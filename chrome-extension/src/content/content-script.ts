// Content script. Injected on supported job sites. Shows a floating
// "Apply with ResumeMint" button that opens the side panel; also listens
// for FILL_FORM messages from the side panel and runs the matching filler.

import type { FlatResume, ExtensionMessage } from "../types";
import { detectAts, runFiller } from "./fillers";

console.debug("[ResumeMint] content script ready on", location.host);

// ---- Side-panel → content script: fill the form ------------------------
chrome.runtime.onMessage.addListener((msg: ExtensionMessage, _sender, sendResponse) => {
  if (msg.type !== "FILL_FORM") return false;
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
});

// ---- Floating helper button on the page --------------------------------
(function injectFloatingButton() {
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
