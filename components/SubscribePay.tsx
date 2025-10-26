'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { Elements, PaymentElement, ExpressCheckoutElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import toast from 'react-hot-toast';
import { auth } from '@/app/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CheckoutInner({ onConfirmed }: { onConfirmed: () => void }) {
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
      toast.error((result as any).error?.message || 'Payment confirmation failed');
      lock.current = false;
      setSubmitting(false);
      return;
    }
    onConfirmed();
  }, [stripe, elements, onConfirmed]);

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
  const [email, setEmail] = useState('');

  const emailTrimmed = useMemo(() => email.trim(), [email]);
  const emailValid = useMemo(() => /^\S+@\S+\.\S+$/.test(emailTrimmed), [emailTrimmed]);

  const start = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    try {
      // If user is signed in, use auth flow (no email field needed)
      const user = auth.currentUser || await new Promise<any>(res => onAuthStateChanged(auth, u => res(u)));
      if (user) {
        const t = await user.getIdToken();
        const r = await fetch('/api/billing/start', { method: 'POST', headers: { Authorization: `Bearer ${t}` } });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || j?.detail || 'start_failed');
        setClientSecret(j.clientSecret);
        return;
      }

      // Guest flow → email is REQUIRED
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
    const showEmail = !auth.currentUser; // only show email if not signed in
    return (
      <form
        className="max-w-md w-full space-y-3"
        onSubmit={(e) => { e.preventDefault(); start(); }}
      >
        {showEmail && (
          <input
            placeholder="Email to receive your receipt & account link"
            className="w-full rounded-lg border border-white/20 bg-transparent px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            inputMode="email"
            name="email"
            autoComplete="email"
            required
            aria-invalid={email.length > 0 && !emailValid}
          />
        )}
        <button
          type="submit"
          onClick={start}
          disabled={starting || (showEmail && !emailValid)}
          className="w-full rounded-xl bg-white text-black px-4 py-2 font-semibold disabled:opacity-60"
        >
          {starting ? 'Preparing…' : 'Continue'}
        </button>
        <div className="text-xs text-neutral-500">
          We’ll save your payment method first; the subscription is created after this step.
        </div>
      </form>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
      <CheckoutInner onConfirmed={() => { /* no-op */ }} />
    </Elements>
  );
}
