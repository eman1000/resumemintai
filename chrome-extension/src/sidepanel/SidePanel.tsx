import { useEffect, useRef, useState } from "react";
import type { StoredAuth, FlatResume, AgentAction } from "../types";
import { STORAGE_KEYS } from "../types";
import { openConnectFlow, getSettings, setSettings } from "../lib/auth";
import { runAgentLoop, type AgentEvent } from "./agentLoop";
import { runComputerLoop, type ComputerEvent } from "./computerLoop";
import {
  fetchResume,
  fetchProfile,
  saveProfileFields,
  generateCoverLetter,
  fetchLatestVersion,
  tailorForJob,
  apiBaseUrl,
  fetchResumes,
  fetchCoverLetters,
  type ProfileField,
  type ApplicantProfile,
} from "../lib/api";
import type { ResumeSummary } from "../lib/api";

const COLORS = {
  brand: "#2a72d7",
  brandDeep: "#0a2d50",
  mint: "#00b67a",
  ink: "#1d1d20",
  meta: "#52525a",
  pillBg: "#eaf3fc",
  border: "#e5e7eb",
  line: "#e5e7eb",
};

/** a < b ? true. Plain numeric semver compare ("0.6.0" vs "0.7.0"). */
function versionLt(a: string, b: string): boolean {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x !== y) return x < y;
  }
  return false;
}

