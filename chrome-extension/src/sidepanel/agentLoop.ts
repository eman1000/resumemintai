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

import {
  agentPlan,
  fetchResume,
  fetchResumePdf,
  fetchResumes,
  logApply,
  type ResumeSummary,
} from "../lib/api";
import type {
  AgentAction,
  AgentGoal,
  AgentJobContext,
  AgentSnapshot,
  FlatResume,
} from "../types";

/** Extract a stable job identifier from a URL so we can detect drift. */
function parseGoalFromUrl(url: string): AgentGoal["pinned"] {
  try {
    const u = new URL(url);
    const params = u.searchParams;
    const jobId =
      params.get("currentJobId") ||  // LinkedIn Easy Apply
      params.get("gh_jid") ||         // Greenhouse
      params.get("jobId") ||
      params.get("job_id") ||
      // Workday / Workable embed the id in the path (…/job/<id> or …/jobs/<id>)
      u.pathname.match(/\/(?:job|jobs)\/(\d+|[a-z0-9-]+)/i)?.[1] ||
      undefined;
    return { host: u.host, jobId };
  } catch {
    return { host: "" };
  }
}

function urlHasDrifted(goal: AgentGoal, currentUrl: string): boolean {
  if (!goal.originalUrl) return false;
  if (currentUrl === goal.originalUrl) return false;
  const now = parseGoalFromUrl(currentUrl);
  if (now.host !== goal.pinned.host) return true;
  // If we pinned a job id and it now differs, that's drift to a different job.
  if (goal.pinned.jobId && now.jobId && now.jobId !== goal.pinned.jobId) return true;
  return false;
}

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
  | { kind: "drift"; from: string; to: string }
  | { kind: "done"; message?: string }
  | { kind: "error"; error: string };

export type AgentLoopOptions = {
  tabId: number;
  jobContext?: AgentJobContext;
  /** chrome.identity email — set if the user is signed in to Chrome. */
  chromeEmail?: string;
  /** Allow auto-submit when LLM confidence ≥ 0.95. Mirrors user setting. */
  autoSubmit: boolean;
  /** Send page screenshots to the planner (vision). Defaults to true. */
  sendScreenshot?: boolean;
  /** Called for every loop event so the side panel can render. */
  onEvent: (e: AgentEvent) => void;
  /** Side panel sets this to a Promise that resolves with answers when the user submits. */
  awaitAnswers: () => Promise<Record<string, string>>;
  /** Resolves when the user clicks "I've signed in, continue". */
  awaitLoginCompleted: () => Promise<void>;
  /** Resolves with the user's choice of base resume (or null to skip tailoring). */
  awaitTailorBaseChoice: () => Promise<{ baseResumeId: string } | null>;
};

const MAX_TURNS = 14;
const MAX_NO_PROGRESS_TURNS = 3;

async function captureScreenshot(): Promise<string | undefined> {
  try {
    // captureVisibleTab returns "data:image/png;base64,...." — strip the prefix.
    // chrome.tabs.captureVisibleTab in MV3 returns a Promise when no callback
    // is given. The type signature is fussy about the first arg, so call the
    // single-arg form to capture the currently-focused window.
    const dataUrl = (await (chrome.tabs as any).captureVisibleTab({
      format: "png",
    })) as string | undefined;
    return dataUrl?.replace(/^data:image\/png;base64,/, "") || undefined;
  } catch {
    return undefined;
  }
}

async function getCurrentTabUrl(tabId: number): Promise<string> {
  try {
    const tab = await chrome.tabs.get(tabId);
    return tab.url || "";
  } catch {
    return "";
  }
}

/** All frames in the tab that have our content script (top + ATS iframes). */
async function listFrames(tabId: number): Promise<number[]> {
  try {
    const frames = await chrome.webNavigation.getAllFrames({ tabId });
    return (frames || [])
      .filter((f) => /^https?:/.test(f.url))
      .map((f) => f.frameId);
  } catch {
    return [0];
  }
}

