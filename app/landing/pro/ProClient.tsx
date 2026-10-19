'use client';
// app/landing/pro/ProClient.tsx
//
// 1:1 structural copy of the card-billing (CC) landing template, measured from
// the live page at 390px and 1280px (fonts, sizes, weights, line-heights,
// spacing, colours, button sizes). Section order and copy patterns follow the
// source; the content is ResumeMint's.
//
//   body        #000 · text #f5f5f5 · Inter body · Phudu headings
//   hero        padding 40px 0 · logo 126×70 · h1 Phudu 44.35/80px w700 lh1.2
//               price line Inter 22.67/26px lh1.6 mt16 · wallet buttons 240×40
//               consent: checkbox 24×24 #474545 r4 · text Inter 12px lh1.2
//   h2          Phudu 44.35/60px w700 lh1.2 mb18 · p Inter 20/24px lh1.6
//   cards       #191919 · h6 Phudu 34.5/38px w700 ls1 mb20 · p Inter 20 lh1.6
//   numbers     Phudu 105px w900
//   pricing     card #181818 · "Pricing" Phudu 31.5 · price Inter 52.5 w800 ls1.5
//               desc Inter 15.75/18 · CTA 319×66 / 520×74 #ee2255 r5 Inter 18.75/24 w700 upper ls1
//   footer      #191919 pt60 pb30 · h3 Phudu 45/60 · links Inter 15/18 w600 #88d1ff

import Link from 'next/link';
import { useEffect, useState } from 'react';
import CcSubscribe from '@/components/CcSubscribe';
import { auth } from '@/app/firebase';
import { track } from '@/lib/track';

const VARIANT = 'pro';
const H = 'font-[family-name:var(--font-phudu)]';
const B = 'font-[family-name:var(--font-inter)]';

type Pricing = {
  priceAmount: number | null;
  priceCurrency: string | null;
  priceInterval: 'day' | 'week' | 'month' | 'year' | null;
  priceIntervalCount: number | null;
  trialDays: number;
};

function fmtPrice(amount: number | null, currency: string | null): string {
  if (amount == null || !currency) return '';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase(), maximumFractionDigits: 2 }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function usePricing(): Pricing | null {
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
      } catch { /* fallback copy renders */ }
    })();
    return () => { cancelled = true; };
  }, []);
  return p;
}

function Impression() {
  useEffect(() => {
    (async () => {
      const t = await auth?.currentUser?.getIdToken();
      track({ event: 'impression', props: { page: 'landing', variant: VARIANT, _idToken: t } });
    })();
  }, []);
  return null;
}

const thumb = (slug: string) => `/template-previews/resume/${slug}.thumb.png`;
const MOSAIC = ['modern', 'executive', 'minimal', 'creative', 'classic', 'professional', 'elegant', 'chrono', 'compact', 'iconic', 'horizontal', 'casual'];

// "Content categories" block → resume template families (all shipped in /public)
const CATEGORIES = [
  { name: 'Classic', slug: 'classic' },
  { name: 'Modern', slug: 'modern' },
  { name: 'Executive', slug: 'executive' },
  { name: 'Creative', slug: 'creative' },
  { name: 'Minimal', slug: 'minimal' },
  { name: 'Professional', slug: 'professional' },
];

// Six feature blocks, icon + Phudu title + Inter paragraph, like the source.
const FEATURES = [
  { icon: 'search', title: 'ATS Keyword Matching', text: 'Paste the job description and ResumeMint pulls out the keywords the applicant tracking system screens for, then works them into your bullets naturally.' },
  { icon: 'bolt', title: 'One-Click Tailoring', text: 'Your bullets are rewritten to match the role and highlight measurable impact, so every application reads like it was written for that job.' },
  { icon: 'layout', title: 'Recruiter-Approved Templates', text: 'Thirteen ATS-safe resume layouts and twelve design themes. Switch templates at any time without retyping a word.' },
  { icon: 'pdf', title: 'Pixel-Perfect PDF Export', text: 'Download a clean PDF that keeps its layout in every applicant tracking system, email client and print-out.' },
  { icon: 'letter', title: 'Matching Cover Letters', text: 'Generate a cover letter from the same resume and job description in seconds, in a template that matches your resume.' },
  { icon: 'lock', title: 'Private by Default', text: 'Your resumes stay in your account. Export them, archive them or delete them whenever you like.' },
];

