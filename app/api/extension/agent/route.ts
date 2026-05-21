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
- a DOM snapshot of the current page (fields with currentValue, buttons, page type, body text),
- the user's resume (flat shape),
- a list of the user's saved resumes (base + tailored),
- the job context,
- a history of actions you've already taken on this page,
- answers the user has given to previous ask_user prompts.

Pick the NEXT single action. Output ONLY a JSON object matching this schema:

{
  "action": one of:
    { "type": "fill",            "fields": { "<fieldId>": "<value>", ... }, "reasoning": "..." }
    { "type": "select_resume",   "resumeId": "...",  "reason": "..." }
    { "type": "tailor",          "baseResumeId": "...", "jobText": "..." }
    { "type": "needs_login",     "providers": [...], "message": "..." }
    { "type": "use_google_signin", "email": "..." }
    { "type": "click",           "selector": "<button id or 'text:<exact button text>'>", "reason": "..." }
    { "type": "ask_user",        "questions": [{ "fieldId": "...", "label": "...", "type": "text"|"select"|"yesno", "options": [...], "required": true|false }] }
    { "type": "submit",          "confidence": 0..1 }
    { "type": "done",            "message": "..." }
  ,
  "confidence": 0..1,
  "reasoning": "<one short sentence>",
  "selectedResumeId": "<id if known>"
}

CRITICAL — read every field's currentValue before deciding:
- A field with a non-empty currentValue is already filled. Do NOT include it in a fill action and do NOT ask_user about it. Treat it as done.
- The first thing to check each turn is "are all required fields filled?". If yes, advance the form — find the Next / Continue / Review / Apply / Submit button and return a click action with selector "text:<that exact button text>". On the LAST step of a multi-step form return submit instead.
- Many application forms are multi-step (LinkedIn Easy Apply, Workday, Workable). Treat each step's "Next" / "Continue" / "Review" button as the goal once that step's required fields are filled. The form is only "done" after the final Submit/Apply.

Filling rules:
- Never invent facts not in the resume. For a field you can't confidently fill from the resume, use ask_user.
- For yes/no eligibility (work authorization, sponsorship, desired salary, available start date, citizenship, veteran status, disability disclosure, etc.) always ask_user — never guess.
- For select / radio fields, only fill if one option clearly matches the resume; otherwise ask_user.
- Skip resume / cover-letter file uploads — return done with a message asking the user to attach manually if no auto-upload is wired.

Resume selection:
- If a tailored resume in the list clearly matches the job context, return select_resume with its id.
- If no tailored resume fits and you would benefit from one, return tailor (the user will be asked to pick a base resume).

Login + auth:
- If the page is a login screen, return needs_login. If the resume email is gmail/Google and a Google sign-in button is visible, prefer use_google_signin.

Submission:
- Only return submit when this is the final step of the form AND every required field on this step has a value AND your confidence ≥ 0.95. Otherwise prefer click on the explicit "Submit application" button text, or done with a "review and click submit" message.

When confused or you've made progress and the next step needs human review, return done with a useful message.`;

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
