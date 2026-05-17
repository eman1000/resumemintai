// app/api/dev/stripe/confirm-test/route.ts
// DEV-ONLY: confirms a SetupIntent with a Stripe test PaymentMethod so we can
// skip filling the card form during local development.
//
// 404s in production. Requires `sk_test_*` key — refuses to run against a live
// secret key even if NODE_ENV is somehow set wrong.

import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SK = process.env.STRIPE_SECRET_KEY || '';
const IS_TEST_MODE = SK.startsWith('sk_test_');
const IS_DEV = process.env.NODE_ENV !== 'production';

// @ts-ignore
const stripe = SK ? new Stripe(SK, { apiVersion: '2024-06-20' }) : null;

const TEST_PMS = new Set([
  'pm_card_visa',
  'pm_card_visa_debit',
  'pm_card_mastercard',
  'pm_card_amex',
  'pm_card_discover',
  'pm_card_visa_chargeDeclined',
  'pm_card_authenticationRequired',
]);

export async function POST(req: Request) {
  // Hard gate — never reachable on live.
  if (!IS_DEV || !IS_TEST_MODE || !stripe) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let body: { setupIntentId?: string; paymentMethod?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const siId = body.setupIntentId?.trim() || '';
  const pm = body.paymentMethod?.trim() || 'pm_card_visa';

  if (!siId) return NextResponse.json({ error: 'missing_setup_intent_id' }, { status: 400 });
  if (!TEST_PMS.has(pm)) {
    return NextResponse.json({ error: 'invalid_test_pm', allowed: Array.from(TEST_PMS) }, { status: 400 });
  }

  try {
    const si = await stripe.setupIntents.confirm(siId, { payment_method: pm });
    return NextResponse.json({
      ok: true,
      setupIntentId: si.id,
      status: si.status,
      paymentMethod: typeof si.payment_method === 'string' ? si.payment_method : si.payment_method?.id ?? null,
    });
  } catch (e: any) {
    console.error('[dev/stripe/confirm-test]', e);
    return NextResponse.json(
      { error: 'confirm_failed', detail: e?.message || 'unexpected_error' },
      { status: 400 },
    );
  }
}
