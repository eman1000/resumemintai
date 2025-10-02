// runtime: nodejs
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SubRow = {
  subscriptionId: string;
  status: string;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: FirebaseFirestore.Timestamp | null;
  canceledAt?: FirebaseFirestore.Timestamp | null;
  updatedAt?: FirebaseFirestore.Timestamp | null;
  priceId?: string | null;
  customerId?: string | null;
};

const ACTIVE = new Set(['active', 'trialing', 'past_due']);

function computeSubscribed(sub: SubRow | null): boolean {
  if (!sub) return false;

  // Immediate cancel => status "canceled"
  if (sub.status === 'canceled') return false;

  // If it's active/trialing/past_due, it's usable until the end of the current period.
  if (ACTIVE.has(sub.status)) {
    const end = sub.currentPeriodEnd?.toDate?.() as Date | undefined;
    if (!end) return true; // be permissive if missing
    return end.getTime() > Date.now();
  }

  return false;
}

export async function GET(req: NextRequest) {
  try {
    // auth (optional but preferred)
    const authz = req.headers.get('authorization') || '';
    const idToken = authz.startsWith('Bearer ') ? authz.slice(7) : '';
    let uid = '';
    if (idToken) {
      const dec = await adminAuth.verifyIdToken(idToken);
      uid = dec.uid;
    }

    // If no auth, try cookie fallback (external_uid -> accounts doc), optional for your app
    if (!uid) {
      const ext = req.cookies.get('external_uid')?.value || '';
      if (ext) {
        const byExt = await adminDb.collection('accounts')
          .where('externalUid', '==', ext).limit(1).get();
        if (!byExt.empty) uid = byExt.docs[0].id;
      }
    }

    if (!uid) {
      return NextResponse.json({ subscribed: false, latest: null });
    }

    // Grab the most recent sub row for this account
    const snap = await adminDb.collection('stripeSubs')
      .where('accountId', '==', uid)
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get();

    const latest: SubRow | null = snap.empty
      ? null
      : (snap.docs[0].data() as any);

    const subscribed = computeSubscribed(latest);

    // lightweight payload to the client (convert Timestamps to ISO)
    const toIso = (t?: FirebaseFirestore.Timestamp | null) =>
      t?.toDate ? t.toDate().toISOString() : null;

    return NextResponse.json({
      subscribed,
      latest: latest
        ? {
            subscriptionId: latest.subscriptionId,
            status: latest.status,
            cancelAtPeriodEnd: !!latest.cancelAtPeriodEnd,
            currentPeriodEnd: toIso(latest.currentPeriodEnd ?? null),
            canceledAt: toIso(latest.canceledAt ?? null),
            priceId: latest.priceId ?? null,
            customerId: latest.customerId ?? null,
            updatedAt: toIso(latest.updatedAt ?? null),
          }
        : null,
    });
  } catch (e: any) {
    console.error('[billing/status] error', e);
    return NextResponse.json({ error: 'status_failed' }, { status: 500 });
  }
}
