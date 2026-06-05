// app/api/extension/computer/route.ts
//
// Computer-use planner for the ResumeMint Apply agent. Unlike the DOM-based
// /agent route, this drives the page via Claude's computer-use tool
// (screenshot in, coordinate/keyboard actions out). The EXTENSION executes
// those actions through chrome.debugger (CDP) so they are TRUSTED input —
// indistinguishable from a real user — which is what makes it work on any
// site (Workday, custom React portals) that ignores synthetic JS events.
//
// Stateless: the extension holds the running message history and posts it
// each turn. We call Claude once, return the assistant turn's content
// blocks (tool_use actions for the extension to execute), and the extension
// appends tool_result blocks (screenshots) and calls again.
//
// Metered via the extension-agent feature (one record per planner turn).

import { NextResponse } from "next/server";
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

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// NOTE: claude-sonnet-4-6 does NOT support Anthropic's built-in
// `computer_20250124` tool type. Instead of relying on that, we define our
// OWN custom "computer" tool with the same action grammar and feed
// screenshots as image blocks. The model reasons over the screenshot and
// calls the tool with coordinates; the extension's CDP layer executes them.
const MODEL = process.env.ANTHROPIC_COMPUTER_MODEL || "claude-sonnet-4-6";

// The extension downscales its screenshots to this logical display size and
// scales action coordinates back up. Keeping it ≤ XGA is best for targeting
// accuracy + lower image-token cost.
const DISPLAY_WIDTH = Number(process.env.COMPUTER_DISPLAY_W || 1280);
const DISPLAY_HEIGHT = Number(process.env.COMPUTER_DISPLAY_H || 800);

const SYSTEM = `You are the ResumeMint Apply agent. You complete a job application on behalf of the user by controlling their browser tab — looking at screenshots and taking mouse/keyboard actions, exactly like a careful human applicant.

GOAL
- A "goal" job is given in the first user message (title, company, URL). Complete THAT job's application. If the apply flow opens the company's own site or a new tab, continue there — that is expected.
- Never start applying to a DIFFERENT job. If you find yourself on a search results page or a different posting, navigate back toward the goal application, or call task_complete explaining the situation.

HOW TO WORK
- You drive the page with the "computer" tool. Each turn you get a screenshot AND a numbered "INTERACTIVE ELEMENTS" list of the clickable/typeable elements on the page.
- STRONGLY PREFER element actions: click_element {index} and type_in_element {index, text}. They click the element's true center via trusted input and almost never miss. Match the element you want from the list (by its label/role) and use its number.
- Use coordinate actions (left_click {coordinate}, type, scroll, key) ONLY when no list element matches what you see in the screenshot (e.g. a canvas, an unlabeled custom widget). Coordinates are in the same pixel space as the screenshot.
- Act one step at a time. After each action you get a fresh screenshot + element list — verify the result before the next step. If an element action did nothing, re-read the updated list (the page may have changed) rather than blindly repeating.
- Cookie/consent banners: find the Accept button in the element list and click_element it before proceeding.
- Fill fields from the user's resume data (provided in the first message). Click into a field before typing. Use realistic, accurate values only — never invent employment history, dates, or credentials.
- For dropdowns/comboboxes: click to open, then click the matching option.
- Scroll to reach fields below the fold.
- To attach the resume/CV: click the upload/attach button. A native file chooser will be handled automatically by the system using the user's ResumeMint resume PDF — you do NOT need to pick a file; just click the upload control and continue.

WHEN TO STOP AND ASK (use the custom tools, do NOT guess)
- ask_user: for any answer not derivable from the resume — work authorization, visa sponsorship, salary expectations, start date, notice period, demographic/EEO questions, custom screening questions.
- needs_login: if a login wall blocks progress.
- submit_application: when the form is complete and ready to submit. Describe what will be submitted. NEVER click the final submit button yourself — call this tool and the system enforces the user's auto-submit preference.
- task_complete: when the application is submitted, or you cannot proceed (and explain why).

SAFETY
- Do not interact with anything outside completing this application (no messaging, no settings, no other jobs, no purchases).
- Prefer accuracy over completion: if unsure about a required answer, ask_user.`;

