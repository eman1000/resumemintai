// app/api/track/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/app/api/server/auth/firebase-admin';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Incoming = {
  event: string;
  props?: Record<string, any>;
  ts?: number;
  dedupeKey?: string | null;
};

function fromMs(ms?: number): Date {
  return typeof ms === 'number' && isFinite(ms) ? new Date(ms) : new Date();
}

function normalizeEvent(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 64).replace(/^_+|_+$/g, '');
}

export async function POST(req: NextRequest) {
  try {
    const authz = req.headers.get('authorization') || '';
    const idToken = authz.startsWith('Bearer ') ? authz.slice(7) : '';
    let uid: string | null = null;
    if (idToken) {
      try {
        const dec = await adminAuth().verifyIdToken(idToken);
        uid = dec.uid;
      } catch { /* anonymous allowed */ }
    }

    let raw = '';
    try { raw = await req.text(); } catch {}
    if (!raw || !raw.trim()) return NextResponse.json({ ok: true, inserted: 0 });

    let parsed: Incoming | Incoming[];
    try { parsed = JSON.parse(raw); } catch { return NextResponse.json({ ok: true, inserted: 0 }); }
    const payloads = Array.isArray(parsed) ? parsed : [parsed];

    const h = req.headers;
    const ipHeader =
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      // @ts-ignore (Node runtime sometimes exposes req.ip)
      (req as any).ip || null;

    const ua   = h.get('user-agent') || null;
    const ref  = h.get('referer') || null;
    const path = req.nextUrl.pathname + (req.nextUrl.search || '');

    const ip_country  = h.get('x-vercel-ip-country') || null;
    const region_code = h.get('x-vercel-ip-country-region') || null;
    const city        = h.get('x-vercel-ip-city') || null;
    const postal_code = h.get('x-vercel-ip-postal-code') || null;
    const latStr      = h.get('x-vercel-ip-latitude');
    const lonStr      = h.get('x-vercel-ip-longitude');
    const lat = latStr ? Number(latStr) : null;
    const lon = lonStr ? Number(lonStr) : null;

    const rows = payloads
      .filter((p): p is Incoming => !!p && typeof (p as any).event === 'string' && (p as any).event.trim().length > 0)
      .map((p) => {
        const props = p.props ?? {};
        const keyman_id: string | null =
          typeof (props as any).keyman_id === 'string' ? (props as any).keyman_id : null;

        const event = normalizeEvent(p.event);
        if (!event) return null;

        return {
          event,
          props: props as any,
          keymanId: keyman_id,
          uid,
          ua,
          ip: ipHeader,
          ref,
          path,
          tsClient: fromMs(p.ts ?? Date.now()),
          tsServer: new Date(),
          dedupeKey: p.dedupeKey ?? null,
          ipCountry: ip_country,
          regionCode: region_code,
          city,
          postalCode: postal_code,
          lat,
          lon,
          geoSource: 'vercel',
          country: null,
        };
      })
      .filter(Boolean) as Array<Parameters<typeof prisma.event.create>[0]['data']>;

    if (rows.length === 0) return NextResponse.json({ ok: true, inserted: 0 });

    // ON CONFLICT (event, dedupe_key) DO NOTHING via skipDuplicates
    const result = await prisma.event.createMany({
      data: rows,
      skipDuplicates: true,
    });

    return NextResponse.json({ ok: true, inserted: result.count });
  } catch (e: any) {
    console.error('[track] error', e);
    // Never break the page due to analytics
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
