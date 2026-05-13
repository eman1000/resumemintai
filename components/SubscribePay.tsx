'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { Elements, PaymentElement, ExpressCheckoutElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import toast from 'react-hot-toast';
import { auth } from '@/app/firebase';
import { signOut } from 'firebase/auth';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
const PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || 'price_xxx';

function CheckoutInner({
  onActivated,
  setupIntentClientSecret,
  setupIntentMeta,
}: {
  onActivated: (payload: any) => void;
  setupIntentClientSecret: string;
  setupIntentMeta: { email: string };
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const lock = useRef(false);

  const confirmAndActivate = useCallback(async () => {
    if (!stripe || !elements || lock.current) return;
    lock.current = true;
    setSubmitting(true);

    // 0) If SI already succeeded (e.g., refresh), skip straight to activate
    try {
      const retrieved = await stripe.retrieveSetupIntent(setupIntentClientSecret);
      const pre = retrieved?.setupIntent;
      if (pre?.status === 'succeeded' && pre.id) {
        const r = await fetch('/api/billing/activate-guest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setupIntentId: pre.id, priceId: PRICE_ID }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.detail || j?.error || 'activate_failed');

        (window as any).dataLayer = (window as any).dataLayer || [];
        (window as any).dataLayer.push({
          event: 'ads_conversion',
          conversion_name: 'purchase',
          subscription_id: j.subscriptionId,
          value: 1.0,
          currency: 'USD',
        });

        toast.success('Subscription activated!');
        // ✅ use setup_intent so /billing/return unlocks UI
        location.href = `/billing/return?setup_intent=${encodeURIComponent(pre.id)}`;
        return;
      }
    } catch {
      // ignore – fall through to normal confirm
    }

    // 1) Confirm SI (if not already succeeded)
    const result = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: `${location.origin}/billing/return` },
      redirect: 'if_required',
    });

    // 2) Handle errors (including "already succeeded")
    const err: any = (result as any)?.error;
    if (err) {
      if (err.code === 'setup_intent_unexpected_state' && err?.setup_intent?.id) {
        try {
          const r = await fetch('/api/billing/activate-guest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ setupIntentId: err.setup_intent.id, priceId: PRICE_ID }),
          });
          const j = await r.json();
          if (!r.ok) throw new Error(j?.detail || j?.error || 'activate_failed');

          (window as any).dataLayer = (window as any).dataLayer || [];
          (window as any).dataLayer.push({
            event: 'ads_conversion',
            conversion_name: 'purchase',
            subscription_id: j.subscriptionId,
            value: 1.0,
            currency: 'USD',
          });

          toast.success('Subscription activated!');
          // ✅ use setup_intent here as well
          location.href = `/billing/return?setup_intent=${encodeURIComponent(err.setup_intent.id)}`;
          return;
        } catch (e: any) {
          toast.error(e?.message || 'Activation failed');
          lock.current = false;
          setSubmitting(false);
          return;
        }
      }

      toast.error(err?.message || 'Payment confirmation failed');
      lock.current = false;
      setSubmitting(false);
      return;
    }

    // 3) Normal success → activate
    const siId =
      (result as any)?.setupIntent?.id ||
      (result as any)?.setupIntent?.client_secret?.split('_secret')[0];

    if (!siId) {
      toast.error('Missing SetupIntent id');
      lock.current = false;
      setSubmitting(false);
      return;
    }

    try {
      const r = await fetch('/api/billing/activate-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setupIntentId: siId, priceId: PRICE_ID }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.detail || j?.error || 'activate_failed');

      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).dataLayer.push({
        event: 'ads_conversion',
        conversion_name: 'purchase',
        subscription_id: j.subscriptionId,
        value: 1.0,
        currency: 'USD',
      });

      toast.success('Subscription activated!');
      // ✅ and here
      location.href = `/billing/return?setup_intent=${encodeURIComponent(siId)}`;
    } catch (e: any) {
      toast.error(e?.message || 'Activation failed');
      lock.current = false;
      setSubmitting(false);
    }
  }, [stripe, elements, setupIntentClientSecret]);

  return (
    <div className="max-w-md w-full space-y-4">
      <ExpressCheckoutElement
        onConfirm={confirmAndActivate}
        options={{ paymentMethodOrder: ['apple_pay', 'google_pay'] }}
      />
      <PaymentElement options={{ layout: 'accordion' }} />
      <button
        onClick={confirmAndActivate}
        disabled={!stripe || !elements || submitting}
        className="w-full rounded-full bg-[#2a72d7] text-white px-4 py-2 font-semibold disabled:opacity-60"
      >
        {submitting ? 'Processing…' : 'Start subscription'}
      </button>
      <div className="text-xs text-[#a1a1aa]">
        We’ll securely save your payment method, then start your subscription.
      </div>
    </div>
  );
}

export default function SubscribePay() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [email, setEmail] = useState('');

  const emailTrimmed = useMemo(() => email.trim(), [email]);
  const emailValid = useMemo(() => /^\S+@\S+\.\S+$/.test(emailTrimmed), [emailTrimmed]);

  const start = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    try {
      // Always force guest flow
      try { if (auth?.currentUser) await signOut(auth); } catch {}

      if (!emailValid) {
        toast.error('Enter a valid email');
        setStarting(false);
        return;
      }

      const r = await fetch('/api/billing/start-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTrimmed }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || j?.detail || 'start_failed');

      setClientSecret(j.clientSecret);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Could not start checkout');
      setStarting(false);
    }
  }, [starting, emailValid, emailTrimmed]);

  if (!clientSecret) {
    return (
      <form
        className="max-w-md w-full space-y-3"
        onSubmit={(e) => { e.preventDefault(); start(); }}
      >
        <input
          placeholder="Email to receive your receipt & account link"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          inputMode="email"
          name="email"
          autoComplete="email"
          required
          aria-invalid={email.length > 0 && !emailValid}
        />
        <button
          type="submit"
          disabled={starting || !emailValid}
          className="w-full rounded-full bg-[#2a72d7] text-white px-4 py-2 font-semibold disabled:opacity-60"
        >
          {starting ? 'Preparing…' : 'Continue'}
        </button>
        <div className="text-xs text-[#a1a1aa]">
          We’ll save your payment method first; the subscription is created after this step.
        </div>
      </form>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
      <CheckoutInner
        setupIntentClientSecret={clientSecret}
        setupIntentMeta={{ email: emailTrimmed }}
        onActivated={() => { /* handled inside inner (redirect) */ }}
      />
    </Elements>
  );
}
