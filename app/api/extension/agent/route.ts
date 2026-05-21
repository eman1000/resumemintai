// app/api/extension/agent/route.ts
//
// LLM "planner" for the Chrome extension agent loop. Given a DOM snapshot,
// job context, history of prior actions, and user-provided answers, returns
// the next single action the extension should take.
//
// Action union (see chrome-extension/src/types/index.ts AgentAction):
//   fill | select_resume | tailor | needs_login | use_google_signin |
//   click | ask_user | submit | done

import { NextResponse } from "next/server";
import OpenAI from "openai";
import prisma from "@/lib/prisma";
import { userIdFromExtensionRequest } from "@/lib/extensionToken";
import {
  checkAiUsage,
  recordAiUsage,
  quotaBlockedResponse,
} from "@/lib/aiUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const SYSTEM = `You are the ResumeMint Apply agent. You drive a Chrome extension that auto-fills job application forms on behalf of the user.

You are given:
- a DOM snapshot of the current page (fields, buttons, page type, body text),
- the user's resume (flat shape),
- a list of the user's saved resumes (base + tailored),
- the job context the user attached to this run,
- a history of actions you've already taken on this page,
- answers the user has given to previous ask_user prompts.

Pick the NEXT single action. Output ONLY a JSON object matching this schema:

{
  "action": one of:
    { "type": "fill",            "fields": { "<fieldId>": "<value>", ... }, "reasoning": "..." }
    { "type": "select_resume",   "resumeId": "...",  "reason": "..." }
    { "type": "tailor",          "baseResumeId": "...", "jobText": "..." }
    { "type": "needs_login",     "providers": ["google"|"linkedin"|"email"|...], "message": "..." }
    { "type": "use_google_signin", "email": "..." }
    { "type": "click",           "selector": "<button id or unique text>", "reason": "..." }
    { "type": "ask_user",        "questions": [{ "fieldId": "...", "label": "...", "type": "text"|"select"|"yesno", "options": [...], "required": true|false }] }
    { "type": "submit",          "confidence": 0..1 }
    { "type": "done",            "message": "..." }
  ,
  "confidence": 0..1,
  "reasoning": "<one short sentence>",
  "selectedResumeId": "<id if known>"
}

Hard rules:
- Never invent facts not present in the resume. For a field you can't confidently fill from the resume, use ask_user.
- For yes/no eligibility (work authorization, sponsorship, salary expectations, start date, etc.) always ask_user — never guess.
- If the page is a login screen, return needs_login. If the user's resume email is a Google/Gmail address AND the page has a "Sign in with Google" button, prefer use_google_signin.
- For select fields, only fill if one option clearly matches the resume; otherwise ask_user.
- Prefer select_resume to switch to an already-tailored resume that matches the job. If no tailored resume fits, return tailor with the best base resume id.
- Only return submit when every required field is filled AND confidence ≥ 0.95. The extension will refuse to submit below that threshold anyway.
- Once the form is fully filled and you are not submitting, return done.`;

export async function POST(req: Request) {
  let userId: string;
  try {
    userId = userIdFromExtensionRequest(req);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!me) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const quota = await checkAiUsage(userId, "extension-agent");
  if (!quota.ok) {
    return NextResponse.json(quotaBlockedResponse(quota), { status: 429 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const snapshot = body?.snapshot;
  const jobContext = body?.jobContext;
  const history = Array.isArray(body?.history) ? body.history.slice(-20) : [];
  const userAnswers = body?.userAnswers || {};
  const resume = body?.resume;
  const resumes = Array.isArray(body?.resumes) ? body.resumes.slice(0, 40) : [];

  if (!snapshot || !resume) {
    return NextResponse.json({ error: "missing_input" }, { status: 400 });
  }

  // Trim DOM snapshot — we don't need every field's currentValue, and bodyText
  // can be long. The LLM sees enough to plan but not enough to drown.
  const trimmedSnapshot = {
    ...snapshot,
    fields: Array.isArray(snapshot.fields)
      ? snapshot.fields.slice(0, 80).map((f: any) => ({
          id: f.id,
          label: (f.label || "").slice(0, 200),
          type: f.type,
          required: !!f.required,
          options: Array.isArray(f.options) ? f.options.slice(0, 30) : undefined,
          placeholder: f.placeholder?.slice(0, 100),
          currentValue: f.currentValue?.slice(0, 200),
        }))
      : [],
    buttons: Array.isArray(snapshot.buttons)
      ? snapshot.buttons.slice(0, 30)
      : [],
    bodyText: (snapshot.bodyText || "").slice(0, 4000),
  };

  const userMsg = JSON.stringify({
    snapshot: trimmedSnapshot,
    jobContext,
    history,
    userAnswers,
    resume,
    resumes,
  }).slice(0, 60_000);

  let aiOut: any = {};
  try {
    const resp = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userMsg },
      ],
    });
    aiOut = JSON.parse(resp.choices[0].message.content || "{}");
  } catch (e: any) {
    console.error("[extension/agent] AI error", e?.message);
    return NextResponse.json(
      { error: "ai_failed", detail: e?.message },
      { status: 502 },
    );
  }

  await recordAiUsage(userId, "extension-agent");

  // Lightweight validation — refuse malformed actions.
  const action = aiOut?.action;
  if (!action || typeof action !== "object" || typeof action.type !== "string") {
    return NextResponse.json(
      { error: "invalid_action", raw: aiOut },
      { status: 502 },
    );
  }

  const confidence = clampConfidence(
    typeof aiOut?.confidence === "number" ? aiOut.confidence : 0.5,
  );

  return NextResponse.json({
    action,
    confidence,
    reasoning: typeof aiOut?.reasoning === "string" ? aiOut.reasoning : undefined,
    selectedResumeId:
      typeof aiOut?.selectedResumeId === "string"
        ? aiOut.selectedResumeId
        : undefined,
    quota: {
      remainingDay: Math.max(0, quota.remainingDay - 1),
      remainingMonth: Math.max(0, quota.remainingMonth - 1),
    },
  });
}

function clampConfidence(n: number): number {
  if (!isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}