const VALUES = [
  { title: 'Relevance', text: 'Every rewrite is anchored to the job description you paste, so your resume speaks the language of that role and that company.' },
  { title: 'Honesty', text: 'ResumeMint sharpens how your experience is described. It never invents jobs, dates or qualifications you do not have.' },
  { title: 'Speed', text: 'Tailoring a resume by hand takes an evening. Here it takes minutes, so you can apply to more roles while they are still open.' },
];

// Milestones: verifiable numbers from the product itself (template counts in
// /public/template-previews, trial length from Stripe config). No user counts.
const MILESTONES = [
  { label: 'Resume Templates', value: '13' },
  { label: 'Design Themes', value: '12' },
  { label: 'Cover Letter Templates', value: '4' },
];

const STEPS = [
  { title: 'Complete Payment', text: 'Tap Apple Pay or Google Pay, or enter a card. Your payment details are protected by Stripe and your free trial starts immediately.' },
  { title: "You're Subscribed!", text: 'Sign in on the next screen to link the subscription to your account, then paste your resume and the job description and export your first tailored PDF.' },
];

function Icon({ name, className }: { name: string; className?: string }) {
  const c = className || 'h-[50px] w-[50px]';
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'search': return <svg viewBox="0 0 24 24" className={c} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /><path d="M8 11h6M11 8v6" /></svg>;
    case 'bolt': return <svg viewBox="0 0 24 24" className={c} {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" /></svg>;
    case 'layout': return <svg viewBox="0 0 24 24" className={c} {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 9v12" /></svg>;
    case 'pdf': return <svg viewBox="0 0 24 24" className={c} {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></svg>;
    case 'letter': return <svg viewBox="0 0 24 24" className={c} {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>;
    case 'lock': return <svg viewBox="0 0 24 24" className={c} {...p}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>;
    default: return <svg viewBox="0 0 24 24" className={c} {...p}><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></svg>;
  }
}

/** Small "section icon" above big headings, like the source's 54×54 svg. */
function SectionIcon() {
  return <Icon name="check" className="mx-auto mb-4 h-[54px] w-[54px] text-[#f5f5f5]" />;
}

function scrollToCheckout() {
  track({ event: 'landing_cta', props: { page: 'landing', variant: VARIANT } });
  document.getElementById('checkout')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export default function ProClient() {
  const pricing = usePricing();
  // No iOS/Apple Pay gate here on purpose: this page is for Apple-targeted ads,
  // so iOS visitors must land on the Apple Pay button, not the NonC creative.

  const price = fmtPrice(pricing?.priceAmount ?? null, pricing?.priceCurrency ?? null);
  const zero = fmtPrice(0, pricing?.priceCurrency ?? null) || '$0.00';
  const interval = pricing?.priceInterval ?? 'month';
  const count = pricing?.priceIntervalCount ?? 1;
  const per = count > 1 ? `${count} ${interval}s` : interval; // "month" | "28 days"
  const trialDays = pricing?.trialDays ?? 0;
  const year = new Date().getFullYear();

  // Price line, same shape as the source:
  //   "1-day trial for €0.01, then €49,99 / 28 days with auto-renewal."
  const priceLine = !price
    ? 'Subscribe to ResumeMint. Cancel anytime.'
    : trialDays > 0
      ? `${trialDays}-day free trial for ${zero}, then ${price} / ${per} with auto-renewal.`
      : `${price} / ${per} with auto-renewal. Cancel anytime.`;

  const card = `bg-[#191919] px-8 pt-10 pb-8 text-left`;
  const h2 = `${H} text-center font-bold capitalize leading-[1.2] text-[44.35px] md:text-[60px] mb-[18px]`;
  const h2ls = `${H} text-center font-bold leading-[1.2] tracking-[1px] text-[45px] md:text-[60px] mb-[18px]`;
  const para = `${B} text-center text-[20px] leading-[1.6] md:text-[24px] md:leading-[1.4]`;
  const cardTitle = `${H} font-bold tracking-[1px] text-[34.5px] leading-[1.1] md:text-[38px] mb-5`;
  const cardText = `${B} text-[20px] leading-[1.6] mb-2`;

  return (
    <main className={`${B} min-h-screen bg-black text-[#f5f5f5] antialiased`}>
      <Impression />

      {/* ============ HERO (div.design: padding 40px 0, bg image) ============ */}
      <section className="relative overflow-hidden py-10">
        <div aria-hidden className="absolute inset-0 grid grid-cols-3 gap-1 opacity-40 md:grid-cols-6">
          {MOSAIC.map((s) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={s} src={thumb(s)} alt="" className="h-full w-full object-cover object-top" />
          ))}
        </div>
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/70 to-black" />

        <div className="relative mx-auto max-w-[1168px] px-4 text-center">
          {/* logo 126×70 */}
          <Link href="/" className="mx-auto flex h-[70px] w-[126px] items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/resumemint-wordmark-light.svg" alt="ResumeMint" className="h-[28px] w-auto" />
          </Link>

          <h1 className={`${H} mt-4 font-bold leading-[1.2] text-[44.35px] md:text-[80px]`}>
            ResumeMint &ndash; Your AI Resume Builder That Beats The ATS
          </h1>

          <div className={`${B} mt-4 text-[22.67px] leading-[1.6] md:text-[26px]`}>{priceLine}</div>

          {/* wallet buttons 240×40 */}
          <div id="checkout" className="mt-6">
            <CcSubscribe />
          </div>

          {/* consent: 24×24 checkbox + 12px text, 328px wide on mobile, 570 on desktop */}
          <div className="mx-auto mt-6 w-full max-w-[328px] space-y-3 text-left md:max-w-[602px]">
            <label className="flex items-start gap-2">
              <input defaultChecked type="checkbox" className="mt-0 h-6 w-6 shrink-0 rounded-[4px] accent-[#474545]" />
              <p className={`${B} text-[12px] leading-[1.2] text-[#f5f5f5]`}>
                By signing up for our website, you confirm you are 18 years old or older and your acceptance of the{' '}
                <Link href="/terms" className="underline">Terms &amp; Conditions</Link> and{' '}
                <Link href="/privacy" className="underline">Privacy Policy</Link>.
              </p>
            </label>
            <label className="flex items-start gap-2">
              <input defaultChecked type="checkbox" className="mt-0 h-6 w-6 shrink-0 rounded-[4px] accent-[#474545]" />
              <p className={`${B} text-[12px] leading-[1.2] text-[#f5f5f5]`}>
                {trialDays > 0 && price ? (
                  <>By signing up for our website, you confirm that you voluntarily opt into our subscription service, ensuring you receive the full benefits of our platform. The subscription starts now for {zero} / {trialDays}-day trial. The subscription will be automatically prolonged for {price} / {per} after the first period.</>
                ) : price ? (
                  <>By signing up for our website, you confirm that you voluntarily opt into our subscription service. The subscription starts now for {price} / {per} and will be automatically prolonged for {price} / {per} after each period until cancelled.</>
                ) : (
                  <>By signing up for our website, you confirm that you voluntarily opt into our subscription service, which renews automatically until cancelled.</>
                )}
              </p>
            </label>
          </div>
        </div>
      </section>

      {/* ============ WHAT IS ============ */}
      <section className="mx-auto max-w-[1168px] px-4 pt-[60px]">
        <h2 className={h2}>What is ResumeMint?</h2>
        <p className={para}>
          ResumeMint is an AI resume builder that rewrites your resume for each job you apply to. Paste your work history and the job description; it matches the keywords the applicant tracking system screens for, tightens every bullet, lays it out in a recruiter-approved template and exports a clean PDF.
        </p>
        {/* circular visual 358×354 / 500×495 */}
        <div className="mx-auto mt-[60px] h-[354px] w-[358px] max-w-full overflow-hidden rounded-full md:h-[495px] md:w-[500px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb('modern')} alt="ResumeMint resume preview" className="h-full w-full object-cover object-top" />
        </div>
      </section>

      {/* ============ CATEGORIES ============ */}
      <section className="mx-auto max-w-[1168px] px-4 pt-[60px]">
        <h2 className={h2}>Templates For Every Role And Industry</h2>
        <p className={para}>Pick a layout and switch at any time. Every template is built to pass automated screening.</p>
        <div className="mx-auto mt-10 grid max-w-[1168px] grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3">
          {CATEGORIES.map((c) => (
            <div key={c.slug} className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb(c.slug)} alt={`${c.name} resume template`} className="mx-auto h-[128px] w-[128px] rounded-full object-cover object-top" loading="lazy" />
              <h5 className={`${H} mt-0 text-[16px] font-medium uppercase leading-[1.6] md:text-[23px]`}>{c.name}</h5>
            </div>
          ))}
        </div>
      </section>

      {/* ============ COMPATIBILITY ============ */}
      <section className="mx-auto max-w-[1168px] px-4 pt-[60px]">
        <h2 className={`${h2} mt-[60px]`}>Works With Every Applicant Tracking System</h2>
        <p className={para}>Your resume is exported as a standard PDF with real text, not images.</p>
        <p className={para}>All you need to start is a phone or a computer and the job description.</p>
      </section>

      {/* ============ FEATURES (icon 50 · h4 27/38 · p 20) ============ */}
      <section className="mx-auto max-w-[1168px] px-4 pt-[60px]">
        <div className="grid gap-y-[60px] md:grid-cols-3 md:gap-x-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="text-center">
              <Icon name={f.icon} className="mx-auto mb-4 h-[50px] w-[50px] text-[#f5f5f5]" />
              <h4 className={`${H} text-[27px] font-bold leading-[1.6] md:text-[38px] md:leading-[1.2]`}>{f.title}</h4>
              <p className={`${para} mt-2`}>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ PASSIONATE ============ */}
      <section className="mx-auto max-w-[1168px] px-4 pt-[80px]">
        <h2 className={h2ls}>We&rsquo;re Passionate About Getting You The Interview</h2>
        <p className={para}>Driven by what recruiters and screening software actually look for, we keep improving how ResumeMint reads a job description, rewrites your experience and lays it out, so your application lands at the top of the pile.</p>
      </section>

      {/* ============ VALUES (cards #191919) ============ */}
      <section className="mx-auto max-w-[1168px] px-4 pt-[80px]">
        <SectionIcon />
        <h2 className={h2ls}>Our Values</h2>
        <p className={para}>The principles that guide ResumeMint in helping job-seekers get seen.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {VALUES.map((v) => (
            <div key={v.title} className={card}>
              <h6 className={cardTitle}>{v.title}</h6>
              <p className={cardText}>{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ MILESTONES (numbers Phudu 105 w900) ============ */}
      <section className="mx-auto max-w-[1168px] px-4 pt-[80px]">
        <SectionIcon />
        <h2 className={h2ls}>What&rsquo;s Inside</h2>
        <p className={para}>Everything in ResumeMint is included from the first day of your trial.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {MILESTONES.map((m) => (
            <div key={m.label} className={card}>
              <h6 className={cardTitle}>{m.label}</h6>
              <h5 className={`${H} text-[105px] font-black leading-[1.1] tracking-[1px] mb-5`}>{m.value}</h5>
            </div>
          ))}
        </div>
      </section>

      {/* ============ HOW TO SUBSCRIBE ============ */}
      <section className="mx-auto max-w-[1168px] px-4 pt-[80px]">
        <SectionIcon />
        <h2 className={h2ls}>How To Subscribe To ResumeMint</h2>
        <p className={para}>Start your free trial in under a minute. Unlimited tailored resumes, cover letters and PDF exports from the moment you subscribe.</p>
        <div className="mx-auto mt-10 grid max-w-[980px] gap-4 md:grid-cols-2">
          {STEPS.map((s) => (
            <div key={s.title} className={card}>
              <h6 className={cardTitle}>{s.title}</h6>
              <p className={cardText}>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ READY + PRICING ============ */}
      <section className="mx-auto max-w-[1168px] px-4 pt-[80px]">
        <h2 className={`${H} text-center font-bold capitalize leading-[1.2] text-[45px] md:text-[60px] mb-4`}>Ready To Land More Interviews?</h2>
        <p className={para}>Get every template, unlimited AI rewrites and cover letters with one subscription you can cancel at any time.</p>
        <div className="mx-auto mt-10 w-full max-w-[358px] bg-[#181818] px-5 py-10 text-center md:max-w-[640px] md:px-16">
          <h6 className={`${H} text-[31.5px] font-bold leading-[1.1] tracking-[1px]`}>Pricing</h6>
          <h4 className={`${B} mt-6 mb-3 text-[52.5px] font-extrabold leading-[1.6] tracking-[1.5px]`}>{price || '—'}</h4>
          <h4 className={`${B} mt-4 mb-8 text-[15.75px] leading-[1.6] tracking-[0.79px] md:text-[18px] md:tracking-[0.9px]`}>
            {trialDays > 0 && price
              ? `Get instant access to ResumeMint with a ${trialDays}-day free trial, then ${price} / ${per} with auto-renewal. Cancel at any time from your account.`
              : price
                ? `Get instant access to ResumeMint for ${price} / ${per} with auto-renewal. Cancel at any time from your account.`
                : 'Get instant access to ResumeMint. Cancel at any time from your account.'}
          </h4>
          <button
            type="button"
            onClick={scrollToCheckout}
            className={`${B} mx-auto mb-8 block h-[66px] w-full max-w-[319px] rounded-[5px] bg-[#ee2255] text-[18.75px] font-bold uppercase leading-[1.6] tracking-[1px] text-[#f5f5f5] md:h-[74px] md:max-w-[520px] md:text-[24px]`}
          >
            {trialDays > 0 ? 'Start Free Trial' : 'Subscribe Now'}
          </button>
        </div>
      </section>

      {/* ============ HOW TO UNSUBSCRIBE ============ */}
      <section className="mx-auto max-w-[1168px] px-4 pt-[80px]">
        <SectionIcon />
        <h2 className={h2ls}>How To Unsubscribe From ResumeMint</h2>
        <p className={para}>If you decide to leave ResumeMint, unsubscribing is a straightforward process that can be completed in just a few steps. We value your time and strive to make this transition as smooth as possible.</p>
        <div className="mx-auto mt-10 grid max-w-[980px] gap-4 md:grid-cols-2">
          <div className={card}>
            <h6 className={cardTitle}>Option: From Your Account</h6>
            <p className={cardText}>Sign in, open the unsubscribe page and confirm. Your access continues until the end of the current period and you are not charged again.</p>
            <Link href="/unsubscribe" className={`${B} text-[20px] font-semibold leading-[1.6] text-[#88d1ff] md:text-[24px]`}>Unsubscribe</Link>
          </div>
          <div className={card}>
            <h6 className={cardTitle}>Option: Contact Support</h6>
            <p className={cardText}>Send us a message with your cancellation request. Please include the email address on your account so we can process it quickly.</p>
            <Link href="/contact" className={`${B} text-[20px] font-semibold leading-[1.6] text-[#88d1ff] md:text-[24px]`}>Contact us</Link>
          </div>
        </div>
      </section>

      {/* ============ FOOTER (#191919 · pt60 pb30) ============ */}
      <footer className="mt-[80px] bg-[#191919] px-4 pb-[30px] pt-[60px] md:px-10">
        <div className="mx-auto grid max-w-[1200px] gap-10 md:grid-cols-[585px_1fr_1fr]">
          <div>
            <Link href="/" className="inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo/resumemint-wordmark-light.svg" alt="ResumeMint" className="h-[24px] w-auto" />
            </Link>
            <h3 className={`${H} mb-4 mt-8 text-[45px] font-bold leading-[1.2] tracking-[1px] md:text-[60px]`}>Land Your Next Role Today</h3>
            <p className={`${B} my-4 text-[16px] leading-[1.6] md:text-[20px]`}>ResumeMint is an all-in-one AI resume builder: tailored resumes, matching cover letters and ATS-safe templates, exported as pixel-perfect PDFs.</p>
            <p className={`${B} my-4 text-[16px] leading-[1.6] md:text-[20px]`}>&copy; {year} All rights reserved</p>
          </div>
          <div>
            <h4 className={`${H} mb-[15px] text-[24px] font-bold leading-[1.6] md:text-[34px]`}>Help Center</h4>
            <ul className={`${B} space-y-2 text-[15px] font-semibold leading-[1.6] text-[#88d1ff] md:text-[18px]`}>
              <li><Link href="/faq">FAQs</Link></li>
              <li><Link href="/contact">Contact</Link></li>
              <li><Link href="/login">My Account</Link></li>
            </ul>
          </div>
          <div>
            <h4 className={`${H} mb-[15px] text-[24px] font-bold leading-[1.6] md:text-[34px]`}>Legal</h4>
            <ul className={`${B} space-y-2 text-[15px] font-semibold leading-[1.6] text-[#88d1ff] md:text-[18px]`}>
              <li><Link href="/terms">Terms of Service</Link></li>
              <li><Link href="/privacy">Privacy Policy</Link></li>
              <li><Link href="/refund">Refund Policy</Link></li>
            </ul>
          </div>
        </div>
        {/* payment logos row 254×40 */}
        <div className="mx-auto mt-10 flex h-10 w-[254px] items-center justify-between gap-3">
          {['apple-pay', 'google-pay', 'visa', 'mastercard'].map((l) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={l} src={`/logos/${l}.webp`} alt={l.replace('-', ' ')} className="h-8 w-auto" loading="lazy" />
          ))}
        </div>
      </footer>
    </main>
  );
}
