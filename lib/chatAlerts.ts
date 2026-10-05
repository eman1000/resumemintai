// Google Chat alerts for ResumeMint leads (space webhook in RESUMEMINT_CHAT_WEBHOOK_URL).
// Fire-and-forget: never throws, never blocks a request path. Registered with Vercel's
// waitUntil so the function is not frozen before the webhook call completes.
import { waitUntil } from '@vercel/functions';

export async function postChat(text: string): Promise<void> {
  const url = process.env.RESUMEMINT_CHAT_WEBHOOK_URL;
  if (!url) return;
  const p = fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(5000),
  }).then(() => undefined, (e) => console.warn('[chatAlerts] post failed', (e as Error)?.message));
  try { waitUntil(p); } catch { /* not inside a Vercel request context */ }
  await p;
}

const base = () => (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.resumemintai.com').replace(/\/$/, '');
const clip = (s: string | null | undefined, n = 300) => (s ? (s.length > n ? s.slice(0, n) + '…' : s) : '');

export function alertContact(c: { name: string; email: string; subject?: string | null; message: string; country?: string | null; city?: string | null; path?: string | null; ref?: string | null; id?: string }) {
  const where = [c.city, c.country].filter(Boolean).join(', ');
  return postChat([
    `✉️ *ResumeMint contact message* from ${c.name} <${c.email}>${where ? ` (${where})` : ''}`,
    c.subject ? `Subject: ${c.subject}` : null,
    `“${clip(c.message)}”`,
    [c.path ? `Page: ${c.path}` : null, c.ref ? `Ref: ${c.ref}` : null].filter(Boolean).join(' · ') || null,
    c.id ? `Contact id: ${c.id}` : null,
  ].filter(Boolean).join('\n'));
}

export function alertSignup(u: { email: string | null; userId: string; userType?: string | null; country?: string | null }) {
  return postChat([
    `🆕 *New ResumeMint signup*: ${u.email || '(no email)'}${u.country ? ` (${u.country})` : ''}${u.userType && u.userType !== 'candidate' ? ` · ${u.userType}` : ''}`,
    `Admin: ${base()}/admin/users/${u.userId}`,
  ].join('\n'));
}

export function alertRecruiter(u: { email: string | null; userId: string; companyName?: string | null }) {
  return postChat([
    `🧑‍💼 *Recruiter onboarded*: ${u.email || '(no email)'}${u.companyName ? ` · ${u.companyName}` : ''}`,
    `Admin: ${base()}/admin/users/${u.userId}`,
  ].join('\n'));
}

export function alertSubscription(s: { email: string | null; userId?: string | null; plan?: string | null; amount?: string | null; interval?: string | null; status?: string | null; trial?: boolean }) {
  return postChat([
    `💳 *ResumeMint ${s.trial ? 'trial started' : 'new subscription'}*: ${s.email || '(email unknown)'}`,
    [s.plan, s.amount ? `${s.amount}${s.interval ? '/' + s.interval : ''}` : null, s.status].filter(Boolean).join(' · ') || null,
    s.userId ? `Admin: ${base()}/admin/users/${s.userId}` : null,
  ].filter(Boolean).join('\n'));
}
