// lib/resumeStore.ts
// Persist an uploaded candidate resume so recruiters can view/download it later.
// Stored via the unified storage layer (Cloudflare R2, Firebase fallback).

import crypto from "node:crypto";
import { putObject } from "@/lib/storage";

function safeName(name: string): string {
  return (name || "resume")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
}

/** Upload a resume file buffer; returns a public download URL (or null on failure). */
export async function storeShortlistResume(
  buf: Buffer,
  filename: string,
  contentType: string,
): Promise<string | null> {
  try {
    const key = `shortlist-resumes/${crypto.randomUUID()}-${safeName(filename)}`;
    return await putObject(key, buf, contentType || "application/octet-stream", { cacheControl: "private, max-age=0" });
  } catch (e) {
    console.warn("[resumeStore] upload failed:", (e as any)?.message || e);
    return null;
  }
}
