'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Elements,
  PaymentRequestButtonElement,
  useStripe,
  useElements,
  PaymentElement,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import toast from 'react-hot-toast';
import { auth } from '@/app/firebase';
import { signOut } from 'firebase/auth';
import { track } from '@/lib/track';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
const PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || 'price_xxx';
const DISPLAY_LABEL = 'ResumeMint — save payment method';

type StartResponse = {
  clientSecret: string;
  accountId?: string;
  customerId?: string;
  merchantCountry?: string;
  priceCurrency?: string;
};

type SubscribeAllPayProps = {
  onWalletReadyChange?: (ready: boolean) => void;
  onWalletSupportChange?: (supported: boolean) => void;
  /**
   * When true (default), the starter signs out the current Firebase user
   * before creating a guest SetupIntent — appropriate for the landing-page
   * guest checkout flow. Set to false when embedding this component for an
   * already-authenticated user (e.g. the in-app subscribe slide panel) so
   * we don't kick them out of their session.
   */
  signOutFirst?: boolean;
  /**
   * Called after the SetupIntent is confirmed AND the subscription has been
   * activated. The default behavior (no callback supplied) redirects to
   * /billing/return. Provide a callback when embedding in the in-app slide
   * panel so we can just close the modal instead of redirecting.
   */
  onActivated?: (payload: any) => void;
};

/* -------------------- Wallet (Apple/Google Pay) -------------------- */
function WalletAutoFlow({
  clientSecret,
  merchantCountry = 'US',
  priceCurrency = 'usd',
  onActivated,
  onWalletReadyChange,
  onWalletSupportChange,
}: {
  clientSecret: string;
  merchantCountry?: string;
  priceCurrency?: string;
  /** Optional. If provided, replaces the default /billing/return redirect. */
  onActivated?: (payload: any) => void;
  onWalletReadyChange?: (ready: boolean) => void;
  onWalletSupportChange?: (supported: boolean) => void;
}) {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState<stripe.paymentRequest.PaymentRequest | null>(null);
  const prReady = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    onWalletReadyChange?.(false);
    onWalletSupportChange?.(false);
  }, [onWalletReadyChange, onWalletSupportChange]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!stripe) return;

      try {
        track({ event: 'payment-request-can', props: { page: 'landing' } });
        const pr = stripe.paymentRequest({
          country: merchantCountry,
          currency: priceCurrency,
          total: { label: DISPLAY_LABEL, amount: 0, pending: true },
          requestPayerEmail: false,
        });

        const can = await pr.canMakePayment();

        if (!can || (!can.applePay && !can.googlePay)) {
          if (!cancelled) {
            setPaymentRequest(null);
            onWalletReadyChange?.(false);
            onWalletSupportChange?.(false);
          }
          track({ event: 'payment-request-can-failure', props: { page: 'landing', can } });
          return;
        }

        if (!cancelled) {
          setPaymentRequest(pr);
          onWalletSupportChange?.(true);
        }

        pr.on('paymentmethod', async (ev) => {
          try {
            track({ event: 'payment-request-start', props: { page: 'landing' } });
            setSubmitting(true);

            const { error, setupIntent } = await stripe.confirmSetup({
              clientSecret,
              confirmParams: { payment_method: ev.paymentMethod.id },
              redirect: 'if_required',
            });

            if (error) {
              track({ event: 'payment-request-failure', props: { page: 'landing', error: error.message } });
              ev.complete('fail');
              setSubmitting(false);
              toast.error(error.message || 'Payment confirmation failed');
              return;
            }

            const siId = setupIntent?.id || setupIntent?.client_secret?.split('_secret')[0];
            if (!siId) {
              track({ event: 'payment-request-failure', props: { page: 'landing', error: 'Missing SetupIntent id' } });
              ev.complete('fail');
              setSubmitting(false);
              toast.error('Missing SetupIntent id');
              return;
            }

            // Auth-aware: signed-in user goes through /api/billing/subscribe.
            const currentUser = auth?.currentUser;
            let j: any;
            if (currentUser) {
              const token = await currentUser.getIdToken();
              const r = await fetch('/api/billing/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ setupIntentId: siId, priceId: PRICE_ID }),
              });
              j = await r.json();
              if (!r.ok) throw new Error(j?.detail || j?.error || 'activate_failed');
            } else {
              const r = await fetch('/api/billing/guest/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ setupIntentId: siId, priceId: PRICE_ID }),
              });
              j = await r.json();
              if (!r.ok) throw new Error(j?.detail || j?.error || 'activate_failed');
            }

            track({ event: 'payment-request-success', props: { page: currentUser ? 'app' : 'landing', setupIntentId: siId } });

            ev.complete('success');

            (window as any).dataLayer = (window as any).dataLayer || [];
            (window as any).dataLayer.push({
              event: 'ads_conversion',
              conversion_name: 'purchase',
              subscription_id: j.subscriptionId,
              value: 1.0,
              currency: 'USD',
            });

            toast.success('Subscription activated!');
            if (onActivated) {
              onActivated(j);
            } else if (currentUser) {
              location.reload();
            } else {
              location.href = `/billing/return?setup_intent=${encodeURIComponent(siId)}`;
            }
          } catch (e: any) {
            ev.complete('fail');
            setSubmitting(false);
            toast.error(e?.message || 'Activation failed');
          }
        });

      } catch (e: any) {
        if (!cancelled) {
          setPaymentRequest(null);
          onWalletReadyChange?.(false);
          onWalletSupportChange?.(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [stripe, clientSecret, merchantCountry, priceCurrency, onWalletReadyChange, onWalletSupportChange]);

  const openWallet = useCallback(async () => {
    track({ event: 'open-wallet', props: { page: 'landing' } });
    if (!paymentRequest || !stripe || submitting) return;
    if (!prReady.current) await new Promise((r) => setTimeout(r, 0));
    try {
      await paymentRequest.show();
      track({ event: 'open-wallet-success', props: { page: 'landing' } });
    } catch (e: any) {
      track({ event: 'open-wallet-failure', props: { page: 'landing', error: e?.message || String(e) } });
      toast.error(e?.message || 'Could not open wallet');
    }
  }, [paymentRequest, stripe, submitting]);

  const showBtn = !!paymentRequest && prReady.current && !submitting;

  return (
    <div className="space-y-3">
      {/* Hidden PRB to initialize the wallet bridge */}
      <div style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}>
        {paymentRequest && (
          <PaymentRequestButtonElement
            options={{ paymentRequest, style: { paymentRequestButton: { type: 'default' } } }}
            onReady={() => {
              prReady.current = true;
              onWalletReadyChange?.(true);
              track({ event: 'wallet_ready', props: { page: 'landing' } });
            }}
          />
        )}
      </div>

      {showBtn ? (
        <button onClick={openWallet} disabled={!showBtn} className="btn btn-creative start-now-button">
          {submitting ? 'Processing…' : 'Continue with Apple/Google Pay'}
        </button>
      ) : (
        <div className="text-sm text-[#a1a1aa]">Checking wallet…</div>
      )}
    </div>
  );
}

