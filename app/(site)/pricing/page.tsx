import PageShell from '@/components/PageShell';

export default function Page() {
  return (
    <PageShell title="Pricing" subtitle="Start free, upgrade anytime.">
      <div className="prose prose-invert max-w-none">

<div className="grid md:grid-cols-3 gap-4">
  <div className="rounded-2xl border border-neutral-800 p-5"><h3 className="text-xl font-semibold">Starter</h3><p className="text-3xl font-extrabold mt-1">€0</p><p className="text-neutral-400 mt-1 text-sm">Try the basics</p><ul className="mt-3 space-y-1 text-sm"><li>• Tailored resume</li><li>• ATS score</li><li>• Keywords</li></ul><a href="/login" className="mt-5 inline-block px-4 py-2 rounded-xl bg-white text-black font-semibold">Get Started</a></div>
  <div className="rounded-2xl border border-neutral-800 p-5"><h3 className="text-xl font-semibold">Pro</h3><p className="text-3xl font-extrabold mt-1">€19/mo</p><p className="text-neutral-400 mt-1 text-sm">For job hunters</p><ul className="mt-3 space-y-1 text-sm"><li>• Everything in Starter</li><li>• Unlimited letters</li><li>• Unlimited exports</li></ul><a href="/login" className="mt-5 inline-block px-4 py-2 rounded-xl bg-white text-black font-semibold">Upgrade</a></div>
  <div className="rounded-2xl border border-neutral-800 p-5"><h3 className="text-xl font-semibold">Team</h3><p className="text-3xl font-extrabold mt-1">€49/mo</p><p className="text-neutral-400 mt-1 text-sm">For career centers</p><ul className="mt-3 space-y-1 text-sm"><li>• Seats & sharing</li><li>• Admin dashboard</li><li>• Priority support</li></ul><a href="/login" className="mt-5 inline-block px-4 py-2 rounded-xl bg-white text-black font-semibold">Contact</a></div>
</div>
<p className="mt-6 text-xs text-neutral-500">Wire up Stripe + Firebase webhooks for real subscriptions.</p>

      </div>
    </PageShell>
  );
}
