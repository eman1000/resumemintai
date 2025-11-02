// app/api/billing/cancel-subscription/route.ts
// @ts-nocheck
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getUserFromRequest } from "@/app/api/server/auth/getUserFromRequest";
import { run } from "@/app/api/server/db";
import pool from "@/app/api/server/db/pool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

// Mirrors your resumes route mapping
async function getDbUserIdByFirebaseUid(firebaseUid: string) {
  const { rows } = await run(pool, (c) =>
    c.query<{ id: string }>(
      `select id from public.users where firebase_uid = $1 limit 1`,
      [firebaseUid],
    )
  );
  return rows[0]?.id ?? null;
}

async function getStripeCustomerIdByUserId(userId: string) {
  const { rows } = await run(pool, (c) =>
    c.query<{ stripe_customer_id: string | null }>(
      `select stripe_customer_id from public.users where id = $1 limit 1`,
      [userId],
    )
  );
  return rows[0]?.stripe_customer_id || null;
}

type Body = {
  subscriptionId?: string;
  mode?: "at_period_end" | "now";
  prorate?: boolean;
};

export async function POST(req: Request) {
  try {
    // 1) Auth (same as /api/resumes)
    const fb = await getUserFromRequest(); // throws { name: 'UNAUTHORIZED' } on failure
    const userId = await getDbUserIdByFirebaseUid(fb.uid);
    if (!userId) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // 2) Parse body
    const body = (await req.json().catch(() => ({}))) as Body;
    const mode = body.mode ?? "at_period_end";
    const prorate = body.prorate ?? true;

    // 3) Resolve subscription id
    let subId = body.subscriptionId?.trim() || "";

    if (!subId) {
      const customerId = await getStripeCustomerIdByUserId(userId);
      if (!customerId) {
        return NextResponse.json({ error: "no_customer" }, { status: 404 });
      }

      // Find newest active-ish subscription for this customer
      const list = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        expand: ["data.items.data.price"],
        limit: 20,
      });

      const ACTIVE = new Set(["active", "trialing", "past_due"]);
      const candidate = list.data.find((s) => ACTIVE.has(s.status as any));
      if (!candidate) {
        return NextResponse.json({ error: "no_active_subscription" }, { status: 404 });
      }
      subId = candidate.id;
    }

    // 4) Extra safety: ensure the Stripe sub belongs to this user’s customer
    const sub = await stripe.subscriptions.retrieve(subId);
    const subCustomerId =
      typeof sub.customer === "string" ? sub.customer : (sub.customer as any)?.id;

    const dbCustomerId = await getStripeCustomerIdByUserId(userId);
    if (dbCustomerId && subCustomerId && dbCustomerId !== subCustomerId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // 5) Perform cancel
    const updated =
      mode === "at_period_end"
        ? await stripe.subscriptions.update(
            subId,
            { cancel_at_period_end: true },
            { idempotencyKey: `sub-cancel-${subId}-atend` },
          )
        : await stripe.subscriptions.cancel(
            subId,
            { prorate },
            { idempotencyKey: `sub-cancel-${subId}-now` },
          );

    // 6) Best-effort cache to your subscriptions table (webhook remains source of truth)
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
          updated.id,
          userId,
          updated.status,
          updated.items.data[0]?.price?.id ?? null,
          updated.current_period_end
            ? new Date(updated.current_period_end * 1000).toISOString()
            : null,
          !!updated.cancel_at_period_end,
        ],
      ),
    );

    // 7) Respond
    return NextResponse.json({
      subscriptionId: updated.id,
      status: updated.status,
      cancel_at_period_end: updated.cancel_at_period_end,
      current_period_end: updated.current_period_end
        ? new Date(updated.current_period_end * 1000).toISOString()
        : null,
      canceled_at: updated.canceled_at
        ? new Date(updated.canceled_at * 1000).toISOString()
        : null,
    });
  } catch (e: any) {
    if (e?.name === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const msg = e?.raw?.message || e?.message || "cancel_failed";
    return NextResponse.json({ error: "cancel_failed", message: msg }, { status: 400 });
  }
}
