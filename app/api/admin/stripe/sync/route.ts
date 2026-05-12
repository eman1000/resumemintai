// app/api/admin/stripe/sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// @ts-ignore
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
const ADMIN_TOKEN = process.env.ADMIN_SYNC_TOKEN!;

async function upsertSubscription(opts: {
  stripeSubId: string;
  stripeCustomerId: string;
  status: Stripe.Subscription.Status;
  priceId?: string | null;
  currentPeriodEnd?: number | null;
  cancelAtPeriodEnd?: boolean | null;
}) {
  const { stripeSubId, stripeCustomerId, status, priceId, currentPeriodEnd, cancelAtPeriodEnd } = opts;

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId },
    select: { id: true },
  });
  if (!user) return;

  const periodEnd = currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null;

  await prisma.subscription.upsert({
    where: { id: stripeSubId },
    create: {
      id: stripeSubId,
      userId: user.id,
      status,
      priceId: priceId ?? null,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: !!cancelAtPeriodEnd,
    },
    update: {
      status,
      priceId: priceId ?? null,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: !!cancelAtPeriodEnd,
    },
  });
}

async function syncOneCustomer(customerId: string) {
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    expand: ["data.items.data.price"],
    limit: 100,
  });

  for (const s of subs.data) {
    await upsertSubscription({
      stripeSubId: s.id,
      stripeCustomerId: typeof s.customer === "string" ? s.customer : (s.customer as any)?.id,
      status: s.status,
      priceId: s.items.data[0]?.price?.id ?? null,
      // @ts-ignore
      currentPeriodEnd: s.current_period_end ?? null,
      cancelAtPeriodEnd: s.cancel_at_period_end ?? null,
    });
  }

  return { customerId, synced: subs.data.length };
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-admin-token");
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as any));
  const { customerId, userId, all } = body || {};

  try {
    const results: any[] = [];

    if (customerId) {
      results.push(await syncOneCustomer(customerId));
    } else if (userId) {
      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { stripeCustomerId: true },
      });
      if (u?.stripeCustomerId) results.push(await syncOneCustomer(u.stripeCustomerId));
    } else if (all) {
      const users = await prisma.user.findMany({
        where: { stripeCustomerId: { not: null } },
        select: { stripeCustomerId: true },
      });
      for (const u of users) {
        if (u.stripeCustomerId) {
          results.push(await syncOneCustomer(u.stripeCustomerId));
        }
      }
    } else {
      return NextResponse.json(
        { error: "Provide one of: customerId, userId, or all:true" },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    console.error("[admin/stripe/sync]", e);
    return NextResponse.json({ error: "sync_failed", detail: e?.message }, { status: 500 });
  }
}
