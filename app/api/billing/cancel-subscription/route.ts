// app/api/billing/cancel-subscription/route.ts
// @ts-nocheck
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getUserFromRequest } from "@/app/api/server/auth/getUserFromRequest";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

async function getDbUserIdByFirebaseUid(firebaseUid: string) {
  const u = await prisma.user.findUnique({
    where: { firebaseUid },
    select: { id: true },
  });
  return u?.id ?? null;
}

async function getStripeCustomerIdByUserId(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });
  return u?.stripeCustomerId || null;
}

type Body = {
  subscriptionId?: string;
  mode?: "at_period_end" | "now";
  prorate?: boolean;
};

export async function POST(req: Request) {
  try {
    const fb = await getUserFromRequest();
    const userId = await getDbUserIdByFirebaseUid(fb.uid);
    if (!userId) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as Body;
    const mode = body.mode ?? "at_period_end";
    const prorate = body.prorate ?? true;

    let subId = body.subscriptionId?.trim() || "";

    if (!subId) {
      const customerId = await getStripeCustomerIdByUserId(userId);
      if (!customerId) {
        return NextResponse.json({ error: "no_customer" }, { status: 404 });
      }

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

    const sub = await stripe.subscriptions.retrieve(subId);
    const subCustomerId =
      typeof sub.customer === "string" ? sub.customer : (sub.customer as any)?.id;

    const dbCustomerId = await getStripeCustomerIdByUserId(userId);
    if (dbCustomerId && subCustomerId && dbCustomerId !== subCustomerId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

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

    const periodEnd = updated.current_period_end
      ? new Date(updated.current_period_end * 1000)
      : null;

    // Cache to subscriptions table (webhook remains source of truth)
    await prisma.subscription.upsert({
      where: { id: updated.id },
      create: {
        id: updated.id,
        userId,
        status: updated.status,
        priceId: updated.items.data[0]?.price?.id ?? null,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: !!updated.cancel_at_period_end,
      },
      update: {
        status: updated.status,
        priceId: updated.items.data[0]?.price?.id ?? null,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: !!updated.cancel_at_period_end,
      },
    });

    return NextResponse.json({
      subscriptionId: updated.id,
      status: updated.status,
      cancel_at_period_end: updated.cancel_at_period_end,
      current_period_end: periodEnd ? periodEnd.toISOString() : null,
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
