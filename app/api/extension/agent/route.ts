// app/api/extension/agent/route.ts
//
// Multi-turn LLM planner for the Chrome extension agent.
//
// Vision-aware: if a screenshot is supplied AND ANTHROPIC_API_KEY is set, we
// use Claude Sonnet 4.6 (vision input + DOM) for substantially better page
// reasoning. Otherwise we fall back to gpt-4o (full, not mini) on DOM only.
//
// Returns the NEXT single action the extension should take. Action union:
// fill | select_resume | tailor | needs_login | use_google_signin |
// click | ask_user | submit | done

import { NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import prisma from "@/lib/prisma";
import { userIdFromExtensionRequest } from "@/lib/extensionToken";
import {
  checkAiUsage,
  recordAiUsage,
  quotaBlockedResponse,
} from "@/lib/aiUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const OPENAI_MODEL = process.env.OPENAI_AGENT_MODEL || "gpt-4o";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_AGENT_MODEL || "claude-sonnet-4-6";

const SYSTEM = `You are the ResumeMint Apply agent — an autonomous loop that fills and submits job application forms on behalf of the user. You take ONE action per turn.

ANCHOR
- You have a "goal" object pinned at the start: the original URL and job the user wanted to apply to. NEVER navigate to a different job, listing, or page. If the current page has drifted off the goal, return done with the reason.
- If a "drift" object is set on the request, the tab has navigated away from the goal — return done immediately with a clear message; do not try to act on a wrong page.
- You are not a general browser agent — you operate on one application form. Do NOT click on "Easy Apply" buttons in job listings, do NOT scroll endlessly looking for things, do NOT click links that navigate away from the goal URL.

INPUT
You receive each turn:
- snapshot: { url, title, pageType, fields[ { id, label, type, required, options, currentValue } ], buttons[ { id, text } ], bodyText, ssoProviders[] }
- screenshot: (optional) PNG of the visible tab — use it to disambiguate when the DOM is unclear.
- goal: { originalUrl, originalTitle, pinned: { host, jobId? } }
- drift: present when the tab has wandered off goal
- jobContext: the user's intent (title, company, description, sourceUrl)
- resume: flat user resume (fullName, email, phone, location, etc.)
- resumes: list of saved resumes with isTailored + tailoredFor metadata
- history: previous actions + their results
- userAnswers: answers to previous ask_user prompts

OUTPUT — strict JSON, ONE action:
{
  "action": {
    "type": "fill"|"select_resume"|"tailor"|"needs_login"|"use_google_signin"|"click"|"ask_user"|"submit"|"done",
    ...(action-specific fields)
  },
  "confidence": 0..1,
  "reasoning": "<one short sentence>",
  "selectedResumeId": "<id if known>"
}

Click actions MUST use selector "text:<exact button label>" — only these labels are allowed: Next, Continue, Review, Apply, Easy Apply, Submit, Submit application, Send, I agree, I accept, Save. Anything else will be refused by the executor.

CRITICAL FILL BEHAVIOUR
- Before deciding, scan every field for non-empty currentValue — those are DONE. Do NOT include them in fill and do NOT ask_user about them.
- If all required fields on the current step are filled, the next action is click "text:Next" (or whatever the form's advance button is labelled — see snapshot.buttons). On the FINAL step, prefer click "text:Submit application" / "text:Submit" or, if you are highly confident, submit.
- A field's value comes from the resume FIRST. Aliases:
  - Email / Email address / Work email → resume.email
  - Phone / Mobile / Telephone / Cell → resume.phone
  - First name / Given name → resume.firstName
  - Last name / Surname / Family name → resume.lastName
  - Full name / Name → resume.fullName
  - Location / City / Where do you live → resume.location or resume.city
  - Country → resume.country
  - LinkedIn / LinkedIn URL → resume.linkedIn
  - Website / Portfolio → resume.website
  - GitHub → resume.github
  - Headline / Title / Current role → resume.headline
  - Summary / About → resume.summary
- Only ask_user when the resume genuinely lacks the value AND it can't be derived.
- ALWAYS ask_user for yes/no eligibility (work authorization, sponsorship, salary expectation, start date, citizenship, willingness to relocate, notice period, veteran status, disability disclosure).
- For select / radio: fill only when one option clearly matches; else ask_user.
- File uploads: skip. Return done with a message that the user should attach the resume PDF manually.

RESUME SELECTION
- If a tailored resume in the list clearly matches the job, select_resume with its id.
- If no tailored resume fits, tailor (the side panel will ask the user to pick a base resume).

LOGIN
- If the page is a login wall, needs_login. If resume.email is gmail/Google AND a "Sign in with Google" provider is detected, prefer use_google_signin.

SUBMIT
- Only submit when you are 100% sure this is the final step AND every required field is filled AND your confidence ≥ 0.95. Otherwise prefer click on a labelled Submit button or done.

STUCK?
- If you've taken the same action twice with no change, return done with a clear message asking the user to review the form.`;

function isAllowedAction(t: string): boolean {
  return ["fill", "select_resume", "tailor", "needs_login", "use_google_signin", "click", "ask_user", "submit", "done"].includes(t);
}

function clampConfidence(n: number): number {
  if (!isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

function trimSnapshot(snapshot: any): any {
  return {
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
    bodyText: (snapshot.bodyText || "").slice(0, 3000),
  };
}

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
  if (!quota.ok) return NextResponse.json(quotaBlockedResponse(quota), { status: 429 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const snapshot = body?.snapshot;
  const screenshot: string | undefined = typeof body?.screenshot === "string" && body.screenshot.length > 100
    ? body.screenshot
    : undefined;
  const jobContext = body?.jobContext;
  const goal = body?.goal;
  const drift = body?.drift;
  const history = Array.isArray(body?.history) ? body.history.slice(-20) : [];
  const userAnswers = body?.userAnswers || {};
  const resume = body?.resume;
  const resumes = Array.isArray(body?.resumes) ? body.resumes.slice(0, 40) : [];

  if (!snapshot || !resume) {
    return NextResponse.json({ error: "missing_input" }, { status: 400 });
  }

  const trimmed = trimSnapshot(snapshot);
  const turnContext = {
    snapshot: trimmed,
    jobContext,
    goal,
    drift,
    history,
    userAnswers,
    resume,
    resumes,
  };
  const turnJson = JSON.stringify(turnContext).slice(0, 50_000);

  let aiOut: any = {};
  let modelUsed = OPENAI_MODEL;

  // Prefer Claude Sonnet 4.6 when we have a screenshot AND an Anthropic key.
  // Vision input meaningfully helps on dynamic SPAs (LinkedIn, Workday).
  if (anthropic && screenshot) {
    modelUsed = ANTHROPIC_MODEL;
    try {
      const resp = await anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: "image/png", data: screenshot },
              },
              {
                type: "text",
                text:
                  `Here is the current page state. Choose the next single action and reply with strict JSON only (no prose).\n\n${turnJson}`,
              },
            ],
          },
        ],
      });
      const text = resp.content
        .filter((c): c is { type: "text"; text: string } => c.type === "text")
        .map((c) => c.text)
        .join("");
      const match = text.match(/\{[\s\S]*\}/);
      aiOut = match ? JSON.parse(match[0]) : {};
    } catch (e: any) {
      console.error("[extension/agent] anthropic error", e?.message);
      // Fall back to OpenAI so the run still completes.
      modelUsed = OPENAI_MODEL;
    }
  }

  if (!aiOut.action) {
    try {
      const resp = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content:
              `Here is the current page state. Choose the next single action and reply with strict JSON only.\n\n${turnJson}`,
          },
        ],
      });
      aiOut = JSON.parse(resp.choices[0].message.content || "{}");
    } catch (e: any) {
      console.error("[extension/agent] openai error", e?.message);
      return NextResponse.json({ error: "ai_failed", detail: e?.message }, { status: 502 });
    }
  }

  await recordAiUsage(userId, "extension-agent");

  const action = aiOut?.action;
  if (!action || typeof action !== "object" || !isAllowedAction(action.type)) {
    return NextResponse.json(
      { error: "invalid_action", raw: aiOut, modelUsed },
      { status: 502 },
    );
  }

  return NextResponse.json({
    action,
    confidence: clampConfidence(typeof aiOut?.confidence === "number" ? aiOut.confidence : 0.7),
    reasoning: typeof aiOut?.reasoning === "string" ? aiOut.reasoning : undefined,
    selectedResumeId:
      typeof aiOut?.selectedResumeId === "string" ? aiOut.selectedResumeId : undefined,
    modelUsed,
    quota: {
      remainingDay: Math.max(0, quota.remainingDay - 1),
      remainingMonth: Math.max(0, quota.remainingMonth - 1),
    },
  });
}
