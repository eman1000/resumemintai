// app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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

    const name    = (body.name ?? '').trim();
    const email   = (body.email ?? '').trim();
    const subject = (body.subject ?? '').trim() || null;
    const message = (body.message ?? '').toString().trim();
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

    return NextResponse.json(
      { ok: true, id: created.id, created_at: created.createdAt.toISOString() },
      { status: 201 },
    );
  } catch (e: any) {
    console.error('[contact] error', e);
    return NextResponse.json(
      { error: 'contact_failed', detail: e?.message || 'unexpected_error' },
      { status: 500 },
    );
  }
}
