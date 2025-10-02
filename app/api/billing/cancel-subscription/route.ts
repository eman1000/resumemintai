// app/api/billing/cancel-subscription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Stripe SDK
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    // @ts-ignore
  apiVersion: '2024-06-20',
});

// Considered "active" for your app logic
const ACTIVE = new Set(['active', 'trialing', 'past_due'] as const);

type Body = {
  // If passed, we cancel this exact subscription.
  // If omitted, we'll locate the caller's active sub via Firestore (stripeSubs) using their uid.
  subscriptionId?: string;

  // 'at_period_end' (default) or 'now'
  mode?: 'at_period_end' | 'now';

  // Only used when mode === 'now': whether to prorate the final invoice (default true)
  prorate?: boolean;
};

async function findUsersActiveSubscription(uid: string): Promise<string | null> {
  // Look up your cached subs (written by your webhook) for this accountId
  const snap = await adminDb
    .collection('stripeSubs')
    .where('accountId', '==', uid)
    .orderBy('updatedAt', 'desc')
    .limit(20)
    .get();

  // Pick the newest active-ish one
  for (const d of snap.docs) {
    const status = (d.get('status') || '').toString();
    if (ACTIVE.has(status as any)) return d.id; // the doc id is sub.id in your webhook
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    // 1) Auth: require Firebase ID token
    const authz = req.headers.get('authorization') || '';
    const idToken = authz.startsWith('Bearer ') ? authz.slice(7) : '';
    if (!idToken) {
      return NextResponse.json({ error: 'missing_auth' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    // 2) Parse body
    const { subscriptionId: bodySubId, mode = 'at_period_end', prorate = true } =
      (await req.json().catch(() => ({}))) as Body;

    // 3) Get the subscription id either from body or by looking up user's active sub
    const subscriptionId =
      bodySubId || (await findUsersActiveSubscription(uid));
    if (!subscriptionId) {
      return NextResponse.json({ error: 'no_active_subscription' }, { status: 404 });
    }

    // 4) Safety: fetch the subscription from Stripe and confirm it belongs to this user
    const sub = await stripe.subscriptions.retrieve(subscriptionId);

    // We expect accountId to be stamped in metadata by your create-subscription flow
    const ownerAccountId = (sub.metadata?.accountId as string) || '';
    if (ownerAccountId && ownerAccountId !== uid) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    // 5) Perform cancellation
    let updated:
      | Stripe.Response<Stripe.Subscription>
      | Stripe.Subscription;

    if (mode === 'at_period_end') {
      // Set cancel_at_period_end: true
      updated = await stripe.subscriptions.update(
        subscriptionId,
        { cancel_at_period_end: true },
        { idempotencyKey: `sub-cancel-${subscriptionId}-atend` }
      );
    } else {
      // Cancel immediately; optionally prorate (creates a final invoice)
      updated = await stripe.subscriptions.cancel(
        subscriptionId,
        { prorate },
        { idempotencyKey: `sub-cancel-${subscriptionId}-now` }
      );
    }

    // 6) (Optional) Best-effort local cache update NOW;
    // Your webhook will also update it shortly, but this makes the UI snappy.
    try {
      await adminDb.collection('stripeSubs').doc(subscriptionId).set(
        {
          status: updated.status,
          cancelAtPeriodEnd: !!updated.cancel_at_period_end,
          cancelAt: updated.cancel_at ? new Date(updated.cancel_at * 1000) : null,
          canceledAt: updated.canceled_at ? new Date(updated.canceled_at * 1000) : null,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    } catch (_) {
      // Ignore; webhook is source of truth anyway
    }

    // 7) Respond with useful info for the UI
    return NextResponse.json({
      subscriptionId: updated.id,
      status: updated.status,
      cancel_at_period_end: updated.cancel_at_period_end,
      // @ts-ignore
      current_period_end: updated.current_period_end
      // @ts-ignore
        ? new Date(updated.current_period_end * 1000).toISOString()
        : null,
      canceled_at: updated.canceled_at
        ? new Date(updated.canceled_at * 1000).toISOString()
        : null,
    });
  } catch (e: any) {
    // Surface Stripe errors cleanly
    const msg =
      e?.raw?.message || e?.message || 'cancel_failed';
    const code = e?.raw?.code || e?.code;
    return NextResponse.json(
      { error: 'cancel_failed', message: msg, code },
      { status: 400 }
    );
  }
}
