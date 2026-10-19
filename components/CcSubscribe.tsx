'use client';
//
// Wallet-first subscribe block for the card-billing style landing (/landing/pro).
//
// Looks like the CC pages: two static white 240×40 buttons (Apple Pay, Google
// Pay) always visible above the fold. Behaviour:
//   - SetupIntent created on mount for a guest account (same endpoint and
//     sessionStorage caching as LandingSubscribe).
//   - Stripe PaymentRequest (amount 0, pending) is built once; a hidden
//     PaymentRequestButtonElement initialises the wallet bridge, exactly like
//     SubscribePayNE. Tapping a button calls paymentRequest.show().
//   - 'paymentmethod' → confirmSetup(payment_method) → /api/billing/guest/subscribe
//     → /billing/return (claim / sign-in step).
//   - If the tapped wallet is not available in this browser, a Stripe
//     PaymentElement (card) is revealed under the buttons instead.
//
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Elements,
  PaymentElement,
  PaymentRequestButtonElement,
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
const PAGE = 'landing';
const VARIANT = 'pro';
const DISPLAY_LABEL = 'ResumeMint';

type StartResponse = {
  clientSecret: string;
  customerId: string;
  accountId: string;
  priceId: string | null;
  priceAmount: number | null;
  priceCurrency: string | null;
  priceInterval: 'day' | 'week' | 'month' | 'year' | null;
  priceIntervalCount: number | null;
  trialDays: number;
  merchantCountry?: string;
};

