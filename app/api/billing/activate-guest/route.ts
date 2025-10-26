// app/api/billing/activate-guest/route.ts
import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { getUserByEmail, ensureUserByEmail, setStripeCustomerId } from '../../server/db/user';
import pool from '../../server/db/pool';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// @ts-ignore
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

export async function POST(req: Request) {
  try {
    const { setupIntentId, priceId } = (await req.json()) as { setupIntentId?: string; priceId?: string };
    if (!setupIntentId || !priceId) {
      return NextResponse.json({ error: 'missing_params' }, { status: 400 });
    }

    const si = await stripe.setupIntents.retrieve(setupIntentId);
    if (si.status !== 'succeeded' && si.status !== 'processing') {
      return NextResponse.json({ error: 'setup_incomplete', status: si.status }, { status: 400 });
    }

    const customerId = typeof si.customer === 'string' ? si.customer : (si.customer as any)?.id;
    if (!customerId) return NextResponse.json({ error: 'no_customer' }, { status: 400 });

    // Email priority: SI.metadata.email → Stripe customer.email
    let email = (si as any)?.metadata?.email as string | undefined;
    if (!email) {
      const cust = (await stripe.customers.retrieve(customerId)) as Stripe.Customer;
      email = cust.email ?? undefined;
    }
    if (!email) return NextResponse.json({ error: 'no_email' }, { status: 400 });
    const norm = email.trim().toLowerCase();

    const existing = await getUserByEmail(pool, norm);
    const userId = existing?.id ?? (await ensureUserByEmail(pool, norm));

    if (!existing?.stripe_customer_id) {
      await setStripeCustomerId(pool, userId, customerId);
    }

    const pm = typeof si.payment_method === 'string' ? si.payment_method : si.payment_method?.id;
    if (!pm) return NextResponse.json({ error: 'no_payment_method' }, { status: 400 });

    const trialDays = Number(process.env.STRIPE_TRIAL_DAYS ?? 0);
    const idem = `activate-guest:${customerId}:${setupIntentId}:${priceId}`;

    const sub = await stripe.subscriptions.create(
      {
        customer: customerId,
        items: [{ price: priceId }],
        default_payment_method: pm,
        trial_period_days: trialDays > 0 ? trialDays : undefined,
        trial_settings: trialDays > 0 ? { end_behavior: { missing_payment_method: 'cancel' } } : undefined,
        payment_behavior: 'allow_incomplete',
        metadata: { accountId: userId, email: norm },
      },
      { idempotencyKey: idem },
    );

    return NextResponse.json({
      subscriptionId: sub.id,
      status: sub.status,
      cancelAtPeriodEnd: !!sub.cancel_at_period_end,
      currentPeriodEnd: (sub as any).current_period_end ? new Date((sub as any).current_period_end * 1000).toISOString() : null,
      customerId,
      email: norm,
      accountId: userId,
    });
  } catch (e: any) {
    console.error('[activate-guest] error', e);
    return NextResponse.json({ error: 'activate_failed', detail: e?.message }, { status: 500 });
  }
}
