// Drives the multi-turn agent loop from the side panel.
//
// Each turn:
//   1. Ask the content script for a fresh DOM snapshot.
//   2. Send snapshot + history + user answers to /api/extension/agent.
//   3. Inspect the returned action:
//      - fill/click/submit/use_google_signin → ask the content script to execute it.
//      - ask_user → pause and surface a question form; resume when answered.
//      - needs_login → pause and surface a "sign in" message; resume on user click.
//      - select_resume → tell the server to swap which resume the agent picks from
//        (just stored locally; resume itself is fetched fresh next turn).
//      - tailor → call /api/jobs/tailored-kit and refresh the resume before the next turn.
//      - done → exit.
//   4. Loop until done, ask_user, needs_login, or hard error.

import { agentPlan, fetchResume, fetchResumes, type ResumeSummary } from "../lib/api";
import type {
  AgentAction,
  AgentJobContext,
  AgentSnapshot,
  FlatResume,
} from "../types";

export type AgentEvent =
  | { kind: "thinking" }
  | { kind: "snapshot"; snapshot: AgentSnapshot }
  | { kind: "action"; action: AgentAction; reasoning?: string; confidence: number }
  | { kind: "executed"; ok: boolean; note?: string }
  | { kind: "ask_user"; questions: Extract<AgentAction, { type: "ask_user" }>["questions"] }
  | { kind: "needs_login"; providers: string[]; message?: string; suggestGoogle?: boolean }
  | { kind: "ask_tailor_base"; resumes: ResumeSummary[]; suggestedId?: string }
  | { kind: "resume_selected"; resumeId: string; reason?: string }
  | { kind: "tailoring" }
  | { kind: "done"; message?: string }
  | { kind: "error"; error: string };

export type AgentLoopOptions = {
  tabId: number;
  jobContext?: AgentJobContext;
  /** chrome.identity email — set if the user is signed in to Chrome. */
  chromeEmail?: string;
  /** Allow auto-submit when LLM confidence ≥ 0.95. Mirrors user setting. */
  autoSubmit: boolean;
  /** Called for every loop event so the side panel can render. */
  onEvent: (e: AgentEvent) => void;
  /** Side panel sets this to a Promise that resolves with answers when the user submits. */
  awaitAnswers: () => Promise<Record<string, string>>;
  /** Resolves when the user clicks "I've signed in, continue". */
  awaitLoginCompleted: () => Promise<void>;
  /** Resolves with the user's choice of base resume (or null to skip tailoring). */
  awaitTailorBaseChoice: () => Promise<{ baseResumeId: string } | null>;
};

const MAX_TURNS = 12;

async function snapshotTab(tabId: number): Promise<AgentSnapshot> {
  const resp = (await chrome.tabs.sendMessage(tabId, { type: "AGENT_SNAPSHOT" })) as
    | { ok: boolean; snapshot?: AgentSnapshot; error?: string }
    | undefined;
  if (!resp?.ok || !resp.snapshot) {
    throw new Error(resp?.error || "snapshot_failed");
  }
  return resp.snapshot;
}

async function executeOnTab(
  tabId: number,
  action: AgentAction,
): Promise<{ ok: boolean; note?: string }> {
  const resp = (await chrome.tabs.sendMessage(tabId, {
    type: "AGENT_EXECUTE",
    action,
  })) as { ok: boolean; note?: string } | undefined;
  return resp || { ok: false, note: "no response" };
}

async function tailorNow(
  jobContext: AgentJobContext | undefined,
  baseResumeId: string,
): Promise<void> {
  // Calls the existing /api/jobs/tailored-kit endpoint. Side panel can
  // continue once it returns. Token-aware fetch lives in api.ts.
  const { agentTailorPassThrough } = await import("./agentTailor");
  await agentTailorPassThrough(jobContext, baseResumeId);
}

