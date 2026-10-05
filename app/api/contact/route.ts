// app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { alertContact } from '@/lib/chatAlerts';
import { forwardPlenqorLead } from '@/lib/plenqorLeads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Incoming = {
  name: string;
  email: string;
  subject?: string | null;
  message: string;
  keyman_id?: string | null;
  path?: string | null;
  ref?: string | null;
};

function isEmail(x: string) {
  return /^\S+@\S+\.\S+$/.test(x);
}

const MAX = { name: 120, email: 200, subject: 200, message: 4000 } as const;

/** Trim, cap length, and drop control characters. Content is still stored verbatim
 *  otherwise — escaping is the renderer's job, never the database's. */
function clean(v: unknown, max: number): string {
  return String(v ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);
}

/** Automated probes (blind-XSS scanners, SQLi fuzzers) and link spam. These are
 *  stored but never announced, so they can't flood Chat or the Plenqor CRM. */
function looksAutomated(...parts: string[]): boolean {
  const t = parts.join(' \n ').toLowerCase();
  if (/<\s*script|onerror\s*=|javascript:|<\s*img[^>]*src|<\/(title|style|textarea|script)\s*>/.test(t)) return true;
  if (/xss\.report|burpcollaborator|oastify|interact\.sh|\.onion\b/.test(t)) return true;
  if (/union\s+select|\bor\s+1\s*=\s*1\b|\$\{jndi:/.test(t)) return true;
  if ((t.match(/https?:\/\//g) || []).length >= 5) return true;
  return false;
}

/** Crude per-IP throttle backed by the contacts table: no Redis in this stack. */
async function tooManyFromIp(ip: string | null): Promise<boolean> {
  if (!ip) return false;
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const n = await prisma.contact.count({ where: { ip, createdAt: { gte: since } } });
  return n >= 5;
}

export async function POST(req: NextRequest) {
  try {
    const h = req.headers;

    const country = h.get('x-vercel-ip-country') || null;
    const region  = h.get('x-vercel-ip-country-region') || null;
    const city    = h.get('x-vercel-ip-city') || null;
    const postal  = h.get('x-vercel-ip-postal-code') || null;
    const latStr  = h.get('x-vercel-ip-latitude');
    const lonStr  = h.get('x-vercel-ip-longitude');

    const ip =
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      // @ts-ignore (Node runtime sometimes exposes this)
      (req as any).ip ||
      null;

    const ua  = h.get('user-agent') || null;
    const ref = h.get('referer') || null;
    const path = req.nextUrl.pathname + (req.nextUrl.search || '');

    const body = (await req.json().catch(() => ({}))) as Incoming;

    const name    = clean(body.name, MAX.name);
    const email   = clean(body.email, MAX.email);
    const subject = clean(body.subject, MAX.subject) || null;
    const message = clean(body.message, MAX.message);
    const keyman  = (body.keyman_id ?? '').trim() || null;

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'invalid_name' }, { status: 400 });
    }
    if (!isEmail(email)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }
    if (!message || message.length < 2) {
      return NextResponse.json({ error: 'invalid_message' }, { status: 400 });
    }

    if (await tooManyFromIp(ip)) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    // Probes still get a 201 so the scanner sees nothing interesting, but they
    // are flagged and never reach Chat or the CRM.
    const automated = looksAutomated(name, email, subject ?? '', message);

    const created = await prisma.contact.create({
      data: {
        name,
        email,
        subject,
        message,
        keymanId: keyman,
        path: body.path ?? path,
        ref: body.ref ?? ref,
        ua,
        ip,
        ipCountry: country,
        ipRegion: region,
        ipCity: city,
        ipPostal: postal,
        ipLat: latStr ? Number(latStr) : null,
        ipLon: lonStr ? Number(lonStr) : null,
      },
      select: { id: true, createdAt: true },
    });

    if (automated) {
      console.warn('[contact] automated submission suppressed', { id: created.id, ip, country });
    } else {
      void alertContact({ name, email, subject, message, country, city, path: body.path ?? path, ref: body.ref ?? ref, id: created.id });
      forwardPlenqorLead({ source: 'resumemint-contact', email, name, country, message: subject ? `${subject}\n\n${message}` : message, pageUrl: body.path ?? path, referrer: body.ref ?? ref });
    }
    return NextResponse.json(
      { ok: true, id: created.id, created_at: created.createdAt.toISOString() },
      { status: 201 },
    );
  } catch (e: any) {
    console.error('[contact] error', e);
    return NextResponse.json(
      { error: 'contact_failed', detail: 'Something went wrong on our side. Please try again.' },
      { status: 500 },
    );
  }
}
