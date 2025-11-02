// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { run } from "../../server/db";
import pool from "../../server/db/pool";

export const runtime = "nodejs";            // required for raw body access
export const dynamic = "force-dynamic";     // webhooks shouldn't be cached

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-ignore
  apiVersion: "2024-06-20",
});

// ---------- Helpers ----------
async function upsertFromSubscription(sub: Stripe.Subscription) {
  // normalize customer id
  const customerId =
    typeof sub.customer === "string"
      ? sub.customer
      : (sub.customer as Stripe.Customer | null)?.id ?? null;

  if (!customerId) return;

  // Map Stripe customer -> your users table
  const { rows: uRows } = await run(pool, (c) =>
    c.query<{ id: string }>(
      `select id from users where stripe_customer_id = $1 limit 1`,
      [customerId]
    )
  );
  const userId = uRows[0]?.id;
  if (!userId) return; // can't map: skip silently

  // Upsert into subscriptions table
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
        sub.items.data[0]?.price?.id ?? null,
        sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null,
        !!sub.cancel_at_period_end,
      ]
    )
  );
}

// ---------- Handler ----------
export async function POST(req: NextRequest) {
  let event: Stripe.Event;

  // 1) Verify signature with RAW body
  let rawBody: string;
  try {
    rawBody = await req.text(); // IMPORTANT: raw body, not parsed JSON
    const signature = req.headers.get("stripe-signature")!;
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: "invalid_signature", detail: e?.message },
      { status: 400 }
    );
  }

  try {
          console.log("event.type:", event.type);

    switch (event.type) {
      
      // -------------------------------
      // Primary source of truth
      // -------------------------------
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await upsertFromSubscription(sub);
        break;
      }

      // -------------------------------
      // Safety net: payment confirms an active sub
      // -------------------------------
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        // Only proceed if invoice is tied to a subscription
        const subId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : (invoice.subscription as Stripe.Subscription | null)?.id;

        if (subId) {
          // Expand to get price on items for DB
          const sub = await stripe.subscriptions.retrieve(subId, {
            expand: ["items.data.price"],
          });
          await upsertFromSubscription(sub);
        }
        break;
      }

      // -------------------------------
      // Link Stripe customer to your user, early and reliably
      // -------------------------------
      case "checkout.session.completed": {
        const cs = event.data.object as Stripe.Checkout.Session;
        const customerId =
          typeof cs.customer === "string"
            ? cs.customer
            : (cs.customer as Stripe.Customer | null)?.id;

        // Choose how you pass user id into Checkout (preferred: client_reference_id)
        const userId = cs.client_reference_id || cs.metadata?.user_id;

        if (customerId && userId) {
          await run(pool, (c) =>
            c.query(
              `update users
               set stripe_customer_id = $1
               where id = $2
                 and (stripe_customer_id is null or stripe_customer_id = $1)`,
              [customerId, userId]
            )
          );
        }
        break;
      }
      case 'setup_intent.succeeded': {
        const si = event.data.object as Stripe.SetupIntent;

        // normalize customer id
        const customerId = typeof si.customer === 'string'
          ? si.customer
          : (si.customer as Stripe.Customer | null)?.id;

        if (customerId) {
          // (A) make sure the Stripe customer ↔ user mapping exists
          // if you put accountId/email into SI metadata on creation,
          // you can safely set stripe_customer_id here.
          const accountId = (si.metadata && si.metadata.accountId) || null;
          if (accountId) {
            await run(pool, (c) => c.query(`
              update users
                set stripe_customer_id = $1
              where id = $2
                and (stripe_customer_id is null or stripe_customer_id = $1)
            `, [customerId, accountId]));
          }

          // (B) fetch the newest subscription for this customer and upsert
          const subs = await stripe.subscriptions.list({
            customer: customerId,
            status: 'all',
            expand: ['data.items.data.price'],
            limit: 1,
          });
          const latest = subs.data[0];
          if (latest) await upsertFromSubscription(latest);
        }
        break;
      }
      case 'invoice.finalized': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : (invoice.subscription as Stripe.Subscription | null)?.id;

        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId, { expand: ['items.data.price'] });
          await upsertFromSubscription(sub);
        }
        break;
      }



      // (Optional) if you want, you can log others for debugging.
      default:
        // No-op for other events
        break;
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("[stripe webhook]", event.type, e);
    return NextResponse.json(
      { error: "webhook_error", type: event.type, detail: e?.message },
      { status: 500 }
    );
  }
}
