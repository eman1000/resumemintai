// app/billing/return/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/app/firebase';
import { ensureAnonOnce } from '@/lib/ensureAnon';
import toast from 'react-hot-toast';
import { track } from '@/lib/track';

export default function BillingReturn() {
  const sp = useSearchParams();
  const router = useRouter();
  const [msg, setMsg] = useState('Finalizing…');

  useEffect(() => {
    (async () => {
      try {
        const setupIntentId = sp.get('setup_intent'); // "seti_..."
        if (!setupIntentId) {
          setMsg('Missing confirmation. Please try again.');
          return;
        }

        // client-side idempotency: prevent double-call in StrictMode / reloads
        const guardKey = `activated:${setupIntentId}`;
        if (sessionStorage.getItem(guardKey)) {
          // already attempted; no-op
          return;
        }
        sessionStorage.setItem(guardKey, '1');

        // Strip params ASAP so refresh doesn’t retry
        const url = new URL(window.location.href);
        url.searchParams.delete('setup_intent');
        url.searchParams.delete('setup_intent_client_secret');
        window.history.replaceState({}, '', url.toString());

        if (!auth.currentUser) await ensureAnonOnce();
        const t = await auth.currentUser!.getIdToken();

        const r = await fetch('/api/billing/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
          body: JSON.stringify({
            priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
            setupIntentId,
          }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || j?.detail || 'activate_failed');

                // Push to GTM for Google Ads conversion
        try {
          const subId = j?.subscriptionId;     // from your activate response
          const value = 0;                     // optional: pass your amount if you want
          (window as any).dataLayer = (window as any).dataLayer || [];
          (window as any).dataLayer.push({
            event: 'sale',
            transaction_id: subId,             // GTM Order ID
            value,                             // GTM Value (optional)
            currency: 'EUR'
          });
        } catch { /* no-op */ }

        track({
          event: 'sale',
          props: { source: 'return_page', _idToken: t },
          dedupeKey: setupIntentId, // idempotent write server-side
        });

       
        toast.success('Subscription started!');
        router.replace('/builder'); // or '/account'
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || 'Could not activate subscription');
        setMsg('Something went wrong. Please try again.');
      }
    })();
  }, [sp, router]);

  return (
    <main className="max-w-lg mx-auto p-8 text-center">
      <h1 className="text-2xl font-semibold mb-2">Payment method saved</h1>
      <p className="text-neutral-400">{msg}</p>
    </main>
  );
}
