// Content script. Injected on supported job sites. Detects the host's ATS,
// shows a floating "Fill with ResumeMint" button, and runs the matching
// filler on click. Falls back to AI-mapping for unknown forms.

import type { FlatResume } from "../types";
import { detectAts } from "./fillers";
import { runFiller } from "./fillers";

console.debug("[ResumeMint] content script ready on", location.host);

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
      Fill with ResumeMint (${labelAts})
    </button>
    <div id="__rm-status" style="margin-top:6px;font-size:11px;color:#52525a;background:#fff;
      padding:4px 8px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.08);display:none;"></div>
  `;
  document.documentElement.appendChild(host);

  const btn = host.querySelector<HTMLButtonElement>("#__rm-fill-btn")!;
  const status = host.querySelector<HTMLDivElement>("#__rm-status")!;
  const setStatus = (s: string, ok = true) => {
    status.style.display = "block";
    status.style.color = ok ? "#0a2d50" : "#9f1239";
    status.textContent = s;
  };

  btn.onclick = async () => {
    setStatus("Loading your resume…");
    const { resume } = (await chrome.runtime.sendMessage({ type: "GET_RESUME" })) as
      | { resume: FlatResume | null }
      | undefined ?? {};
    if (!resume) {
      setStatus("Not signed in — open the ResumeMint extension and sign in first.", false);
      return;
    }
    setStatus(`Filling fields via ${ats ? ats : "AI"}…`);
    try {
      const filled = await runFiller({ resume });
      setStatus(`Filled ${filled} field${filled === 1 ? "" : "s"}. Review and submit.`);
    } catch (e: any) {
      setStatus(`Couldn't fill: ${e?.message || e}`, false);
    }
  };
})();
