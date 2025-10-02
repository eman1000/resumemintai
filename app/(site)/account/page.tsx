// app/account/page.tsx
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { auth } from '@/app/firebase';
import AuthGate from '@/components/AuthGate';
import { ensureAnonOnce } from '@/lib/ensureAnon';
import SiteNav from '@/components/SiteNav';
import SiteNavAuth from '@/components/SiteNavAuth';

type EnsureResp = {
  accountId: string;
  primaryEmail: string;
  externalUid: string;
  subscribed: boolean;
};

type CancelResp = {
  subscriptionId: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  canceled_at: string | null;
};

export default function AccountBillingPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [working, setWorking] = React.useState<'at_end' | 'now' | null>(null);
  const [ensure, setEnsure] = React.useState<EnsureResp | null>(null);
  const [lastCancel, setLastCancel] = React.useState<CancelResp | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!auth.currentUser) {
          // allow anonymous users too
          await await ensureAnonOnce();
        }
        const idToken = await auth.currentUser!.getIdToken(true);

        const r = await fetch('/api/account/ensure', {
          method: 'POST',
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const j = (await r.json()) as EnsureResp | { error: string };
        if (!r.ok || (j as any)?.error) {
          throw new Error((j as any)?.error || 'ensure_failed');
        }
        if (!mounted) return;
        setEnsure(j as EnsureResp);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load account');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const cancelAtPeriodEnd = async () => {
    setWorking('at_end');
    setError(null);
    try {
      const idToken = await auth.currentUser!.getIdToken(true);

      const r = await fetch('/api/billing/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ mode: 'at_period_end' }),
      });
      const j = (await r.json()) as CancelResp | { error: string; message?: string };
      if (!r.ok || (j as any)?.error) {
        throw new Error((j as any)?.message || (j as any)?.error || 'cancel_failed');
      }
      setLastCancel(j as CancelResp);
      toast.success('Your subscription will end at the period end.');
      // optional: refresh ensure to reflect changes written by webhook
      setTimeout(() => router.refresh(), 300);
    } catch (e: any) {
      setError(e?.message || 'Cancel failed');
      toast.error(e?.message || 'Cancel failed');
    } finally {
      setWorking(null);
    }
  };

  const cancelImmediately = async () => {
    if (!confirm('Cancel immediately and prorate the final invoice?')) return;
    setWorking('now');
    setError(null);
    try {
      const idToken = await auth.currentUser!.getIdToken(true);

      const r = await fetch('/api/billing/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ mode: 'now', prorate: true }),
      });
      const j = (await r.json()) as CancelResp | { error: string; message?: string };
      if (!r.ok || (j as any)?.error) {
        throw new Error((j as any)?.message || (j as any)?.error || 'cancel_failed');
      }
      setLastCancel(j as CancelResp);
      toast.success('Subscription cancelled immediately.');
      setTimeout(() => router.refresh(), 300);
    } catch (e: any) {
      setError(e?.message || 'Cancel failed');
      toast.error(e?.message || 'Cancel failed');
    } finally {
      setWorking(null);
    }
  };

  return (
    <><SiteNavAuth />
      <main className="max-w-2xl mx-auto p-6 space-y-6">
        
        <h1 className="text-2xl font-semibold">Billing</h1>

        {loading && (
          <div className="text-sm text-neutral-400">Loading…</div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {!loading && ensure && (
          <section className="rounded-2xl border border-neutral-800 p-4 space-y-2">
            <div className="text-sm text-neutral-400">
              <div>Account ID: <code>{ensure.accountId}</code></div>
              <div>Email: <code>{ensure.primaryEmail || '(none)'}</code></div>
              <div>Subscribed: <span className={ensure.subscribed ? 'text-emerald-400' : 'text-yellow-400'}>
                {ensure.subscribed ? 'Yes' : 'No'}
              </span></div>
            </div>

            {ensure.subscribed ? (
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  onClick={cancelAtPeriodEnd}
                  disabled={working !== null}
                  className="rounded-xl bg-neutral-800 px-4 py-2 disabled:opacity-60"
                >
                  {working === 'at_end' ? 'Cancelling…' : 'Cancel at period end'}
                </button>

                <button
                  onClick={cancelImmediately}
                  disabled={working !== null}
                  className="rounded-xl bg-neutral-900 border border-neutral-700 px-4 py-2 disabled:opacity-60"
                >
                  {working === 'now' ? 'Cancelling…' : 'Cancel immediately (prorated)'}
                </button>
              </div>
            ) : (
              <div className="text-sm text-neutral-400">
                No active subscription found.
              </div>
            )}
          </section>
        )}

        {lastCancel && (
          <section className="rounded-2xl border border-neutral-800 p-4">
            <h2 className="text-lg font-medium mb-2">Latest action</h2>
            <div className="text-sm text-neutral-300 space-y-1">
              <div>Subscription: <code>{lastCancel.subscriptionId}</code></div>
              <div>Status: <code>{lastCancel.status}</code></div>
              <div>Cancel at period end: <code>{String(lastCancel.cancel_at_period_end)}</code></div>
              <div>Current period end: <code>{lastCancel.current_period_end ?? '-'}</code></div>
              <div>Cancelled at: <code>{lastCancel.canceled_at ?? '-'}</code></div>
            </div>
          </section>
        )}
      </main>
      </>
  );
}
