// app/api/billing/start/route.ts (Checkout version)
import Stripe from 'stripe';
import { NextResponse } from 'next/server';
// @ts-ignore
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

export async function POST(req: Request) {
  const { priceId, landingLabel } = await req.json();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    // ⬇️ force Stripe to create a Customer and capture email
    customer_creation: 'always',
    allow_promotion_codes: true,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/landing/${landingLabel || 'vtdft'}`,
    metadata: { landingLabel }, // useful for attribution
  });

  return NextResponse.json({ url: session.url });
}
