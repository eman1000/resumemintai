import crypto from 'crypto';

const HMAC_KEY = process.env.EXTERNAL_UID_HMAC_KEY || 'dev-secret-change-me';

export function generateExternalUid(): string {
  return 'RM-ID-' + crypto.randomBytes(12).toString('base64url');
}

export function mintUrlToken(uid: string, ttlSeconds = 7 * 24 * 3600) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = crypto.createHmac('sha256', HMAC_KEY).update(`${uid}|${exp}`).digest('base64url');
  return { uid, exp, sig };
}
