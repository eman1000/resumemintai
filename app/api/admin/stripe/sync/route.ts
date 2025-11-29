import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { run } from "@/app/api/server/db";
import pool from "@/app/api/server/db/pool";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// @ts-ignore
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
const ADMIN_TOKEN = process.env.ADMIN_SYNC_TOKEN!; // set a strong random token

async function upsertSubscription(opts: {
  stripeSubId: string;
  stripeCustomerId: string;
  status: Stripe.Subscription.Status;
  priceId?: string | null;
  currentPeriodEnd?: number | null;
  cancelAtPeriodEnd?: boolean | null;
}) {
  const { stripeSubId, stripeCustomerId, status, priceId, currentPeriodEnd, cancelAtPeriodEnd } = opts;

  // Map Stripe customer → your users.id
  const { rows: uRows } = await run(pool, (c) =>
    c.query<{ id: string }>("select id from users where stripe_customer_id = $1 limit 1", [
      stripeCustomerId,
    ])
  );
  const userId = uRows[0]?.id;
  if (!userId) return; // no local user mapped yet

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
        stripeSubId,
        userId,
        status,
        priceId ?? null,
        currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
        !!cancelAtPeriodEnd,
      ]
    )
  );
}

async function syncOneCustomer(customerId: string) {
  // Pull all subs for this customer (active, trialing, canceled, etc.)
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    expand: ["data.items.data.price"], // helpful for price info
    limit: 100,
  });

  for (const s of subs.data) {
    await upsertSubscription({
      stripeSubId: s.id,
      stripeCustomerId: typeof s.customer === "string" ? s.customer : (s.customer as any)?.id,
      status: s.status,
      priceId: s.items.data[0]?.price?.id ?? null,
      currentPeriodEnd: s.current_period_end ?? null,
      cancelAtPeriodEnd: s.cancel_at_period_end ?? null,
    });
  }

  return { customerId, synced: subs.data.length };
}

export async function POST(req: NextRequest) {
  // Auth
  const token = req.headers.get("x-admin-token");
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Payload: { customerId?: string; userId?: string; all?: boolean }
  const body = await req.json().catch(() => ({} as any));
  const { customerId, userId, all } = body || {};

  try {
    const results: any[] = [];

    if (customerId) {
      // Sync a single Stripe customer id
      results.push(await syncOneCustomer(customerId));
    } else if (userId) {
      // Look up customer's id for this user, then sync
      const { rows } = await run(pool, (c) =>
        c.query<{ stripe_customer_id: string }>(
          "select stripe_customer_id from users where id = $1 limit 1",
          [userId]
        )
      );
      const cust = rows[0]?.stripe_customer_id;
      if (cust) results.push(await syncOneCustomer(cust));
    } else if (all) {
      // Sync all users that have a stripe_customer_id
      // (paginate if you have many users)
      const { rows } = await run(pool, (c) =>
        c.query<{ stripe_customer_id: string }>(
          "select stripe_customer_id from users where stripe_customer_id is not null"
        )
      );
      for (const r of rows) {
        if (r.stripe_customer_id) {
          results.push(await syncOneCustomer(r.stripe_customer_id));
        }
      }
    } else {
      return NextResponse.json(
        { error: "Provide one of: customerId, userId, or all:true" },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    console.error("[admin/stripe/sync]", e);
    return NextResponse.json({ error: "sync_failed", detail: e?.message }, { status: 500 });
  }
}
