// Computer-use agent loop. Mirrors the message-based agent loop in
// agentLoop.ts but drives the page via CDP trusted input (cdp.ts) and
// Claude's computer-use tool (server: /api/extension/computer).
//
// Each turn:
//   1. POST the running message history to the planner.
//   2. The assistant replies with text + tool_use blocks (computer actions
//      or custom tools: ask_user / needs_login / submit_application /
//      task_complete).
//   3. Execute computer actions via CDP, collect tool_result blocks
//      (screenshots), append, and loop. Custom tools pause/inform the UI.

import { computerPlan, fetchResumePdf, logApply, tailorForJob, saveProfileAnswers } from "../lib/api";
import type { AgentJobContext } from "../types";
import { CdpSession, type ComputerAction } from "./cdp";

export type ComputerEvent =
  | { kind: "thinking" }
  | { kind: "text"; text: string }
  | { kind: "user_said"; text: string }
  | { kind: "action"; action: string; detail?: string }
  | { kind: "ask_user"; questions: Array<{ label: string; type?: string; options?: string[] }> }
  | { kind: "needs_login"; message?: string }
  | { kind: "confirm_submit"; summary: string; confidence?: number }
  | { kind: "confirm_upload" }
  | { kind: "banner"; on: boolean }
  | { kind: "done"; message?: string }
  | { kind: "error"; error: string };

export type ComputerLoopOptions = {
  tabId: number;
  jobContext?: AgentJobContext;
  resume: Record<string, any>;
  selectedResumeId?: string;
  autoSubmit: boolean;
  onEvent: (e: ComputerEvent) => void;
  awaitAnswers: () => Promise<Record<string, string>>;
  awaitLoginCompleted: () => Promise<void>;
  /** Resolve true to submit, false to stop, when auto-submit is off. */
  awaitSubmitConfirm: () => Promise<boolean>;
  /** Drain any messages the user typed in the chat box since last turn. The
   * loop injects them so the user can steer the agent while it works. */
  drainUserMessages?: () => string[];
  /** Resolves when the user sends a chat message — lets a chat message break
   * the agent out of a pause (needs_login / ask_user) so it can be redirected
   * (e.g. "create an account for me" instead of signing in). */
  awaitUserMessage?: () => Promise<void>;
  /** At the first resume upload, ask whether to tailor a fresh resume for the
   * job or use the existing one. Cached for the rest of the run. */
  awaitUploadChoice?: () => Promise<"tailor" | "existing">;
};

// Computer-use takes many small steps; long multi-question forms (citizenship,
// screening, EEO…) routinely exceed 40. Higher cap so a single run can finish
// them. (Re-running "Apply with AI" also resumes from the page's current state.)
const MAX_TURNS = 120;
const DISPLAY_W = 1280;
const DISPLAY_H = 800;

type Block = any;

/** Find the current tab driven by the run (follows external-apply new tabs). */
function trackSpawnedTab(openerTabId: number, onSpawn: (id: number) => void) {
  const listener = (tab: chrome.tabs.Tab) => {
    if (tab.openerTabId === openerTabId && tab.id) onSpawn(tab.id);
  };
  chrome.tabs.onCreated.addListener(listener);
  return () => chrome.tabs.onCreated.removeListener(listener);
}

