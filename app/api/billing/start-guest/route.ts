// app/api/billing/start-guest/route.ts
// @ts-nocheck
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import crypto from 'node:crypto';

import { getUserByEmail, ensureUserByEmail, setStripeCustomerId } from '../../server/db/user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// @ts-ignore
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

function newIdemKey(userId: string, email: string) {
  return `si2:${userId}:${email}:${Date.now()}:${crypto.randomUUID()}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { email?: string };
    const norm = (body?.email || '').trim().toLowerCase();

    if (!/^\S+@\S+\.\S+$/.test(norm)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }

    const existing = await getUserByEmail(null, norm);
    const userId = existing?.id ?? (await ensureUserByEmail(null, norm));

    let customer: Stripe.Customer | null = null;

    try {
      const found = await stripe.customers.search({
        query: `metadata['accountId']:'${userId}' OR email:'${norm}'`,
        limit: 1,
      });
      customer = (found.data[0] as Stripe.Customer) ?? null;
    } catch {
      const listed = await stripe.customers.list({ email: norm, limit: 1 });
      customer = (listed.data[0] as Stripe.Customer) ?? null;
    }

    if (!customer) {
      customer = await stripe.customers.create({
        email: norm,
        metadata: { accountId: userId, email: norm },
      });
    } else {
      const needsUpdate =
        (customer.metadata?.accountId ?? '') !== userId ||
        (customer.email ?? '') !== norm;
      if (needsUpdate) {
        customer = await stripe.customers.update(customer.id, {
          email: norm,
          metadata: { ...(customer.metadata || {}), accountId: userId, email: norm },
        });
      }
    }

    if (!existing?.stripe_customer_id) {
      await setStripeCustomerId(null, userId, customer.id);
    }

    const payload: Stripe.SetupIntentCreateParams = {
      customer: customer.id,
      usage: 'off_session',
      payment_method_types: ['card', 'link'],
      metadata: { email: norm, accountId: userId },
    };

    let si: Stripe.SetupIntent;
    let idemKey = newIdemKey(userId, norm);

    try {
      si = await stripe.setupIntents.create(payload, { idempotencyKey: idemKey });
    } catch (err: any) {
      if (err?.type === 'idempotency_error') {
        idemKey = newIdemKey(userId, norm);
        si = await stripe.setupIntents.create(payload, { idempotencyKey: idemKey });
      } else {
        throw err;
      }
    }

    return NextResponse.json({
      clientSecret: si.client_secret!,
      customerId: customer.id,
      email: norm,
      accountId: userId,
    });
  } catch (e: any) {
    console.error('[start-guest] error', e);
    return NextResponse.json(
      { error: 'start_failed', detail: e?.message || 'unexpected_error' },
      { status: 500 },
    );
  }
}
