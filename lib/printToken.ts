// lib/printToken.ts
//
// Short-lived signed token used so the server can let Puppeteer fetch
// /render/resume/[id]/print without a Firebase session. We derive a
// dedicated print-token key from the existing EXTERNAL_UID_HMAC_KEY so we
// don't conflate concerns and don't need a new env var.

import crypto from 'node:crypto';

function getKey(): Buffer {
  const base = process.env.EXTERNAL_UID_HMAC_KEY || 'dev-only-fallback-do-not-use-in-prod';
  return crypto.createHmac('sha256', base).update('print-token-v1').digest();
}

/** Sign a token authorising the bearer to render `resumeId` for `ttlSec` seconds. */
export function signPrintToken(resumeId: string, ttlSec = 60): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const payload = `${resumeId}.${exp}`;
  const sig = crypto.createHmac('sha256', getKey()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

/** Returns the resumeId if the token is valid and unexpired, otherwise null. */
export function verifyPrintToken(token: string): { resumeId: string } | null {
  if (typeof token !== 'string' || !token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [resumeId, expStr, sig] = parts;
  const exp = parseInt(expStr, 10);
  if (!Number.isFinite(exp)) return null;
  if (exp < Math.floor(Date.now() / 1000)) return null;
  const expected = crypto
    .createHmac('sha256', getKey())
    .update(`${resumeId}.${expStr}`)
    .digest('base64url');
  // Constant-time compare.
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return { resumeId };
}
