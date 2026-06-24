// lib/storage.ts
// Unified object storage for ALL uploads/generations (recruiter resumes,
// candidate resume/cover-letter thumbnails, generated PDFs, etc.).
//
// Primary backend: Cloudflare R2 (S3-compatible) via aws4fetch (tiny signer,
// small cold-start cost). Falls back to Firebase Storage automatically if R2
// isn't configured, so this is a zero-downtime cutover — existing Firebase URLs
// keep working; new uploads go to R2 the moment the env is present.

import { AwsClient } from "aws4fetch";

const R2_ENDPOINT = process.env.R2_ENDPOINT || "";
const R2_BUCKET = process.env.R2_BUCKET || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_PUBLIC_BASE_URL = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");

export function r2Configured(): boolean {
  return !!(R2_ENDPOINT && R2_BUCKET && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_PUBLIC_BASE_URL);
}

let _client: AwsClient | null = null;
function client(): AwsClient {
  if (!_client) {
    _client = new AwsClient({
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
      region: process.env.R2_REGION || "auto",
      service: "s3",
    });
  }
  return _client;
}

/**
 * Upload a buffer to object storage and return a public URL.
 * @param key  object key (path), e.g. "thumbnails/abc.png"
 */
export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
  opts?: { cacheControl?: string },
): Promise<string> {
  const cleanKey = key.replace(/^\/+/, "");

  if (r2Configured()) {
    const url = `${R2_ENDPOINT}/${R2_BUCKET}/${cleanKey}`;
    // Retry transient failures — serverless R2 PUTs occasionally drop under load.
    let lastErr: unknown = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await client().fetch(url, {
          method: "PUT",
          body,
          headers: {
            "content-type": contentType || "application/octet-stream",
            "cache-control": opts?.cacheControl || "public, max-age=31536000, immutable",
          },
        });
        if (res.ok) return `${R2_PUBLIC_BASE_URL}/${cleanKey}`;
        lastErr = `status ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`;
      } catch (e) {
        lastErr = e;
      }
      await new Promise((r) => setTimeout(r, 150 * attempt));
    }
    // R2 failed after retries → fall back to Firebase rather than lose the file.
    console.warn(`[storage] R2 upload failed for ${cleanKey}, falling back to Firebase:`, lastErr);
  }

  // Fallback: Firebase Storage (legacy / R2 failure).
  const { adminBucket } = await import("@/lib/firebaseAdmin");
  const file = adminBucket.file(cleanKey);
  await file.save(body, {
    contentType: contentType || "application/octet-stream",
    resumable: false,
    public: true,
    metadata: { cacheControl: opts?.cacheControl || "public, max-age=31536000, immutable" },
  });
  return `https://storage.googleapis.com/${adminBucket.name}/${cleanKey}`;
}
