'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';

const plans = {
  monthly: { amount: '$19.99', period: '/month', billed: '' },
  quarterly: { amount: '$14.99', period: '/month', billed: 'Billed $44.97 every 3 months' },
  annual: { amount: '$9.99', period: '/month', billed: 'Billed $119.88 per year' },
} as const;

type BillingPeriod = keyof typeof plans;

const allFeatures = [
  'Create professional resumes',
  'Write cover letters',
  '12 resume templates',
  'AI-powered suggestions',
  'ATS optimization',
  'PDF export',
  'Job search & tracker',
  'Unlimited documents',
  'Cancel anytime',
];

export default function PricingPage() {
  const [period, setPeriod] = useState<BillingPeriod>('quarterly');
  const selected = plans[period];

  return (
    <>
      <SiteNav />
      <main className="max-w-site mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-[#1d1d20]">Simple, transparent pricing</h1>
          <p className="mt-3 text-[#52525a]">One plan, all features. Start with a 14-day free trial.</p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex bg-gray-100 rounded-pill p-1 gap-1">
            {(Object.keys(plans) as BillingPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-5 py-2 rounded-pill text-sm font-medium transition-all ${
                  period === p
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-[#52525a] hover:text-[#1d1d20]'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing card */}
        <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-2xl shadow-lg p-8">
          <div className="text-center">
            <div className="text-5xl font-bold text-[#1d1d20]">{selected.amount}</div>
            <div className="text-[#52525a] mt-1">{selected.period}</div>
            {selected.billed && (
              <div className="text-sm text-[#a1a1aa] mt-1">{selected.billed}</div>
            )}
          </div>

          <ul className="mt-8 space-y-3">
            {allFeatures.map((f) => (
              <li key={f} className="flex items-center gap-3 text-[#1d1d20]">
                <Check className="w-5 h-5 text-[#00b67a] flex-shrink-0" />
                <span className="text-sm">{f}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/builder"
            className="btn-primary w-full mt-8 text-center block"
          >
            Start 14-day free trial
          </Link>

          <p className="text-center text-xs text-[#a1a1aa] mt-4">
            No credit card required to start. Cancel anytime.
          </p>
        </div>

        {/* Payment logos */}
        <div className="flex justify-center gap-3 mt-8">
          {[
            { alt: "Visa", src: "/logos/visa.webp" },
            { alt: "Mastercard", src: "/logos/mastercard.webp" },
            { alt: "Apple Pay", src: "/logos/apple-pay.webp" },
            { alt: "Google Pay", src: "/logos/google-pay.webp" },
          ].map((logo, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded flex items-center justify-center w-14 h-9 p-1">
              <img alt={logo.alt} src={logo.src} className="max-w-full max-h-full object-contain" />
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
