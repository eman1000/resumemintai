// lib/recruiterBilling.ts
//
// Gating helpers for the recruiter product. Recruiter features (shortlisting,
// job postings, applicant management) require an ACTIVE recruiter subscription.
// We don't add a `plan` column to Subscription — instead we detect the recruiter
// plan by its Stripe price id(s). Before the recruiter price is configured in
// Stripe (pre-launch), ANY active subscription counts so the flow is testable;
// once STRIPE_PRICE_RECRUITER_ID is set, it tightens to recruiter prices only.

import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/app/api/server/auth/getUserFromRequest";

const ACTIVE = ["active", "trialing", "past_due"];

/** All Stripe price ids that represent the recruiter plan (monthly + any
 * future billing periods). Configure these once the price exists in Stripe. */
export function recruiterPriceIds(): string[] {
  return [
    process.env.STRIPE_PRICE_RECRUITER_ID,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_RECRUITER,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_RECRUITER_QUARTERLY,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_RECRUITER_ANNUAL,
  ].filter((x): x is string => !!x && x.trim().length > 0);
}

export function recruiterPriceConfigured(): boolean {
  return recruiterPriceIds().length > 0;
}

/** Active recruiter subscription? See file header for the pre-launch fallback. */
export async function hasActiveRecruiterSub(userId: string): Promise<boolean> {
  const ids = recruiterPriceIds();
  if (ids.length === 0) {
    const any = await prisma.subscription.findFirst({
      where: { userId, status: { in: ACTIVE } },
      select: { id: true },
    });
    return !!any;
  }
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: { in: ACTIVE }, priceId: { in: ids } },
    select: { id: true },
  });
  return !!sub;
}

export type RecruiterAuth = { userId: string; firebaseUid: string; email: string | null };

/** Thrown by requireRecruiter — carries a code the route maps to an HTTP status. */
export class RecruiterGateError extends Error {
  code: "UNAUTHORIZED" | "NO_USER" | "NOT_SUBSCRIBED";
  constructor(code: RecruiterGateError["code"]) {
    super(code);
    this.code = code;
    this.name = "RecruiterGateError";
  }
}

/** Verify the caller is an authenticated user with an active recruiter
 * subscription. Throws RecruiterGateError otherwise. */
export async function requireRecruiter(): Promise<RecruiterAuth> {
  let fb;
  try {
    fb = await getUserFromRequest();
  } catch {
    throw new RecruiterGateError("UNAUTHORIZED");
  }
  const user = await prisma.user.findUnique({
    where: { firebaseUid: fb.uid },
    select: { id: true },
  });
  if (!user?.id) throw new RecruiterGateError("NO_USER");
  if (!(await hasActiveRecruiterSub(user.id))) throw new RecruiterGateError("NOT_SUBSCRIBED");
  return { userId: user.id, firebaseUid: fb.uid, email: fb.email ?? null };
}

/** Map a RecruiterGateError to the right HTTP status + body. */
export function recruiterGateResponse(e: RecruiterGateError) {
  if (e.code === "UNAUTHORIZED") return { status: 401, body: { error: "unauthorized" } };
  if (e.code === "NO_USER") return { status: 403, body: { error: "no_user" } };
  return { status: 402, body: { error: "recruiter_subscription_required" } };
}
