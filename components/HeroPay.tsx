'use client';

import { useState } from 'react';

export default function HeroPay({ label }: { label: string }) {
  const [loading, setLoading] = useState<'apple'|'google'|null>(null);

  async function startCheckout(wallet: 'apple'|'google') {
    const c1 = (document.getElementById('c1') as HTMLInputElement | null)?.checked;
    const c2 = (document.getElementById('c2') as HTMLInputElement | null)?.checked;
    if (!c1 || !c2) { alert('Please confirm both checkboxes first.'); return; }

    try {
      setLoading(wallet);
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, wallet }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Checkout failed');
      window.location.href = json.url; // Stripe Checkout redirect
    } catch (e: any) {
      alert(e.message || 'Something went wrong');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <button
        onClick={() => startCheckout('apple')}
        disabled={!!loading}
        className="h-12 w-full rounded-lg bg-white font-semibold text-black shadow-md ring-1 ring-white/20 hover:opacity-95 disabled:opacity-60"
      >
        {loading === 'apple' ? 'Loading…' : ' Pay'}
      </button>
      <button
        onClick={() => startCheckout('google')}
        disabled={!!loading}
        className="h-12 w-full rounded-lg bg-white font-medium text-black shadow-md ring-1 ring-white/20 hover:opacity-95 disabled:opacity-60"
      >
        {loading === 'google' ? 'Loading…' : 'Pay with G Pay'}
      </button>
    </div>
  );
}
