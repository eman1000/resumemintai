// app/landing/[label]/ClientLanding.tsx
'use client';

import Link from 'next/link';
import LandingSubscribe from '@/components/LandingSubscribe';
import NonC from '@/components/NonC';
import { useGeo } from '@/lib/useGeo';
import type { LandingVariant } from './landingData';
import { auth } from '@/app/firebase';
import { track } from '@/lib/track';
import { useEffect, useState } from 'react';
export function LandingImpression() {
  useEffect(() => {
    (async () => {
      const t = await auth?.currentUser?.getIdToken();
      // Fires GTM (GA4) + writes to /api/track
      track({ event: 'impression', props: { page: 'landing', _idToken: t } });
    })();
  }, []);
  return null;
}
// Minor-unit formatter (Stripe gives amounts in cents/öre/etc.)
function fmtPrice(amount: number | null, currency: string | null): string {
  if (amount == null || !currency) return '';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

type Pricing = {
  priceAmount: number | null;
  priceCurrency: string | null;
  priceInterval: 'day' | 'week' | 'month' | 'year' | null;
  priceIntervalCount: number | null;
  trialDays: number;
};

/** Read-only price/trial metadata for the hero copy. Doesn't create Stripe
 * objects, so it's safe to call on every page load (including for already-
 * subscribed visitors). LandingSubscribe creates its own SetupIntent only
 * when it actually decides to render the guest flow. */
function usePricing() {
  const [p, setP] = useState<Pricing | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/billing/pricing-info', { method: 'GET' });
        const j = await r.json();
        if (!cancelled && r.ok) {
          setP({
            priceAmount: j.priceAmount ?? null,
            priceCurrency: j.priceCurrency ?? null,
            priceInterval: j.priceInterval ?? null,
            priceIntervalCount: j.priceIntervalCount ?? null,
            trialDays: j.trialDays ?? 0,
          });
        }
      } catch { /* silent — fallback copy will render */ }
    })();
    return () => { cancelled = true; };
  }, []);
  return p;
}

