'use client';
//
// Authed in-app subscribe flow. Used inside SubscribeSlidePanel when the
// user is already signed in. Talks to:
//   POST /api/billing/setup-intent   (creates SI on user's Stripe customer)
//   POST /api/billing/subscribe      (creates subscription from confirmed SI)
//
// Independent from SubscribeAllPay (which is for the guest landing checkout).
//

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import toast from 'react-hot-toast';
import { auth } from '@/app/firebase';
import { track } from '@/lib/track';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type StartResponse = {
  clientSecret: string;
  customerId: string;
};

type Props = {
  /** Called after a Subscription is created (or already existed). */
  onActivated?: (payload: { subscriptionId: string; status: string; alreadySubscribed?: boolean }) => void;
};

async function authedFetch(input: string, init: RequestInit = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('not_signed_in');
  const token = await user.getIdToken();
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(input, { ...init, headers });
}

/* ---------- loading skeleton ---------- */
function Loading({ label = 'Preparing secure checkout…' }: { label?: string }) {
  return (
    <div className="space-y-4 animate-pulse" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-2 text-sm text-[#52525a]">
        <svg className="animate-spin h-4 w-4 text-brand" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
          <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <span>{label}</span>
      </div>
      <div className="h-10 rounded-lg bg-gray-100" />
      <div className="h-10 rounded-lg bg-gray-100" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-10 rounded-lg bg-gray-100" />
        <div className="h-10 rounded-lg bg-gray-100" />
      </div>
      <div className="h-11 rounded-lg bg-gray-200" />
    </div>
  );
}

/* ---------- inner: Elements-aware form ---------- */
function PayForm({ clientSecret, onActivated }: { clientSecret: string; onActivated?: Props['onActivated'] }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [showDevTestCard, setShowDevTestCard] = useState(false);

  const setupIntentId = clientSecret.split('_secret')[0];

  // Dev convenience: skip the form entirely against pm_card_visa in local test mode.
  useEffect(() => {
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
    const isTest = pk.startsWith('pk_test_');
    const host = typeof window !== 'undefined' ? location.hostname : '';
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    setShowDevTestCard(isTest && isLocal);
  }, []);

  async function finalize(siId: string) {
    const r = await authedFetch('/api/billing/subscribe', {
      method: 'POST',
      body: JSON.stringify({ setupIntentId: siId }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.detail || j?.error || 'subscribe_failed');
    track({ event: 'subscribe_success', props: { authed: true, setupIntentId: siId } });
    toast.success(j.alreadySubscribed ? 'You already have an active subscription.' : 'Subscription activated!');
    onActivated?.(j);
  }

  const onSubmit = useCallback(async () => {
    if (!stripe || !elements || submitting) return;
    try {
      setSubmitting(true);
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
      });
      if (error) {
        toast.error(error.message || 'Card confirmation failed');
        setSubmitting(false);
        return;
      }
      const siId = setupIntent?.id || setupIntent?.client_secret?.split('_secret')[0] || setupIntentId;
      if (!siId) {
        toast.error('Missing SetupIntent id');
        setSubmitting(false);
        return;
      }
      await finalize(siId);
    } catch (e: any) {
      toast.error(e?.message || 'Subscribe failed');
      setSubmitting(false);
    }
  }, [stripe, elements, submitting, setupIntentId, onActivated]);

  const onDevTestCard = useCallback(async () => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const r = await fetch('/api/dev/stripe/confirm-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setupIntentId, paymentMethod: 'pm_card_visa' }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.detail || j?.error || 'dev_confirm_failed');
      await finalize(setupIntentId);
    } catch (e: any) {
      toast.error(e?.message || 'Dev confirm failed');
      setSubmitting(false);
    }
  }, [setupIntentId, submitting, onActivated]);

  return (
    <div className="space-y-3">
      <PaymentElement options={{ layout: 'accordion' }} />
      <button
        onClick={onSubmit}
        disabled={!stripe || !elements || submitting}
        className="w-full rounded-lg bg-brand text-white font-semibold py-3 transition hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting ? 'Processing…' : 'Continue'}
      </button>

      {showDevTestCard && (
        <button
          type="button"
          onClick={onDevTestCard}
          disabled={submitting}
          className="w-full text-xs px-3 py-2 rounded-md border border-dashed border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 disabled:opacity-60"
          title="Local dev only — confirms the SetupIntent with Stripe's pm_card_visa test PaymentMethod"
        >
          {submitting ? 'Submitting…' : '⚙︎ Use Stripe test card 4242 (dev only)'}
        </button>
      )}
    </div>
  );
}

/* ---------- outer: starter + Elements wrapper ---------- */
export default function InAppSubscribe({ onActivated }: Props) {
  const [start, setStart] = useState<StartResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const r = await authedFetch('/api/billing/setup-intent', {
          method: 'POST',
          body: JSON.stringify({}),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.detail || j?.error || 'setup_intent_failed');
        setStart(j as StartResponse);
      } catch (e: any) {
        const m = e?.message || 'Could not start checkout';
        setErrorMsg(m);
        toast.error(m);
      }
    })();
  }, []);

  const options = useMemo(
    () =>
      start
        ? {
            clientSecret: start.clientSecret,
            appearance: { theme: 'night' as const },
          }
        : null,
    [start],
  );

  if (errorMsg) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        {errorMsg}
      </div>
    );
  }

  if (!start || !options) {
    return <Loading />;
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <PayForm clientSecret={start.clientSecret} onActivated={onActivated} />
    </Elements>
  );
}