/** Inject the content script on demand. Needed when the tab was already open
 * before the extension was installed/updated — Chrome only auto-injects at
 * page load, so an existing tab has no listener until refresh. We read the
 * script files from the manifest so this stays correct across builds. */
async function injectContentScript(tabId: number): Promise<void> {
  try {
    const files = chrome.runtime.getManifest().content_scripts?.[0]?.js || [];
    if (!files.length) return;
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files,
    });
    // Give the script a beat to register its message listener.
    await new Promise((r) => setTimeout(r, 300));
  } catch {
    // Page not in host_permissions (unsupported site) — caller reports it.
  }
}

async function collectFrameSnapshots(
  tabId: number,
): Promise<Array<{ frameId: number; snapshot: AgentSnapshot }>> {
  const frameIds = await listFrames(tabId);
  const snaps: Array<{ frameId: number; snapshot: AgentSnapshot }> = [];
  for (const frameId of frameIds) {
    try {
      const resp = (await chrome.tabs.sendMessage(
        tabId,
        { type: "AGENT_SNAPSHOT" },
        { frameId },
      )) as { ok: boolean; snapshot?: AgentSnapshot; error?: string } | undefined;
      if (resp?.ok && resp.snapshot) snaps.push({ frameId, snapshot: resp.snapshot });
    } catch {
      // Frame without our content script (cross-origin we lack permission
      // for, about:blank, etc.) — skip.
    }
  }
  return snaps;
}

/** Snapshot every reachable frame and merge: the frame with the most fields
 * is usually the application form (Greenhouse embed, Workday iframe). Fields
 * carry their frameId so actions route back to the right frame (G4). */
async function snapshotTab(
  tabId: number,
): Promise<AgentSnapshot & { __frameId: number }> {
  let snaps = await collectFrameSnapshots(tabId);
  if (!snaps.length) {
    // Self-heal: the tab probably predates the extension load — inject the
    // content script now and retry once.
    await injectContentScript(tabId);
    snaps = await collectFrameSnapshots(tabId);
  }
  if (!snaps.length) {
    throw new Error(
      "Could not read this page. Refresh the job page tab and try again — and make sure it's a supported job site (Greenhouse, Lever, Ashby, Workable, LinkedIn Jobs, Indeed, Workday).",
    );
  }

  // Primary frame = the one with the most form fields (top frame wins ties).
  snaps.sort(
    (a, b) =>
      b.snapshot.fields.length +
      (b.snapshot.fileFields?.length || 0) * 2 -
      (a.snapshot.fields.length + (a.snapshot.fileFields?.length || 0) * 2),
  );
  const primary = snaps[0];
  const top = snaps.find((s) => s.frameId === 0) || primary;

  // Merge: primary frame's form + top frame's url/title/context.
  const merged: AgentSnapshot & { __frameId: number } = {
    ...primary.snapshot,
    url: top.snapshot.url,
    title: top.snapshot.title,
    bodyText: primary.snapshot.bodyText || top.snapshot.bodyText,
    fields: primary.snapshot.fields.map((f) => ({ ...f, frameId: primary.frameId })),
    fileFields: primary.snapshot.fileFields?.map((f) => ({
      ...f,
      frameId: primary.frameId,
    })),
    buttons: [
      ...primary.snapshot.buttons.map((b) => ({ ...b, frameId: primary.frameId })),
      // Keep top-frame buttons too (e.g. cookie banners are top-frame).
      ...(primary.frameId !== 0
        ? top.snapshot.buttons.slice(0, 10).map((b) => ({ ...b, frameId: 0 }))
        : []),
    ],
    __frameId: primary.frameId,
  };
  return merged;
}

