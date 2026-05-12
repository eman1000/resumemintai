// app/api/billing/activate-guest/route.ts
import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { setStripeCustomerId } from '../../server/db/user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// @ts-ignore
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

export async function POST(req: Request) {
  try {
    const { setupIntentId, priceId } = (await req.json()) as {
      setupIntentId?: string;
      priceId?: string;
    };
    if (!setupIntentId || !priceId) {
      return NextResponse.json({ error: 'missing_params' }, { status: 400 });
    }

    const si = await stripe.setupIntents.retrieve(setupIntentId);
    if (si.status !== 'succeeded' && si.status !== 'processing') {
      return NextResponse.json({ error: 'setup_incomplete', status: si.status }, { status: 400 });
    }

    const customerId =
      typeof si.customer === 'string' ? si.customer : (si.customer as any)?.id;
    if (!customerId) return NextResponse.json({ error: 'no_customer' }, { status: 400 });

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
    if (!pm) return NextResponse.json({ error: 'no_payment_method' }, { status: 400 });

    try {
      await setStripeCustomerId(null, accountId, customerId);
    } catch (e) {
      console.warn('[activate-guest] setStripeCustomerId failed', e);
    }

    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: pm },
      metadata: { accountId },
    });

    const trialDays = Number(process.env.STRIPE_TRIAL_DAYS ?? 0);
    const idem = `activate-guest:${customerId}:${setupIntentId}:${priceId}`;

    const subscription = await stripe.subscriptions.create(
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

    return NextResponse.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
      // @ts-ignore
      currentPeriodEnd: subscription.current_period_end
        // @ts-ignore
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      customerId,
      accountId,
    });
  } catch (e: any) {
    console.error('[activate-guest] error', e);
    return NextResponse.json(
      { error: 'activate_failed', detail: e?.message || 'unexpected_error' },
      { status: 500 },
    );
  }
}
