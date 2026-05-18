// app/api/billing/setup-intent/route.ts
//
// Authed in-app flow: create a SetupIntent for the current user's Stripe
// customer. Single source of truth for the user ↔ customer mapping is
// users.stripe_customer_id (Postgres). No anonymous account churn.
//
// Body: {} (no params needed; identity comes from the bearer token)
// Returns: { clientSecret, customerId }
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import crypto from 'node:crypto';
import { adminAuth } from '@/lib/firebaseAdmin';
import prisma from '@/lib/prisma';
import { ensureDbUserByFirebaseUid } from '@/app/api/server/db/user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// @ts-ignore
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

export async function POST(req: Request) {
  try {
    const authz = req.headers.get('authorization') || '';
    const idToken = authz.startsWith('Bearer ') ? authz.slice(7) : '';
    if (!idToken) {
      return NextResponse.json({ error: 'missing_auth' }, { status: 401 });
    }

    const dec = await adminAuth.verifyIdToken(idToken);
    const uid = dec.uid;
    const email = (dec.email || '').trim().toLowerCase() || null;

    // 1) Ensure the users row exists.
    const userId = await ensureDbUserByFirebaseUid(uid, email);

    // 2) Resolve or create the Stripe customer for this user.
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    // Verify the stored customer still exists in the connected Stripe account.
    // If we switched test↔live or pointed at a different account, the saved
    // ID is stale — null it out and create a fresh customer instead of
    // failing with "No such customer".
    let customerId = me?.stripeCustomerId ?? null;
    if (customerId) {
      try {
        const existing = await stripe.customers.retrieve(customerId);
        // Deleted customers come back with `{ deleted: true }`; treat as gone.
        if ((existing as any)?.deleted) customerId = null;
      } catch (e: any) {
        const code = e?.code || e?.raw?.code;
        if (code === 'resource_missing' || e?.statusCode === 404) {
          customerId = null;
        } else {
          throw e;
        }
      }
    }
    if (!customerId) {
      const customer = await stripe.customers.create(
        {
          email: email ?? undefined,
          metadata: { accountId: userId, uid },
        },
        { idempotencyKey: `customer-create:${userId}:${crypto.randomUUID()}` },
      );
      customerId = customer.id;
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    // 3) Create a SetupIntent on that customer.
    const idempotencyKey = `setup-intent:${userId}:${crypto.randomUUID()}`;
    const si = await stripe.setupIntents.create(
      {
        customer: customerId,
        usage: 'off_session',
        payment_method_types: ['card', 'link'],
        metadata: { accountId: userId, uid },
      },
      { idempotencyKey },
    );

    return NextResponse.json({
      clientSecret: si.client_secret,
      customerId,
    });
  } catch (e: any) {
    console.error('[billing/setup-intent] error', e);
    return NextResponse.json(
      { error: 'setup_intent_failed', detail: e?.message || 'unexpected_error' },
      { status: 500 },
    );
  }
}
