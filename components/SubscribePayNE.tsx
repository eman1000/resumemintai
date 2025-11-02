'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Elements,
  PaymentRequestButtonElement,
  useStripe,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import toast from 'react-hot-toast';
import { auth } from '@/app/firebase';
import { signOut } from 'firebase/auth';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
const PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || 'price_xxx';
const DISPLAY_LABEL = 'ResumeMint — save payment method';

type StartResponse = {
  clientSecret: string;
  accountId?: string;
  customerId?: string;
  merchantCountry?: string; // optional; default below
  priceCurrency?: string;   // optional; default below
};

/* ---------- Wallet-only flow (mounted only after clientSecret exists) ---------- */
function WalletAutoFlow({
  clientSecret,
  merchantCountry = 'US',
  priceCurrency = 'eur',
  onActivated,
}: {
  clientSecret: string;
  merchantCountry?: string;
  priceCurrency?: string;
  onActivated: (payload: any) => void;
}) {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState<stripe.paymentRequest.PaymentRequest | null>(null);
  const prReady = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  // Build Payment Request (only after stripe is ready)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!stripe) return;

      try {
        const pr = stripe.paymentRequest({
          country: merchantCountry,
          currency: priceCurrency,
          total: { label: DISPLAY_LABEL, amount: 0, pending: true },
          requestPayerEmail: false,
        });

        const can = await pr.canMakePayment();
        // console.log('[PR] canMakePayment =>', can);

        if (!can || (!can.applePay && !can.googlePay)) {
          if (!cancelled) setPaymentRequest(null);
          return;
        }

        pr.on('paymentmethod', async (ev) => {
          try {
            setSubmitting(true);
            const { error, setupIntent } = await stripe.confirmSetup({
              clientSecret,
              confirmParams: { payment_method: ev.paymentMethod.id },
              redirect: 'if_required',
            });

            if (error) {
              ev.complete('fail');
              setSubmitting(false);
              toast.error(error.message || 'Payment confirmation failed');
              return;
            }

            const siId =
              setupIntent?.id ||
              setupIntent?.client_secret?.split('_secret')[0];

            if (!siId) {
              ev.complete('fail');
              setSubmitting(false);
              toast.error('Missing SetupIntent id');
              return;
            }

            const r = await fetch('/api/billing/activate-guest', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ setupIntentId: siId, priceId: PRICE_ID }),
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j?.detail || j?.error || 'activate_failed');

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
            onActivated?.(j);
            location.href = `/billing/return?setup_intent=${encodeURIComponent(siId)}`;
          } catch (e: any) {
            ev.complete('fail');
            setSubmitting(false);
            toast.error(e?.message || 'Activation failed');
          }
        });

        pr.on?.('cancel', () => setSubmitting(false));

        if (!cancelled) setPaymentRequest(pr);
      } catch (e: any) {
        if (!cancelled) setPaymentRequest(null);
      }
    })();

    return () => { cancelled = true; };
  }, [stripe, clientSecret, merchantCountry, priceCurrency, onActivated]);

  // One-click: programmatically open the wallet
  const openWallet = useCallback(async () => {
    if (!paymentRequest || !stripe || submitting) return;
    // Ensure the hidden PRB is mounted at least once
    if (!prReady.current) await new Promise((r) => setTimeout(r, 0));
    try {
      await paymentRequest.show();
    } catch (e: any) {
      toast.error(e?.message || 'Could not open wallet');
    }
  }, [paymentRequest, stripe, submitting]);

  return (
    <div className="max-w-md w-full space-y-4">
      {/* Hidden PRB to initialize the wallet bridge */}
      <div style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}>
        {paymentRequest && (
          <PaymentRequestButtonElement
            options={{ paymentRequest, style: { paymentRequestButton: { type: 'default' } } }}
            onReady={() => { prReady.current = true; }}
          />
        )}
      </div>

      {/* Continue → opens Apple/Google Pay */}
      <button
        onClick={openWallet}
        disabled={!paymentRequest || submitting}
        className="btn btn-creative start-now-button"
      >
        {submitting ? 'Processing…' : 'Continue'}
      </button>

      {!paymentRequest && (
        <div className="text-sm text-neutral-400">
          Wallet not available on this device.
        </div>
      )}

      <div className="text-xs text-neutral-500">
        You won’t be charged today. <strong>Total due now: $0.00</strong>.
      </div>
    </div>
  );
}

/* ---------- Starter: separate component with its own hooks ---------- */
function SubscribeStarter({
  onStarted,
}: {
  onStarted: (payload: StartResponse) => void;
}) {
  const [starting, setStarting] = useState(false);

  const start = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    try {
      try { if (auth?.currentUser) await signOut(auth); } catch {}

      const r = await fetch('/api/billing/start-guest-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const j: StartResponse = await r.json();
      if (!r.ok) throw new Error((j as any)?.error || (j as any)?.detail || 'start_failed');

      // Persist optional ids
      if (j.accountId) localStorage.setItem('resumemint_account_id', j.accountId);
      if (j.customerId) localStorage.setItem('resumemint_stripe_customer_id', j.customerId);

      onStarted(j);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Could not start checkout');
      setStarting(false);
    }
  }, [starting, onStarted]);

  useEffect(() => {
    start();
  }, [start]);

  return (
    <form className="max-w-md w-full space-y-3" onSubmit={(e) => { e.preventDefault(); start(); }}>
      <button type="submit" disabled={starting} className="btn btn-creative start-now-button">
        {starting ? 'Preparing…' : 'Continue 1'}
      </button>

    </form>
  );
}

/* ---------- Page component: mounts Elements only after secret exists ---------- */
export default function SubscribePage() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [merchantCountry, setMerchantCountry] = useState<string>('US');
  const [priceCurrency, setPriceCurrency] = useState<string>('usd');

  // NOTE: no hooks after this point depend on clientSecret existence.
  // We switch entire subtrees, not hook flow inside a single component.

  if (!clientSecret) {
    return (
      <SubscribeStarter
        onStarted={(j) => {
          setClientSecret(j.clientSecret);
          if (j.merchantCountry) setMerchantCountry(j.merchantCountry);
          if (j.priceCurrency) setPriceCurrency(j.priceCurrency);
        }}
      />
    );
  }
  

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
      <WalletAutoFlow
        clientSecret={clientSecret}
        merchantCountry={merchantCountry}
        priceCurrency={priceCurrency}
        onActivated={() => { /* redirect handled inside */ }}
      />
    </Elements>
  );
}
