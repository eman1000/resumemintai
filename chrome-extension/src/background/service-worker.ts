// Background service worker. Handles:
//  - External messages from the resumemintai.com connect page (auth handoff).
//  - Internal messages from popup / content scripts.
//  - Periodic resume cache refresh.

import { STORAGE_KEYS, type ExtensionMessage, type StoredAuth } from "../types";
import { fetchResume } from "../lib/api";
import { setStoredAuth } from "../lib/auth";

// ---- External (web page → extension) -----------------------------------
chrome.runtime.onMessageExternal.addListener((msg: ExtensionMessage, sender, sendResponse) => {
  if (!sender.origin?.startsWith("https://www.resumemintai.com") &&
      !sender.origin?.startsWith("http://localhost:3000")) {
    sendResponse({ ok: false, error: "untrusted_origin" });
    return false;
  }
  (async () => {
    if (msg.type === "EXTENSION_TOKEN") {
      const auth: StoredAuth = {
        token: msg.token,
        user: msg.user,
        obtainedAt: Date.now(),
      };
      await setStoredAuth(auth);
      // Best-effort prefetch so the popup can show the resume immediately.
      try {
        const resume = await fetchResume();
        if (resume) await chrome.storage.local.set({ [STORAGE_KEYS.RESUME]: resume });
      } catch {}
      sendResponse({ ok: true });
    } else {
      sendResponse({ ok: false, error: "unknown_message" });
    }
  })();
  return true;
});

// ---- Internal (popup / content script → background) --------------------
chrome.runtime.onMessage.addListener((msg: ExtensionMessage, _sender, sendResponse) => {
  (async () => {
    if (msg.type === "GET_AUTH") {
      const out = await chrome.storage.local.get(STORAGE_KEYS.AUTH);
      sendResponse(out[STORAGE_KEYS.AUTH] || null);
      return;
    }
    if (msg.type === "SIGN_OUT") {
      await chrome.storage.local.remove([STORAGE_KEYS.AUTH, STORAGE_KEYS.RESUME]);
      sendResponse({ ok: true });
      return;
    }
    if (msg.type === "GET_RESUME") {
      const cached = await chrome.storage.local.get(STORAGE_KEYS.RESUME);
      if (cached[STORAGE_KEYS.RESUME]) {
        sendResponse({ resume: cached[STORAGE_KEYS.RESUME], cached: true });
        return;
      }
      const fresh = await fetchResume();
      if (fresh) await chrome.storage.local.set({ [STORAGE_KEYS.RESUME]: fresh });
      sendResponse({ resume: fresh, cached: false });
      return;
    }
    sendResponse({ ok: false, error: "unknown_message" });
  })();
  return true;
});
