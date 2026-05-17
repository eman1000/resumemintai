// app/api/billing/pricing-info/route.ts
//
// Read-only pricing metadata for the landing page (and anywhere else that
// needs to display the current price/trial without creating any Stripe
// objects). Single source of truth = Stripe + STRIPE_TRIAL_DAYS env.
//
// Returns: { priceId, priceAmount, priceCurrency, priceInterval, priceIntervalCount, trialDays }
// Caches the Stripe Price lookup in-process for 5 min.
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// @ts-ignore
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

const PRICE_ID = process.env.STRIPE_PRICE_ID || '';
const TRIAL_DAYS = Number(process.env.STRIPE_TRIAL_DAYS ?? 0) || 0;

let priceCache: { fetchedAt: number; data: Stripe.Price | null } | null = null;
const PRICE_TTL_MS = 5 * 60 * 1000;

async function loadPrice(): Promise<Stripe.Price | null> {
  if (!PRICE_ID) return null;
  const now = Date.now();
  if (priceCache && now - priceCache.fetchedAt < PRICE_TTL_MS) return priceCache.data;
  try {
    const p = await stripe.prices.retrieve(PRICE_ID);
    priceCache = { fetchedAt: now, data: p };
    return p;
  } catch (e) {
    console.warn('[pricing-info] price retrieve failed', (e as any)?.message);
    priceCache = { fetchedAt: now, data: null };
    return null;
  }
}

export async function GET() {
  const price = await loadPrice();
  return NextResponse.json(
    {
      priceId: PRICE_ID || null,
      priceAmount: price?.unit_amount ?? null,
      priceCurrency: price?.currency ?? null,
      priceInterval: price?.recurring?.interval ?? null,
      priceIntervalCount: price?.recurring?.interval_count ?? null,
      trialDays: TRIAL_DAYS,
    },
    {
      headers: {
        // Public, edge-cacheable for a few seconds so a marketing burst doesn't
        // hammer Stripe; clients re-fetch every page load anyway.
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    },
  );
}
