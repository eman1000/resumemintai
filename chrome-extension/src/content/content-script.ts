// Content script. Injected on supported job sites. Shows a floating
// "Apply with ResumeMint" button that opens the side panel; also listens
// for FILL_FORM messages from the side panel and runs the matching filler.

import type { FlatResume, ExtensionMessage } from "../types";
import { detectAts, runFiller } from "./fillers";
import { buildSnapshot } from "./snapshot";
import { executeAction, clickGoogleSignIn } from "./executor";

console.debug("[ResumeMint] content script ready on", location.host);

// ---- Side-panel → content script: actions ------------------------------
chrome.runtime.onMessage.addListener((msg: ExtensionMessage, _sender, sendResponse) => {
  // Agent loop: snapshot the page
  if (msg.type === "AGENT_SNAPSHOT") {
    try {
      sendResponse({ ok: true, snapshot: buildSnapshot() });
    } catch (e: any) {
      sendResponse({ ok: false, error: e?.message || String(e) });
    }
    return false;
  }
  // Agent loop: execute one action. For upload_resume the side panel sends
  // the rendered PDF along with the action (base64 + filename).
  if (msg.type === "AGENT_EXECUTE") {
    (async () => {
      try {
        const result = await executeAction(msg.action, (msg as any).filePayload);
        sendResponse(result);
      } catch (e: any) {
        sendResponse({ ok: false, note: e?.message || String(e) });
      }
    })();
    return true;
  }
  // Side-panel told us to click the "Sign in with Google" button
  if (msg.type === "AGENT_CLICK_GOOGLE_SIGNIN") {
    sendResponse({ ok: clickGoogleSignIn() });
    return false;
  }
  // Legacy deterministic fill (kept as a fallback / for one-off fills)
  if (msg.type === "FILL_FORM") {
    (async () => {
      try {
        const { resume } = (await chrome.runtime.sendMessage({ type: "GET_RESUME" })) as
          | { resume: FlatResume | null }
          | undefined ?? {};
        if (!resume) {
          sendResponse({ ok: false, error: "Not signed in." });
          return;
        }
        const filled = await runFiller({ resume });
        sendResponse({ ok: true, filled });
      } catch (e: any) {
        sendResponse({ ok: false, error: e?.message || String(e) });
      }
    })();
    return true;
  }
  return false;
});

// ---- Floating helper button on the page --------------------------------
(function injectFloatingButton() {
  // With all_frames:true the content script runs in every iframe — only the
  // top frame should show the button (the agent still reaches iframe forms).
  if (window !== window.top) return;
  if ((window as any).__rmInjected) return;
  (window as any).__rmInjected = true;

  const host = document.createElement("div");
  host.id = "__resumemint-fill-host";
  host.style.cssText =
    "position:fixed;bottom:20px;right:20px;z-index:2147483647;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;";

  const ats = detectAts(location.href, document);
  const labelAts = ats ? ats : "form";

  host.innerHTML = `
    <button id="__rm-fill-btn" style="
      background:#2a72d7;color:#fff;font-weight:600;border:0;padding:10px 14px;
      border-radius:999px;box-shadow:0 6px 18px rgba(0,0,0,.18);cursor:pointer;
      font-size:13px;display:flex;align-items:center;gap:6px;">
      <span style="display:inline-block;width:14px;height:14px;background:#fff;border-radius:3px;color:#2a72d7;
        text-align:center;line-height:14px;font-size:10px;font-weight:800;">RM</span>
      Apply with ResumeMint (${labelAts})
    </button>
  `;
  document.documentElement.appendChild(host);

  const btn = host.querySelector<HTMLButtonElement>("#__rm-fill-btn")!;
  btn.onclick = async () => {
    // Ask the background to open the side panel — must be triggered from
    // a user gesture (this click satisfies that).
    try {
      const resp = await chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" });
      if (resp?.ok) return;
    } catch {}
    // Fallback: if the side panel API isn't available, fill directly.
    const { resume } = (await chrome.runtime.sendMessage({ type: "GET_RESUME" })) as
      | { resume: FlatResume | null }
      | undefined ?? {};
    if (resume) await runFiller({ resume });
  };
})();
