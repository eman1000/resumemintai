// Background service worker. Handles:
//  - External messages from the resumemintai.com connect page (auth handoff).
//  - Internal messages from side panel / content scripts.
//  - Opens the side panel when the toolbar icon is clicked.

import { STORAGE_KEYS, type ExtensionMessage, type StoredAuth } from "../types";
import { fetchResume } from "../lib/api";
import { setStoredAuth } from "../lib/auth";

// Clicking the toolbar icon opens the side panel (Chrome ≥114).
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true }).catch(() => {});
});

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

// ---- Internal (side panel / content script → background) --------------
chrome.runtime.onMessage.addListener((msg: ExtensionMessage, sender, sendResponse) => {
  (async () => {
    if (msg.type === "OPEN_SIDE_PANEL") {
      try {
        const tabId = sender.tab?.id;
        // @ts-ignore — chrome.sidePanel.open availability varies by Chrome version.
        if (tabId && chrome.sidePanel?.open) {
          // @ts-ignore
          await chrome.sidePanel.open({ tabId });
          sendResponse({ ok: true });
          return;
        }
        sendResponse({ ok: false, error: "side_panel_unavailable" });
      } catch (e: any) {
        sendResponse({ ok: false, error: e?.message || String(e) });
      }
      return;
    }
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
    if (msg.type === "GET_CHROME_IDENTITY") {
      // chrome.identity.getProfileUserInfo returns the email of the user
      // currently signed into Chrome — used by the agent to detect when the
      // resume email matches the Chrome account, in which case "Sign in
      // with Google" is the right next action.
      try {
        // @ts-ignore — types vary by Chrome version
        chrome.identity.getProfileUserInfo({ accountStatus: "ANY" }, (info: any) => {
          sendResponse({ email: info?.email || "", id: info?.id || "" });
        });
      } catch {
        sendResponse({ email: "", id: "" });
      }
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
