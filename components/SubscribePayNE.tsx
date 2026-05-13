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
import { track } from '@/lib/track';

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
  onWalletReadyChange,
  onWalletSupportChange, 
}: {
  clientSecret: string;
  merchantCountry?: string;
  priceCurrency?: string;
  onActivated: (payload: any) => void;
  onWalletReadyChange: (ready: boolean) => void;
  onWalletSupportChange?: (supported: boolean) => void;
}) {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState<stripe.paymentRequest.PaymentRequest | null>(null);
  const prReady = useRef(false);
  const [submitting, setSubmitting] = useState(false);

   useEffect(() => {
    onWalletReadyChange?.(false);
  }, [onWalletReadyChange, onWalletSupportChange]);

  // Build Payment Request (only after stripe is ready)
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
        // console.log('[PR] canMakePayment =>', can);

        if (!can || (!can.applePay && !can.googlePay)) {
          if (!cancelled) {
            setPaymentRequest(null);
            onWalletReadyChange?.(false);
            onWalletSupportChange?.(false);  
          }
          track({ event: 'payment-request-can-failure', props: { page: 'landing', can } });
          return;
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

            const siId =
              setupIntent?.id ||
              setupIntent?.client_secret?.split('_secret')[0];

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

        pr.on?.('cancel', () => setSubmitting(false));

        if (!cancelled) {
          setPaymentRequest(pr);
          onWalletSupportChange?.(true);  
          // don't mark ready yet—wait for the hidden PRB to call onReady
        }
      } catch (e: any) {
        if (!cancelled) {
          setPaymentRequest(null);
          onWalletReadyChange?.(false);
          onWalletSupportChange?.(false);    
        }
      }
    })();

    return () => { cancelled = true; };
  }, [stripe, clientSecret, merchantCountry, priceCurrency, onActivated, onWalletReadyChange, onWalletSupportChange]);

  const buttonVisible = !!paymentRequest && prReady.current && !submitting;

  // One-click: programmatically open the wallet
  const openWallet = useCallback(async () => {
    track({ event: 'open-wallet', props: { page: 'landing' } });
    if (!paymentRequest || !stripe || submitting) return;
    // Ensure the hidden PRB is mounted at least once
    if (!prReady.current) await new Promise((r) => setTimeout(r, 0));
    try {
      await paymentRequest.show();
      track({ event: 'open-wallet-success', props: { page: 'landing' } });
    } catch (e: any) {
      track({ event: 'open-wallet-failure', props: { page: 'landing', error: e } });
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
            onReady={() => {
              prReady.current = true;
              onWalletReadyChange?.(true);
              track({ event: 'wallet_ready', props: { page: 'landing' } }); // NEW

            }}
          />
        )}
      </div>

      {/* Only render the button when ready */}
      {buttonVisible ? (
        <button
          onClick={openWallet}
          disabled={!buttonVisible}
          className="btn btn-creative start-now-button"
        >
          {submitting ? 'Processing…' : 'Continue'}
        </button>
      ) : (
        // Optional lightweight placeholder while waiting
        <div className="text-sm text-[#a1a1aa]">Loading…</div>
      )}

     
    </div>
  );
}

/* ---------- Starter: separate component with its own hooks ---------- */
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
        dedupeKey: j.accountId
      });
      if (j.accountId) localStorage.setItem('resumemint_account_id', j.accountId);
      if (j.customerId) localStorage.setItem('resumemint_stripe_customer_id', j.customerId);

      onStarted(j);
    } catch (e: any) {
      track({ event: 'start_guest_fail', props: { page: 'landing', error: e?.message } });

      console.error(e);
      toast.error(e?.message || 'Could not start checkout');
      setStarting(false);
    }
  }, [starting, onStarted]);

  useEffect(() => {
    if (startedRef.current) return;   // <-- prevent StrictMode double call
    startedRef.current = true;
    start();
  }, [start]);

  return null; // no fallback button while auto-starting
}


/* ---------- Page component: mounts Elements only after secret exists ---------- */
export default function SubscribePage({
  onWalletReadyChange,
  onWalletSupportChange
}:{
  onWalletReadyChange?: (ready: boolean) => void;
  onWalletSupportChange?: (supported: boolean) => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [merchantCountry, setMerchantCountry] = useState<string>('US');
  const [priceCurrency, setPriceCurrency] = useState<string>('usd');


  useEffect(() => {
    onWalletReadyChange?.(false);
    return () => onWalletReadyChange?.(false);
  }, [onWalletReadyChange]);

  useEffect(() => {
    track({ event: 'show-checkout', props: { page: 'landing' } });
  }, []);
  // NOTE: no hooks after this point depend on clientSecret existence.
  // We switch entire subtrees, not hook flow inside a single component.

  if (!clientSecret) {
    return (
      <SubscribeStarter
        onStarted={(j) => {
          setClientSecret(j.clientSecret);
          if (j.merchantCountry) setMerchantCountry(j.merchantCountry);
          if (j.priceCurrency) setPriceCurrency(j.priceCurrency);
          onWalletReadyChange?.(false);
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
        onWalletReadyChange={(ready) => onWalletReadyChange?.(ready)}
        onWalletSupportChange={onWalletSupportChange}
      />
    </Elements>
  );
}
