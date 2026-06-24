"use client";

// Recruiter subscription checkout (authed flow). Reuses the existing authed
// Stripe routes (/api/billing/setup-intent + /api/billing/subscribe) but passes
// the recruiter price id and lands on the recruiter dashboard — it does NOT
// touch the candidate guest/return flow.
//
// Recruiter price comes from NEXT_PUBLIC_STRIPE_PRICE_RECRUITER. If that's
// unset (pre-launch), we omit priceId and the server falls back to its default
// price so the flow stays testable.

import React from "react";
import { useRouter } from "next/navigation";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import toast from "react-hot-toast";
import { auth } from "@/app/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { fetchAuthed } from "@/app/builder/_client/withAuth";
import { useQuery } from "@/app/builder/hooks/use-query";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
const RECRUITER_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_RECRUITER || "";

async function activate(setupIntentId: string, router: ReturnType<typeof useRouter>) {
  const body: any = { setupIntentId };
  if (RECRUITER_PRICE) body.priceId = RECRUITER_PRICE;
  const r = await fetchAuthed("/api/billing/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.detail || j?.error || "activate_failed");
  // Mark the account as a recruiter, then enter the workspace.
  await fetchAuthed("/api/recruiter/onboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  }).catch(() => {});
  toast.success("Recruiter subscription started!");
  router.replace("/recruiter/dashboard");
}

function CheckoutInner({ clientSecret }: { clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const lock = React.useRef(false);

  const onSubmit = async () => {
    if (!stripe || !elements || lock.current) return;
    lock.current = true;
    setSubmitting(true);
    try {
      const result = await stripe.confirmSetup({
        elements,
        confirmParams: { return_url: `${location.origin}/recruiter/pricing` },
        redirect: "if_required",
      });
      const err: any = (result as any)?.error;
      if (err) {
        if (err.code === "setup_intent_unexpected_state" && err?.setup_intent?.id) {
          await activate(err.setup_intent.id, router);
          return;
        }
        toast.error(err?.message || "Payment confirmation failed");
        lock.current = false;
        setSubmitting(false);
        return;
      }
      const siId = (result as any)?.setupIntent?.id;
      if (!siId) {
        toast.error("Missing SetupIntent id");
        lock.current = false;
        setSubmitting(false);
        return;
      }
      await activate(siId, router);
    } catch (e: any) {
      toast.error(e?.message || "Activation failed");
      lock.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <PaymentElement options={{ layout: "accordion" }} />
      <button
        onClick={onSubmit}
        disabled={!stripe || !elements || submitting}
        className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 font-semibold disabled:opacity-60 transition-colors"
      >
        {submitting ? "Processing…" : "Start 14-day free trial"}
      </button>
      <p className="text-xs text-[#a1a1aa]">
        We securely save your payment method, then start your trial. Cancel anytime before it ends and you won&apos;t be charged.
      </p>
    </div>
  );
}

export default function RecruiterCheckout() {
  const router = useRouter();
  const params = useQuery();
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [phase, setPhase] = React.useState<"loading" | "ready" | "finalizing">("loading");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!alive) return;
      if (!user) {
        router.replace("/login?role=recruiter&return=/recruiter/pricing");
        return;
      }
      // Returning from a redirect-based confirmation?
      const siId = params?.get("setup_intent");
      if (siId) {
        setPhase("finalizing");
        try {
          await activate(siId, router);
        } catch (e: any) {
          setError(e?.message || "Could not finalize subscription");
          setPhase("ready");
        }
        return;
      }
      try {
        const r = await fetchAuthed("/api/billing/setup-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.detail || j?.error || "setup_failed");
        if (!alive) return;
        setClientSecret(j.clientSecret);
        setPhase("ready");
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Could not start checkout");
        setPhase("ready");
      }
    });
    return () => {
      alive = false;
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "finalizing") {
    return <div className="text-center text-sm text-[#52525a] py-8">Finalizing your subscription…</div>;
  }
  if (error) {
    return <div className="text-sm text-red-600 py-4">{error}</div>;
  }
  if (!clientSecret) {
    return <div className="text-center text-sm text-[#52525a] py-8">Preparing secure checkout…</div>;
  }
  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
      <CheckoutInner clientSecret={clientSecret} />
    </Elements>
  );
}
