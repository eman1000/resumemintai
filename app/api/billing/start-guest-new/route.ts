// app/api/billing/start-guest/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import crypto from 'node:crypto';

import pool from '../../server/db/pool';
import { ensureGuestAccount, getStripeCustomerIdByAccountId, setStripeCustomerIdByAccountId } from '../../server/db/user';



export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// @ts-ignore
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

function newIdempotencyKey(accountId: string) {
  return `si2:${accountId}:${Date.now()}:${crypto.randomUUID()}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      accountId?: string | null;
      templateId?: string;
    };

    // 1) Resolve accountId and ENSURE the users row exists with a guest email
    const accountId = body.accountId ?? crypto.randomUUID();
    await ensureGuestAccount(pool, accountId);        // ✅ prevents CHECK failure

    // 2) Reuse or create Stripe customer
    let customerId = await getStripeCustomerIdByAccountId(pool, accountId);
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: {
          accountId,
          ...(body.templateId ? { templateId: String(body.templateId) } : {}),
        },
      });
      customerId = customer.id;
      await setStripeCustomerIdByAccountId(pool, accountId, customerId);
    }

    // 3) Create SetupIntent tagged with accountId
    const payload: Stripe.SetupIntentCreateParams = {
      customer: customerId,
      usage: 'off_session',
      payment_method_types: ['card', 'link'],
      metadata: { accountId },
    };

    let si: Stripe.SetupIntent;
    let idemKey = newIdempotencyKey(accountId);
    try {
      si = await stripe.setupIntents.create(payload, { idempotencyKey: idemKey });
    } catch (err: any) {
      if (err?.type === 'idempotency_error') {
        idemKey = newIdempotencyKey(accountId);
        si = await stripe.setupIntents.create(payload, { idempotencyKey: idemKey });
      } else {
        throw err;
      }
    }

    // 4) Return identifiers for the client
    return NextResponse.json({
      clientSecret: si.client_secret!,
      customerId,
      accountId,
    });
  } catch (e: any) {
    console.error('[start-guest] error', e);
    return NextResponse.json(
      { error: 'start_failed', detail: e?.message || 'unexpected_error' },
      { status: 500 },
    );
  }
}
