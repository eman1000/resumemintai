// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { run } from '@/app/api/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// @ts-ignore
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

export async function POST(req: NextRequest) {
  let event: Stripe.Event;
  try {
    const raw = await req.text(); // keep raw body for signature verification
    const sig = req.headers.get('stripe-signature')!;
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (e: any) {
    return NextResponse.json({ error: 'Invalid signature', detail: e?.message }, { status: 400 });
  }

  try {
    if (event.type.startsWith('customer.subscription.')) {
      const sub = event.data.object as Stripe.Subscription & {
        current_period_end?: number | null;
        cancel_at_period_end?: boolean | null;
      };

      const customerId =
        typeof sub.customer === 'string' ? sub.customer : (sub.customer as any)?.id || null;

      if (!customerId) {
        return NextResponse.json({ received: true }); // nothing to map
      }

      // Map Stripe customer → your users table
      const { rows: uRows } = await run(pool, (c) =>
        c.query<{ id: string }>(
          `select id from users where stripe_customer_id = $1 limit 1`,
          [customerId],
        ),
      );
      const userId = uRows[0]?.id;
      if (!userId) {
        // If you want, you can soft-store by email here using sub.customer_details / sub.metadata
        return NextResponse.json({ received: true });
      }

      await run(pool, (c) =>
        c.query(
          `
          insert into subscriptions (id, user_id, status, price_id, current_period_end, cancel_at_period_end, created_at, updated_at)
          values ($1,$2,$3,$4,$5,$6, now(), now())
          on conflict (id) do update set
            status = excluded.status,
            price_id = excluded.price_id,
            current_period_end = excluded.current_period_end,
            cancel_at_period_end = excluded.cancel_at_period_end,
            updated_at = now()
          `,
          [
            sub.id,
            userId,
            sub.status,
            sub.items.data[0]?.price?.id || null,
            sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
            !!sub.cancel_at_period_end,
          ],
        ),
      );
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error('[stripe webhook]', e);
    return NextResponse.json({ error: 'webhook_error', detail: e?.message }, { status: 500 });
  }
}
