import { useEffect, useState } from "react";
import type { StoredAuth, FlatResume } from "../types";
import { STORAGE_KEYS } from "../types";
import { openConnectFlow, getSettings, setSettings } from "../lib/auth";

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
                  <div style={{ marginTop: 12 }}>
                    <PrimaryButton onClick={fillCurrent} disabled={filling}>
                      {filling ? "Filling…" : "Fill this form"}
                    </PrimaryButton>
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

            <Section title="Your resume">
              {resume ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{resume.fullName || "Untitled"}</div>
                  {resume.headline && (
                    <div style={{ fontSize: 12, color: COLORS.meta, marginTop: 2 }}>{resume.headline}</div>
                  )}
                  <div style={{ fontSize: 11, color: COLORS.meta, marginTop: 6 }}>
                    {resume.email} {resume.phone ? `· ${resume.phone}` : ""}
                  </div>
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