export async function runComputerLoop(opts: ComputerLoopOptions): Promise<void> {
  const cdp = new CdpSession(opts.tabId, DISPLAY_W, DISPLAY_H);
  let spawnedTabId: number | null = null;
  const untrack = trackSpawnedTab(opts.tabId, (id) => (spawnedTabId = id));

  try {
    await cdp.attach();
    opts.onEvent({ kind: "banner", on: true });

    // Preload the resume PDF so file choosers resolve instantly. Capture any
    // error (e.g. empty resume) so the upload step can tell the user clearly
    // instead of silently attaching nothing/blank.
    let resumeError: string | null = null;
    try {
      cdp.filePayload = await fetchResumePdf(opts.selectedResumeId);
    } catch (e: any) {
      resumeError = e?.message || "Could not load your resume.";
    }

    const goalUrl = opts.jobContext?.sourceUrl || "";
    let uploadDecision: "tailor" | "existing" | null = null;
    const firstShot = await cdp.screenshot();
    const firstMarks = await cdp.enumerateElements();

    // Seed the conversation: instructions + resume + first screenshot.
    const messages: Array<{ role: "user" | "assistant"; content: Block[] }> = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              `GOAL JOB:\n` +
              `- Title: ${opts.jobContext?.title || "(unknown)"}\n` +
              `- Company: ${opts.jobContext?.company || "(unknown)"}\n` +
              `- URL: ${goalUrl}\n\n` +
              `USER RESUME (use these exact values; do not invent):\n` +
              "```json\n" +
              JSON.stringify(opts.resume, null, 2).slice(0, 6000) +
              "\n```\n\n" +
              `Apply to this job. The screenshot below shows the page; the numbered ` +
              `list is the clickable/typeable elements on it. PREFER click_element / ` +
              `type_in_element with an element number — it's far more reliable than ` +
              `pixel coordinates.\n\n` +
              renderMarks(firstMarks),
          },
          {
            type: "image",
            source: { type: "base64", media_type: "image/png", data: firstShot },
          },
        ],
      },
    ];

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      opts.onEvent({ kind: "thinking" });

      // Inject any chat messages the user typed while the agent was working,
      // so they steer the very next decision (like Claude for Chrome).
      const queued = opts.drainUserMessages?.() || [];
      if (queued.length) {
        const last = messages[messages.length - 1];
        const note = {
          type: "text",
          text: "USER (live instruction): " + queued.join("\n"),
        };
        if (last && last.role === "user" && Array.isArray(last.content)) {
          last.content.push(note);
        } else {
          messages.push({ role: "user", content: [note] });
        }
        for (const m of queued) opts.onEvent({ kind: "user_said", text: m });
      }

      // Follow a newly-spawned tab (external apply opened a new tab).
      if (spawnedTabId) {
        const newTab = spawnedTabId;
        spawnedTabId = null;
        try {
          await chrome.tabs.update(newTab, { active: true });
          await new Promise((r) => setTimeout(r, 800));
          await cdp.retarget(newTab);
        } catch {
          /* keep current tab */
        }
      }

      let plan;
      try {
        // Report the ACTUAL image size the model is looking at so the tool's
        // coordinate space matches the screenshot exactly (Retina-safe).
        const img = cdp.imageSize;
        plan = await computerPlan({
          messages,
          display: { width: img.width, height: img.height },
        });
      } catch (e: any) {
        opts.onEvent({ kind: "error", error: e?.message || "planner_failed" });
        return;
      }

      const content: Block[] = plan.content || [];
      messages.push({ role: "assistant", content });

      // Surface any assistant text.
      for (const b of content) {
        if (b.type === "text" && b.text?.trim()) {
          opts.onEvent({ kind: "text", text: b.text.trim() });
        }
      }

      const toolUses = content.filter((b: Block) => b.type === "tool_use");
      if (!toolUses.length) {
        // No actions — model considers itself done.
        opts.onEvent({ kind: "done", message: "Agent finished." });
        return;
      }

      const toolResults: Block[] = [];
      let pausedOrEnded = false;

      // Race a pause (login / questions) against the user sending a chat
      // message. If the user types instead of clicking the pause button, we
      // resume immediately and feed their message back to the model — so
      // "create an account for me" redirects the agent instead of being
      // stuck behind a 'sign in' wait. Returns the queued messages (if any).
      const racePauseOrChat = async (waitForButton: () => Promise<void>): Promise<string[]> => {
        const chat = opts.awaitUserMessage ? opts.awaitUserMessage() : new Promise<void>(() => {});
        await Promise.race([waitForButton(), chat]);
        return opts.drainUserMessages?.() || [];
      };

      for (const tu of toolUses) {
        // ---- Custom tools (hand control to the UI) -----------------------
        if (tu.name === "ask_user") {
          // Key each question by its label so the answer form + profile-capture
          // are keyed by the question TEXT (Claude doesn't send a fieldId).
          const rawQs = (tu.input?.questions || []) as Array<any>;
          const questions = rawQs.map((q) => ({
            fieldId: String(q.label || "").slice(0, 120),
            label: q.label,
            type: q.type === "yesno" ? "yesno" : q.options?.length ? "select" : "text",
            options: q.options,
          }));
          opts.onEvent({ kind: "ask_user", questions: questions as any });
          // Race the structured answer form against a free-text chat message.
          let answers: Record<string, string> | null = null;
          const formP = opts.awaitAnswers().then((a) => {
            answers = a;
          });
          const chatP = opts.awaitUserMessage ? opts.awaitUserMessage() : new Promise<void>(() => {});
          await Promise.race([formP, chatP]);
          const typed = opts.drainUserMessages?.() || [];
          const shot = await cdp.screenshot();
          const marks = await cdp.enumerateElements();
          if (answers) {
            // Remember these answers on the account so the agent stops asking
            // them on future applications.
            void saveProfileAnswers(answers);
            toolResults.push({
              type: "tool_result",
              tool_use_id: tu.id,
              content: [
                { type: "text", text: "User answered:\n" + JSON.stringify(answers, null, 2) },
              ],
            });
          } else {
            for (const m of typed) opts.onEvent({ kind: "user_said", text: m });
            toolResults.push({
              type: "tool_result",
              tool_use_id: tu.id,
              content: [
                {
                  type: "text",
                  text: "USER (live instruction): " + typed.join("\n") + "\n\n" + renderMarks(marks),
                },
                { type: "image", source: { type: "base64", media_type: "image/png", data: shot } },
              ],
            });
          }
          continue;
        }
        if (tu.name === "needs_login") {
          opts.onEvent({ kind: "needs_login", message: tu.input?.message });
          const typed = await racePauseOrChat(opts.awaitLoginCompleted);
          const shot = await cdp.screenshot();
          const marks = await cdp.enumerateElements();
          if (typed.length) {
            for (const m of typed) opts.onEvent({ kind: "user_said", text: m });
            toolResults.push({
              type: "tool_result",
              tool_use_id: tu.id,
              content: [
                {
                  type: "text",
                  text:
                    "The user did not sign in. Instead they instructed: " +
                    typed.join("\n") +
                    "\nAct on this (e.g. create an account using the resume details). Here is the page:\n\n" +
                    renderMarks(marks),
                },
                { type: "image", source: { type: "base64", media_type: "image/png", data: shot } },
              ],
            });
            continue;
          }
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: [
              { type: "text", text: "User signed in. Here is the current page.\n\n" + renderMarks(marks) },
              { type: "image", source: { type: "base64", media_type: "image/png", data: shot } },
            ],
          });
          continue;
        }
        if (tu.name === "submit_application") {
          const summary = tu.input?.summary || "Application ready to submit.";
          const confidence = tu.input?.confidence;
          if (!opts.autoSubmit) {
            opts.onEvent({ kind: "confirm_submit", summary, confidence });
            const go = await opts.awaitSubmitConfirm();
            if (!go) {
              opts.onEvent({ kind: "done", message: "Stopped before submit — review and submit manually." });
              return;
            }
          } else if (typeof confidence === "number" && confidence < 0.95) {
            opts.onEvent({
              kind: "done",
              message: `Confidence ${(confidence * 100).toFixed(0)}% < 95% — review and submit manually.`,
            });
            return;
          }
          // Approved: tell the model to click the actual submit button now.
          const shot = await cdp.screenshot();
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: [
              { type: "text", text: "Approved. Click the final submit button now, then take a screenshot to confirm." },
              { type: "image", source: { type: "base64", media_type: "image/png", data: shot } },
            ],
          });
          await logCompletionSafe();
          continue;
        }
        if (tu.name === "task_complete") {
          opts.onEvent({ kind: "done", message: tu.input?.message });
          pausedOrEnded = true;
          break;
        }

        // ---- The computer tool -------------------------------------------
        if (tu.name === "computer") {
          const action = tu.input as ComputerAction;
          opts.onEvent({
            kind: "action",
            action: action.action,
            detail: describeAction(action),
          });

          // If the resume couldn't be loaded (e.g. empty), don't attach a
          // blank file — tell the user and end this turn cleanly.
          if (action.action === "upload_resume" && resumeError && uploadDecision !== "tailor") {
            opts.onEvent({ kind: "text", text: "⚠ " + resumeError });
            toolResults.push({
              type: "tool_result",
              tool_use_id: tu.id,
              content: [
                {
                  type: "text",
                  text:
                    "Resume could not be attached: " + resumeError +
                    " Tell the user to fix their resume; do not keep retrying the upload.",
                },
              ],
              is_error: true,
            });
            continue;
          }

          // Before the first resume upload, ask tailor-vs-existing (once),
          // then prepare the right PDF. Per the user's "ask me each run".
          if (action.action === "upload_resume" && uploadDecision === null) {
            if (opts.awaitUploadChoice) {
              opts.onEvent({ kind: "confirm_upload" });
              uploadDecision = await opts.awaitUploadChoice();
            } else {
              uploadDecision = "existing";
            }
            if (uploadDecision === "tailor") {
              try {
                opts.onEvent({ kind: "text", text: "Tailoring a resume for this job…" });
                const jobText = await cdp.getPageText();
                const { resumeId } = await tailorForJob({
                  title: opts.jobContext?.title,
                  company: opts.jobContext?.company,
                  description: jobText,
                  source: goalUrl,
                });
                cdp.filePayload = await fetchResumePdf(resumeId);
                opts.onEvent({ kind: "text", text: "Tailored resume ready — attaching it." });
              } catch (e: any) {
                opts.onEvent({
                  kind: "text",
                  text: "Tailoring failed (" + (e?.message || "error") + ") — using your existing resume instead.",
                });
              }
            }
          }

          try {
            const execRes: any = await cdp.execute(action);
            // Settle a beat after page-changing actions, then snap + re-enumerate.
            const noViewChange =
              action.action === "cursor_position" || action.action === "mouse_move";
            const resultContent: Block[] = [];
            if (!noViewChange) {
              await wait(500);
              const shot = action.action === "screenshot" && execRes.screenshot
                ? execRes.screenshot
                : await cdp.screenshot();
              const marks = await cdp.enumerateElements();
              const note =
                execRes && typeof execRes.note === "string" ? execRes.note + "\n\n" : "";
              resultContent.push({ type: "text", text: note + renderMarks(marks) });
              resultContent.push({
                type: "image",
                source: { type: "base64", media_type: "image/png", data: shot },
              });
            } else {
              resultContent.push({ type: "text", text: "done" });
            }
            toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: resultContent });
          } catch (e: any) {
            toolResults.push({
              type: "tool_result",
              tool_use_id: tu.id,
              content: [{ type: "text", text: `Action failed: ${e?.message || e}` }],
              is_error: true,
            });
          }
          continue;
        }

        // Unknown tool.
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: [{ type: "text", text: "Unknown tool." }],
          is_error: true,
        });
      }

      if (pausedOrEnded) return;
      messages.push({ role: "user", content: toolResults });

      // Keep the message history from ballooning: drop old screenshots,
      // keeping only the most recent few image blocks (text stays).
      pruneOldScreenshots(messages, 3);
    }

    opts.onEvent({ kind: "done", message: `Paused after ${MAX_TURNS} steps (safety limit). Click "Apply with AI" again to continue from where it left off, or finish the rest manually.` });

    async function logCompletionSafe() {
      try {
        await logApply({
          ats: hostOf(goalUrl),
          jobUrl: goalUrl,
          jobSnapshot: { title: opts.jobContext?.title, company: opts.jobContext?.company },
        });
      } catch {
        /* tracking only */
      }
    }
  } catch (e: any) {
    opts.onEvent({ kind: "error", error: e?.message || "computer_loop_failed" });
  } finally {
    untrack();
    await cdp.detach();
    opts.onEvent({ kind: "banner", on: false });
  }
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Render the set-of-marks element list for the model. */
function renderMarks(
  marks: Array<{
    idx: number;
    label: string;
    role: string;
    x: number;
    y: number;
    w: number;
    h: number;
    kind?: string;
    options?: string[];
  }>,
): string {
  if (!marks.length) return "INTERACTIVE ELEMENTS: (none detected — use coordinates from the screenshot)";
  const lines = marks
    .map((m) => {
      if (m.kind === "select") {
        const opts = (m.options || []).slice(0, 40).join(" | ");
        return `#${m.idx} [native select] "${m.label}" → use select_option. Options: ${opts}`;
      }
      return `#${m.idx} [${m.role}] "${m.label}"`;
    })
    .join("\n");
  return `INTERACTIVE ELEMENTS (use click_element / type_in_element / select_option with the number):\n${lines}`;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "unknown";
  }
}

