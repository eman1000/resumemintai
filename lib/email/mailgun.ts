// lib/email/mailgun.ts
//
// Thin Mailgun wrapper. Mirrors the pattern from revance-leads'
// emailService.js — one client, one send(). No-ops with a console.log when
// MAILGUN_API_KEY isn't set, so local dev and missing-env preview deploys
// don't blow up.
//
// ENV (set on Vercel when you're ready to send real mail):
//   MAILGUN_API_KEY        — Mailgun private API key
//   MAILGUN_DOMAIN         — e.g. mg.resumemintai.com   (or use the EU host)
//   MAILGUN_HOST_REGION    — optional; "us" (default) or "eu"
//   EMAIL_FROM             — From header, default `ResumeMint <noreply@${MAILGUN_DOMAIN}>`

import formData from 'form-data';
import Mailgun from 'mailgun.js';

type SendArgs = {
  to: string | string[];
  subject: string;
  html: string;
  /** Optional plaintext fallback. We auto-derive a basic one if omitted. */
  text?: string;
  /** Reply-To header — defaults to EMAIL_SUPPORT if set. */
  replyTo?: string;
  /** Tags surface in Mailgun analytics — handy for "job-match", "welcome". */
  tags?: string[];
  /** o:deliverytime for scheduled sends; RFC 2822 string. */
  scheduledAt?: string;
};

const API_KEY = process.env.MAILGUN_API_KEY || '';
const DOMAIN = process.env.MAILGUN_DOMAIN || '';
const REGION = (process.env.MAILGUN_HOST_REGION || 'us').toLowerCase();
const DEFAULT_FROM =
  process.env.EMAIL_FROM ||
  (DOMAIN ? `ResumeMint <noreply@${DOMAIN}>` : 'ResumeMint <noreply@resumemintai.com>');
const SUPPORT = process.env.EMAIL_SUPPORT || 'support@resumemintai.com';

let _mg: ReturnType<ReturnType<typeof Mailgun>['client']> | null = null;
function getClient() {
  if (!API_KEY) return null;
  if (_mg) return _mg;
  const mailgun = new (Mailgun as any)(formData);
  _mg = mailgun.client({
    username: 'api',
    key: API_KEY,
    url: REGION === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net',
  });
  return _mg;
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d|tr|td)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&rarr;/g, '→')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function sendEmail(args: SendArgs): Promise<{ ok: boolean; id?: string; skipped?: boolean }> {
  const mg = getClient();
  const tos = Array.isArray(args.to) ? args.to : [args.to];
  const tags = args.tags || [];

  // Local dev / missing env: log and skip rather than throw.
  if (!mg || !DOMAIN) {
    console.log(
      `[email/skipped] (no MAILGUN_API_KEY or MAILGUN_DOMAIN)\n  to: ${tos.join(', ')}\n  subject: ${args.subject}\n  tags: ${tags.join(', ') || '(none)'}`,
    );
    return { ok: false, skipped: true };
  }

  try {
    const messageData: Record<string, any> = {
      from: DEFAULT_FROM,
      to: tos,
      subject: args.subject,
      html: args.html,
      text: args.text || htmlToText(args.html),
    };
    if (args.replyTo) messageData['h:Reply-To'] = args.replyTo;
    if (tags.length) messageData['o:tag'] = tags;
    if (args.scheduledAt) messageData['o:deliverytime'] = args.scheduledAt;

    const resp = await (mg as any).messages.create(DOMAIN, messageData);
    return { ok: true, id: resp?.id };
  } catch (e: any) {
    console.error('[email] send failed:', e?.message || e);
    return { ok: false };
  }
}

export const EMAIL_DEFAULTS = {
  from: DEFAULT_FROM,
  domain: DOMAIN,
  support: SUPPORT,
};