// Our custom "computer" tool — same action vocabulary as Anthropic's built-in
// computer tool, but model-agnostic (works on claude-sonnet-4-6). The
// extension's CDP layer (cdp.ts) executes each action.
const COMPUTER_TOOL: Anthropic.Tool = {
  name: "computer",
  description:
    "Control the browser page with mouse and keyboard, like a human applicant. " +
    "After each action you receive an updated screenshot. Coordinates are pixels " +
    `in a ${DISPLAY_WIDTH}x${DISPLAY_HEIGHT} space, origin top-left.`,
  input_schema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: [
          // PREFERRED — reliable element-targeted actions (set-of-marks):
          "click_element",
          "type_in_element",
          // Coordinate fallback (only when no element matches):
          "left_click",
          "right_click",
          "double_click",
          "triple_click",
          "mouse_move",
          "left_click_drag",
          "type",
          "key",
          "scroll",
          "wait",
          "screenshot",
        ],
        description:
          "The action. PREFER click_element/type_in_element with an element number from the INTERACTIVE ELEMENTS list — coordinate clicks are a last resort.",
      },
      index: {
        type: "number",
        description: "Element number (from the INTERACTIVE ELEMENTS list) for click_element / type_in_element.",
      },
      coordinate: {
        type: "array",
        items: { type: "number" },
        description: "[x, y] target for coordinate-based click/move/scroll actions.",
      },
      start_coordinate: {
        type: "array",
        items: { type: "number" },
        description: "[x, y] start point for left_click_drag.",
      },
      text: {
        type: "string",
        description: "Text to type (action=type) or key combo like 'Return', 'Tab', 'ctrl+a' (action=key).",
      },
      scroll_direction: { type: "string", enum: ["up", "down", "left", "right"] },
      scroll_amount: { type: "number", description: "Number of scroll steps (≈100px each)." },
      duration: { type: "number", description: "Seconds to wait (action=wait)." },
    },
    required: ["action"],
  },
};

// Custom tools the model uses to hand control back to the extension UI.
const CUSTOM_TOOLS: Anthropic.Tool[] = [
  {
    name: "ask_user",
    description:
      "Ask the user one or more questions whose answers are not in the resume (eligibility, salary, screening questions). The run pauses until they answer.",
    input_schema: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string", description: "The question text shown to the user." },
              type: { type: "string", description: "input | select | yesno" },
              options: { type: "array", items: { type: "string" } },
            },
            required: ["label"],
          },
        },
      },
      required: ["questions"],
    },
  },
  {
    name: "needs_login",
    description: "Signal that a login wall blocks progress. The run pauses for the user to sign in.",
    input_schema: {
      type: "object",
      properties: { message: { type: "string" } },
      required: [],
    },
  },
  {
    name: "submit_application",
    description:
      "The form is complete and ready to submit. Describe what will be submitted. Do NOT click submit yourself; the system applies the user's auto-submit setting.",
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "Brief summary of the completed application." },
        confidence: { type: "number", description: "0..1 confidence that the form is correct and complete." },
      },
      required: ["summary"],
    },
  },
  {
    name: "task_complete",
    description: "End the run: application submitted, or cannot proceed. Explain the outcome.",
    input_schema: {
      type: "object",
      properties: { message: { type: "string" } },
      required: ["message"],
    },
  },
];

export async function POST(req: Request) {
  let userId: string;
  try {
    userId = userIdFromExtensionRequest(req);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!anthropic) {
    return NextResponse.json(
      { error: "not_configured", detail: "ANTHROPIC_API_KEY is not set on the server." },
      { status: 503 },
    );
  }

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!me) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const quota = await checkAiUsage(userId, "extension-agent");
  if (!quota.ok) return NextResponse.json(quotaBlockedResponse(quota), { status: 429 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const messages = Array.isArray(body?.messages) ? body.messages : null;
  if (!messages) {
    return NextResponse.json({ error: "missing_messages" }, { status: 400 });
  }
  // Optional per-run display override (the extension reports its captured
  // screenshot dimensions so coordinates line up).
  const displayW = Number(body?.display?.width) || DISPLAY_WIDTH;
  const displayH = Number(body?.display?.height) || DISPLAY_HEIGHT;

  // Tell the model the EXACT pixel space of the screenshots it's seeing, so
  // its coordinates line up with the image (and thus the page after the
  // client maps them to CSS px).
  const computerTool: Anthropic.Tool = {
    ...COMPUTER_TOOL,
    description:
      `Control the browser page with mouse and keyboard, like a human applicant. ` +
      `After each action you receive an updated screenshot that is ${displayW}x${displayH} pixels. ` +
      `Give coordinates in that exact pixel space, origin top-left. Click the visual center of targets.`,
  };
  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1536,
      system: [
        { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
      ],
      tools: [computerTool, ...CUSTOM_TOOLS],
      messages: messages as Anthropic.MessageParam[],
    });

    await recordAiUsage(userId, "extension-agent");

    return NextResponse.json({
      id: resp.id,
      role: resp.role,
      content: resp.content, // tool_use + text blocks for the extension to act on
      stopReason: resp.stop_reason,
      modelUsed: MODEL,
      quota: {
        remainingDay: Math.max(0, quota.remainingDay - 1),
        remainingMonth: Math.max(0, quota.remainingMonth - 1),
      },
    });
  } catch (e: any) {
    console.error("[extension/computer]", e?.status, e?.message);
    return NextResponse.json(
      { error: "planner_failed", detail: e?.message || "computer-use call failed" },
      { status: 502 },
    );
  }
}
