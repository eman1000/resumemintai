// app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../server/db/pool';
import { run } from '../server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Incoming = {
  name: string;
  email: string;
  subject?: string | null;
  message: string;
  keyman_id?: string | null;
  // optionally sent by the form; server will also infer headers
  path?: string | null;
  ref?: string | null;
};

function isEmail(x: string) {
  return /^\S+@\S+\.\S+$/.test(x);
}

export async function POST(req: NextRequest) {
  try {
    const h = req.headers;

    // Vercel geo/IP headers (safe defaults if not present)
    const country = h.get('x-vercel-ip-country') || null;
    const region  = h.get('x-vercel-ip-country-region') || null;
    const city    = h.get('x-vercel-ip-city') || null;
    const postal  = h.get('x-vercel-ip-postal-code') || null;
    const lat     = h.get('x-vercel-ip-latitude') || null;
    const lon     = h.get('x-vercel-ip-longitude') || null;

    const ip =
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      // @ts-ignore (Node runtime sometimes exposes this)
      (req as any).ip ||
      null;

    const ua  = h.get('user-agent') || null;
    const ref = h.get('referer') || null;
    const path = req.nextUrl.pathname + (req.nextUrl.search || '');

    const body = (await req.json().catch(() => ({}))) as Incoming;

    // Basic validation
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

    // Insert
    const sql = `
      INSERT INTO public.contacts
        (name, email, subject, message,
         keyman_id, path, ref, ua, ip,
         ip_country, ip_region, ip_city, ip_postal, ip_lat, ip_lon, country)
      VALUES
        ($1,   $2,    $3,      $4,
         $5,       $6,  $7, $8, $9::inet,
         $10,       $11,      $12,      $13,      $14::double precision, $15::double precision, NULL)
      RETURNING id, created_at
    `;

    const params = [
      name,
      email,
      subject,
      message,
      keyman,
      body.path ?? path,
      body.ref ?? ref,
      ua,
      ip,
      country,
      region,
      city,
      postal,
      lat ? Number(lat) : null,
      lon ? Number(lon) : null,
    ];

    const out = await run(pool, async (c) => {
      const { rows } = await c.query(sql, params);
      return rows[0];
    });

    return NextResponse.json(
      { ok: true, id: out.id, created_at: out.created_at },
      { status: 201 }
    );
  } catch (e: any) {
    console.error('[contact] error', e);
    return NextResponse.json(
      { error: 'contact_failed', detail: e?.message || 'unexpected_error' },
      { status: 500 }
    );
  }
}