export default function ClientLanding({
  cfg,
  label,
}: {
  cfg: LandingVariant;
  label: string;
}) {
  const { data: geoData } = useGeo();
  const pricing = usePricing();

  // Only runs in the browser
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const cc = geoData?.country_code?.toUpperCase();
  const isCompliant = !window.ApplePaySession || !isIOS || cc === 'IN' || cc === 'INDIA';

  if (!isCompliant) return <>
    <LandingImpression />
  <NonC />
  </>;

  return (
    <main className="min-h-screen bg-[#f8fbfc] text-[#1d1d20]">
      <LandingImpression />
      {/* NAV */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-block w-7 h-7 rounded bg-violet-500" />
            <span className="font-semibold">ResumeMint</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-[#52525a]">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#faq">FAQ</a>
          </nav>
        </div>
      </header>


      {/* HERO */}
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-5 pb-20 text-center">
        <h1 className="text-balance text-5xl font-extrabold uppercase leading-[1.05] text-[#1d1d20] md:text-7xl lg:text-8xl">
          Tailor your resume in seconds
        </h1>

        {(() => {
          const priceStr = fmtPrice(pricing?.priceAmount ?? null, pricing?.priceCurrency ?? null);
          const interval = pricing?.priceInterval ?? 'month';
          const intervalCount = pricing?.priceIntervalCount ?? 1;
          const intervalLabel =
            intervalCount > 1 ? `every ${intervalCount} ${interval}s` : `per ${interval}`;
          const trialDays = pricing?.trialDays ?? 0;
          return (
            <>
              <p className="mt-6 text-lg text-[#52525a] md:text-xl">
                {trialDays > 0
                  ? <>{trialDays}-day free trial, then <strong>{priceStr || '…'} {intervalLabel}</strong> with auto-renewal.</>
                  : priceStr
                    ? <><strong>{priceStr} {intervalLabel}</strong>, cancel anytime.</>
                    : <>Subscribe to ResumeMint, cancel anytime.</>}
              </p>

              <div className="mt-8 w-full max-w-md">
                <LandingSubscribe />
              </div>

              {/* Consent copy — driven by the same pricing config */}
              <div className="mt-4 max-w-2xl space-y-3 text-left text-sm text-[#52525a]">
                <label className="flex items-start gap-2">
                  <input defaultChecked id="c1" type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 bg-transparent" />
                  <span>
                    By signing up, you confirm you are 18+ and accept our{' '}
                    <Link href="/terms" className="underline">Terms &amp; Conditions</Link> and{' '}
                    <Link href="/privacy" className="underline">Privacy Policy</Link>.
                  </span>
                </label>
                <label className="flex items-start gap-2">
                  <input defaultChecked id="c2" type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 bg-transparent" />
                  <span>
                    {trialDays > 0 && priceStr
                      ? <>Your subscription starts now for {fmtPrice(0, pricing?.priceCurrency ?? null) || '0.00'} ({trialDays}-day trial) and auto-renews at {priceStr} {intervalLabel} until canceled.</>
                      : priceStr
                        ? <>Your subscription auto-renews at {priceStr} {intervalLabel} until canceled.</>
                        : <>Your subscription auto-renews until canceled.</>}
                  </span>
                </label>
              </div>
            </>
          );
        })()}
      </section>

     {/* FEATURES */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-extrabold">Why ResumeMint</h2>
        <p className="text-[#52525a] mt-2 max-w-2xl">{cfg.features.blurb}</p>

        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {cfg.features.items.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-gray-200 bg-white p-6 hover:bg-gray-50 transition"
            >
              <div className="w-10 h-10 rounded-lg bg-brand-50 grid place-items-center mb-3">
                <span className="text-brand">{f.icon}</span>
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-[#52525a] text-sm mt-2">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-extrabold">How it works</h2>
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          {cfg.how.map((s, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 p-6 bg-white">
              <div className="text-brand text-sm font-mono">Step {i + 1}</div>
              <h3 className="font-semibold mt-1">{s.title}</h3>
              <p className="text-[#52525a] text-sm mt-2">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {cfg.testimonials.map((t, i) => (
            <blockquote
              key={i}
              className="rounded-2xl border border-gray-200 bg-white p-6"
            >
              <p className="text-[#1d1d20]">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-3 text-sm text-[#a1a1aa]">— {t.author}, {t.role}</div>
            </blockquote>
          ))}
        </div>
      </section>

      {/* PRICING (simple) */}
      {/* <section id="pricing" className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-extrabold">Pricing</h2>
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          {cfg.pricing.map((p) => (
            <div key={p.name} className="rounded-2xl border border-gray-200 p-6 bg-white">
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold">{p.name}</h3>
                <div className="text-3xl font-black">
                  {p.price}
                  <span className="text-sm font-medium text-[#a1a1aa]">/ {p.per}</span>
                </div>
              </div>
              <ul className="mt-4 text-sm text-[#52525a] space-y-2 list-disc pl-5">
                {p.features.map((f) => <li key={f}>{f}</li>)}
              </ul>
              <a
                href={p.cta.href}
                className="mt-6 inline-block w-full text-center rounded-xl bg-violet-500 text-white font-semibold py-3"
              >
                {p.cta.label}
              </a>
              {p.subtext && <div className="text-xs text-[#a1a1aa] mt-2">{p.subtext}</div>}
            </div>
          ))}
        </div>
      </section> */}

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-extrabold">FAQ</h2>
        <div className="mt-6 divide-y divide-gray-200">
          {cfg.faq.map((q) => (
            <details key={q.q} className="group p-4">
              <summary className="cursor-pointer list-none font-semibold">
                {q.q}
                <span className="float-right text-brand group-open:rotate-45 transition">+</span>
              </summary>
              <p className="text-[#52525a] mt-2">{q.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 py-10 text-sm text-[#a1a1aa]">
        <div className="mx-auto max-w-7xl px-4 flex flex-wrap items-center justify-between gap-3">
          <div>© {new Date().getFullYear()} ResumeMint. All rights reserved.</div>
          <div className="flex gap-4">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <a href="/contact">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
