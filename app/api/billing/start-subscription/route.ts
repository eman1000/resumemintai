// app/api/billing/start-subscription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';

// @ts-ignore
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

export async function POST(req: NextRequest) {
  try {
    const { payment_method, price_id, email, trial_days } = await req.json();

    // 1) Find or create customer
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer = existing.data[0] ?? await stripe.customers.create({ email });

    // 2) Create the subscription in "incomplete" state so we can confirm the first invoice’s PI with the wallet method
    const sub = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: price_id }],
      trial_period_days: trial_days || undefined,  // omit if no trial
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    const pi = (sub.latest_invoice as any)?.payment_intent;
    const client_secret = pi?.client_secret ?? null;

    return NextResponse.json({
      ok: true,
      subscription_id: sub.id,
      client_secret, // if not null, confirm on the client with the wallet
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'failed' }, { status: 400 });
  }
}
