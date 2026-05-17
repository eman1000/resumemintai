// app/api/billing/subscribe/route.ts
//
// Authed in-app flow: turn a confirmed SetupIntent into a Subscription on the
// current user's Stripe customer. No orphan-merge logic because the matching
// /setup-intent route always uses users.stripe_customer_id as the single
// identity — there's no parallel "guest" account to reconcile.
//
// Webhook /api/webhooks/stripe remains source of truth for downstream
// subscription state mutations. This route caches into public.subscriptions
// opportunistically.
//
// Body: { setupIntentId, priceId? }
//   - priceId defaults to STRIPE_PRICE_ID (server-side env, the price the
//     user agreed to on the LP / pricing page).
// Returns: { subscriptionId, status, currentPeriodEnd, cancelAtPeriodEnd, customerId, alreadySubscribed? }

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminAuth } from '@/lib/firebaseAdmin';
import prisma from '@/lib/prisma';
import { ensureDbUserByFirebaseUid } from '@/app/api/server/db/user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// @ts-ignore
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });
const DEFAULT_PRICE_ID = process.env.STRIPE_PRICE_ID || '';

async function getActiveOrTrialingSub(customerId: string) {
  try {
    const res = await stripe.subscriptions.search({
      query: `customer:"${customerId}" AND (status:"active" OR status:"trialing")`,
      limit: 1,
    });
    return res.data[0] ?? null;
  } catch {
    const res = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 10 });
    return res.data.find((s) => s.status === 'active' || s.status === 'trialing') ?? null;
  }
}

function periodEndDate(sub: Stripe.Subscription): Date | null {
  // @ts-ignore - typings sometimes lag behind Stripe API
  const ts = sub.current_period_end as number | undefined;
  return ts ? new Date(ts * 1000) : null;
}

export async function POST(req: Request) {
  try {
    const authz = req.headers.get('authorization') || '';
    const idToken = authz.startsWith('Bearer ') ? authz.slice(7) : '';
    if (!idToken) {
      return NextResponse.json({ error: 'missing_auth' }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      setupIntentId?: string;
      priceId?: string;
    };

    const setupIntentId = body.setupIntentId?.trim() || '';
    const priceId = (body.priceId?.trim() || DEFAULT_PRICE_ID).trim();

    if (!setupIntentId) {
      return NextResponse.json({ error: 'missing_setup_intent_id' }, { status: 400 });
    }
    if (!priceId) {
      return NextResponse.json({ error: 'missing_price_id' }, { status: 400 });
    }

    const dec = await adminAuth.verifyIdToken(idToken);
    const uid = dec.uid;
    const email = (dec.email || '').trim().toLowerCase() || null;

    // 1) Resolve our user + Stripe customer (single identity).
    const userId = await ensureDbUserByFirebaseUid(uid, email);
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });
    if (!me?.stripeCustomerId) {
      // The companion /setup-intent route should have created one; refuse if not.
      return NextResponse.json(
        { error: 'no_customer', detail: 'Call /api/billing/setup-intent first.' },
        { status: 409 },
      );
    }
    const customerId = me.stripeCustomerId;

    // 2) Verify the SetupIntent belongs to this customer and is confirmable.
    const si = await stripe.setupIntents.retrieve(setupIntentId);
    if (si.status !== 'succeeded' && si.status !== 'processing') {
      return NextResponse.json(
        { error: 'setup_incomplete', status: si.status },
        { status: 400 },
      );
    }
    const siCustomerId =
      typeof si.customer === 'string' ? si.customer : si.customer?.id ?? null;
    if (!siCustomerId || siCustomerId !== customerId) {
      return NextResponse.json({ error: 'customer_mismatch' }, { status: 403 });
    }
    const pm =
      typeof si.payment_method === 'string' ? si.payment_method : si.payment_method?.id;
    if (!pm) {
      return NextResponse.json({ error: 'no_payment_method' }, { status: 400 });
    }

    // 3) Short-circuit if already subscribed.
    const existing = await getActiveOrTrialingSub(customerId);
    if (existing) {
      const periodEnd = periodEndDate(existing);
      // Opportunistic cache (webhook re-asserts).
      await prisma.subscription.upsert({
        where: { id: existing.id },
        create: {
          id: existing.id,
          userId,
          status: existing.status,
          priceId: existing.items.data[0]?.price?.id ?? null,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: !!existing.cancel_at_period_end,
        },
        update: {
          status: existing.status,
          priceId: existing.items.data[0]?.price?.id ?? null,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: !!existing.cancel_at_period_end,
        },
      });
      return NextResponse.json({
        alreadySubscribed: true,
        subscriptionId: existing.id,
        status: existing.status,
        cancelAtPeriodEnd: !!existing.cancel_at_period_end,
        currentPeriodEnd: periodEnd?.toISOString() ?? null,
        customerId,
      });
    }

    // 4) Make sure the PM is the default for invoices (helps off-session renewals).
    try {
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: pm },
      });
    } catch {
      // non-fatal
    }

    // 5) Create the subscription with a deterministic idempotency key.
    const trialDays = Number(process.env.STRIPE_TRIAL_DAYS ?? 0);
    const idemKey = `subscribe:${userId}:${setupIntentId}:${priceId}`;

    const sub = await stripe.subscriptions.create(
      {
        customer: customerId,
        items: [{ price: priceId }],
        default_payment_method: pm,
        trial_period_days: trialDays > 0 ? trialDays : undefined,
        trial_settings:
          trialDays > 0
            ? { end_behavior: { missing_payment_method: 'cancel' } }
            : undefined,
        payment_behavior: 'allow_incomplete',
        metadata: { accountId: userId, activated_by_setup_intent: setupIntentId },
        expand: ['latest_invoice.payment_intent'],
      },
      { idempotencyKey: idemKey },
    );

    // Cache. Webhook will re-assert later.
    const periodEnd = periodEndDate(sub);
    await prisma.subscription.upsert({
      where: { id: sub.id },
      create: {
        id: sub.id,
        userId,
        status: sub.status,
        priceId: sub.items.data[0]?.price?.id ?? null,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: !!sub.cancel_at_period_end,
      },
      update: {
        status: sub.status,
        priceId: sub.items.data[0]?.price?.id ?? null,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: !!sub.cancel_at_period_end,
      },
    });

    return NextResponse.json({
      subscriptionId: sub.id,
      status: sub.status,
      cancelAtPeriodEnd: !!sub.cancel_at_period_end,
      currentPeriodEnd: periodEnd?.toISOString() ?? null,
      customerId,
    });
  } catch (e: any) {
    console.error('[billing/subscribe] error', e);
    return NextResponse.json(
      { error: 'subscribe_failed', detail: e?.message || 'unexpected_error' },
      { status: 500 },
    );
  }
}
