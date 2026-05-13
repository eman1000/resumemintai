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
  onActivated: (payload: any) => void;
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

            const r = await fetch('/api/billing/activate-guest', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ setupIntentId: siId, priceId: PRICE_ID }),
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j?.detail || j?.error || 'activate_failed');

            track({ event: 'payment-request-success', props: { page: 'landing', setupIntentId: siId } });

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
  onActivated,
}: {
  onActivated: (payload: any) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

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

      const r = await fetch('/api/billing/activate-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setupIntentId: siId, priceId: PRICE_ID }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.detail || j?.error || 'activate_failed');

      track({ event: 'card_confirm_success', props: { page: 'landing', setupIntentId: siId } });
      toast.success('Subscription activated!');
      onActivated?.(j);
      location.href = `/billing/return?setup_intent=${encodeURIComponent(siId)}`;
    } catch (e: any) {
      toast.error(e?.message || 'Activation failed');
      setSubmitting(false);
    }
  }, [stripe, elements, submitting, onActivated]);

  useEffect(() => {
    track({ event: 'card_form_view', props: { page: 'landing' } });
  }, []);

  return (
    <div className="space-y-3">
      <PaymentElement options={{ layout: 'accordion' }} />
      <button onClick={onSubmit} disabled={!stripe || !elements || submitting} className="btn btn-creative w-full">
        {submitting ? 'Processing…' : 'Continue'}
      </button>
    </div>
  );
}

/* -------------------- Starter: request SetupIntent -------------------- */
function SubscribeStarter({ onStarted }: { onStarted: (p: StartResponse) => void }) {
  const [starting, setStarting] = useState(false);
  const startedRef = useRef(false);

  const start = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    try {
      try { if (auth?.currentUser) await signOut(auth); } catch {}
      track({ event: 'start_guest_request', props: { page: 'landing' } });

      const r = await fetch('/api/billing/start-guest-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
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
  }, [starting, onStarted]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    start();
  }, [start]);

  return null;
}

/* -------------------- Unified Component: Wallet + Card -------------------- */
export default function SubscribeAllPay(props: SubscribeAllPayProps) {
  const { onWalletReadyChange, onWalletSupportChange } = props;
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [merchantCountry, setMerchantCountry] = useState<string>('US');
  const [priceCurrency, setPriceCurrency] = useState<string>('usd');

  useEffect(() => {
    track({ event: 'show-checkout', props: { page: 'landing' } });
  }, []);

  if (!clientSecret) {
    return (
      <SubscribeStarter
        onStarted={(j) => {
          setClientSecret(j.clientSecret);
          if (j.merchantCountry) setMerchantCountry(j.merchantCountry);
          if (j.priceCurrency) setPriceCurrency(j.priceCurrency);
          onWalletReadyChange?.(false);
          onWalletSupportChange?.(false);
        }}
      />
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
          onActivated={() => {}}
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
        <CardSetupFlow onActivated={() => {}} />
      </div>
    </Elements>
  );
}
