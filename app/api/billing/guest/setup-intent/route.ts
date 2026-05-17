// app/api/billing/guest/setup-intent/route.ts
//
// Guest checkout flow (landing pages). Creates a pre-account in our DB with a
// placeholder email and returns a SetupIntent on a Stripe customer tagged with
// that accountId. After payment, the user is prompted at /billing/return to
// claim the account by signing in — at which point /api/account/claim merges
// the guest row into the authed user.
//
// Body: { accountId?, templateId? }
// Returns: {
//   clientSecret, customerId, accountId,
//   priceId, priceAmount, priceCurrency, priceInterval, priceIntervalCount,
//   trialDays
// }
// The pricing metadata lets the landing page render accurate disclosures
// without hardcoding numbers in JSX (which has drifted from Stripe before).
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import crypto from 'node:crypto';
import {
  ensureGuestAccount,
  getStripeCustomerIdByAccountId,
  setStripeCustomerIdByAccountId,
} from '@/app/api/server/db/user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// @ts-ignore
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

const DEFAULT_PRICE_ID = process.env.STRIPE_PRICE_ID || '';
const TRIAL_DAYS = Number(process.env.STRIPE_TRIAL_DAYS ?? 0) || 0;

function newIdempotencyKey(accountId: string) {
  return `guest-si:${accountId}:${Date.now()}:${crypto.randomUUID()}`;
}

// Cache the price lookup in-process so we don't round-trip Stripe on every
// SetupIntent. ~5-min TTL is enough to pick up dashboard edits quickly.
let priceCache: { fetchedAt: number; data: Stripe.Price | null } | null = null;
const PRICE_TTL_MS = 5 * 60 * 1000;

async function loadPrice(): Promise<Stripe.Price | null> {
  if (!DEFAULT_PRICE_ID) return null;
  const now = Date.now();
  if (priceCache && now - priceCache.fetchedAt < PRICE_TTL_MS) return priceCache.data;
  try {
    const p = await stripe.prices.retrieve(DEFAULT_PRICE_ID);
    priceCache = { fetchedAt: now, data: p };
    return p;
  } catch (e) {
    console.warn('[guest/setup-intent] price retrieve failed', (e as any)?.message);
    priceCache = { fetchedAt: now, data: null };
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      accountId?: string | null;
      templateId?: string;
    };

    const accountId = body.accountId ?? crypto.randomUUID();
    await ensureGuestAccount(null, accountId);

    let customerId = await getStripeCustomerIdByAccountId(null, accountId);
    if (!customerId) {
      const customer = await stripe.customers.create(
        {
          metadata: {
            accountId,
            ...(body.templateId ? { templateId: String(body.templateId) } : {}),
          },
        },
        { idempotencyKey: `guest-customer:${accountId}` },
      );
      customerId = customer.id;
      await setStripeCustomerIdByAccountId(null, accountId, customerId);
    }

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

    const price = await loadPrice();
    return NextResponse.json({
      clientSecret: si.client_secret!,
      customerId,
      accountId,
      priceId: DEFAULT_PRICE_ID || null,
      priceAmount: price?.unit_amount ?? null, // in minor units (cents/öre/etc.)
      priceCurrency: price?.currency ?? null,
      priceInterval: price?.recurring?.interval ?? null,
      priceIntervalCount: price?.recurring?.interval_count ?? null,
      trialDays: TRIAL_DAYS,
    });
  } catch (e: any) {
    console.error('[billing/guest/setup-intent] error', e);
    return NextResponse.json(
      { error: 'guest_setup_intent_failed', detail: e?.message || 'unexpected_error' },
      { status: 500 },
    );
  }
}
