'use client';
//
// Best-practice landing-page subscribe component.
//
// Differences from the legacy SubscribePay:
//   - No email gate up-front. We create the SetupIntent on mount with just an
//     accountId so Express Checkout (Apple/Google Pay) is tappable immediately.
//   - The accountId is cached in sessionStorage so a tab refresh reuses the
//     same Stripe customer instead of creating a new orphan each time.
//   - Pricing copy (price, currency, trial days) is driven by the server's
//     response — no hardcoded "€19.99 / 14 days" that drift from Stripe.
//   - On payment success → /billing/return for the claim/sign-in step (the
//     existing flow already merges the guest account into the authed user via
//     /api/account/claim).
//

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import toast from 'react-hot-toast';
import { track, trackSubscribeSuccess } from '@/lib/track';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import InAppSubscribe from './InAppSubscribe';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const ACCOUNT_ID_KEY = 'resumemint_account_id';
const SI_CACHE_KEY = 'resumemint_guest_si';

type StartResponse = {
  clientSecret: string;
  customerId: string;
  accountId: string;
  priceId: string | null;
  priceAmount: number | null;       // minor units
  priceCurrency: string | null;
  priceInterval: 'day' | 'week' | 'month' | 'year' | null;
  priceIntervalCount: number | null;
  trialDays: number;
};