function fmtElapsed(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

const linkBtnStyle: React.CSSProperties = {
  background: "transparent",
  color: COLORS.meta,
  border: "none",
  cursor: "pointer",
  fontSize: 11,
  textDecoration: "underline",
  padding: 0,
};

type ActiveTab = { url: string; title: string; id?: number } | null;

export default function SidePanel() {
  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const [resume, setResume] = useState<FlatResume | null>(null);
  const [autoSubmit, setAutoSubmit] = useState(false);
  const [sendScreenshot, setSendScreenshot] = useState(true);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>(null);
  const [filling, setFilling] = useState(false);
  const [fillResult, setFillResult] = useState<string | null>(null);

  // Agent state
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentLog, setAgentLog] = useState<AgentEvent[]>([]);
  const [elapsed, setElapsed] = useState(0); // seconds, while a run is active
  const [chatInput, setChatInput] = useState("");
  const userMsgQueueRef = useRef<string[]>([]);
  const userMsgWaiterRef = useRef<(() => void) | null>(null);
  // Applicant profile (remembered screening answers)
  const [profile, setProfile] = useState<ApplicantProfile | null>(null);
  const [profileFields, setProfileFields] = useState<ProfileField[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverText, setCoverText] = useState<string>("");
  const [coverPdf, setCoverPdf] = useState<string>("");
  const [tailorBusy, setTailorBusy] = useState(false);
  const [tab, setTab] = useState<"apply" | "resumes" | "covers">("apply");

  // Tailor a resume to the current job (without applying) → opens the new copy.
  async function tailorResumeForJob() {
    if (!activeTab?.id || tailorBusy) return;
    setTailorBusy(true);
    try {
      let pageText = "";
      try {
        const [r] = await chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          func: () => (document.body?.innerText || "").slice(0, 8000),
        });
        pageText = (r?.result as string) || "";
      } catch { /* fall back to title only */ }
      const { resumeId } = await tailorForJob({
        title: activeTab.title || "",
        description: pageText,
        source: activeTab.url,
      });
      chrome.tabs.create({ url: `${apiBaseUrl()}/builder/${resumeId}/edit` });
    } catch (e: any) {
      setAgentLog((prev) => [...prev, { kind: "text", text: `Couldn't tailor: ${e?.message || e}` } as unknown as AgentEvent]);
    } finally {
      setTailorBusy(false);
    }
  }
  const [outdated, setOutdated] = useState<{ installed: string; latest: string } | null>(null);

  // Block a stale extension: if a newer version has been published, this build
  // must be removed and reinstalled (endpoints/agent protocol move with it).
  useEffect(() => {
    (async () => {
      try {
        const installed = chrome.runtime.getManifest().version;
        const latest = await fetchLatestVersion();
        if (latest && versionLt(installed, latest)) setOutdated({ installed, latest });
      } catch { /* ignore — don't block on a check failure */ }
    })();
  }, []);
  const [pendingQuestions, setPendingQuestions] =
    useState<Extract<AgentAction, { type: "ask_user" }>["questions"] | null>(null);
  const [pendingLogin, setPendingLogin] = useState<{ providers: string[]; message?: string; suggestGoogle?: boolean } | null>(null);
  const [pendingTailorChoice, setPendingTailorChoice] =
    useState<{ resumes: ResumeSummary[]; suggestedId?: string } | null>(null);
  const answersResolverRef = useRef<((a: Record<string, string>) => void) | null>(null);
  const loginResolverRef = useRef<(() => void) | null>(null);
  const tailorChoiceResolverRef = useRef<((c: { baseResumeId: string } | null) => void) | null>(null);

  useEffect(() => {
    (async () => {
      const out = await chrome.storage.local.get([STORAGE_KEYS.AUTH, STORAGE_KEYS.RESUME]);
      setAuth((out[STORAGE_KEYS.AUTH] as StoredAuth) ?? null);
      setResume((out[STORAGE_KEYS.RESUME] as FlatResume) ?? null);
      const s = await getSettings();
      setAutoSubmit(s.autoSubmit);
      setSendScreenshot(s.sendScreenshot !== false);
      setLoading(false);
      readActiveTab();
      // Load the applicant profile (remembered screening answers). Prompt the
      // user to fill it on first use (when it's empty).
      if (out[STORAGE_KEYS.AUTH]) {
        try {
          const { profile: p, fields } = await fetchProfile();
          setProfile(p);
          setProfileFields(fields);
          const empty = !p?.fields || Object.keys(p.fields).filter((k) => p.fields[k]).length === 0;
          if (empty) setProfileOpen(true);
        } catch {}
      }
    })();

    const storageListener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== "local") return;
      if (changes[STORAGE_KEYS.AUTH]) setAuth(changes[STORAGE_KEYS.AUTH].newValue ?? null);
      if (changes[STORAGE_KEYS.RESUME]) setResume(changes[STORAGE_KEYS.RESUME].newValue ?? null);
    };
    chrome.storage.onChanged.addListener(storageListener);

    // Re-read active tab when the user switches tabs.
    const tabListener = () => readActiveTab();
    chrome.tabs.onActivated.addListener(tabListener as any);
    chrome.tabs.onUpdated.addListener(tabListener as any);

    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
      chrome.tabs.onActivated.removeListener(tabListener as any);
      chrome.tabs.onUpdated.removeListener(tabListener as any);
    };
  }, []);

  async function readActiveTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      setActiveTab(tab?.url ? { url: tab.url, title: tab.title || "", id: tab.id } : null);
    } catch {
      setActiveTab(null);
    }
  }

  const ats = detectAtsFromUrl(activeTab?.url || "");

  async function fillCurrent() {
    if (!activeTab?.id) return;
    setFilling(true);
    setFillResult(null);
    try {
      // Tell the active tab's content script to run the filler.
      const resp = await chrome.tabs.sendMessage(activeTab.id, { type: "FILL_FORM" });
      if (resp?.ok) {
        setFillResult(`Filled ${resp.filled} field${resp.filled === 1 ? "" : "s"}.`);
      } else {
        setFillResult(`Couldn't fill: ${resp?.error || "unknown error"}`);
      }
    } catch (e: any) {
      setFillResult(`Couldn't fill: ${e?.message || e}`);
    } finally {
      setFilling(false);
    }
  }

  async function runAgent() {
    if (!activeTab?.id) return;
    setAgentRunning(true);
    setAgentLog([]);
    setPendingQuestions(null);
    setPendingLogin(null);

    // Get the Chrome-signed-in email (used to detect Google sign-in flow).
    let chromeEmail = "";
    try {
      const info = (await chrome.runtime.sendMessage({ type: "GET_CHROME_IDENTITY" })) as
        | { email?: string }
        | undefined;
      chromeEmail = info?.email || "";
    } catch {}

    try {
      await runAgentLoop({
        tabId: activeTab.id,
        autoSubmit,
        sendScreenshot,
        chromeEmail,
        jobContext: { sourceUrl: activeTab.url, title: activeTab.title },
        onEvent: (e) => setAgentLog((prev) => [...prev, e]),
        awaitAnswers: () =>
          new Promise<Record<string, string>>((resolve) => {
            answersResolverRef.current = resolve;
          }),
        awaitLoginCompleted: () =>
          new Promise<void>((resolve) => {
            loginResolverRef.current = resolve;
          }),
        awaitTailorBaseChoice: () =>
          new Promise<{ baseResumeId: string } | null>((resolve) => {
            tailorChoiceResolverRef.current = resolve;
          }),
      });
    } finally {
      setAgentRunning(false);
    }
  }

  // ---- Computer-use (CDP trusted input) agent --------------------------
  const submitConfirmResolverRef = useRef<((go: boolean | { redirect: string }) => void) | null>(null);
  const [pendingSubmit, setPendingSubmit] = useState<{ summary: string; confidence?: number } | null>(null);
  const [debuggerBanner, setDebuggerBanner] = useState(false);
  const uploadChoiceResolverRef = useRef<((c: "tailor" | "existing") => void) | null>(null);
  const [pendingUpload, setPendingUpload] = useState(false);

  async function runComputerAgent() {
    if (!activeTab?.id) return;
    setAgentRunning(true);
    setAgentLog([]);
    setPendingQuestions(null);
    setPendingLogin(null);
    setPendingSubmit(null);
    setPendingUpload(false);
    userMsgQueueRef.current = [];

    let resume: Record<string, any> = {};
    try {
      resume = (await fetchResume()) || {};
    } catch {}

    try {
      await runComputerLoop({
        tabId: activeTab.id,
        autoSubmit,
        selectedResumeId: undefined,
        resume,
        jobContext: { sourceUrl: activeTab.url, title: activeTab.title },
        onEvent: (e) => setAgentLog((prev) => [...prev, e as unknown as AgentEvent]),
        awaitAnswers: () =>
          new Promise<Record<string, string>>((resolve) => {
            answersResolverRef.current = resolve;
          }),
        awaitLoginCompleted: () =>
          new Promise<void>((resolve) => {
            loginResolverRef.current = resolve;
          }),
        awaitSubmitConfirm: () =>
          new Promise<boolean | { redirect: string }>((resolve) => {
            submitConfirmResolverRef.current = resolve;
          }),
        drainUserMessages: () => {
          const msgs = userMsgQueueRef.current;
          userMsgQueueRef.current = [];
          return msgs;
        },
        awaitUserMessage: () =>
          new Promise<void>((resolve) => {
            userMsgWaiterRef.current = resolve;
          }),
        awaitUploadChoice: () =>
          new Promise<"tailor" | "existing">((resolve) => {
            uploadChoiceResolverRef.current = resolve;
          }),
      });
    } finally {
      setAgentRunning(false);
      setDebuggerBanner(false);
    }
  }

  function confirmSubmit(go: boolean) {
    setPendingSubmit(null);
    const r = submitConfirmResolverRef.current;
    submitConfirmResolverRef.current = null;
    r?.(go);
  }

  function chooseUpload(choice: "tailor" | "existing") {
    setPendingUpload(false);
    const r = uploadChoiceResolverRef.current;
    uploadChoiceResolverRef.current = null;
    r?.(choice);
  }

  // Elapsed-time ticker while the agent runs.
  useEffect(() => {
    if (!agentRunning) return;
    setElapsed(0);
    const started = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, [agentRunning]);

  function sendChat() {
    const t = chatInput.trim();
    if (!t) return;
    // Optimistically show it in the log immediately.
    setAgentLog((prev) => [...prev, { kind: "user_said", text: t } as unknown as AgentEvent]);
    setChatInput("");
    // If we're at the submit gate, a typed message is an instruction to act on
    // (e.g. "generate a cover letter") — redirect the agent instead of stopping.
    if (pendingSubmit && submitConfirmResolverRef.current) {
      setPendingSubmit(null);
      const r = submitConfirmResolverRef.current;
      submitConfirmResolverRef.current = null;
      r({ redirect: t });
      return;
    }
    userMsgQueueRef.current.push(t);
    // Wake the loop if it's paused (needs_login / ask_user) so a chat message
    // can redirect it instead of being stuck behind a pause button.
    const w = userMsgWaiterRef.current;
    userMsgWaiterRef.current = null;
    w?.();
  }

  function submitAnswers(answers: Record<string, string>) {
    setPendingQuestions(null);
    const r = answersResolverRef.current;
    answersResolverRef.current = null;
    r?.(answers);
  }

  function continueAfterLogin() {
    setPendingLogin(null);
    const r = loginResolverRef.current;
    loginResolverRef.current = null;
    r?.();
  }

  function chooseTailorBase(baseResumeId: string | null) {
    setPendingTailorChoice(null);
    const r = tailorChoiceResolverRef.current;
    tailorChoiceResolverRef.current = null;
    r?.(baseResumeId ? { baseResumeId } : null);
  }

  async function clickGoogleSignIn() {
    if (!activeTab?.id) return;
    try {
      await chrome.tabs.sendMessage(activeTab.id, { type: "AGENT_CLICK_GOOGLE_SIGNIN" });
    } catch {}
    // Don't auto-continue — let the user complete the sign-in then click "I'm in".
  }

  // React to ask_user / needs_login / ask_tailor_base / computer-use events.
  useEffect(() => {
    const last = agentLog[agentLog.length - 1] as AgentEvent | ComputerEvent | undefined;
    if (!last) return;
    if (last.kind === "ask_user") setPendingQuestions(last.questions as any);
    if (last.kind === "needs_login")
      setPendingLogin({
        providers: (last as any).providers || [],
        message: last.message,
        suggestGoogle: (last as any).suggestGoogle,
      });
    if (last.kind === "ask_tailor_base")
      setPendingTailorChoice({ resumes: (last as any).resumes, suggestedId: (last as any).suggestedId });
    // Computer-use specific:
    if (last.kind === "confirm_submit")
      setPendingSubmit({ summary: (last as any).summary, confidence: (last as any).confidence });
    if (last.kind === "confirm_upload") setPendingUpload(true);
    if (last.kind === "banner") setDebuggerBanner((last as any).on);
  }, [agentLog]);

  async function refreshResume() {
    setLoading(true);
    const out = await chrome.runtime.sendMessage({ type: "GET_RESUME" });
    setResume(out?.resume ?? null);
    setLoading(false);
  }

  async function signOut() {
    await chrome.runtime.sendMessage({ type: "SIGN_OUT" });
    setAuth(null);
    setResume(null);
  }

  if (outdated) {
    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24, color: COLORS.ink, background: "#fafbfd" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⬆️</div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Update required</div>
        <div style={{ fontSize: 13, color: COLORS.meta, lineHeight: 1.6, maxWidth: 320, marginBottom: 16 }}>
          A new version of ResumeMint Apply (v{outdated.latest}) has been released — your installed
          version (v{outdated.installed}) is out of date and has been disabled. Please <b>remove this
          extension</b> from <code>chrome://extensions</code> and install the latest build.
        </div>
        <a
          href="https://www.resumemintai.com/extension/install"
          target="_blank"
          rel="noreferrer"
          style={{ background: COLORS.brand, color: "#fff", textDecoration: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 600, fontSize: 13 }}
        >
          Get the latest version
        </a>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", color: COLORS.ink, background: "#fafbfd" }}>
      {/* Header */}
      <header style={{ padding: "14px 16px", background: "white", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: COLORS.brand,
            color: "white",
            display: "grid",
            placeItems: "center",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          RM
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>ResumeMint Apply</div>
          <div style={{ fontSize: 11, color: COLORS.meta, marginTop: 1 }}>
            {auth ? auth.user.email : "Not signed in"}
          </div>
        </div>
      </header>

      <main style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        {loading ? (
          <div style={{ color: COLORS.meta, fontSize: 12 }}>Loading…</div>
        ) : !auth ? (
          <Section title="Sign in">
            <p style={{ fontSize: 13, color: COLORS.meta, lineHeight: 1.55, margin: "0 0 12px" }}>
              Pair the extension with your ResumeMint account once, then auto-fill any supported job
              application form from your saved resume.
            </p>
            <PrimaryButton onClick={openConnectFlow}>Sign in to ResumeMint</PrimaryButton>
          </Section>
        ) : (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {([["apply", "Apply"], ["resumes", "Resumes"], ["covers", "Cover letters"]] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  style={{
                    flex: 1, padding: "7px 6px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    borderRadius: 8, border: `1px solid ${tab === k ? COLORS.brand : COLORS.border}`,
                    background: tab === k ? COLORS.brand : "white", color: tab === k ? "white" : COLORS.ink,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "resumes" && (
              <DocTable kind="resumes" baseUrl={apiBaseUrl()} load={fetchResumes} />
            )}
            {tab === "covers" && (
              <DocTable kind="covers" baseUrl={apiBaseUrl()} load={fetchCoverLetters} />
            )}

            {tab === "apply" && (
            <>
            <Section title="Current page">
              {activeTab ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {activeTab.title || activeTab.url}
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.meta, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {activeTab.url}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                    <Badge color={ats ? COLORS.mint : COLORS.meta}>
                      {ats ? `Detected: ${ats}` : "Generic form (AI)"}
                    </Badge>
                  </div>
                  <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                    <PrimaryButton onClick={runComputerAgent} disabled={agentRunning || filling}>
                      {agentRunning ? "Agent running…" : "Apply with AI (any site)"}
                    </PrimaryButton>
                  </div>
                  {debuggerBanner && (
                    <div style={{ marginTop: 8, fontSize: 11, color: COLORS.meta, lineHeight: 1.4 }}>
                      Chrome shows a “ResumeMint Apply is debugging this browser” bar while the
                      agent controls the page — that’s expected and disappears when it finishes.
                    </div>
                  )}
                  <div style={{ marginTop: 8, display: "flex", gap: 12 }}>
                    <button
                      onClick={runAgent}
                      disabled={filling || agentRunning}
                      style={linkBtnStyle}
                    >
                      Form-fill mode (DOM)
                    </button>
                    <button
                      onClick={fillCurrent}
                      disabled={filling || agentRunning}
                      style={linkBtnStyle}
                    >
                      {filling ? "Filling…" : "Just fill (no AI loop)"}
                    </button>
                  </div>
                  {fillResult && (
                    <div style={{ marginTop: 8, fontSize: 12, color: COLORS.ink }}>{fillResult}</div>
                  )}
                </>
              ) : (
                <p style={{ fontSize: 12, color: COLORS.meta }}>
                  Open a job application page in another tab, then come back here to fill it.
                </p>
              )}
            </Section>

            {(agentRunning || agentLog.length > 0) && (
              <Section
                title={
                  (agentRunning ? "Agent — working" : "Agent — finished") +
                  (elapsed > 0 ? `  ·  ${fmtElapsed(elapsed)}` : "")
                }
              >
                {pendingLogin && (
                  <LoginPrompt
                    providers={pendingLogin.providers}
                    message={pendingLogin.message}
                    suggestGoogle={pendingLogin.suggestGoogle}
                    onUseGoogle={clickGoogleSignIn}
                    onContinue={continueAfterLogin}
                  />
                )}
                {pendingQuestions && (
                  <QuestionForm questions={pendingQuestions} onSubmit={submitAnswers} />
                )}
                {pendingSubmit && (
                  <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: 12, marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Ready to submit</div>
                    <div style={{ fontSize: 12, color: COLORS.ink, marginBottom: 10, lineHeight: 1.4 }}>
                      {pendingSubmit.summary}
                      {typeof pendingSubmit.confidence === "number" && (
                        <span style={{ color: COLORS.meta }}>
                          {" "}
                          (confidence {(pendingSubmit.confidence * 100).toFixed(0)}%)
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <PrimaryButton onClick={() => confirmSubmit(true)}>Submit application</PrimaryButton>
                      <button onClick={() => confirmSubmit(false)} style={linkBtnStyle}>
                        Stop, I’ll review
                      </button>
                    </div>
                  </div>
                )}
                {pendingUpload && (
                  <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: 12, marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Which resume?</div>
                    <div style={{ fontSize: 12, color: COLORS.meta, marginBottom: 10, lineHeight: 1.4 }}>
                      Tailor a fresh resume for this job (best results, ~20s), or attach your current resume.
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <PrimaryButton onClick={() => chooseUpload("tailor")}>Tailor for this job</PrimaryButton>
                      <button onClick={() => chooseUpload("existing")} style={linkBtnStyle}>
                        Use my resume
                      </button>
                    </div>
                  </div>
                )}
                {pendingTailorChoice && (
                  <TailorBasePicker
                    resumes={pendingTailorChoice.resumes}
                    suggestedId={pendingTailorChoice.suggestedId}
                    onChoose={chooseTailorBase}
                  />
                )}
                <AgentLog events={agentLog} />
                {agentRunning && (
                  <div
                    style={{
                      marginTop: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 999,
                      padding: "4px 4px 4px 14px",
                      background: "white",
                    }}
                  >
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") sendChat();
                      }}
                      placeholder="Message the agent…"
                      style={{
                        flex: 1,
                        fontSize: 12,
                        padding: "6px 0",
                        border: "none",
                        outline: "none",
                        background: "transparent",
                      }}
                    />
                    <button
                      onClick={sendChat}
                      aria-label="Send"
                      style={{
                        background: chatInput.trim() ? COLORS.brand : COLORS.border,
                        color: "#fff",
                        border: "none",
                        borderRadius: "50%",
                        width: 30,
                        height: 30,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: chatInput.trim() ? "pointer" : "default",
                        fontSize: 15,
                        flexShrink: 0,
                      }}
                    >
                      ↑
                    </button>
                  </div>
                )}
              </Section>
            )}

            <Section title="Your resume">
              {resume ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{resume.fullName || "Untitled"}</div>
                  {resume.headline && (
                    <div style={{ fontSize: 12, color: COLORS.meta, marginTop: 2 }}>{resume.headline}</div>
                  )}
                  <div style={{ fontSize: 11, color: COLORS.meta, marginTop: 6 }}>
                    {resume.email || <span style={{ color: "#c08600" }}>no email</span>}
                    {resume.phone ? ` · ${resume.phone}` : (
                      <span style={{ color: "#c08600" }}> · no phone</span>
                    )}
                  </div>
                  {(!resume.email || !resume.phone || !resume.location) && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: 8,
                        background: "#fff8e6",
                        border: "1px solid #f5e0a0",
                        borderRadius: 6,
                        fontSize: 11,
                        color: "#6b5400",
                        lineHeight: 1.5,
                      }}
                    >
                      Your resume is missing{" "}
                      {[
                        !resume.email && "email",
                        !resume.phone && "phone",
                        !resume.location && "location",
                      ]
                        .filter(Boolean)
                        .join(", ")}{" "}
                      — the agent will have to ask you each time. Fill them in at{" "}
                      <a
                        href="https://www.resumemintai.com/builder"
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: COLORS.brand, fontWeight: 600 }}
                      >
                        resumemintai.com/builder
                      </a>{" "}
                      and click Refresh below.
                    </div>
                  )}
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={tailorResumeForJob}
                      disabled={tailorBusy || !activeTab}
                      style={{
                        background: COLORS.brand, color: "#fff", border: "none", borderRadius: 8,
                        padding: "6px 12px", fontWeight: 600, cursor: tailorBusy ? "default" : "pointer",
                        fontSize: 12, opacity: tailorBusy || !activeTab ? 0.6 : 1,
                      }}
                      title="Create a copy of your master resume tailored to this job (doesn't apply)"
                    >
                      {tailorBusy ? "Tailoring…" : "✨ Tailor resume for this job"}
                    </button>
                    <button
                      onClick={refreshResume}
                      style={{
                        background: "white", color: COLORS.brand, border: `1px solid ${COLORS.brand}`,
                        borderRadius: 8, padding: "6px 10px", fontWeight: 600, cursor: "pointer", fontSize: 12,
                      }}
                    >
                      Refresh
                    </button>
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 12, color: COLORS.meta }}>
                  No resume cached yet. Create one at{" "}
                  <a href="https://www.resumemintai.com/builder" target="_blank" rel="noreferrer" style={{ color: COLORS.brand }}>
                    resumemintai.com
                  </a>{" "}
                  and click Refresh.
                </p>
              )}
            </Section>

            <Section title="Cover letter">
              <p style={{ fontSize: 12, color: COLORS.meta, margin: "0 0 8px", lineHeight: 1.4 }}>
                Generate a cover letter for this job, grounded in your resume — it never claims skills you don’t have.
              </p>
              <button
                disabled={coverBusy || !activeTab}
                onClick={async () => {
                  setCoverBusy(true);
                  setCoverText("");
                  setCoverPdf("");
                  try {
                    const { text, pdf } = await generateCoverLetter({ title: activeTab?.title || "" });
                    setCoverText(text);
                    setCoverPdf(pdf || "");
                  } catch (e: any) {
                    setCoverText(`Couldn't generate: ${e?.message || e}`);
                  } finally {
                    setCoverBusy(false);
                  }
                }}
                style={{
                  background: COLORS.brand, color: "#fff", border: "none", borderRadius: 8,
                  padding: "7px 14px", cursor: coverBusy ? "default" : "pointer", fontSize: 12, fontWeight: 600,
                  opacity: coverBusy || !activeTab ? 0.6 : 1,
                }}
              >
                {coverBusy ? "Generating…" : "Generate cover letter"}
              </button>
              {coverText && (
                <div style={{ marginTop: 8 }}>
                  <textarea
                    readOnly
                    value={coverText}
                    style={{ width: "100%", height: 160, fontSize: 12, padding: 8, border: `1px solid ${COLORS.border}`, borderRadius: 6, boxSizing: "border-box", resize: "vertical" }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <button
                      onClick={() => { try { navigator.clipboard.writeText(coverText); } catch {} }}
                      style={{ background: "white", color: COLORS.brand, border: `1px solid ${COLORS.brand}`, borderRadius: 8, padding: "6px 10px", fontWeight: 600, cursor: "pointer", fontSize: 12 }}
                    >
                      Copy
                    </button>
                    {coverPdf && (
                      <button
                        onClick={() => {
                          try {
                            const bytes = Uint8Array.from(atob(coverPdf), (c) => c.charCodeAt(0));
                            const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = "cover-letter.pdf";
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            URL.revokeObjectURL(url);
                          } catch {}
                        }}
                        style={{ background: COLORS.brand, color: "#fff", border: "none", borderRadius: 8, padding: "6px 10px", fontWeight: 600, cursor: "pointer", fontSize: 12 }}
                      >
                        Download PDF
                      </button>
                    )}
                  </div>
                </div>
              )}
            </Section>

            <Section title="Settings">
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: "6px 0" }}>
                <input
                  type="checkbox"
                  checked={autoSubmit}
                  onChange={async (e) => {
                    setAutoSubmit(e.target.checked);
                    await setSettings({ autoSubmit: e.target.checked });
                  }}
                />
                <span>Auto-submit after fill (use with care)</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: "6px 0" }}>
                <input
                  type="checkbox"
                  checked={sendScreenshot}
                  onChange={async (e) => {
                    setSendScreenshot(e.target.checked);
                    await setSettings({ autoSubmit, sendScreenshot: e.target.checked });
                  }}
                />
                <span>Send page screenshot to AI (better accuracy)</span>
              </label>
            </Section>

            <Section title="Application profile">
              {profileOpen ? (
                <ProfileEditor
                  fields={profileFields}
                  profile={profile}
                  onSave={async (vals) => {
                    await saveProfileFields(vals);
                    setProfile((p) => ({ fields: { ...(p?.fields || {}), ...vals }, custom: p?.custom || {} }));
                    setProfileOpen(false);
                  }}
                  onCancel={() => setProfileOpen(false)}
                />
              ) : (
                <div>
                  <p style={{ fontSize: 12, color: COLORS.meta, margin: "0 0 8px", lineHeight: 1.4 }}>
                    {profile && Object.keys(profile.fields || {}).filter((k) => profile.fields[k]).length > 0
                      ? "Saved answers (visa, citizenship, salary…) are reused so the agent stops re-asking."
                      : "Add your common application answers once — the agent reuses them so it stops re-asking every job."}
                  </p>
                  <button onClick={() => {
                    setProfileOpen(true); // open immediately (form has a fallback schema)
                    // Refresh schema + saved answers in the background.
                    fetchProfile().then(({ profile: p, fields }) => {
                      if (p) setProfile(p);
                      if (fields?.length) setProfileFields(fields);
                    }).catch(() => {});
                  }} style={{
                    background: COLORS.brand, color: "#fff", border: "none", borderRadius: 8,
                    padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600,
                  }}>
                    {profile && Object.keys(profile.fields || {}).filter((k) => profile.fields[k]).length > 0 ? "Edit profile" : "Set up profile"}
                  </button>
                </div>
              )}
            </Section>

            <Section title="Account">
              <button
                onClick={signOut}
                style={{
                  background: "white",
                  color: COLORS.meta,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Sign out
              </button>
            </Section>
            </>
            )}
          </>
        )}
      </main>

      <footer style={{ padding: "10px 16px", borderTop: `1px solid ${COLORS.border}`, fontSize: 10, color: "#a1a1aa", background: "white" }}>
        Keep your resume up to date at{" "}
        <a href="https://www.resumemintai.com/builder" target="_blank" rel="noreferrer" style={{ color: COLORS.brand }}>
          resumemintai.com
        </a>
        .
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: "white", border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 12, marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.meta, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 8 }}>{title}</div>
      {children}
    </section>
  );
}

