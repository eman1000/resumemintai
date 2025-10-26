// app/api/billing/start-guest/route.ts
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
    const { email } = (await req.json()) as { email?: string };
    const norm = (email || '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(norm)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }


    // Upsert user by email in Postgres
    const existing = await getUserByEmail(pool, norm);
    const userId = existing?.id ?? (await ensureUserByEmail(pool, norm));

    // Reuse Stripe customer if exists (by metadata.accountId or email)
    let customer: Stripe.Customer | Stripe.DeletedCustomer | null = null;
    try {
      const found = await stripe.customers.search({
        // Requires “Customer search” enabled in Stripe
        query: `metadata['accountId']:'${userId}' OR email:'${norm}'`,
        limit: 1,
      });
      customer = found.data[0] || null;
    } catch {
      customer = null;
    }

    if (!customer) {
      customer = await stripe.customers.create({
        email: norm,
        metadata: { accountId: userId, email: norm },
      });
    } else if ('deleted' in customer && customer.deleted) {
      customer = await stripe.customers.create({
        email: norm,
        metadata: { accountId: userId, email: norm },
      });
    } else {
      // Ensure metadata/email are set
      const needsUpdate =
        !(customer as Stripe.Customer).metadata?.accountId ||
        (customer as Stripe.Customer).email !== norm;
      if (needsUpdate) {
        customer = await stripe.customers.update((customer as Stripe.Customer).id, {
          email: norm,
          metadata: { ...(customer as Stripe.Customer).metadata, accountId: userId, email: norm },
        });
      }
    }

    // Bind stripe_customer_id in your users table (if not set)
    if (!existing?.stripe_customer_id) {
      await setStripeCustomerId(pool, userId, (customer as Stripe.Customer).id);
    }

    // Create SetupIntent and *persist email in metadata* as a reliable fallback
    const si = await stripe.setupIntents.create(
      {
        customer: (customer as Stripe.Customer).id,
        usage: 'off_session',
        payment_method_types: ['card', 'link'],
        metadata: { email: norm, accountId: userId },
      },
      { idempotencyKey: `si:${userId}:${norm}` },
    );

    return NextResponse.json({
      clientSecret: si.client_secret!,
      customerId: (customer as Stripe.Customer).id,
      email: norm,
      accountId: userId,
    });
  } catch (e: any) {
    console.error('[start-guest] error', e);
    return NextResponse.json({ error: 'start_failed', detail: e?.message }, { status: 500 });
  }
}
