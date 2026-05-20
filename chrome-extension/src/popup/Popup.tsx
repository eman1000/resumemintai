import { useEffect, useState } from "react";
import type { StoredAuth, FlatResume } from "../types";
import { STORAGE_KEYS } from "../types";
import { openConnectFlow, getSettings, setSettings } from "../lib/auth";

const COLORS = {
  brand: "#2a72d7",
  brandDeep: "#0a2d50",
  ink: "#1d1d20",
  meta: "#52525a",
  pillBg: "#eaf3fc",
};

export default function Popup() {
  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const [resume, setResume] = useState<FlatResume | null>(null);
  const [autoSubmit, setAutoSubmit] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const out = await chrome.storage.local.get([STORAGE_KEYS.AUTH, STORAGE_KEYS.RESUME]);
      setAuth((out[STORAGE_KEYS.AUTH] as StoredAuth) ?? null);
      setResume((out[STORAGE_KEYS.RESUME] as FlatResume) ?? null);
      const s = await getSettings();
      setAutoSubmit(s.autoSubmit);
      setLoading(false);
    })();

    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== "local") return;
      if (changes[STORAGE_KEYS.AUTH]) setAuth(changes[STORAGE_KEYS.AUTH].newValue ?? null);
      if (changes[STORAGE_KEYS.RESUME]) setResume(changes[STORAGE_KEYS.RESUME].newValue ?? null);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  async function signOut() {
    await chrome.runtime.sendMessage({ type: "SIGN_OUT" });
    setAuth(null);
    setResume(null);
  }

  async function refreshResume() {
    setLoading(true);
    const out = await chrome.runtime.sendMessage({ type: "GET_RESUME" });
    setResume(out?.resume ?? null);
    setLoading(false);
  }

  return (
    <div style={{ width: 320, padding: 14, fontFamily: "system-ui, -apple-system, sans-serif", color: COLORS.ink }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: COLORS.brand,
            color: "white",
            display: "grid",
            placeItems: "center",
            fontSize: 11,
            fontWeight: 800,
          }}
        >
          RM
        </div>
        <div style={{ fontWeight: 700, fontSize: 14 }}>ResumeMint Apply</div>
      </div>

      {loading ? (
        <div style={{ color: COLORS.meta, fontSize: 12 }}>Loading…</div>
      ) : !auth ? (
        <>
          <p style={{ fontSize: 12, color: COLORS.meta, lineHeight: 1.5, margin: "0 0 12px" }}>
            Sign in once to your ResumeMint account. We'll fill any supported job application form
            from your saved resume.
          </p>
          <button
            onClick={openConnectFlow}
            style={{
              width: "100%",
              background: COLORS.brand,
              color: "white",
              border: 0,
              borderRadius: 8,
              padding: "10px 12px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Sign in to ResumeMint
          </button>
        </>
      ) : (
        <>
          <div
            style={{
              background: COLORS.pillBg,
              padding: "8px 10px",
              borderRadius: 8,
              fontSize: 12,
              marginBottom: 10,
            }}
          >
            <div style={{ fontWeight: 600 }}>{auth.user.email}</div>
            <div style={{ color: COLORS.meta, fontSize: 11, marginTop: 2 }}>
              {resume ? "Resume cached" : "No resume cached yet"}
              {resume?.headline ? ` — ${resume.headline}` : ""}
            </div>
          </div>

          <p style={{ fontSize: 12, color: COLORS.meta, lineHeight: 1.5, margin: "0 0 10px" }}>
            Open any supported job posting and click the floating "Fill with ResumeMint" button.
            Currently best on Greenhouse + most ATSes (AI fallback).
          </p>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, margin: "8px 0" }}>
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

          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            <button
              onClick={refreshResume}
              style={{
                flex: 1,
                background: "white",
                color: COLORS.brand,
                border: `1px solid ${COLORS.brand}`,
                borderRadius: 8,
                padding: "8px 10px",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Refresh resume
            </button>
            <button
              onClick={signOut}
              style={{
                flex: 1,
                background: "white",
                color: COLORS.meta,
                border: `1px solid #e5e7eb`,
                borderRadius: 8,
                padding: "8px 10px",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Sign out
            </button>
          </div>
        </>
      )}

      <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid #f0f0f3", fontSize: 10, color: "#a1a1aa" }}>
        Tip: keep your resume updated at{" "}
        <a href="https://www.resumemintai.com/builder" target="_blank" style={{ color: COLORS.brand }}>
          resumemintai.com
        </a>
        .
      </div>
    </div>
  );
}