function PrimaryButton({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        background: COLORS.brand,
        color: "white",
        border: 0,
        borderRadius: 8,
        padding: "10px 12px",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 13,
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {children}
    </button>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        background: `${color}20`,
        color,
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 8px",
        borderRadius: 999,
      }}
    >
      {children}
    </span>
  );
}

function AgentLog({ events }: { events: AgentEvent[] }) {
  const endRef = useRef<HTMLDivElement | null>(null);
  // Auto-scroll to the newest line as the agent works (like a chat transcript).
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [events]);
  return (
    <div style={{ maxHeight: 340, overflowY: "auto", fontSize: 12, lineHeight: 1.6 }}>
      {events.map((e, i) => {
        const isUser = (e as any).kind === "user_said";
        const isText = (e as any).kind === "text";
        return (
          <div
            key={i}
            style={{
              padding: isUser ? "6px 10px" : "3px 0",
              margin: isUser ? "4px 0" : 0,
              alignSelf: isUser ? "flex-end" : "flex-start",
              background: isUser ? COLORS.pillBg : "transparent",
              borderRadius: isUser ? 10 : 0,
              color: isUser ? COLORS.brandDeep : isText ? COLORS.ink : COLORS.meta,
              maxWidth: isUser ? "85%" : "100%",
              marginLeft: isUser ? "auto" : 0,
              fontWeight: isText ? 500 : 400,
            }}
          >
            {renderLogLine(e)}
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

function renderLogLine(ev: AgentEvent | ComputerEvent): string {
  const e = ev as any;
  switch (e.kind) {
    case "thinking":
      return "• thinking…";
    case "snapshot":
      return `• read page (${e.snapshot.fields.length} fields, ${e.snapshot.pageType})`;
    case "action":
      // DOM agent emits {action:{type}}; computer agent emits {action:string,detail}.
      return typeof e.action === "string"
        ? `• ${e.action}${e.detail ? ` — ${e.detail}` : ""}`
        : `• action: ${e.action.type}${e.reasoning ? ` — ${e.reasoning}` : ""}`;
    case "text":
      return `• ${e.text}`;
    case "user_said":
      return `🗣 you: ${e.text}`;
    case "banner":
      return e.on ? "• controlling the page (debugger attached)" : "• released the page";
    case "confirm_submit":
      return `• ready to submit — awaiting your OK`;
    case "executed":
      return `  → ${e.ok ? "✓" : "✗"} ${e.note || ""}`;
    case "ask_user":
      return `• needs ${e.questions.length} answer${e.questions.length === 1 ? "" : "s"} from you`;
    case "needs_login":
      return `• needs login${e.providers ? ` (${e.providers.join(", ")})` : ""}`;
    case "ask_tailor_base":
      return `• pick a base resume to tailor (${e.resumes.filter((r: ResumeSummary) => !r.isTailored).length} available)`;
    case "drift":
      try {
        const from = new URL(e.from).pathname;
        const to = new URL(e.to).pathname;
        return `⚠ tab drifted: ${from} → ${to}`;
      } catch {
        return `⚠ tab drifted off the original job`;
      }
    case "resume_selected":
      return `• selected resume ${e.resumeId.slice(0, 8)}…${e.reason ? ` — ${e.reason}` : ""}`;
    case "tailoring":
      return "• tailoring a fresh resume for this job…";
    case "done":
      return `✓ ${e.message || "done"}`;
    case "error":
      return `✗ error: ${e.error}`;
    default:
      return "•";
  }
}

function QuestionForm({
  questions,
  onSubmit,
}: {
  questions: Extract<AgentAction, { type: "ask_user" }>["questions"];
  onSubmit: (answers: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  return (
    <div style={{ background: "#fff8e6", border: "1px solid #f5e0a0", borderRadius: 8, padding: 10, marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#8a6a00", marginBottom: 8 }}>
        Agent needs your input
      </div>
      {questions.map((q) => (
        <div key={q.fieldId} style={{ marginBottom: 8 }}>
          <label style={{ display: "block", fontSize: 12, color: COLORS.ink, marginBottom: 3 }}>
            {q.label}{q.required ? " *" : ""}
          </label>
          {q.type === "select" && q.options?.length ? (
            <select
              value={values[q.fieldId] || ""}
              onChange={(e) => setValues((v) => ({ ...v, [q.fieldId]: e.target.value }))}
              style={{ width: "100%", padding: 6, fontSize: 12, border: `1px solid ${COLORS.border}`, borderRadius: 6 }}
            >
              <option value="">Select…</option>
              {q.options.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          ) : q.type === "yesno" ? (
            <div style={{ display: "flex", gap: 8 }}>
              {["Yes", "No"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setValues((v) => ({ ...v, [q.fieldId]: opt }))}
                  style={{
                    flex: 1,
                    padding: "6px 8px",
                    fontSize: 12,
                    borderRadius: 6,
                    border: `1px solid ${values[q.fieldId] === opt ? COLORS.brand : COLORS.border}`,
                    background: values[q.fieldId] === opt ? COLORS.brand : "white",
                    color: values[q.fieldId] === opt ? "white" : COLORS.ink,
                    cursor: "pointer",
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <input
              type="text"
              value={values[q.fieldId] || ""}
              onChange={(e) => setValues((v) => ({ ...v, [q.fieldId]: e.target.value }))}
              style={{ width: "100%", padding: 6, fontSize: 12, border: `1px solid ${COLORS.border}`, borderRadius: 6 }}
            />
          )}
        </div>
      ))}
      <PrimaryButton onClick={() => onSubmit(values)}>Continue</PrimaryButton>
    </div>
  );
}

// Fallback field schema (mirrors server PROFILE_FIELDS) so the form ALWAYS
// renders inputs even if /api/extension/profile hasn't loaded yet or failed.
const FALLBACK_PROFILE_FIELDS: ProfileField[] = [
  { key: "workLocation", label: "Current work location (city, country)", type: "text", placeholder: "Kuala Lumpur, Malaysia" },
  { key: "citizenship", label: "Country of citizenship", type: "text", placeholder: "Zimbabwe" },
  { key: "secondCitizenship", label: "Second citizenship (or 'None')", type: "text", placeholder: "None" },
  { key: "workAuthorization", label: "Where are you authorized to work?", type: "text", placeholder: "Malaysia (work permit)" },
  { key: "visaSponsorship", label: "Do you require visa sponsorship?", type: "yesno" },
  { key: "willingToRelocate", label: "Willing to relocate?", type: "yesno" },
  { key: "salaryExpectation", label: "Salary expectation", type: "text", placeholder: "USD 90k–110k / yr" },
  { key: "noticePeriod", label: "Notice period", type: "text", placeholder: "1 month" },
  { key: "earliestStart", label: "Earliest start date", type: "text", placeholder: "Immediately / 2 weeks" },
  { key: "yearsExperience", label: "Total years of experience", type: "text", placeholder: "8" },
  { key: "howHeard", label: "How did you hear about roles? (default source)", type: "text", placeholder: "LinkedIn" },
  { key: "pronouns", label: "Gender / pronouns (optional, for EEO)", type: "text", placeholder: "He/Him" },
  { key: "veteranStatus", label: "Veteran status (optional, EEO)", type: "text", placeholder: "Not a veteran" },
  { key: "disabilityStatus", label: "Disability status (optional, EEO)", type: "text", placeholder: "Prefer not to say" },
];

function ProfileEditor({
  fields,
  profile,
  onSave,
  onCancel,
}: {
  fields: ProfileField[];
  profile: ApplicantProfile | null;
  onSave: (vals: Record<string, string>) => void;
  onCancel: () => void;
}) {
  // Use the loaded schema, or the built-in fallback if it's empty.
  const list = fields && fields.length ? fields : FALLBACK_PROFILE_FIELDS;
  const [vals, setVals] = useState<Record<string, string>>(profile?.fields || {});
  const set = (k: string, v: string) => setVals((s) => ({ ...s, [k]: v }));
  return (
    <div>
      <p style={{ fontSize: 11, color: COLORS.meta, margin: "0 0 10px", lineHeight: 1.4 }}>
        Fill what applies — leave the rest blank. The agent reuses these and only asks for what’s missing.
      </p>
      <div style={{ maxHeight: 320, overflowY: "auto", paddingRight: 4 }}>
        {list.map((f) => (
          <div key={f.key} style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 11, color: COLORS.ink, marginBottom: 3 }}>{f.label}</label>
            {f.type === "yesno" ? (
              <div style={{ display: "flex", gap: 6 }}>
                {["Yes", "No"].map((opt) => (
                  <button key={opt} type="button" onClick={() => set(f.key, opt)} style={{
                    flex: 1, padding: "6px 8px", fontSize: 12, borderRadius: 6,
                    border: `1px solid ${vals[f.key] === opt ? COLORS.brand : COLORS.border}`,
                    background: vals[f.key] === opt ? COLORS.brand : "white",
                    color: vals[f.key] === opt ? "white" : COLORS.ink, cursor: "pointer",
                  }}>{opt}</button>
                ))}
              </div>
            ) : (
              <input
                type="text"
                value={vals[f.key] || ""}
                placeholder={f.placeholder}
                onChange={(e) => set(f.key, e.target.value)}
                style={{ width: "100%", padding: 6, fontSize: 12, border: `1px solid ${COLORS.border}`, borderRadius: 6, boxSizing: "border-box" }}
              />
            )}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <PrimaryButton onClick={() => onSave(vals)}>Save profile</PrimaryButton>
        <button onClick={onCancel} style={linkBtnStyle}>Cancel</button>
      </div>
    </div>
  );
}

function TailorBasePicker({
  resumes,
  suggestedId,
  onChoose,
}: {
  resumes: ResumeSummary[];
  suggestedId?: string;
  onChoose: (baseResumeId: string | null) => void;
}) {
  // Only base resumes (not already-tailored) are reasonable bases.
  const bases = resumes.filter((r) => !r.isTailored);
  // Prefer the suggested resume, else the master (source of truth), else first.
  const [selectedId, setSelectedId] = useState<string>(
    (suggestedId && bases.find((b) => b.id === suggestedId) ? suggestedId : "") ||
      bases.find((b) => b.isMaster)?.id ||
      bases[0]?.id ||
      "",
  );

  if (bases.length === 0) {
    return (
      <div style={{ background: "#fff8e6", border: "1px solid #f5e0a0", borderRadius: 8, padding: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#8a6a00", marginBottom: 6 }}>
          You need a base resume first
        </div>
        <div style={{ fontSize: 12, color: COLORS.ink, marginBottom: 8, lineHeight: 1.5 }}>
          The agent wants to tailor a resume for this job, but you don't have a base resume yet.
          Build one (or upload an existing PDF) on ResumeMint, then run the agent again.
        </div>
        <a
          href="https://www.resumemintai.com/builder"
          target="_blank"
          rel="noreferrer"
          style={{
            display: "block",
            textAlign: "center",
            background: COLORS.brand,
            color: "white",
            textDecoration: "none",
            borderRadius: 6,
            padding: "8px 12px",
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          Open ResumeMint builder
        </a>
        <a
          href="https://www.resumemintai.com/templates/import"
          target="_blank"
          rel="noreferrer"
          style={{
            display: "block",
            textAlign: "center",
            background: "white",
            color: COLORS.brand,
            textDecoration: "none",
            border: `1px solid ${COLORS.brand}`,
            borderRadius: 6,
            padding: "8px 12px",
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          Upload an existing resume
        </a>
        <button
          onClick={() => onChoose(null)}
          style={{
            background: "transparent",
            color: COLORS.meta,
            border: "none",
            cursor: "pointer",
            fontSize: 11,
            textDecoration: "underline",
            padding: 0,
            width: "100%",
          }}
        >
          Skip tailoring for now
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff8e6", border: "1px solid #f5e0a0", borderRadius: 8, padding: 10, marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#8a6a00", marginBottom: 6 }}>
        Pick a base resume to tailor
      </div>
      <div style={{ fontSize: 12, color: COLORS.ink, marginBottom: 8 }}>
        The agent will tailor a fresh copy of this resume for the job.
      </div>
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        style={{ width: "100%", padding: 6, fontSize: 12, border: `1px solid ${COLORS.border}`, borderRadius: 6, marginBottom: 10 }}
      >
        {bases.map((b) => (
          <option key={b.id} value={b.id}>
            {b.isMaster ? "★ " : ""}{b.title || "Untitled"}{b.isMaster ? "  (master)" : ""}{b.id === suggestedId ? "  (suggested)" : ""}
          </option>
        ))}
      </select>
      <PrimaryButton onClick={() => onChoose(selectedId)}>
        Tailor this resume
      </PrimaryButton>
      <button
        onClick={() => onChoose(null)}
        style={{
          background: "transparent",
          color: COLORS.meta,
          border: "none",
          cursor: "pointer",
          fontSize: 11,
          textDecoration: "underline",
          padding: "6px 0 0 0",
          width: "100%",
        }}
      >
        Skip tailoring — fill with my current resume
      </button>
    </div>
  );
}

function LoginPrompt({
  providers,
  message,
  suggestGoogle,
  onUseGoogle,
  onContinue,
}: {
  providers: string[];
  message?: string;
  suggestGoogle?: boolean;
  onUseGoogle: () => void;
  onContinue: () => void;
}) {
  return (
    <div style={{ background: "#eef6ff", border: "1px solid #bcd9f5", borderRadius: 8, padding: 10, marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.brandDeep, marginBottom: 6 }}>
        Sign in required
      </div>
      <div style={{ fontSize: 12, color: COLORS.ink, marginBottom: 8 }}>
        {message || `This form requires you to sign in (${providers.join(", ")}).`}
      </div>
      {suggestGoogle && (
        <button
          onClick={onUseGoogle}
          style={{
            background: "white",
            color: "#3c4043",
            border: "1px solid #dadce0",
            borderRadius: 6,
            padding: "8px 12px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            width: "100%",
            marginBottom: 6,
          }}
        >
          Sign in with Google (uses your Chrome account)
        </button>
      )}
      <button
        onClick={onContinue}
        style={{
          background: COLORS.brand,
          color: "white",
          border: 0,
          borderRadius: 6,
          padding: "8px 12px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          width: "100%",
        }}
      >
        I've signed in — continue
      </button>
    </div>
  );
}

function detectAtsFromUrl(url: string): string | null {
  if (!url) return null;
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  })();
  if (host.includes("greenhouse.io")) return "Greenhouse";
  if (host.includes("lever.co")) return "Lever";
  if (host.includes("ashbyhq.com")) return "Ashby";
  if (host.includes("workable.com")) return "Workable";
  if (host.includes("myworkdayjobs.com")) return "Workday";
  if (host.includes("linkedin.com")) return "LinkedIn";
  if (host.includes("indeed.com")) return "Indeed";
  return null;
}

// ---- Resumes / Cover letters tab: searchable, paginated list ----
function DocTable({
  kind,
  baseUrl,
  load,
}: {
  kind: "resumes" | "covers";
  baseUrl: string;
  load: () => Promise<any[]>;
}) {
  const [items, setItems] = useState<any[] | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const PER = 8;

  useEffect(() => {
    let alive = true;
    load().then((rows) => { if (alive) setItems(rows || []); }).catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, []);

  const editPath = (id: string) =>
    kind === "covers" ? `${baseUrl}/builder/cover-letters/${id}/edit` : `${baseUrl}/builder/${id}/edit`;

  const filtered = (items || []).filter((it) => {
    const hay = `${it.title || ""} ${it.tailoredFor?.company || ""} ${it.tailoredFor?.title || ""}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });
  const pages = Math.max(1, Math.ceil(filtered.length / PER));
  const cur = Math.min(page, pages - 1);
  const slice = filtered.slice(cur * PER, cur * PER + PER);

  if (items === null) return <div style={{ color: COLORS.meta, fontSize: 12, padding: 8 }}>Loading…</div>;

  return (
    <div>
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setPage(0); }}
        placeholder={`Search ${kind === "covers" ? "cover letters" : "resumes"}…`}
        style={{ width: "100%", padding: 8, fontSize: 12, border: `1px solid ${COLORS.border}`, borderRadius: 8, boxSizing: "border-box", marginBottom: 10 }}
      />
      {filtered.length === 0 ? (
        <div style={{ color: COLORS.meta, fontSize: 12, padding: 8 }}>
          {q ? "No matches." : `No ${kind === "covers" ? "cover letters" : "resumes"} yet.`}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {slice.map((it) => (
            <a
              key={it.id}
              href={editPath(it.id)}
              target="_blank"
              rel="noreferrer"
              style={{ display: "block", textDecoration: "none", color: COLORS.ink, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 10px", background: "white" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                  {it.title || "Untitled"}
                </span>
                {it.isMaster ? (
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#92600a", background: "#fde9b8", borderRadius: 999, padding: "1px 6px" }}>★ Master</span>
                ) : it.isTailored ? (
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#fff", background: "#4b5563", borderRadius: 999, padding: "1px 6px" }}>Tailored</span>
                ) : null}
              </div>
              <div style={{ fontSize: 10, color: COLORS.meta, marginTop: 2 }}>
                {it.tailoredFor?.company ? `${it.tailoredFor.company} · ` : ""}
                {it.updatedAt ? new Date(it.updatedAt).toLocaleDateString() : ""}
              </div>
            </a>
          ))}
        </div>
      )}
      {pages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 10 }}>
          <button onClick={() => setPage(Math.max(0, cur - 1))} disabled={cur === 0}
            style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: `1px solid ${COLORS.border}`, background: "white", cursor: cur === 0 ? "default" : "pointer", opacity: cur === 0 ? 0.5 : 1 }}>
            ‹ Prev
          </button>
          <span style={{ fontSize: 11, color: COLORS.meta }}>Page {cur + 1} / {pages}</span>
          <button onClick={() => setPage(Math.min(pages - 1, cur + 1))} disabled={cur >= pages - 1}
            style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: `1px solid ${COLORS.border}`, background: "white", cursor: cur >= pages - 1 ? "default" : "pointer", opacity: cur >= pages - 1 ? 0.5 : 1 }}>
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}