function readSession<T>(key: string): T | null {
  try {
    const v = sessionStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch { return null; }
}
function writeSession<T>(key: string, val: T) {
  try { sessionStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export function formatPrice(amount: number | null, currency: string | null): string {
  if (amount == null || !currency) return '';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

/* ------------ visual: loading skeleton ------------ */
function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse" aria-live="polite" aria-busy="true">
      <div className="h-12 rounded-xl bg-gray-200" />
      <div className="h-12 rounded-xl bg-gray-100" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-12 rounded-xl bg-gray-100" />
        <div className="h-12 rounded-xl bg-gray-100" />
      </div>
      <div className="h-12 rounded-full bg-gray-200" />
      <div className="text-center text-xs text-[#a1a1aa]">Preparing secure checkout…</div>
    </div>
  );
}

/* ------------ Stripe-aware inner form ------------ */
function CheckoutForm({
  start,
  showDevTestCard,
}: {
  start: StartResponse;
  showDevTestCard: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const lock = useRef(false);
  const setupIntentId = start.clientSecret.split('_secret')[0];

  async function activate(siId: string) {
    const r = await fetch('/api/billing/guest/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setupIntentId: siId, priceId: start.priceId || undefined }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.detail || j?.error || 'activate_failed');
    track({
      event: 'sale',
      props: { page: 'landing', setupIntentId: siId, subscriptionId: j.subscriptionId },
      dedupeKey: j.subscriptionId,
    });
    if (j.subscriptionId) {
      trackSubscribeSuccess({
        subscriptionId: j.subscriptionId,
        status: j.status,
        priceAmount: j.priceAmount ?? start.priceAmount,
        priceCurrency: j.priceCurrency ?? start.priceCurrency,
        page: 'landing',
      });
    }
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).dataLayer.push({
      event: 'ads_conversion',
      conversion_name: 'purchase',
      subscription_id: j.subscriptionId,
      value: (start.priceAmount ?? 0) / 100,
      currency: (start.priceCurrency || 'USD').toUpperCase(),
    });
    toast.success('Subscription activated!');
    // Clear cached SI so a returning user doesn't reuse a now-spent one.
    try { sessionStorage.removeItem(SI_CACHE_KEY); } catch {}
    location.href = `/billing/return?setup_intent=${encodeURIComponent(siId)}`;
  }

  const confirmAndActivate = useCallback(async () => {
    if (!stripe || !elements || lock.current) return;
    lock.current = true;
    setSubmitting(true);
    try {
      // Already-succeeded SI (page refresh after payment redirect).
      const retrieved = await stripe.retrieveSetupIntent(start.clientSecret);
      const pre = retrieved?.setupIntent;
      if (pre?.status === 'succeeded' && pre.id) {
        await activate(pre.id);
        return;
      }

      const result = await stripe.confirmSetup({
        elements,
        confirmParams: { return_url: `${location.origin}/billing/return` },
        redirect: 'if_required',
      });
      const err: any = (result as any)?.error;
      if (err) {
        if (err.code === 'setup_intent_unexpected_state' && err?.setup_intent?.id) {
          await activate(err.setup_intent.id);
          return;
        }
        throw new Error(err.message || 'Payment confirmation failed');
      }

      const siId =
        (result as any)?.setupIntent?.id ||
        (result as any)?.setupIntent?.client_secret?.split('_secret')[0] ||
        setupIntentId;
      await activate(siId);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Could not complete checkout');
      lock.current = false;
      setSubmitting(false);
    }
  }, [stripe, elements, start.clientSecret, setupIntentId]);

  const useTestCard = useCallback(async () => {
    if (lock.current) return;
    lock.current = true;
    setSubmitting(true);
    try {
      const r = await fetch('/api/dev/stripe/confirm-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setupIntentId, paymentMethod: 'pm_card_visa' }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.detail || j?.error || 'dev_confirm_failed');
      await activate(setupIntentId);
    } catch (e: any) {
      toast.error(e?.message || 'Test confirm failed');
      lock.current = false;
      setSubmitting(false);
    }
  }, [setupIntentId]);

  return (
    <div className="w-full space-y-3">
      <ExpressCheckoutElement
        onConfirm={confirmAndActivate}
        options={{ paymentMethodOrder: ['apple_pay', 'google_pay'] }}
      />
      <PaymentElement options={{ layout: 'accordion' }} />
      <button
        onClick={confirmAndActivate}
        disabled={!stripe || !elements || submitting}
        className="w-full rounded-full bg-[#2a72d7] text-white px-4 py-3 font-semibold disabled:opacity-60"
        aria-busy={submitting}
      >
        {submitting ? 'Processing…' : 'Start subscription'}
      </button>
      <p className="text-xs text-[#a1a1aa]">
        We&rsquo;ll securely save your payment method, then start your subscription.
        You&rsquo;ll sign in on the next step to link this purchase to your account.
      </p>
      {showDevTestCard && (
        <button
          type="button"
          onClick={useTestCard}
          disabled={submitting}
          className="w-full text-xs px-3 py-2 rounded-md border border-dashed border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 disabled:opacity-60"
          title="Local dev only — confirms the SetupIntent with pm_card_visa"
        >
          {submitting ? 'Submitting…' : '⚙︎ Use Stripe test card 4242 (dev only)'}
        </button>
      )}
    </div>
  );
}

/* ------------ "already subscribed" CTA ------------ */
function AlreadySubscribed() {
  return (
    <div className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-left">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid place-items-center h-8 w-8 rounded-full bg-emerald-500/20">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 7L9 18l-5-5" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-emerald-900">You&rsquo;re already subscribed</h3>
          <p className="mt-1 text-sm text-emerald-800">
            Welcome back! Your subscription is active. Open the builder to keep working.
          </p>
          <Link
            href="/builder"
            className="mt-4 inline-flex w-full justify-center rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Open dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ------------ guest flow (no auth) ------------ */
function GuestSubscribe() {
  const [start, setStart] = useState<StartResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const startedRef = useRef(false);
  const [showDevTestCard, setShowDevTestCard] = useState(false);

  useEffect(() => {
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
    const host = typeof window !== 'undefined' ? location.hostname : '';
    setShowDevTestCard(pk.startsWith('pk_test_') && (host === 'localhost' || host === '127.0.0.1'));
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        // Reuse cached SI within the same tab so refresh doesn't churn.
        const cached = readSession<StartResponse>(SI_CACHE_KEY);
        if (cached?.clientSecret) {
          setStart(cached);
          return;
        }
        const cachedAccountId = (() => {
          try { return localStorage.getItem(ACCOUNT_ID_KEY); } catch { return null; }
        })();
        const r = await fetch('/api/billing/guest/setup-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cachedAccountId ? { accountId: cachedAccountId } : {}),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.detail || j?.error || 'start_failed');
        try { localStorage.setItem(ACCOUNT_ID_KEY, j.accountId); } catch {}
        writeSession(SI_CACHE_KEY, j);
        setStart(j as StartResponse);
        track({ event: 'show-checkout', props: { page: 'landing', accountId: j.accountId } });
      } catch (e: any) {
        console.error(e);
        setErrorMsg(e?.message || 'Could not start checkout');
      }
    })();
  }, []);

  const elementsOptions = useMemo(
    () =>
      start
        ? {
            clientSecret: start.clientSecret,
            appearance: { theme: 'stripe' as const },
          }
        : null,
    [start],
  );

  if (errorMsg) {
    return (
      <div className="w-full rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <div className="font-medium mb-1">Couldn&rsquo;t start checkout</div>
        <div>{errorMsg}</div>
        <button
          onClick={() => location.reload()}
          className="mt-3 text-xs underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!start || !elementsOptions) {
    return <LoadingSkeleton />;
  }

  return (
    <Elements stripe={stripePromise} options={elementsOptions}>
      <CheckoutForm start={start} showDevTestCard={showDevTestCard} />
    </Elements>
  );
}

/* ------------ outer router ------------ */
export default function LandingSubscribe() {
  const { isAuthenticated, isSubscribed, loading } = useAuthStatus();

  if (loading) return <LoadingSkeleton />;

  if (isAuthenticated && isSubscribed) {
    return <AlreadySubscribed />;
  }

  if (isAuthenticated && !isSubscribed) {
    // Use the authed flow so the subscription attaches to the existing user
    // row instead of creating an orphan guest Stripe customer.
    return <InAppSubscribe onActivated={() => { location.href = '/builder'; }} />;
  }

  // Guest flow
  return <GuestSubscribe />;
}
