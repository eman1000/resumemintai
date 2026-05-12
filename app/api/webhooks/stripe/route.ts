// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-ignore
  apiVersion: "2024-06-20",
});

async function upsertFromSubscription(sub: Stripe.Subscription) {
  const customerId =
    typeof sub.customer === "string"
      ? sub.customer
      : (sub.customer as Stripe.Customer | null)?.id ?? null;

  if (!customerId) return;

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  if (!user) return;

  const periodEnd = (sub as any).current_period_end
    ? new Date((sub as any).current_period_end * 1000)
    : null;

  await prisma.subscription.upsert({
    where: { id: sub.id },
    create: {
      id: sub.id,
      userId: user.id,
      status: sub.status,
      priceId: sub.items.data[0]?.price?.id ?? null,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: !!sub.cancel_at_period_end,
    },
    update: {
      status: sub.status,
      priceId: sub.items.data[0]?.price?.id ?? null,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: !!sub.cancel_at_period_end,
    },
  });
}

export async function POST(req: NextRequest) {
  let event: Stripe.Event;

  let rawBody: string;
  try {
    rawBody = await req.text();
    const signature = req.headers.get("stripe-signature")!;
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: "invalid_signature", detail: e?.message },
      { status: 400 },
    );
  }

  try {
    console.log("event.type:", event.type);

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await upsertFromSubscription(sub);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId =
          typeof (invoice as any).subscription === "string"
            ? (invoice as any).subscription
            : ((invoice as any).subscription as Stripe.Subscription | null)?.id;

        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId, {
            expand: ["items.data.price"],
          });
          await upsertFromSubscription(sub);
        }
        break;
      }

      case "checkout.session.completed": {
        const cs = event.data.object as Stripe.Checkout.Session;
        const customerId =
          typeof cs.customer === "string"
            ? cs.customer
            : (cs.customer as Stripe.Customer | null)?.id;

        const userId = cs.client_reference_id || cs.metadata?.user_id;

        if (customerId && userId) {
          // Only set if currently unset or already matches.
          await prisma.user.updateMany({
            where: {
              id: userId,
              OR: [
                { stripeCustomerId: null },
                { stripeCustomerId: customerId },
              ],
            },
            data: { stripeCustomerId: customerId },
          });
        }
        break;
      }

      case "setup_intent.succeeded": {
        const si = event.data.object as Stripe.SetupIntent;

        const customerId = typeof si.customer === "string"
          ? si.customer
          : (si.customer as Stripe.Customer | null)?.id;

        if (customerId) {
          const accountId = (si.metadata && si.metadata.accountId) || null;
          if (accountId) {
            await prisma.user.updateMany({
              where: {
                id: accountId,
                OR: [
                  { stripeCustomerId: null },
                  { stripeCustomerId: customerId },
                ],
              },
              data: { stripeCustomerId: customerId },
            });
          }

          const subs = await stripe.subscriptions.list({
            customer: customerId,
            status: "all",
            expand: ["data.items.data.price"],
            limit: 1,
          });
          const latest = subs.data[0];
          if (latest) await upsertFromSubscription(latest);
        }
        break;
      }

      case "invoice.finalized": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = typeof (invoice as any).subscription === "string"
          ? (invoice as any).subscription
          : ((invoice as any).subscription as Stripe.Subscription | null)?.id;

        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId, {
            expand: ["items.data.price"],
          });
          await upsertFromSubscription(sub);
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("[stripe webhook]", event.type, e);
    return NextResponse.json(
      { error: "webhook_error", type: event.type, detail: e?.message },
      { status: 500 },
    );
  }
}
