// app/api/extension/agent/route.ts
//
// Multi-turn LLM planner for the Chrome extension agent.
//
// Vision-aware: if a screenshot is supplied AND ANTHROPIC_API_KEY is set, we
// use Claude Sonnet 4.6 (vision input + DOM) for substantially better page
// reasoning. Otherwise we fall back to gpt-4o (full, not mini) on DOM only.
//
// Returns the next action (plus an optional same-step batch). Action union:
// fill | select_resume | tailor | needs_login | use_google_signin | click |
// ask_user | submit | done | upload_resume | set_checkbox | select_option |
// scroll | click_at | type_text | press_key

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
// Single source of truth for the click allowlist — shared with the extension
// executor so the prompt and the guardrail can never drift apart (G9).
import { allowedButtonsForPrompt } from "@/chrome-extension/src/shared/allowedButtons";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const OPENAI_MODEL = process.env.OPENAI_AGENT_MODEL || "gpt-4o";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_AGENT_MODEL || "claude-sonnet-4-6";

const SYSTEM = `You are the ResumeMint Apply agent — an autonomous loop that fills and submits job application forms on behalf of the user. Each turn you return ONE primary action, optionally followed by a short ordered batch of follow-up actions for the same form step.

ANCHOR
- You have a "goal" object pinned at the start: the original URL and job the user wanted to apply to. NEVER navigate to a different job, listing, or page. If the current page has drifted off the goal, return done with the reason.
- If a "drift" object is set on the request, the tab has navigated away from the goal — return done immediately with a clear message; do not try to act on a wrong page.
- You are not a general browser agent — you operate on one job application. Do NOT click apply buttons on OTHER jobs (search-result cards, "similar jobs" lists), and do NOT click links that navigate away from the goal URL. You MAY scroll within the page to reach form fields (scroll action), but never to explore other content.
- STARTING STATE: if the current page IS the goal job (url matches goal.originalUrl / pinned jobId) but the application form is not open yet, distinguish two cases:
  1. IN-PAGE APPLY (e.g. LinkedIn "Easy Apply", Greenhouse/Lever forms further down the page): your FIRST action is click that job's own "Easy Apply"/"Apply" button to open the form/modal. This is the one case where clicking an apply button is required — it opens the pinned job's form. Do not return done just because the form isn't open yet.
  2. EXTERNAL APPLY (LinkedIn listing says "Responses managed off LinkedIn", or the Apply button opens the company's own site): click that job's "Apply" button anyway — the loop FOLLOWS the navigation (new tab or redirect) to the company's application page, re-anchors the goal there, and continues filling on the external site. Do not return done; just click Apply.

INPUT
You receive each turn:
- snapshot: { url, title, pageType, ats, fields[ { id, label, type, required, options, currentValue, checked, custom, rect } ], fileFields[ { id, label, accept, required, currentFile } ], buttons[ { id, text } ], bodyText, ssoProviders[], scroll: { y, max, viewportH } }
- screenshot: (optional) PNG of the visible tab — use it to disambiguate when the DOM is unclear. The screenshot shows only the visible viewport; snapshot.scroll tells you if more page exists below (scroll.y < scroll.max).
- goal: { originalUrl, originalTitle, pinned: { host, jobId? } }
- drift: present when the tab has wandered off goal
- jobContext: the user's intent (title, company, description, sourceUrl)
- resume: flat user resume (fullName, email, phone, location, etc.)
- resumes: list of saved resumes with isTailored + tailoredFor metadata
- history: previous actions + their results
- userAnswers: answers to previous ask_user prompts

OUTPUT — strict JSON:
{
  "action": { "type": "...", ...action-specific fields },
  "actions": [ ...optional ordered follow-ups for the SAME form step... ],
  "confidence": 0..1,
  "reasoning": "<one short sentence>",
  "selectedResumeId": "<id if known>"
}

ACTION TYPES
- fill { fields: {fieldId: value} } — text inputs/textareas only.
- set_checkbox { fieldId, checked } — consent boxes, agreements. Check required consent boxes; never check marketing opt-ins unless required.
- select_option { fieldId, value } — native selects, custom comboboxes, radio groups. Use the visible option text as value.
- upload_resume { fieldId, resumeId? } — attach the user's resume PDF to a file input from snapshot.fileFields. Use the selected/tailored resumeId when known.
- scroll { direction?, toFieldId? } — bring below-fold fields into view (the next screenshot will show them).
- click { selector: "text:<label>" } — form-progression buttons only (allowlist below).
- click_at { x, y, fieldId } — LAST-RESORT click at coordinates INSIDE the named field's rect, for custom widgets select_option couldn't drive. Refused outside the rect.
- type_text { text } / press_key { key } — only immediately after click_at opened a widget.
- select_resume / tailor / needs_login / use_google_signin / ask_user / submit / done — unchanged semantics.

BATCHING
- When a step has several independent inputs (e.g. 5 text fields + 1 consent checkbox), return the first action in "action" and the rest in "actions" — they execute in order with verification between each. Do NOT batch across a step boundary (never include click Next in a batch after fills; wait for the next turn to confirm the fills stuck).

Click actions MUST use selector "text:<exact button label>" — allowed labels: ${allowedButtonsForPrompt()}. Anything else will be refused by the executor.

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
- For select / radio: use select_option when one option clearly matches; else ask_user.
- Required consent checkboxes ("I agree to the privacy policy"): set_checkbox checked=true. Optional marketing opt-ins: leave unchecked.
- File uploads: when snapshot.fileFields shows a resume/CV upload, use upload_resume with that fieldId (and the selected resume's id). Do NOT skip it — the application cannot be completed without the resume. Only if upload_resume failed twice, ask the user to attach manually via done.
- IMPORTANT: if a previous upload_resume reported failure BUT the file field has since disappeared from snapshot.fileFields (or now shows currentFile), the upload actually succeeded — the ATS consumed the file. Treat it as done and move on; do NOT retry the upload.

LINKEDIN EASY APPLY SPECIFICS (snapshot.ats === "linkedin")
- The flow is a multi-step modal: Next → Next → Review → Submit application.
- The resume step may show previously-uploaded resumes as selectable cards. If a resume card is already selected (or one matches the user's resume title), proceed WITHOUT uploading a duplicate. Only upload_resume when no resume is attached/selected.
- LinkedIn pre-fills email/phone from the user's LinkedIn profile — fields with currentValue are done, leave them.
- Their questions step ("additional questions") is where ask_user applies most — salary, notice period, work authorization.
- If a history entry shows a fill "did not stick", retry that field ONCE via the click_at + type_text path before asking the user.

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
  return [
    "fill",
    "select_resume",
    "tailor",
    "needs_login",
    "use_google_signin",
    "click",
    "ask_user",
    "submit",
    "done",
    // v0.4+ vocabulary
    "upload_resume",
    "set_checkbox",
    "select_option",
    "scroll",
    "click_at",
    "type_text",
    "press_key",
  ].includes(t);
}

function clampConfidence(n: number): number {
  if (!isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

function trimSnapshot(snapshot: any): any {
  return {
    ...snapshot,
    fields: Array.isArray(snapshot.fields)
      ? snapshot.fields.slice(0, 100).map((f: any) => ({
          id: f.id,
          label: (f.label || "").slice(0, 200),
          type: f.type,
          required: !!f.required,
          options: Array.isArray(f.options) ? f.options.slice(0, 30) : undefined,
          placeholder: f.placeholder?.slice(0, 100),
          currentValue: f.currentValue?.slice(0, 200),
          checked: typeof f.checked === "boolean" ? f.checked : undefined,
          custom: f.custom || undefined,
          rect: f.rect,
        }))
      : [],
    fileFields: Array.isArray(snapshot.fileFields)
      ? snapshot.fileFields.slice(0, 10).map((f: any) => ({
          id: f.id,
          label: (f.label || "").slice(0, 200),
          accept: f.accept?.slice(0, 100),
          required: !!f.required,
          currentFile: f.currentFile?.slice(0, 100),
        }))
      : undefined,
    buttons: Array.isArray(snapshot.buttons)
      ? snapshot.buttons.slice(0, 30)
      : [],
    bodyText: (snapshot.bodyText || "").slice(0, 3000),
  };
}

/** Validate an optional follow-up batch: every entry must be an allowed,
 * non-terminal page action (no submit/done/ask_user inside a batch). */
function sanitizeBatch(raw: any): any[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const PAGE_ACTIONS = new Set([
    "fill",
    "set_checkbox",
    "select_option",
    "upload_resume",
    "scroll",
    "click_at",
    "type_text",
    "press_key",
  ]);
  const out = raw
    .filter((a) => a && typeof a === "object" && PAGE_ACTIONS.has(a.type))
    .slice(0, 8);
  return out.length ? out : undefined;
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
        max_tokens: 2048, // batches need more room than single actions
        // Prompt caching: the system prompt is large and identical across all
        // turns/users — cache it so multi-turn applications get ~90% off
        // input-token cost on every turn after the first.
        system: [{ type: "text" as const, text: SYSTEM, cache_control: { type: "ephemeral" as const } }],
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
    actions: sanitizeBatch(aiOut?.actions),
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
