// app/api/billing/guest/subscribe/route.ts
//
// Guest checkout activation. Takes a confirmed SetupIntent, derives the
// accountId from its metadata, and creates the Subscription on the
// associated Stripe customer. The user is expected to claim the account
// afterwards via /billing/return → /api/account/claim.
//
// Body: { setupIntentId, priceId? }
// Returns: { subscriptionId, status, customerId, accountId, currentPeriodEnd, cancelAtPeriodEnd }

import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { setStripeCustomerId } from '@/app/api/server/db/user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// @ts-ignore
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });
const DEFAULT_PRICE_ID = process.env.STRIPE_PRICE_ID || '';

function periodEndDate(sub: Stripe.Subscription): Date | null {
  // @ts-ignore
  const ts = sub.current_period_end as number | undefined;
  return ts ? new Date(ts * 1000) : null;
}

export async function POST(req: Request) {
  try {
    const { setupIntentId, priceId: priceIn } = (await req.json()) as {
      setupIntentId?: string;
      priceId?: string;
    };
    const priceId = (priceIn || DEFAULT_PRICE_ID).trim();
    if (!setupIntentId) {
      return NextResponse.json({ error: 'missing_setup_intent_id' }, { status: 400 });
    }
    if (!priceId) {
      return NextResponse.json({ error: 'missing_price_id' }, { status: 400 });
    }

    const si = await stripe.setupIntents.retrieve(setupIntentId);
    if (si.status !== 'succeeded' && si.status !== 'processing') {
      return NextResponse.json(
        { error: 'setup_incomplete', status: si.status },
        { status: 400 },
      );
    }

    const customerId =
      typeof si.customer === 'string' ? si.customer : (si.customer as any)?.id;
    if (!customerId) {
      return NextResponse.json({ error: 'no_customer' }, { status: 400 });
    }

    // Pull accountId from metadata on the SI or, as a fallback, the customer.
    let accountId = (si.metadata as any)?.accountId as string | undefined;
    if (!accountId) {
      const cust = (await stripe.customers.retrieve(customerId)) as Stripe.Customer;
      accountId = (cust.metadata as any)?.accountId || undefined;
    }
    if (!accountId) {
      return NextResponse.json({ error: 'no_account_id' }, { status: 400 });
    }

    const pm =
      typeof si.payment_method === 'string' ? si.payment_method : si.payment_method?.id;
    if (!pm) {
      return NextResponse.json({ error: 'no_payment_method' }, { status: 400 });
    }

    // Persist the customer mapping (best-effort; webhook re-asserts truth).
    try {
      await setStripeCustomerId(null, accountId, customerId);
    } catch (e) {
      console.warn('[guest/subscribe] setStripeCustomerId failed', e);
    }

    // Set default payment method for renewals.
    try {
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: pm },
        metadata: { accountId },
      });
    } catch {}

    const trialDays = Number(process.env.STRIPE_TRIAL_DAYS ?? 0);
    const idem = `guest-subscribe:${customerId}:${setupIntentId}:${priceId}`;

    const sub = await stripe.subscriptions.create(
      {
        customer: customerId,
        items: [{ price: priceId }],
        default_payment_method: pm,
        collection_method: 'charge_automatically',
        trial_period_days: trialDays > 0 ? trialDays : undefined,
        trial_settings:
          trialDays > 0
            ? { end_behavior: { missing_payment_method: 'cancel' } }
            : undefined,
        payment_behavior: 'allow_incomplete',
        metadata: { accountId },
        expand: ['latest_invoice.payment_intent'],
      },
      { idempotencyKey: idem },
    );

    const itemPrice = sub.items.data[0]?.price;
    return NextResponse.json({
      subscriptionId: sub.id,
      status: sub.status,
      cancelAtPeriodEnd: !!sub.cancel_at_period_end,
      currentPeriodEnd: periodEndDate(sub)?.toISOString() ?? null,
      customerId,
      accountId,
      priceAmount: itemPrice?.unit_amount ?? null,
      priceCurrency: itemPrice?.currency ?? null,
    });
  } catch (e: any) {
    console.error('[billing/guest/subscribe] error', e);
    return NextResponse.json(
      { error: 'guest_subscribe_failed', detail: e?.message || 'unexpected_error' },
      { status: 500 },
    );
  }
}
