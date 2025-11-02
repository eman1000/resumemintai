// app/api/billing/start-guest/route.ts
// @ts-nocheck
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import crypto from 'node:crypto';

import pool from '../../server/db/pool';
import { getUserByEmail, ensureUserByEmail, setStripeCustomerId } from '../../server/db/user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// @ts-ignore
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

/** Build a truly-unique idempotency key (log it so you can verify in Stripe logs) */
function newIdemKey(userId: string, email: string) {
  return `si2:${userId}:${email}:${Date.now()}:${crypto.randomUUID()}`;
}

export async function POST(req: Request) {
  try {
    // Accept JSON; be lenient if body is empty
    const body = (await req.json().catch(() => ({}))) as { email?: string };
    const norm = (body?.email || '').trim().toLowerCase();

    if (!/^\S+@\S+\.\S+$/.test(norm)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // 1) Upsert your app user by email (Postgres)
    // ────────────────────────────────────────────────────────────────────────────
    const existing = await getUserByEmail(pool, norm);
    const userId = existing?.id ?? (await ensureUserByEmail(pool, norm));

    // ────────────────────────────────────────────────────────────────────────────
    // 2) Find or create the Stripe customer by email/metadata
    //    (search requires Customer Search enabled in Stripe)
    // ────────────────────────────────────────────────────────────────────────────
    let customer: Stripe.Customer | null = null;

    try {
      const found = await stripe.customers.search({
        query: `metadata['accountId']:'${userId}' OR email:'${norm}'`,
        limit: 1,
      });
      customer = (found.data[0] as Stripe.Customer) ?? null;
    } catch {
      // If search isn't enabled, fall back to list filter (cheap in test mode)
      const listed = await stripe.customers.list({ email: norm, limit: 1 });
      customer = (listed.data[0] as Stripe.Customer) ?? null;
    }

    if (!customer) {
      customer = await stripe.customers.create({
        email: norm,
        metadata: { accountId: userId, email: norm },
      });
    } else {
      // Ensure metadata/email are populated & consistent
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

    // Bind stripe_customer_id in your users table (if not already saved)
    if (!existing?.stripe_customer_id) {
      await setStripeCustomerId(pool, userId, customer.id);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // 3) Create a SetupIntent (off_session) to collect a payment method now.
    //    Use a truly-unique idempotency key (and retry if Stripe complains).
    // ────────────────────────────────────────────────────────────────────────────
    const payload: Stripe.SetupIntentCreateParams = {
      customer: customer.id,
      usage: 'off_session',
      payment_method_types: ['card', 'link'],
      metadata: { email: norm, accountId: userId },
    };

    let si: Stripe.SetupIntent;
    let idemKey = newIdemKey(userId, norm);
    console.log('[start-guest] idemKey', idemKey);

    try {
      si = await stripe.setupIntents.create(payload, { idempotencyKey: idemKey });
    } catch (err: any) {
      if (err?.type === 'idempotency_error') {
        // Generate a fresh key and retry once
        idemKey = newIdemKey(userId, norm);
        console.warn('[start-guest] retry with idemKey', idemKey);
        si = await stripe.setupIntents.create(payload, { idempotencyKey: idemKey });
      } else {
        throw err;
      }
    }

    // ────────────────────────────────────────────────────────────────────────────
    // 4) Return clientSecret to the client; they’ll confirm & then call activate
    // ────────────────────────────────────────────────────────────────────────────
    return NextResponse.json({
      clientSecret: si.client_secret!,
      customerId: customer.id,
      email: norm,
      accountId: userId,
    });
  } catch (e: any) {
    console.error('[start-guest] error', e);
    return NextResponse.json(
      {
        error: 'start_failed',
        detail: e?.message || 'unexpected_error',
      },
      { status: 500 }
    );
  }
}
