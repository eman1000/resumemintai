// app/api/track/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Incoming = {
  event: 'impression' | 'checkout_start' | 'sale' | string;
  props?: Record<string, any>;
  ts?: number;                 // client timestamp (ms)
  dedupeKey?: string | null;   // e.g. setup_intent id for "sale"
};

export async function POST(req: NextRequest) {
  try {
    const authz = req.headers.get('authorization') || '';
    const idToken = authz.startsWith('Bearer ') ? authz.slice(7) : '';

    let uid: string | null = null;
    if (idToken) {
      try {
        const dec = await adminAuth.verifyIdToken(idToken);
        uid = dec.uid;
      } catch {
        // ignore — anonymous/unknown visitor
      }
    }

    const body: Incoming | Incoming[] = await req.json();
    const payloads = Array.isArray(body) ? body : [body];

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      // @ts-ignore Vercel adds this in Node runtime sometimes
      (req as any).ip ||
      null;

    const ua = req.headers.get('user-agent') || null;
    const ref = req.headers.get('referer') || null;
    const path = req.nextUrl.pathname + (req.nextUrl.search || '');

    // basic allowlist
    const allowed = new Set(['impression', 'checkout_start', 'sale']);

    const batch = adminDb.batch();
    for (const p of payloads) {
      if (!p?.event || !allowed.has(p.event)) continue;

      const now = new Date();
      const docData = {
        event: p.event,
        props: p.props ?? {},
        uid,
        ua,
        ip,
        ref,
        path,
        ts_client: p.ts ?? Date.now(),
        ts_server: now,
      };

      // De-dupe: if a dedupeKey is present, upsert a doc with stable id
      if (p.dedupeKey) {
        const ref = adminDb.collection('events').doc(`dedupe_${p.event}_${p.dedupeKey}`);
        batch.set(ref, docData, { merge: false }); // idempotent
      } else {
        const ref = adminDb.collection('events').doc();
        batch.set(ref, docData);
      }
    }

    await batch.commit();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[track] error', e);
    return NextResponse.json({ error: 'track_failed', detail: e?.message }, { status: 500 });
  }
}
