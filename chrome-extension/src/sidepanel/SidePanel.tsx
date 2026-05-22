import { useEffect, useRef, useState } from "react";
import type { StoredAuth, FlatResume, AgentAction } from "../types";
import { STORAGE_KEYS } from "../types";
import { openConnectFlow, getSettings, setSettings } from "../lib/auth";
import { runAgentLoop, type AgentEvent } from "./agentLoop";
import type { ResumeSummary } from "../lib/api";

const COLORS = {
  brand: "#2a72d7",
  brandDeep: "#0a2d50",
  mint: "#00b67a",
  ink: "#1d1d20",
  meta: "#52525a",
  pillBg: "#eaf3fc",
  border: "#e5e7eb",
};

type ActiveTab = { url: string; title: string; id?: number } | null;

export default function SidePanel() {
  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const [resume, setResume] = useState<FlatResume | null>(null);
  const [autoSubmit, setAutoSubmit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>(null);
  const [filling, setFilling] = useState(false);
  const [fillResult, setFillResult] = useState<string | null>(null);

  // Agent state
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentLog, setAgentLog] = useState<AgentEvent[]>([]);
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
      setLoading(false);
      readActiveTab();
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

  // React to ask_user / needs_login / ask_tailor_base events from the loop.
  useEffect(() => {
    const last = agentLog[agentLog.length - 1];
    if (!last) return;
    if (last.kind === "ask_user") setPendingQuestions(last.questions);
    if (last.kind === "needs_login") setPendingLogin({ providers: last.providers, message: last.message, suggestGoogle: last.suggestGoogle });
    if (last.kind === "ask_tailor_base") setPendingTailorChoice({ resumes: last.resumes, suggestedId: last.suggestedId });
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
                    <PrimaryButton onClick={runAgent} disabled={agentRunning || filling}>
                      {agentRunning ? "Agent running…" : "Apply with AI"}
                    </PrimaryButton>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <button
                      onClick={fillCurrent}
                      disabled={filling || agentRunning}
                      style={{
                        background: "transparent",
                        color: COLORS.meta,
                        border: "none",
                        cursor: "pointer",
                        fontSize: 11,
                        textDecoration: "underline",
                        padding: 0,
                      }}
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
              <Section title={agentRunning ? "Agent — working" : "Agent — finished"}>
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
                {pendingTailorChoice && (
                  <TailorBasePicker
                    resumes={pendingTailorChoice.resumes}
                    suggestedId={pendingTailorChoice.suggestedId}
                    onChoose={chooseTailorBase}
                  />
                )}
                <AgentLog events={agentLog} />
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
                  <button
                    onClick={refreshResume}
                    style={{
                      marginTop: 10,
                      background: "white",
                      color: COLORS.brand,
                      border: `1px solid ${COLORS.brand}`,
                      borderRadius: 8,
                      padding: "6px 10px",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    Refresh from ResumeMint
                  </button>
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
  return (
    <div style={{ maxHeight: 220, overflowY: "auto", fontSize: 11, color: COLORS.meta, lineHeight: 1.6 }}>
      {events.map((e, i) => (
        <div key={i} style={{ padding: "2px 0" }}>
          {renderLogLine(e)}
        </div>
      ))}
    </div>
  );
}

function renderLogLine(e: AgentEvent): string {
  switch (e.kind) {
    case "thinking":
      return "• thinking…";
    case "snapshot":
      return `• read page (${e.snapshot.fields.length} fields, ${e.snapshot.pageType})`;
    case "action":
      return `• action: ${e.action.type}${e.reasoning ? ` — ${e.reasoning}` : ""}`;
    case "executed":
      return `  → ${e.ok ? "✓" : "✗"} ${e.note || ""}`;
    case "ask_user":
      return `• needs ${e.questions.length} answer${e.questions.length === 1 ? "" : "s"} from you`;
    case "needs_login":
      return `• needs login (${e.providers.join(", ")})`;
    case "ask_tailor_base":
      return `• pick a base resume to tailor (${e.resumes.filter((r) => !r.isTailored).length} available)`;
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
  const [selectedId, setSelectedId] = useState<string>(
    suggestedId && bases.find((b) => b.id === suggestedId) ? suggestedId : bases[0]?.id || "",
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
            {b.title || "Untitled"}{b.id === suggestedId ? "  (suggested)" : ""}
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