export async function runAgentLoop(opts: AgentLoopOptions): Promise<void> {
  const history: Array<{ action: AgentAction; result?: "success" | "failed" | "skipped"; note?: string }> = [];
  const userAnswers: Record<string, string> = {};
  let selectedResumeId: string | undefined;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    opts.onEvent({ kind: "thinking" });

    let snapshot: AgentSnapshot;
    try {
      snapshot = await snapshotTab(opts.tabId);
      opts.onEvent({ kind: "snapshot", snapshot });
    } catch (e: any) {
      opts.onEvent({ kind: "error", error: e?.message || "snapshot_failed" });
      return;
    }

    // Fetch the resume + resumes list each turn. Both are cached on the
    // server side so this is cheap; we re-read in case a previous "tailor"
    // action created a new resume the agent should now prefer.
    let resume: FlatResume | null = null;
    let resumes: ResumeSummary[] = [];
    try {
      [resume, resumes] = await Promise.all([fetchResume(), fetchResumes()]);
    } catch (e: any) {
      opts.onEvent({ kind: "error", error: e?.message || "resume_fetch_failed" });
      return;
    }
    if (!resume) {
      opts.onEvent({ kind: "error", error: "no_resume" });
      return;
    }

    let plan;
    try {
      plan = await agentPlan({
        snapshot,
        jobContext: opts.jobContext,
        history,
        userAnswers,
        resume,
        resumes,
      });
    } catch (e: any) {
      opts.onEvent({ kind: "error", error: e?.message || "agent_plan_failed" });
      return;
    }

    const { action, confidence, reasoning } = plan;
    opts.onEvent({ kind: "action", action, reasoning, confidence });

    switch (action.type) {
      case "ask_user": {
        opts.onEvent({ kind: "ask_user", questions: action.questions });
        const answers = await opts.awaitAnswers();
        Object.assign(userAnswers, answers);
        history.push({ action, result: "success", note: `answered ${Object.keys(answers).length}` });
        break;
      }
      case "needs_login": {
        const suggestGoogle =
          !!opts.chromeEmail &&
          /@gmail\.com$/i.test(resume?.email || "") &&
          (action.providers || []).map((s) => s.toLowerCase()).includes("google");
        opts.onEvent({
          kind: "needs_login",
          providers: action.providers,
          message: action.message,
          suggestGoogle,
        });
        await opts.awaitLoginCompleted();
        history.push({ action, result: "success", note: "user signed in" });
        break;
      }
      case "use_google_signin": {
        const result = await executeOnTab(opts.tabId, action);
        opts.onEvent({ kind: "executed", ...result });
        history.push({ action, result: result.ok ? "success" : "failed", note: result.note });
        break;
      }
      case "select_resume": {
        selectedResumeId = action.resumeId;
        opts.onEvent({ kind: "resume_selected", resumeId: action.resumeId, reason: action.reason });
        history.push({ action, result: "success" });
        break;
      }
      case "tailor": {
        // Always ask the user which resume to use as the base — never silently
        // tailor on their behalf. The agent's baseResumeId is just a suggestion.
        opts.onEvent({
          kind: "ask_tailor_base",
          resumes,
          suggestedId: action.baseResumeId,
        });
        const choice = await opts.awaitTailorBaseChoice();
        if (!choice) {
          // User cancelled or has no base resume — stop the loop.
          opts.onEvent({
            kind: "done",
            message:
              resumes.length === 0
                ? "Create a resume at resumemintai.com first, then run the agent again."
                : "Tailoring skipped. Form filled with current resume.",
          });
          history.push({ action, result: "skipped", note: "no base resume chosen" });
          return;
        }
        opts.onEvent({ kind: "tailoring" });
        try {
          await tailorNow(opts.jobContext, choice.baseResumeId);
          history.push({ action, result: "success", note: "tailored kit created" });
        } catch (e: any) {
          history.push({ action, result: "failed", note: e?.message });
          opts.onEvent({ kind: "error", error: e?.message || "tailor_failed" });
          return;
        }
        break;
      }
      case "submit": {
        if (!opts.autoSubmit || confidence < 0.95) {
          // Auto-submit not enabled OR confidence too low — stop and let user click.
          opts.onEvent({
            kind: "done",
            message: opts.autoSubmit
              ? `Confidence ${(confidence * 100).toFixed(0)}% < 95% — review and click Submit.`
              : "Form filled — review and click Submit.",
          });
          history.push({ action, result: "skipped", note: "auto-submit blocked" });
          return;
        }
        const result = await executeOnTab(opts.tabId, action);
        opts.onEvent({ kind: "executed", ...result });
        opts.onEvent({ kind: "done", message: result.ok ? "Submitted." : "Submit failed — please click manually." });
        return;
      }
      case "done": {
        opts.onEvent({ kind: "done", message: action.message });
        history.push({ action, result: "success" });
        return;
      }
      case "fill":
      case "click": {
        const result = await executeOnTab(opts.tabId, action);
        opts.onEvent({ kind: "executed", ...result });
        history.push({ action, result: result.ok ? "success" : "failed", note: result.note });
        break;
      }
    }
  }

  opts.onEvent({
    kind: "done",
    message: `Stopped after ${MAX_TURNS} turns. Review the form and submit manually.`,
  });
}

// Re-export so the side panel can mention the selected resume.
export type { ResumeSummary };
export { selectedResumeIdFromState };

function selectedResumeIdFromState(_resumes: ResumeSummary[], selectedId?: string): string | undefined {
  return selectedId;
}