/* -------------------- Card (PaymentElement) -------------------- */
function CardSetupFlow({
  clientSecret,
  onActivated,
}: {
  clientSecret: string;
  /** Optional. If provided, replaces the default /billing/return redirect. */
  onActivated?: (payload: any) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [showDevTestCard, setShowDevTestCard] = useState(false);

  // Compute the gate AFTER mount so we never depend on module-load timing.
  useEffect(() => {
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
    const isTest = pk.startsWith('pk_test_');
    const host = typeof window !== 'undefined' ? location.hostname : '';
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    setShowDevTestCard(isTest && isLocal);
    // eslint-disable-next-line no-console
    console.log('[SubscribeAllPay] dev-test-card gate:', { isTest, isLocal, pk: pk.slice(0, 10) + '…', host });
  }, []);

  const setupIntentId = clientSecret.split('_secret')[0];

  async function finalize(siId: string) {
    // If the user is already authenticated, go through the authed activate
    // endpoint and skip the /billing/return claim page.
    const currentUser = auth?.currentUser;
    if (currentUser) {
      const token = await currentUser.getIdToken();
      const r = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ setupIntentId: siId, priceId: PRICE_ID }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.detail || j?.error || 'activate_failed');
      track({ event: 'card_confirm_success', props: { page: 'app', setupIntentId: siId, authed: true } });
      toast.success(j.alreadySubscribed ? 'You already have an active subscription.' : 'Subscription activated!');
      if (onActivated) {
        onActivated(j);
      } else {
        location.reload();
      }
      return;
    }

    // Guest path — landing checkout, redirect to /billing/return for claim.
    const r = await fetch('/api/billing/guest/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setupIntentId: siId, priceId: PRICE_ID }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.detail || j?.error || 'activate_failed');
    track({ event: 'card_confirm_success', props: { page: 'landing', setupIntentId: siId, authed: false } });
    toast.success('Subscription activated!');
    if (onActivated) {
      onActivated(j);
    } else {
      location.href = `/billing/return?setup_intent=${encodeURIComponent(siId)}`;
    }
  }

  const onSubmit = useCallback(async () => {
    if (!stripe || !elements || submitting) return;
    try {
      setSubmitting(true);
      track({ event: 'card_submit', props: { page: 'landing' } });

      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        track({ event: 'card_confirm_fail', props: { page: 'landing', error: error.message } });
        toast.error(error.message || 'Card confirmation failed');
        setSubmitting(false);
        return;
      }

      const siId = setupIntent?.id || setupIntent?.client_secret?.split('_secret')[0];
      if (!siId) {
        track({ event: 'card_confirm_fail', props: { page: 'landing', error: 'Missing SetupIntent id' } });
        toast.error('Missing SetupIntent id');
        setSubmitting(false);
        return;
      }

      await finalize(siId);
    } catch (e: any) {
      toast.error(e?.message || 'Activation failed');
      setSubmitting(false);
    }
  }, [stripe, elements, submitting, onActivated]);

  const onUseTestCard = useCallback(async () => {
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
      toast.error(e?.message || 'Test confirm failed');
      setSubmitting(false);
    }
  }, [setupIntentId, submitting, onActivated]);

  useEffect(() => {
    track({ event: 'card_form_view', props: { page: 'landing' } });
  }, []);

  return (
    <div className="space-y-3">
      <PaymentElement options={{ layout: 'accordion' }} />
      <button onClick={onSubmit} disabled={!stripe || !elements || submitting} className="btn btn-creative w-full">
        {submitting ? 'Processing…' : 'Continue'}
      </button>

      {showDevTestCard && (
        <button
          type="button"
          onClick={onUseTestCard}
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

/* -------------------- Starter: request SetupIntent -------------------- */
function SubscribeStarter({
  onStarted,
  signOutFirst = true,
}: {
  onStarted: (p: StartResponse) => void;
  signOutFirst?: boolean;
}) {
  const [starting, setStarting] = useState(false);
  const startedRef = useRef(false);

  const start = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    try {
      if (signOutFirst) {
        try { if (auth?.currentUser) await signOut(auth); } catch {}
      }
      track({ event: 'start_guest_request', props: { page: 'landing' } });

      // Reuse the existing guest accountId from a prior visit if we have one,
      // so we don't create a brand-new users row + Stripe customer on every open.
      let cachedAccountId: string | null = null;
      try { cachedAccountId = localStorage.getItem('resumemint_account_id'); } catch {}

      const r = await fetch('/api/billing/guest/setup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cachedAccountId ? { accountId: cachedAccountId } : {}),
      });
      const j: StartResponse = await r.json();
      if (!r.ok) throw new Error((j as any)?.error || (j as any)?.detail || 'start_failed');

      track({
        event: 'start_guest_success',
        props: { page: 'landing', accountId: j.accountId, customerId: j.customerId },
        dedupeKey: j.accountId,
      });

      if (j.accountId) localStorage.setItem('resumemint_account_id', j.accountId);
      if (j.customerId) localStorage.setItem('resumemint_stripe_customer_id', j.customerId);

      onStarted(j);
    } catch (e: any) {
      track({ event: 'start_guest_fail', props: { page: 'landing', error: e?.message } });
      toast.error(e?.message || 'Could not start checkout');
      setStarting(false);
    }
  }, [starting, onStarted, signOutFirst]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    start();
  }, [start]);

  return null;
}

