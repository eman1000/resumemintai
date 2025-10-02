// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SubEpoch = {
  current_period_start?: number | null;
  current_period_end?: number | null;
  cancel_at?: number | null;
  canceled_at?: number | null;
};
// @ts-ignore
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

async function readRawBody(req: NextRequest) {
  // @ts-ignore
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  while (true) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); }
  return Buffer.concat(chunks);
}

export async function POST(req: NextRequest) {
  let event: Stripe.Event;
  try {
    const raw = await req.text();
    const sig = req.headers.get('stripe-signature')!;
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (e:any) {
    return NextResponse.json({ error: 'Invalid signature', detail: e?.message }, { status: 400 });
  }

  try {
    if (event.type.startsWith('customer.subscription.')) {
      const sub = event.data.object as Stripe.Subscription & SubEpoch;

      // Try metadata first, then fall back to the customer metadata
      let accountId = (sub.metadata?.accountId as string) || '';
      if (!accountId && typeof sub.customer === 'string') {
        const cust = await stripe.customers.retrieve(sub.customer);
        accountId = (cust as any)?.metadata?.accountId || '';
      }

      await adminDb.collection('stripeSubs').doc(sub.id).set({
        accountId: accountId || null,
        customerId: typeof sub.customer === 'string' ? sub.customer : (sub.customer as any)?.id || null,
        subscriptionId: sub.id,
        status: sub.status,
        priceId: sub.items.data[0]?.price?.id || null,
        priceIds: sub.items.data.map(i => i.price?.id).filter(Boolean),
        currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000) : null,
        currentPeriodEnd:   sub.current_period_end   ? new Date(sub.current_period_end   * 1000) : null,
        cancelAt:           sub.cancel_at            ? new Date(sub.cancel_at            * 1000) : null,
        canceledAt:         sub.canceled_at          ? new Date(sub.canceled_at          * 1000) : null,
        cancelAtPeriodEnd: !!sub.cancel_at_period_end,
        latestInvoiceId: typeof sub.latest_invoice === 'string' ? sub.latest_invoice : (sub.latest_invoice as any)?.id || null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    // You can also handle checkout.session.completed if you rely on that
    return NextResponse.json({ received: true });
  } catch (e:any) {
    // Your earlier "seconds is not a valid integer" came from writing Date(undefined).
    // The guards above ( ? new Date(x*1000) : null ) prevent that.
    console.error('Webhook error', e);
    return NextResponse.json({ error: 'Webhook error', detail: e?.message }, { status: 500 });
  }
}