async function executeOnTab(
  tabId: number,
  action: AgentAction,
  frameId = 0,
  filePayload?: { base64: string; filename: string },
): Promise<{ ok: boolean; note?: string }> {
  try {
    const resp = (await chrome.tabs.sendMessage(
      tabId,
      { type: "AGENT_EXECUTE", action, filePayload },
      { frameId },
    )) as { ok: boolean; note?: string } | undefined;
    return resp || { ok: false, note: "no response" };
  } catch (e: any) {
    return { ok: false, note: e?.message || "frame unreachable" };
  }
}

/** Route an action to the frame that owns its target field. */
function frameForAction(
  action: AgentAction,
  snapshot: AgentSnapshot & { __frameId: number },
): number {
  const fieldId =
    (action as any).fieldId ||
    ((action as any).fields ? Object.keys((action as any).fields)[0] : undefined) ||
    (action as any).toFieldId;
  if (fieldId) {
    const f =
      snapshot.fields.find((x) => x.id === fieldId) ||
      snapshot.fileFields?.find((x) => x.id === fieldId);
    if (f?.frameId !== undefined) return f.frameId;
  }
  if (action.type === "click") {
    const label = action.selector.startsWith("text:")
      ? action.selector.slice(5).trim().toLowerCase()
      : action.selector;
    const b = snapshot.buttons.find(
      (x) => x.text.trim().toLowerCase() === label || x.id === action.selector,
    );
    if (b?.frameId !== undefined) return b.frameId;
  }
  return snapshot.__frameId;
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

  // GOAL ANCHOR — capture once at start. Used every turn to detect drift.
  const startUrl = await getCurrentTabUrl(opts.tabId);
  const startSnapshot = await snapshotTab(opts.tabId).catch(() => null);
  const goal: AgentGoal = {
    originalUrl: startUrl,
    originalTitle: startSnapshot?.title || opts.jobContext?.title || "",
    pinned: parseGoalFromUrl(startUrl),
  };

  // Track progress to break out of stuck loops.
  let noProgressStreak = 0;
  let lastSignature = "";

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    opts.onEvent({ kind: "thinking" });

    // Drift check BEFORE taking another action.
    const currentUrl = await getCurrentTabUrl(opts.tabId);
    let drift: { from: string; to: string } | undefined;
    if (urlHasDrifted(goal, currentUrl)) {
      drift = { from: goal.originalUrl, to: currentUrl };
      opts.onEvent({ kind: "drift", from: drift.from, to: drift.to });
      // Try to recover: navigate back to the goal URL once. If we drift again
      // after that, give up rather than fight the page.
      const alreadyTriedRecover = history.some((h) => h.note === "drifted_back");
      if (!alreadyTriedRecover) {
        try {
          await chrome.tabs.update(opts.tabId, { url: goal.originalUrl });
          // Give the page a moment to load.
          await new Promise((r) => setTimeout(r, 1200));
          history.push({
            action: { type: "click", selector: "back-to-goal", reason: "url drifted" },
            result: "success",
            note: "drifted_back",
          });
          continue;
        } catch {
          // fall through to a hard stop
        }
      }
      opts.onEvent({
        kind: "done",
        message: `Tab navigated away from the original job (${new URL(goal.originalUrl).pathname} → ${new URL(currentUrl).pathname}). Stopping to avoid applying to the wrong job.`,
      });
      return;
    }

    let snapshot: AgentSnapshot & { __frameId: number };
    try {
      snapshot = await snapshotTab(opts.tabId);
      opts.onEvent({ kind: "snapshot", snapshot });
    } catch (e: any) {
      opts.onEvent({ kind: "error", error: e?.message || "snapshot_failed" });
      return;
    }

    // No-progress detection: if the snapshot's "signature" (fields + filled
    // count + url) hasn't changed for several turns, we're stuck. Includes
    // checkbox state, file attachment, and scroll position so the new action
    // types register as progress.
    const signature = JSON.stringify({
      url: currentUrl,
      fieldIds: snapshot.fields.map((f) => f.id).sort(),
      filled: snapshot.fields.filter((f) => f.currentValue).length,
      checked: snapshot.fields.filter((f) => f.checked).length,
      files: (snapshot.fileFields || []).filter((f) => f.currentFile).length,
      scrollY: snapshot.scroll?.y ?? 0,
    });
    if (signature === lastSignature) {
      noProgressStreak++;
    } else {
      noProgressStreak = 0;
      lastSignature = signature;
    }
    if (noProgressStreak >= MAX_NO_PROGRESS_TURNS) {
      opts.onEvent({
        kind: "done",
        message: `Stuck after ${noProgressStreak} turns with no page change. Review the form and continue manually.`,
      });
      return;
    }

    // Vision: capture a screenshot of the visible tab so a vision-aware
    // planner (Claude Sonnet) can see what the user sees. Best-effort.
    // Privacy setting can disable it (G12) — the planner falls back to DOM.
    const screenshot =
      opts.sendScreenshot === false ? undefined : await captureScreenshot();

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
        goal,
        drift,
        history,
        userAnswers,
        resume,
        resumes,
        screenshot,
      });
    } catch (e: any) {
      opts.onEvent({ kind: "error", error: e?.message || "agent_plan_failed" });
      return;
    }

    const { action, confidence, reasoning } = plan;
    opts.onEvent({ kind: "action", action, reasoning, confidence });

    /** Execute one page action, routing to its frame and fetching the PDF
     * payload for upload_resume. Shared by the single-action path and the
     * batched-actions path. */
    const execPageAction = async (
      a: AgentAction,
    ): Promise<{ ok: boolean; note?: string }> => {
      const frameId = frameForAction(a, snapshot);
      if (a.type === "upload_resume") {
        try {
          const pdf = await fetchResumePdf(a.resumeId || selectedResumeId);
          return await executeOnTab(opts.tabId, a, frameId, pdf);
        } catch (e: any) {
          return { ok: false, note: e?.message || "resume_pdf_failed" };
        }
      }
      return await executeOnTab(opts.tabId, a, frameId);
    };

    /** Log the completed application to the user's tracker (G11). */
    const logCompletion = async () => {
      try {
        const ats = snapshot.ats || parseGoalFromUrl(goal.originalUrl).host || "unknown";
        await logApply({
          ats: String(ats),
          jobUrl: goal.originalUrl,
          jobSnapshot: {
            title: opts.jobContext?.title || goal.originalTitle,
            company: opts.jobContext?.company,
          },
        });
      } catch {
        // Non-fatal — tracking only.
      }
    };

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
        const result = await executeOnTab(opts.tabId, action, snapshot.__frameId);
        opts.onEvent({ kind: "executed", ...result });
        if (result.ok) await logCompletion();
        opts.onEvent({ kind: "done", message: result.ok ? "Submitted." : "Submit failed — please click manually." });
        return;
      }
      case "done": {
        // If the page looks submitted, log the application (G11).
        if (snapshot.pageType === "post_submit") await logCompletion();
        opts.onEvent({ kind: "done", message: action.message });
        history.push({ action, result: "success" });
        return;
      }
      case "fill":
      case "click":
      case "upload_resume":
      case "set_checkbox":
      case "select_option":
      case "scroll":
      case "click_at":
      case "type_text":
      case "press_key": {
        const result = await execPageAction(action);
        opts.onEvent({ kind: "executed", ...result });
        history.push({ action, result: result.ok ? "success" : "failed", note: result.note });

        // BATCHED follow-ups (v0.5): execute same-step actions in order,
        // stopping at the first failure so the planner can reassess.
        for (const followUp of plan.actions || []) {
          const r = await execPageAction(followUp);
          opts.onEvent({ kind: "executed", ...r });
          history.push({
            action: followUp,
            result: r.ok ? "success" : "failed",
            note: r.note,
          });
          if (!r.ok) break;
        }
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
