"use client";

import * as React from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/app/firebase";
import LoginSlidePanel from "@/components/LoginSlidePanel";

declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage?: (
          extensionId: string,
          message: any,
          callback?: (response: any) => void,
        ) => void;
        lastError?: { message: string } | undefined;
      };
    };
  }
}

type Phase =
  | { kind: "loading" }
  | { kind: "needs_login" }
  | { kind: "exchanging" }
  | { kind: "shipping" }
  | { kind: "done"; email: string }
  | { kind: "error"; message: string };

export default function ConnectClient({ extensionId }: { extensionId: string }) {
  const [phase, setPhase] = React.useState<Phase>({ kind: "loading" });
  const [loginOpen, setLoginOpen] = React.useState(false);
  const ranRef = React.useRef(false);

  React.useEffect(() => {
    if (!extensionId) {
      setPhase({ kind: "error", message: "Missing extension id. Open this page from the extension popup." });
      return;
    }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setPhase({ kind: "needs_login" });
        setLoginOpen(true);
        return;
      }
      if (ranRef.current) return;
      ranRef.current = true;
      setLoginOpen(false);
      try {
        setPhase({ kind: "exchanging" });
        const idToken = await user.getIdToken(true);
        const r = await fetch("/api/extension/exchange", {
          method: "POST",
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.detail || j?.error || "exchange_failed");

        setPhase({ kind: "shipping" });
        const sendMsg = window.chrome?.runtime?.sendMessage;
        if (!sendMsg) {
          throw new Error(
            "Chrome extension API not available in this browser. Use a Chromium-based browser with the ResumeMint Apply extension installed.",
          );
        }
        await new Promise<void>((resolve, reject) => {
          sendMsg(
            extensionId,
            { type: "EXTENSION_TOKEN", token: j.token, user: j.user },
            (response: any) => {
              const err = window.chrome?.runtime?.lastError;
              if (err) return reject(new Error(err.message));
              if (response?.ok) resolve();
              else reject(new Error(response?.error || "extension_did_not_acknowledge"));
            },
          );
        });
        setPhase({ kind: "done", email: j.user.email });
      } catch (e: any) {
        setPhase({ kind: "error", message: e?.message || String(e) });
        ranRef.current = false;
      }
    });
    return () => unsub();
  }, [extensionId]);

  return (
    <div style={{ maxWidth: 520, margin: "80px auto", padding: 24, fontFamily: "system-ui, -apple-system, sans-serif", color: "#1d1d20" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
        Pair the ResumeMint extension
      </h1>
      <p style={{ color: "#52525a", fontSize: 14, lineHeight: 1.55, marginBottom: 24 }}>
        Sign in once. The extension will then auto-fill job application forms using your saved resume.
      </p>

      <LoginSlidePanel
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={() => setLoginOpen(false)}
        reason="Sign in to connect the ResumeMint Apply extension to your account."
      />

      <div
        style={{
          padding: "14px 16px",
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          background: "#fafafa",
          fontSize: 14,
        }}
      >
        {phase.kind === "loading" && "Checking your sign-in…"}
        {phase.kind === "needs_login" && "Please sign in using the panel that just opened."}
        {phase.kind === "exchanging" && "Authorising the extension…"}
        {phase.kind === "shipping" && "Sending the token to the extension…"}
        {phase.kind === "done" && (
          <span>
            ✅ Paired with <strong>{phase.email}</strong>. You can close this tab and start filling forms.
          </span>
        )}
        {phase.kind === "error" && (
          <span style={{ color: "#9f1239" }}>⚠ {phase.message}</span>
        )}
      </div>
    </div>
  );
}