function readSession<T>(key: string): T | null {
  try { const v = sessionStorage.getItem(key); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
function writeSession<T>(key: string, val: T) {
  try { sessionStorage.setItem(key, JSON.stringify(val)); } catch {}
}

/* ---------- the two static buttons (source: 240×40, white, radius 3, mark ~96×20) ---------- */
function AppleMark() {
  // Apple glyph + "Pay" wordmark, drawn inline so it is crisp at any DPI.
  return (
    <span className="flex items-center gap-[3px]" aria-hidden>
      <svg viewBox="0 0 170 170" className="h-[22px] w-[22px]" fill="#000">
        <path d="M150.4 130.3c-2.5 5.8-5.5 11.1-9 16-4.7 6.7-8.6 11.3-11.6 13.9-4.6 4.3-9.6 6.5-14.9 6.6-3.8 0-8.4-1.1-13.8-3.3-5.4-2.2-10.3-3.3-14.8-3.3-4.7 0-9.8 1.1-15.3 3.3-5.5 2.2-9.9 3.4-13.3 3.5-5.1.2-10.2-2-15.3-6.7-3.3-2.9-7.3-7.7-12.1-14.4-5.1-7.2-9.4-15.6-12.7-25.1C14 110.5 12.2 100.6 12.2 91c0-11 2.4-20.5 7.1-28.4 3.7-6.4 8.7-11.4 14.9-15.1 6.2-3.7 12.9-5.6 20.1-5.7 4.1 0 9.4 1.3 16 3.7 6.6 2.5 10.8 3.7 12.7 3.7 1.4 0 6.1-1.5 14.1-4.4 7.6-2.7 14-3.8 19.2-3.4 14.2 1.1 24.8 6.7 31.9 16.9-12.7 7.7-19 18.4-18.8 32.2.1 10.7 4 19.7 11.7 26.8 3.5 3.3 7.3 5.9 11.6 7.7-.9 2.7-1.9 5.3-3 7.8zM119.1 7.2c0 8.2-3 15.9-9 23-7.2 8.4-16 13.3-25.5 12.5-.1-1-.2-2-.2-3.1 0-7.9 3.4-16.3 9.5-23.2 3-3.5 6.9-6.4 11.6-8.7 4.7-2.3 9.1-3.5 13.3-3.7.1 1.1.2 2.2.2 3.2z"/>
      </svg>
      <span className="text-[21px] font-medium leading-none tracking-[-0.3px] text-black" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif' }}>Pay</span>
    </span>
  );
}
function GoogleMark() {
  return (
    <span className="flex items-center gap-[4px]" aria-hidden>
      <svg viewBox="0 0 48 48" className="h-[22px] w-[22px]">
        <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
        <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z"/>
      </svg>
      <span className="text-[21px] font-medium leading-none tracking-[-0.3px] text-[#3c4043]" style={{ fontFamily: 'Roboto, -apple-system, "Helvetica Neue", Arial, sans-serif' }}>Pay</span>
    </span>
  );
}
function WalletButtons({ onApple, onGoogle, disabled }: { onApple: () => void; onGoogle: () => void; disabled: boolean }) {
  const base = 'mx-auto flex h-10 w-[240px] items-center justify-center rounded-[3px] bg-white text-black disabled:opacity-70';
  return (
    <div className="flex flex-col items-center gap-2">
      <button type="button" onClick={onApple} disabled={disabled} className={base} aria-label="Apple Pay">
        <AppleMark />
      </button>
      <button type="button" onClick={onGoogle} disabled={disabled} className={`${base} gap-2`} aria-label="Pay with Google Pay">
        <span className="text-[17px] font-medium leading-none text-[#3c4043]" style={{ fontFamily: 'Roboto, -apple-system, "Helvetica Neue", Arial, sans-serif' }}>Pay with</span>
        <GoogleMark />
      </button>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col items-center gap-2" aria-busy="true">
      <div className="h-10 w-[240px] animate-pulse rounded-[3px] bg-white/80" />
      <div className="h-10 w-[240px] animate-pulse rounded-[3px] bg-white/80" />
    </div>
  );
}

/* ---------- Stripe-aware inner form ---------- */
function CheckoutForm({ start }: { start: StartResponse }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [pr, setPr] = useState<any>(null);
  const can = useRef<{ applePay?: boolean; googlePay?: boolean } | null>(null);
  const prReady = useRef(false);
  const lock = useRef(false);
  const setupIntentId = start.clientSecret.split('_secret')[0];

  const activate = useCallback(async (siId: string) => {
    const r = await fetch('/api/billing/guest/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setupIntentId: siId, priceId: start.priceId || undefined }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.detail || j?.error || 'activate_failed');
    track({ event: 'sale', props: { page: PAGE, variant: VARIANT, setupIntentId: siId, subscriptionId: j.subscriptionId }, dedupeKey: j.subscriptionId });
    if (j.subscriptionId) {
      trackSubscribeSuccess({
        subscriptionId: j.subscriptionId,
        status: j.status,
        priceAmount: j.priceAmount ?? start.priceAmount,
        priceCurrency: j.priceCurrency ?? start.priceCurrency,
        page: PAGE,
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
    try { sessionStorage.removeItem(SI_CACHE_KEY); } catch {}
    location.href = `/billing/return?setup_intent=${encodeURIComponent(siId)}`;
  }, [start.priceId, start.priceAmount, start.priceCurrency]);

  // Build the PaymentRequest once stripe is ready (amount 0 → SetupIntent flow).
  useEffect(() => {
    if (!stripe) return;
    let cancelled = false;
    (async () => {
      try {
        const req = stripe.paymentRequest({
          country: (start.merchantCountry || 'US').toUpperCase(),
          currency: (start.priceCurrency || 'usd').toLowerCase(),
          total: { label: DISPLAY_LABEL, amount: 0, pending: true },
          requestPayerEmail: false,
        });
        const c = await req.canMakePayment();
        can.current = c || {};
        track({ event: 'payment_request_can', props: { page: PAGE, variant: VARIANT, applePay: !!c?.applePay, googlePay: !!c?.googlePay } });
        if (!c || (!c.applePay && !c.googlePay)) return;

        req.on('paymentmethod', async (ev: any) => {
          try {
            setSubmitting(true);
            const { error, setupIntent } = await stripe.confirmSetup({
              clientSecret: start.clientSecret,
              confirmParams: { payment_method: ev.paymentMethod.id },
              redirect: 'if_required',
            });
            if (error) {
              ev.complete('fail');
              setSubmitting(false);
              toast.error(error.message || 'Payment confirmation failed');
              return;
            }
            const siId = setupIntent?.id || setupIntentId;
            ev.complete('success');
            await activate(siId);
          } catch (e: any) {
            try { ev.complete('fail'); } catch {}
            setSubmitting(false);
            toast.error(e?.message || 'Activation failed');
          }
        });
        req.on('cancel', () => setSubmitting(false));
        if (!cancelled) setPr(req);
      } catch {
        can.current = {};
      }
    })();
    return () => { cancelled = true; };
  }, [stripe, start.clientSecret, start.merchantCountry, start.priceCurrency, setupIntentId, activate]);

  const openWallet = useCallback(async (which: 'applePay' | 'googlePay') => {
    track({ event: 'open_wallet', props: { page: PAGE, variant: VARIANT, which } });
    if (submitting) return;
    const available = !!can.current?.[which] && !!pr;
    if (!available) {
      // Wallet not available in this browser → card form instead.
      setShowCard(true);
      return;
    }
    if (!prReady.current) await new Promise((r) => setTimeout(r, 0));
    try {
      await pr.show();
    } catch (e: any) {
      toast.error(e?.message || 'Could not open wallet');
    }
  }, [pr, submitting]);

  async function confirmCard() {
    if (!stripe || !elements || lock.current) return;
    lock.current = true;
    setSubmitting(true);
    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
        confirmParams: { return_url: `${location.origin}/billing/return` },
      });
      if (error) throw new Error(error.message || 'confirm_failed');
      await activate(setupIntent?.id || setupIntentId);
    } catch (e: any) {
      toast.error(e?.message || 'Payment failed');
      lock.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full">
      {/* Hidden PRB initialises the wallet bridge (same trick as SubscribePayNE). */}
      <div style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}>
        {pr && (
          <PaymentRequestButtonElement
            options={{ paymentRequest: pr, style: { paymentRequestButton: { type: 'default' } } }}
            onReady={() => { prReady.current = true; track({ event: 'wallet_ready', props: { page: PAGE, variant: VARIANT } }); }}
          />
        )}
      </div>

      <WalletButtons onApple={() => openWallet('applePay')} onGoogle={() => openWallet('googlePay')} disabled={submitting} />

      {showCard && (
        <div className="mx-auto mt-3 w-full max-w-[328px] rounded-[3px] bg-white p-3 text-left text-[#1d1d20]">
          <PaymentElement options={{ layout: 'accordion' }} />
          <button
            onClick={confirmCard}
            disabled={!stripe || !elements || submitting}
            className="mt-3 w-full rounded-[5px] bg-[#ee2255] px-4 py-3 text-[15px] font-bold uppercase tracking-[1px] text-[#f5f5f5] disabled:opacity-60"
            aria-busy={submitting}
          >
            {submitting ? 'Processing…' : 'Start subscription'}
          </button>
        </div>
      )}
    </div>
  );
}

function AlreadySubscribed() {
  return (
    <a href="/builder" className="mx-auto block w-[240px] rounded-[3px] bg-white py-2.5 text-center text-[15px] font-semibold text-black">
      Open ResumeMint
    </a>
  );
}

function GuestSubscribe() {
  const [start, setStart] = useState<StartResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const cached = readSession<StartResponse>(SI_CACHE_KEY);
        if (cached?.clientSecret) { setStart(cached); return; }
        const cachedAccountId = (() => { try { return localStorage.getItem(ACCOUNT_ID_KEY); } catch { return null; } })();
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
        track({ event: 'show-checkout', props: { page: PAGE, variant: VARIANT, accountId: j.accountId } });
      } catch (e: any) {
        console.error(e);
        setErrorMsg(e?.message || 'Could not start checkout');
      }
    })();
  }, []);

  const elementsOptions = useMemo(
    () => (start ? { clientSecret: start.clientSecret, appearance: { theme: 'stripe' as const } } : null),
    [start],
  );

  if (errorMsg) {
    return (
      <div className="mx-auto w-full max-w-[328px] rounded-[3px] bg-white/10 p-3 text-[12px] text-[#f5f5f5]">
        Couldn&rsquo;t start checkout. <button onClick={() => location.reload()} className="underline">Try again</button>
      </div>
    );
  }
  if (!start || !elementsOptions) return <Skeleton />;
  return (
    <Elements stripe={stripePromise} options={elementsOptions}>
      <CheckoutForm start={start} />
    </Elements>
  );
}

export default function CcSubscribe() {
  const { isAuthenticated, isSubscribed, loading } = useAuthStatus();
  if (loading) return <Skeleton />;
  if (isAuthenticated && isSubscribed) return <AlreadySubscribed />;
  if (isAuthenticated && !isSubscribed) {
    return (
      <div className="mx-auto w-full max-w-[328px] rounded-[3px] bg-white p-3 text-left text-[#1d1d20]">
        <InAppSubscribe onActivated={() => { location.href = '/builder'; }} />
      </div>
    );
  }
  return <GuestSubscribe />;
}
