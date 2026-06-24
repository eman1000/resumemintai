// lib/resumeStore.ts
// Persist an uploaded candidate resume file to Firebase Storage so recruiters
// can view/download it later. Mirrors the thumbnail upload pattern.

import crypto from "node:crypto";
import { adminBucket } from "@/lib/firebaseAdmin";

function safeName(name: string): string {
  return (name || "resume")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
}

/** Upload a resume file buffer; returns a public download URL. */
export async function storeShortlistResume(
  buf: Buffer,
  filename: string,
  contentType: string,
): Promise<string | null> {
  try {
    const objectPath = `shortlist-resumes/${crypto.randomUUID()}-${safeName(filename)}`;
    const file = adminBucket.file(objectPath);
    await file.save(buf, {
      contentType: contentType || "application/octet-stream",
      resumable: false,
      public: true,
      metadata: { cacheControl: "private, max-age=0" },
    });
    return `https://storage.googleapis.com/${adminBucket.name}/${objectPath}`;
  } catch (e) {
    console.warn("[resumeStore] upload failed:", (e as any)?.message || e);
    return null;
  }
}