function describeAction(a: ComputerAction): string {
  if (a.action === "click_element") return `click #${(a as any).index}`;
  if (a.action === "type_in_element") return `type into #${(a as any).index}: ${(a as any).text?.slice(0, 40)}`;
  if (a.action === "select_option") return `select in #${(a as any).index}: ${(a as any).value?.slice(0, 40)}`;
  if (a.action === "upload_resume") return `attach resume${(a as any).label ? ` (${(a as any).label})` : ""}`;
  if ("coordinate" in a && a.coordinate) return `${a.action} @ (${a.coordinate[0]},${a.coordinate[1]})`;
  if (a.action === "type" || a.action === "key") return `${a.action}: ${(a as any).text?.slice(0, 40)}`;
  return a.action;
}

/** Replace all but the last `keep` image blocks with a placeholder so token
 * cost stays bounded over a long application. */
function pruneOldScreenshots(messages: Array<{ role: string; content: Block[] }>, keep: number): void {
  const imageRefs: Array<{ block: Block }> = [];
  for (const m of messages) {
    if (!Array.isArray(m.content)) continue;
    for (const b of m.content) {
      if (b?.type === "image") imageRefs.push({ block: b });
      if (b?.type === "tool_result" && Array.isArray(b.content)) {
        for (const c of b.content) if (c?.type === "image") imageRefs.push({ block: c });
      }
    }
  }
  const toPrune = imageRefs.slice(0, Math.max(0, imageRefs.length - keep));
  for (const { block } of toPrune) {
    if (block.type === "image") {
      block.type = "text";
      block.text = "[earlier screenshot omitted]";
      delete block.source;
    }
  }
}
