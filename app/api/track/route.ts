import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/app/api/server/auth/firebase-admin';
import pool from '../server/db/pool';
import { run } from '../server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Incoming = {
  event: string;
  props?: Record<string, any>;
  ts?: number;
  dedupeKey?: string | null;
};

function fromMs(ms?: number): string {
  const t = typeof ms === 'number' && isFinite(ms) ? new Date(ms) : new Date();
  return t.toISOString();
}

// keep event safe for DB / analytics (matches typical CHECK constraint)
function normalizeEvent(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 64).replace(/^_+|_+$/g, '');
}

export async function POST(req: NextRequest) {
  try {
    // ── Auth (optional)
    const authz = req.headers.get('authorization') || '';
    const idToken = authz.startsWith('Bearer ') ? authz.slice(7) : '';
    let uid: string | null = null;
    if (idToken) {
      try {
        const dec = await adminAuth().verifyIdToken(idToken);
        uid = dec.uid;
      } catch { /* anonymous allowed */ }
    }

    // ── Read body safely (avoid Body is unusable)
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

    // Vercel geo headers
    const ip_country  = h.get('x-vercel-ip-country') || null;
    const region_code = h.get('x-vercel-ip-country-region') || null;
    const city        = h.get('x-vercel-ip-city') || null;
    const postal_code = h.get('x-vercel-ip-postal-code') || null;
    const latStr      = h.get('x-vercel-ip-latitude');
    const lonStr      = h.get('x-vercel-ip-longitude');
    const lat = latStr ? Number(latStr) : null;
    const lon = lonStr ? Number(lonStr) : null;

    // Accept ANY event; just require it to exist and normalize it
    const rows = payloads
      .filter((p): p is Incoming => !!p && typeof (p as any).event === 'string' && (p as any).event.trim().length > 0)
      .map((p) => {
        const props = p.props ?? {};
        const keyman_id: string | null =
          typeof (props as any).keyman_id === 'string' ? (props as any).keyman_id : null;

        const event = normalizeEvent(p.event);

        // if event becomes empty after normalization, drop it
        if (!event) return null as any;

        return {
          event,
          props: JSON.stringify(props),
          keyman_id,
          uid,
          ua,
          ip: ipHeader,
          ref,
          path,
          ts_client: fromMs(p.ts ?? Date.now()),
          ts_server: new Date().toISOString(),
          dedupe_key: p.dedupeKey ?? null,
          ip_country,
          region_code,
          city,
          postal_code,
          lat,
          lon,
          geo_source: 'vercel' as const,
          country: null as string | null, // reserved for page-target country later
        };
      })
      .filter(Boolean);

    if (rows.length === 0) return NextResponse.json({ ok: true, inserted: 0 });

    await run(pool, async (c) => {
      const text = `
        INSERT INTO public.events
          (event, props, keyman_id, uid, ua, ip, ref, path,
           ts_client, ts_server, dedupe_key,
           ip_country, region_code, city, postal_code, lat, lon, geo_source, country)
        VALUES
          ($1, $2::jsonb, $3, $4, $5, $6::inet, $7, $8,
           $9::timestamptz, $10::timestamptz, $11,
           $12, $13, $14, $15, $16, $17, $18, $19)
        ON CONFLICT (event, dedupe_key) DO NOTHING
      `;
      // no explicit BEGIN/COMMIT: single-statement idempotent inserts
      for (const r of rows) {
        await c.query(text, [
          r.event, r.props, r.keyman_id, r.uid, r.ua, r.ip, r.ref, r.path,
          r.ts_client, r.ts_server, r.dedupe_key,
          r.ip_country, r.region_code, r.city, r.postal_code, r.lat, r.lon, r.geo_source, r.country,
        ]);
      }
    });

    return NextResponse.json({ ok: true, inserted: rows.length });
  } catch (e: any) {
    console.error('[track] error', e);
    // Never break the page due to analytics
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
