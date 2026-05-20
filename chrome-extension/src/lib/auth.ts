import { STORAGE_KEYS, type StoredAuth, type Settings } from "../types";
import { RESUMEMINT_ORIGIN } from "./api";

export async function getStoredAuth(): Promise<StoredAuth | null> {
  const out = await chrome.storage.local.get(STORAGE_KEYS.AUTH);
  return (out[STORAGE_KEYS.AUTH] as StoredAuth) || null;
}

export async function setStoredAuth(auth: StoredAuth | null): Promise<void> {
  if (auth) await chrome.storage.local.set({ [STORAGE_KEYS.AUTH]: auth });
  else await chrome.storage.local.remove(STORAGE_KEYS.AUTH);
}

export async function getSettings(): Promise<Settings> {
  const out = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  return (out[STORAGE_KEYS.SETTINGS] as Settings) || { autoSubmit: false };
}

export async function setSettings(s: Settings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: s });
}

/**
 * Opens the ResumeMint connect page, which pairs the extension to the user's
 * account. The page sends back the token via `chrome.runtime.sendMessage`
 * (allowed because the page origin is in `externally_connectable`).
 */
export function openConnectFlow() {
  const url = `${RESUMEMINT_ORIGIN}/extension/connect?ext=${encodeURIComponent(chrome.runtime.id)}`;
  chrome.tabs.create({ url });
}
