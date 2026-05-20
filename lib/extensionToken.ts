// lib/extensionToken.ts
//
// HMAC-signed long-lived token used by the ResumeMint Chrome extension to
// authenticate API calls. Format: `<userId>.<expSec>.<sig>`.
// Key is derived from EXTERNAL_UID_HMAC_KEY so we don't need a new env var.

import crypto from "node:crypto";

function getKey(): Buffer {
  const base = process.env.EXTERNAL_UID_HMAC_KEY || "dev-only-fallback-do-not-use-in-prod";
  return crypto.createHmac("sha256", base).update("extension-token-v1").digest();
}

const DEFAULT_TTL_SEC = 60 * 60 * 24 * 30; // 30 days

export function signExtensionToken(userId: string, ttlSec = DEFAULT_TTL_SEC): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const payload = `${userId}.${exp}`;
  const sig = crypto.createHmac("sha256", getKey()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyExtensionToken(token: string): { userId: string } | null {
  if (typeof token !== "string" || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expStr, sig] = parts;
  const exp = parseInt(expStr, 10);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  const expected = crypto
    .createHmac("sha256", getKey())
    .update(`${userId}.${expStr}`)
    .digest("base64url");
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return { userId };
}

/**
 * Reads `Authorization: Bearer <ext-token>` from a request, verifies the
 * signature, and returns the userId. Throws on missing / invalid token.
 */
export function userIdFromExtensionRequest(req: Request): string {
  const authz = req.headers.get("authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7).trim() : "";
  const v = verifyExtensionToken(token);
  if (!v) {
    const err: any = new Error("unauthorized");
    err.code = "UNAUTHORIZED";
    throw err;
  }
  return v.userId;
}
