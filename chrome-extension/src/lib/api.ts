// Wraps fetches to the ResumeMint backend. The bearer token is the long-lived
// extension token issued by /api/extension/exchange after the user signs in
// on the web app.

import type {
  FlatResume,
  AiField,
  StoredAuth,
  AgentRequest,
  AgentResponse,
} from "../types";
import { STORAGE_KEYS } from "../types";

export type ResumeSummary = {
  id: string;
  title: string;
  isTailored: boolean;
  tailoredFor?: { title?: string; company?: string; location?: string; source?: string };
  updatedAt: string;
};

const PROD_BASE = "https://www.resumemintai.com";
const DEV_BASE = "http://localhost:3000";
// Toggle by setting VITE_API_BASE=http://localhost:3000 when running dev.
const API_BASE = (import.meta as any).env?.VITE_API_BASE || PROD_BASE;

function devOrProd(): string {
  return API_BASE === PROD_BASE ? PROD_BASE : DEV_BASE;
}

export const RESUMEMINT_ORIGIN = devOrProd();

async function getToken(): Promise<string | null> {
  const out = await chrome.storage.local.get(STORAGE_KEYS.AUTH);
  const auth = out[STORAGE_KEYS.AUTH] as StoredAuth | undefined;
  return auth?.token ?? null;
}

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getToken();
  if (!token) throw new Error("Not signed in to ResumeMint.");
  const headers = new Headers(init?.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");
  return fetch(`${RESUMEMINT_ORIGIN}${path}`, { ...init, headers });
}

export async function fetchMe(): Promise<{ email: string; uid: string } | null> {
  try {
    const r = await authedFetch("/api/extension/me");
    if (!r.ok) return null;
    return (await r.json()).user;
  } catch {
    return null;
  }
}

export async function fetchResume(): Promise<FlatResume | null> {
  const r = await authedFetch("/api/extension/resume");
  if (!r.ok) return null;
  return (await r.json()) as FlatResume;
}

export async function aiFillFields(
  fields: AiField[],
  resume: FlatResume,
  pageContext?: { url?: string; title?: string },
): Promise<Record<string, string>> {
  const r = await authedFetch("/api/extension/fill-fields", {
    method: "POST",
    body: JSON.stringify({ fields, resume, pageContext }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j?.detail || j?.error || "fill_failed");
  }
  return (await r.json()).values as Record<string, string>;
}

export async function fetchResumes(): Promise<ResumeSummary[]> {
  const r = await authedFetch("/api/extension/resumes");
  if (!r.ok) return [];
  return ((await r.json()).resumes || []) as ResumeSummary[];
}

export async function agentPlan(
  req: AgentRequest & { resume: FlatResume; resumes: ResumeSummary[] },
): Promise<AgentResponse> {
  const r = await authedFetch("/api/extension/agent", {
    method: "POST",
    body: JSON.stringify(req),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j?.detail || j?.error || "agent_failed");
  }
  return (await r.json()) as AgentResponse;
}

/** Fetch the user's resume rendered as a PDF (for upload_resume actions).
 * Metered server-side (extension-resume-pdf feature). */
export async function fetchResumePdf(
  resumeId?: string,
): Promise<{ filename: string; base64: string }> {
  const qs = resumeId ? `?resumeId=${encodeURIComponent(resumeId)}` : "";
  const r = await authedFetch(`/api/extension/resume-pdf${qs}`);
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j?.detail || j?.error || "resume_pdf_failed");
  }
  return (await r.json()) as { filename: string; base64: string };
}

/** Computer-use planner turn. Sends the running message history; returns the
 * assistant turn's content blocks (tool_use actions + text). */
export async function computerPlan(req: {
  messages: Array<{ role: "user" | "assistant"; content: any[] }>;
  display?: { width: number; height: number };
}): Promise<{ content: any[]; stopReason?: string; modelUsed?: string }> {
  const r = await authedFetch("/api/extension/computer", {
    method: "POST",
    body: JSON.stringify(req),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j?.detail || j?.error || "computer_failed");
  }
  return (await r.json()) as { content: any[]; stopReason?: string; modelUsed?: string };
}

export async function logApply(args: {
  ats: string;
  jobUrl: string;
  jobSnapshot?: any;
}): Promise<{ id: string } | null> {
  try {
    const r = await authedFetch("/api/extension/log-apply", {
      method: "POST",
      body: JSON.stringify(args),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}
