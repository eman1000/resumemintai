// components/SubscribeButton.tsx
'use client';
import { useState, useCallback } from 'react';
import { auth } from '@/app/firebase';
import { ensureAnonOnce } from '@/lib/ensureAnon';

export default function SubscribeButton({ label = 'Continue' }: { label?: string }) {
  const [busy, setBusy] = useState(false);

  const start = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!auth.currentUser) await ensureAnonOnce();
      const t = await auth.currentUser!.getIdToken(true);

      const r = await fetch('/api/checkout/start', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${t}` },
        body: JSON.stringify({ priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || j.detail || 'Failed to start checkout');

      if (j.alreadySubscribed) {
        // they already have something; send to account/builder
        location.href = '/account';
        return;
      }

      location.href = j.url; // go to Stripe Checkout
    } catch (e:any) {
      alert(e.message || 'Could not start checkout');
    } finally {
      setBusy(false);
    }
  }, [busy]);

  return (
    <button onClick={start} disabled={busy} className="w-full rounded-xl bg-white text-black px-4 py-2 font-semibold disabled:opacity-60">
      {busy ? 'Preparing…' : label}
    </button>
  );
}
