"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import AuthGate from "@/components/AuthGate"; // same gate you use elsewhere
import SiteNavAuth from "@/components/SiteNavAuth";
import { fetchAuthed } from "@/app/builder/_client/withAuth";

type EnsureResp = {
  accountId: string;
  primaryEmail: string;
  subscribed: boolean;
  subscriptionId?: string | null;
  status?: string | null;
  cancel_at_period_end?: boolean | null;
  current_period_end?: string | null;
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
  const [working, setWorking] = React.useState<"at_end" | "now" | null>(null);
  const [ensure, setEnsure] = React.useState<EnsureResp | null>(null);
  const [lastCancel, setLastCancel] = React.useState<CancelResp | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchAuthed("/api/account/ensure", { method: "POST" });
      const j = (await r.json()) as EnsureResp & { error?: string };
      if (!r.ok || j?.error) throw new Error(j?.error || "ensure_failed");
      setEnsure(j);
    } catch (e: any) {
      setError(e?.message || "Failed to load account");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const cancelAtPeriodEnd = async () => {
    setWorking("at_end");
    setError(null);
    try {
      const r = await fetchAuthed("/api/billing/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "at_period_end" }),
      });
      const j = (await r.json()) as CancelResp & { error?: string; message?: string };
      if (!r.ok || j?.error) throw new Error(j?.message || j?.error || "cancel_failed");
      setLastCancel(j);
      toast.success("Your subscription will end at the period end.");
      await load();
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Cancel failed");
      toast.error(e?.message || "Cancel failed");
    } finally {
      setWorking(null);
    }
  };

  const cancelImmediately = async () => {
    if (!confirm("Cancel immediately and prorate the final invoice?")) return;
    setWorking("now");
    setError(null);
    try {
      const r = await fetchAuthed("/api/billing/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "now", prorate: true }),
      });
      const j = (await r.json()) as CancelResp & { error?: string; message?: string };
      if (!r.ok || j?.error) throw new Error(j?.message || j?.error || "cancel_failed");
      setLastCancel(j);
      toast.success("Subscription cancelled immediately.");
      await load();
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Cancel failed");
      toast.error(e?.message || "Cancel failed");
    } finally {
      setWorking(null);
    }
  };

  return (
    <AuthGate redirectTo="/login">
      <SiteNavAuth />
      <main className="max-w-2xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Billing</h1>

        {loading && <div className="text-sm text-[#a1a1aa]">Loading…</div>}

        {!loading && error && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && ensure && (
          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 space-y-2">
            <div className="text-sm text-[#52525a]">
              <div>Account ID: <code>{ensure.accountId}</code></div>
              <div>Email: <code>{ensure.primaryEmail || "(none)"} </code></div>
              <div>
                Subscribed:{" "}
                <span className={ensure.subscribed ? "text-emerald-600" : "text-yellow-700"}>
                  {ensure.subscribed ? "Yes" : "No"}
                </span>
              </div>
            </div>

            {ensure.subscribed ? (
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  onClick={cancelAtPeriodEnd}
                  disabled={working !== null}
                  className="rounded-xl bg-brand text-white px-4 py-2 hover:bg-brand-700 disabled:opacity-60"
                >
                  {working === "at_end" ? "Cancelling…" : "Cancel at period end"}
                </button>
                <button
                  onClick={cancelImmediately}
                  disabled={working !== null}
                  className="rounded-xl border border-gray-300 px-4 py-2 hover:bg-gray-100 disabled:opacity-60"
                >
                  {working === "now" ? "Cancelling…" : "Cancel immediately (prorated)"}
                </button>
              </div>
            ) : (
              <div className="text-sm text-[#a1a1aa]">No active subscription found.</div>
            )}
          </section>
        )}

        {lastCancel && (
          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
            <h2 className="text-lg font-medium mb-2">Latest action</h2>
            <div className="text-sm text-[#52525a] space-y-1">
              <div>Subscription: <code>{lastCancel.subscriptionId}</code></div>
              <div>Status: <code>{lastCancel.status}</code></div>
              <div>Cancel at period end: <code>{String(lastCancel.cancel_at_period_end)}</code></div>
              <div>Current period end: <code>{lastCancel.current_period_end ?? "-"}</code></div>
              <div>Cancelled at: <code>{lastCancel.canceled_at ?? "-"}</code></div>
            </div>
          </section>
        )}
      </main>
    </AuthGate>
  );
}
