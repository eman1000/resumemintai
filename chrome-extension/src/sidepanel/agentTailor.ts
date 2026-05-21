// Triggers /api/jobs/tailored-kit so the agent can fall back to creating a
// fresh tailored resume when no existing one is a good match.

import type { AgentJobContext } from "../types";
import { STORAGE_KEYS } from "../types";
import type { StoredAuth } from "../types";

const PROD_BASE = "https://www.resumemintai.com";
const API_BASE = (import.meta as any).env?.VITE_API_BASE || PROD_BASE;

export async function agentTailorPassThrough(jobContext?: AgentJobContext): Promise<void> {
  const out = await chrome.storage.local.get(STORAGE_KEYS.AUTH);
  const auth = out[STORAGE_KEYS.AUTH] as StoredAuth | undefined;
  if (!auth?.token) throw new Error("not_signed_in");

  const r = await fetch(`${API_BASE}/api/jobs/tailored-kit`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      job: {
        title: jobContext?.title || "",
        company: jobContext?.company || "",
        description: jobContext?.description || "",
        source: jobContext?.sourceUrl || "",
      },
    }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j?.detail || j?.error || `tailor_failed_${r.status}`);
  }
}
