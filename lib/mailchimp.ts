// Mailchimp audience sync for ResumeMint.
//
// Keeps one audience in step with the product so Mailchimp journeys can chase
// signups that never saved a card:
//   - signup            → contact added, tag `no-card` (+ `candidate`/`recruiter`)
//   - trial/sub active  → tag `subscribed`, `no-card` removed
//   - sub ended         → tag `churned`, `subscribed` removed
//
// Fire-and-forget like chatAlerts: never throws, never blocks a request. A
// no-op until MAILCHIMP_API_KEY (ends in "-usXX") and MAILCHIMP_AUDIENCE_ID are set.
import { createHash } from 'node:crypto';
import { waitUntil } from '@vercel/functions';

const apiKey = () => process.env.MAILCHIMP_API_KEY || '';
const audience = () => process.env.MAILCHIMP_AUDIENCE_ID || '';
const dc = () => apiKey().split('-').pop() || '';

export const mailchimpEnabled = () => !!(apiKey() && audience() && dc());

export const subscriberHash = (email: string) =>
  createHash('md5').update(email.trim().toLowerCase()).digest('hex');

async function mc(path: string, init: RequestInit & { json?: unknown } = {}) {
  const { json, ...rest } = init;
  const res = await fetch(`https://${dc()}.api.mailchimp.com/3.0${path}`, {
    ...rest,
    headers: {
      Authorization: `Basic ${Buffer.from(`any:${apiKey()}`).toString('base64')}`,
      'Content-Type': 'application/json',
      ...(rest.headers || {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`mailchimp ${res.status} ${path}: ${detail.slice(0, 300)}`);
  }
  return res.status === 204 ? null : res.json();
}

export type TagChange = { name: string; status: 'active' | 'inactive' };

/** Create-or-update a contact, then apply tag changes. Throws on API errors. */
export async function upsertContact(opts: {
  email: string;
  tags?: TagChange[];
  mergeFields?: Record<string, string>;
}) {
  const email = opts.email.trim().toLowerCase();
  const hash = subscriberHash(email);
  await mc(`/lists/${audience()}/members/${hash}`, {
    method: 'PUT',
    json: {
      email_address: email,
      status_if_new: 'subscribed',
      merge_fields: opts.mergeFields || {},
    },
  });
  if (opts.tags?.length) {
    await mc(`/lists/${audience()}/members/${hash}/tags`, {
      method: 'POST',
      json: { tags: opts.tags },
    });
  }
}

/** Fire-and-forget wrapper used from request paths. */
function background(label: string, fn: () => Promise<unknown>) {
  if (!mailchimpEnabled()) return;
  const p = fn().then(
    () => undefined,
    (e) => console.warn(`[mailchimp] ${label} failed`, (e as Error)?.message),
  );
  try { waitUntil(p); } catch { /* not inside a Vercel request context */ }
}

const isPlaceholder = (email?: string | null) =>
  !email || email.startsWith('guest+') || email.endsWith('@noemail.resumemint');

/** New account with no card yet. */
export function syncSignup(u: { email?: string | null; userType?: string | null; country?: string | null }) {
  if (isPlaceholder(u.email)) return;
  const email = u.email as string;
  background('signup', () =>
    upsertContact({
      email,
      tags: [
        { name: 'no-card', status: 'active' },
        { name: u.userType === 'recruiter' ? 'recruiter' : 'candidate', status: 'active' },
      ],
      mergeFields: {
        SIGNUP: new Date().toISOString().slice(0, 10),
        ...(u.country ? { COUNTRY: u.country } : {}),
      },
    }),
  );
}

/** Stripe subscription state changed (created / updated / deleted). */
export function syncSubscription(u: { email?: string | null; status: string }) {
  if (isPlaceholder(u.email)) return;
  const email = u.email as string;
  const live = ['active', 'trialing', 'past_due'].includes(u.status);
  background(`subscription:${u.status}`, () =>
    upsertContact({
      email,
      tags: live
        ? [
            { name: 'subscribed', status: 'active' },
            { name: 'no-card', status: 'inactive' },
            { name: 'churned', status: 'inactive' },
          ]
        : [
            { name: 'churned', status: 'active' },
            { name: 'subscribed', status: 'inactive' },
            { name: 'no-card', status: 'inactive' },
          ],
    }),
  );
}
