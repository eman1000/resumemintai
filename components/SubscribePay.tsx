'use client';

import { useState, useRef, useCallback } from 'react';
import { Elements, PaymentElement, ExpressCheckoutElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import toast from 'react-hot-toast';
import { auth } from '@/app/firebase';
import { ensureAnonOnce } from '@/lib/ensureAnon';
import { track } from '@/lib/track';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CheckoutInner() {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const lock = useRef(false);

  const confirm = useCallback(async () => {
    if (!stripe || !elements || lock.current) return;
    lock.current = true;
    setSubmitting(true);

    const result = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: `${location.origin}/billing/return` },
    });

    if ((result as any)?.error) {
      toast.error((result as any).error?.message || 'Payment method confirmation failed');
      lock.current = false;
      setSubmitting(false);
      return;
    }
    // For wallets that don’t redirect, Stripe may return success inline.
    // We still go to /billing/return where we complete the subscription.
    location.href = `${location.origin}/billing/return`;
  }, [stripe, elements]);

  return (
    <div className="max-w-md w-full space-y-4">
      <ExpressCheckoutElement onConfirm={confirm} options={{ paymentMethodOrder: ['apple_pay','google_pay'] }} />
      <PaymentElement options={{ layout: 'accordion' }} />
      <button
        onClick={confirm}
        disabled={!stripe || !elements || submitting}
        className="w-full rounded-xl bg-white text-black px-4 py-2 font-semibold disabled:opacity-60"
      >
        {submitting ? 'Processing…' : 'Continue'}
      </button>
    </div>
  );
}

export default function SubscribePay() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const start = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    try {
      if (!auth.currentUser) await ensureAnonOnce();
      const t = await auth.currentUser!.getIdToken();
      track({
        event: 'checkout_start',
        props: { place: 'landing', _idToken: t },
      });
      const r = await fetch('/api/billing/start', {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}` },
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || j?.detail || 'Failed to start');

      setClientSecret(j.clientSecret as string);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Could not start checkout');
      setStarting(false);
    }
  }, [starting]);

  if (!clientSecret) {
    return (
      <div className="max-w-md w-full space-y-3">
        <button onClick={start} disabled={starting} className="w-full rounded-xl bg-white text-black px-4 py-2 font-semibold disabled:opacity-60">
          {starting ? 'Preparing…' : 'Continue'}
        </button>
        <div className="text-xs text-neutral-500">We’ll save your payment method first; the subscription is created after this step.</div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
      <CheckoutInner />
    </Elements>
  );
}
