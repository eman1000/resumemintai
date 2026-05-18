'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { auth } from '@/app/firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth';
import { useQuery } from '@/app/builder/hooks/use-query';
import { fireAdsConversionDirect } from '@/lib/ads';
import { track, trackSubscribeSuccess } from '@/lib/track';

const PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO as string;

export default function BillingReturn() {
  const sp = useQuery();
  const router = useRouter();

  const [phase, setPhase] = useState<'finalizing' | 'ready' | 'error'>('finalizing');
  const [msg, setMsg] = useState('Finalizing…');
  const [emailForClaim, setEmailForClaim] = useState('');
  const [sending, setSending] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  // ✅ helper: bind the signed-in Firebase user to the guest accountId
  const claimNow = useCallback(async () => {
    try {
      const t = await auth.currentUser!.getIdToken(true);
      const accountId = localStorage.getItem('resumemint_account_id');
      if (!accountId) {
        toast.error('Missing account link. Please contact support.');
        return;
      }
      const r = await fetch('/api/account/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ accountId }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.detail || j?.error || 'claim_failed');
      toast.success('Account linked!');
      router.replace('/builder');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Could not link account');
    }
  }, [router]);

  // Complete magic-link sign-in if the user opened the email here → then claim
  useEffect(() => {
    (async () => {
      if (!isSignInWithEmailLink(auth, window.location.href)) return;
      const email = localStorage.getItem('emailForClaim') || emailForClaim;
      if (!email) return;
      try {
        await signInWithEmailLink(auth, email, window.location.href);
        localStorage.removeItem('emailForClaim');
        toast.success('Signed in!');
        // ✅ bind this signed-in user to the guest account
        await claimNow();
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || 'Sign-in link failed');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Stripe return (activate subscription)
  useEffect(() => {
    (async () => {
      try {
        const id = sp?.get('setup_intent') ?? '';
        const clientSecret = sp?.get('setup_intent_client_secret') ?? '';
        const redirectStatus = sp?.get('redirect_status'); // 'succeeded' | 'failed' | 'pending'

        let setupIntentId = id;
        if (!setupIntentId && clientSecret) {
          const m = clientSecret.match(/(seti|si)_[^_]+/i);
          if (m) setupIntentId = m[0];
        }

        if (!setupIntentId && redirectStatus === 'succeeded') {
          // nothing else to do without stripe.js here
        }

        if (!setupIntentId) {
          setPhase('error');
          setMsg('Missing confirmation. Please try again.');
          return;
        }

        // Authenticated user hit the return page directly → activate via the
        // authed /subscribe endpoint and short-circuit the claim UI.
        if (auth.currentUser) {
          const t = await auth.currentUser.getIdToken();
          const r = await fetch('/api/billing/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
            body: JSON.stringify({ setupIntentId, priceId: PRICE_ID }),
          });
          const j = await r.json();
          if (!r.ok) throw new Error(j?.error || j?.detail || 'activate_failed');

          fireAdsConversionDirect({ value: 19.99, currency: 'EUR', transactionId: j.subscriptionId });
          if (j.subscriptionId) {
            trackSubscribeSuccess({
              subscriptionId: j.subscriptionId,
              status: j.status,
              priceAmount: j.priceAmount,
              priceCurrency: j.priceCurrency,
              page: 'billing_return',
            });
          }
          toast.success('Subscription started!');
          router.replace('/builder');
          return;
        }

        // Guest path: activate via guest endpoint then prompt sign-in to claim
        const r = await fetch('/api/billing/guest/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setupIntentId, priceId: PRICE_ID }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || j?.detail || 'activate_failed');

        // ✅ persist ids for the claim step
        if (j.accountId) localStorage.setItem('resumemint_account_id', j.accountId);
        if (j.customerId) localStorage.setItem('resumemint_stripe_customer_id', j.customerId);

        fireAdsConversionDirect({ value: 1, currency: 'EUR', transactionId: j.subscriptionId });
        try{
            track({ event: 'sale', props: { page: 'landing'} });
            if (j.subscriptionId) {
              trackSubscribeSuccess({
                subscriptionId: j.subscriptionId,
                status: j.status,
                priceAmount: j.priceAmount,
                priceCurrency: j.priceCurrency,
                page: 'billing_return_guest',
              });
            }
        }catch(e){
          console.error(e);
        }
        

        // no need to depend on email coming back from server
        setMsg('Payment method saved. Sign in to unlock your subscription:');
        setPhase('ready');
      } catch (e: any) {
        console.error(e);
        setMsg(e?.message || 'Something went wrong. Please try again.');
        setPhase('error');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const continueWithGoogle = async () => {
    try {
      setGoogleBusy(true);
      await signInWithPopup(auth, new GoogleAuthProvider());
      toast.success('Signed in!');
      // ✅ bind to guest account
      await claimNow();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Google sign-in failed');
    } finally {
      setGoogleBusy(false);
    }
  };

  const sendLink = async () => {
    try {
      const email = emailForClaim.trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error('Enter a valid email');
      setSending(true);
      const actionCodeSettings = {
        url: `${location.origin}/billing/return?claim=1`,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      localStorage.setItem('emailForClaim', email);
      toast.success('Check your email for a sign-in link');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Could not send magic link');
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8fbfc] text-[#1d1d20] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        {/* Header / status */}
        <div className="text-center mb-6">
          <div
            className={[
              'mx-auto mb-4 grid place-items-center rounded-full',
              phase === 'finalizing' ? 'h-14 w-14 bg-white/5 animate-pulse' : 'h-14 w-14 bg-emerald-500/15',
            ].join(' ')}
          >
            {phase === 'finalizing' ? (
              <svg className="h-6 w-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth={2} d="M12 6v6l4 2" />
              </svg>
            ) : phase === 'ready' ? (
              <svg className="h-7 w-7 text-emerald-400" viewBox="0 0 24 24" fill="none">
                <path d="M20 7L9 18l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg className="h-7 w-7 text-red-400" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">
            {phase === 'finalizing' ? 'Finalizing your setup…' : 'Payment method saved'}
          </h1>
          <p className="mt-2 text-sm text-[#52525a]">{msg}</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-xl p-6 space-y-6">
          {/* Google button */}
          <button
            onClick={continueWithGoogle}
            disabled={googleBusy || phase !== 'ready'}
            className="group w-full flex items-center justify-center gap-3 rounded-xl bg-brand text-white font-semibold py-3 transition hover:bg-brand-700 hover:-translate-y-0.5 disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path
                d="M12 11v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6A6 6 0 1 1 12 6a5.2 5.2 0 0 1 3.7 1.4l2.5-2.5A9 9 0 1 0 12 21c4.7 0 8.6-3.3 8.6-9.1 0-.6-.1-1.1-.2-1.6H12Z"
                fill="currentColor"
              />
            </svg>
            {googleBusy ? 'Opening Google…' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <div className="text-xs uppercase tracking-wider text-[#a1a1aa]">or</div>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {/* Email claim */}
          <div className="space-y-3">
            <label htmlFor="email" className="block text-sm text-[#52525a] text-left">
              Sign in with a magic link
            </label>
            <input
              id="email"
              placeholder="you@domain.com"
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 outline-none ring-0 focus:border-brand focus:ring-1 focus:ring-brand"
              value={emailForClaim}
              onChange={(e) => setEmailForClaim(e.target.value)}
              type="email"
              disabled={phase !== 'ready'}
            />
            <button
              onClick={sendLink}
              disabled={sending || phase !== 'ready'}
              className="w-full rounded-xl bg-brand text-white font-semibold py-3 transition hover:bg-brand-700 disabled:opacity-60"
            >
              {sending ? 'Sending link…' : 'Email me a sign-in link'}
            </button>
            <p className="text-xs text-[#a1a1aa]">
              We’ll link your purchase to this email. You can change it later in Settings.
            </p>
          </div>

          {/* Support hint */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-[#52525a]">
            Need help? <a href="/contact" className="underline text-brand">Contact support</a>.
          </div>
        </div>

        {/* Subtle footer */}
        <p className="mt-6 text-center text-xs text-[#a1a1aa]">
          Your details are encrypted and never shared without consent.
        </p>
      </div>
    </main>
  );
}