function SubscribeLoading() {
  return (
    <div className="space-y-4 animate-pulse" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-2 text-sm text-[#52525a]">
        <svg className="animate-spin h-4 w-4 text-brand" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
          <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <span>Preparing secure checkout…</span>
      </div>
      <div className="h-10 rounded-lg bg-gray-100" />
      <div className="h-px bg-gray-100" />
      <div className="h-10 rounded-lg bg-gray-100" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-10 rounded-lg bg-gray-100" />
        <div className="h-10 rounded-lg bg-gray-100" />
      </div>
      <div className="h-11 rounded-lg bg-gray-200" />
    </div>
  );
}

/* -------------------- Unified Component: Wallet + Card -------------------- */
export default function SubscribeAllPay(props: SubscribeAllPayProps) {
  const { onWalletReadyChange, onWalletSupportChange, signOutFirst = true, onActivated } = props;
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [merchantCountry, setMerchantCountry] = useState<string>('US');
  const [priceCurrency, setPriceCurrency] = useState<string>('usd');

  useEffect(() => {
    track({ event: 'show-checkout', props: { page: 'landing' } });
  }, []);

  if (!clientSecret) {
    return (
      <>
        <SubscribeStarter
          signOutFirst={signOutFirst}
          onStarted={(j) => {
            setClientSecret(j.clientSecret);
            if (j.merchantCountry) setMerchantCountry(j.merchantCountry);
            if (j.priceCurrency) setPriceCurrency(j.priceCurrency);
            onWalletReadyChange?.(false);
            onWalletSupportChange?.(false);
          }}
        />
        <SubscribeLoading />
      </>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: { theme: 'night' },
      }}
    >
      <div className="max-w-md w-full space-y-6">
        {/* Wallet (shows only if supported; button appears when ready) */}
        <WalletAutoFlow
          clientSecret={clientSecret}
          merchantCountry={merchantCountry}
          priceCurrency={priceCurrency}
          onActivated={onActivated}
          onWalletReadyChange={onWalletReadyChange}
          onWalletSupportChange={onWalletSupportChange}
        />

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px bg-gray-200 flex-1" />
          <span className="text-xs uppercase tracking-wide text-[#a1a1aa]">or</span>
          <div className="h-px bg-gray-200 flex-1" />
        </div>

        {/* Card fallback (always rendered, safe in parallel) */}
        <CardSetupFlow clientSecret={clientSecret} onActivated={onActivated} />
      </div>
    </Elements>
  );
}
