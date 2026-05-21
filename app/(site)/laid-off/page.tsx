import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  Wand2,
  FileText,
  Briefcase,
  ChevronDown,
  Sparkles,
  Mail,
  ListChecks,
  Zap,
} from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { faqPageLd, jsonLdScript } from "@/lib/seo-ld";

export const metadata: Metadata = {
  title: "Just got laid off? Your 7-day comeback plan | ResumeMint",
  description:
    "Recently laid off? Use ResumeMint to rebuild your resume in an afternoon, tailor it to every job, and auto-apply with our Chrome extension. Get back to employed — fast.",
  alternates: { canonical: "/laid-off" },
  openGraph: {
    url: "/laid-off",
    title: "Just got laid off? Your 7-day comeback plan",
    description:
      "Rebuild your resume, tailor to each job, and auto-apply in bulk. ResumeMint helps laid-off workers move fast.",
    images: [
      {
        url: "/api/og?eyebrow=COMEBACK+PLAN&title=Laid+off%3F+Get+back+to+employed.&subtitle=Resume+%2B+ATS+checker+%2B+auto-apply",
        width: 1200,
        height: 630,
      },
    ],
  },
};

const sevenDayPlan = [
  {
    day: "Day 1",
    title: "Rebuild your resume",
    body:
      "Import your old resume or LinkedIn, switch to an ATS-friendly template, and let AI rewrite your bullets with measurable impact.",
    cta: { href: "/builder", label: "Open the builder" },
  },
  {
    day: "Day 2",
    title: "Check it against ATS",
    body:
      "Paste a target job description into our free ATS checker. See exactly which keywords you're missing before anyone reads your resume.",
    cta: { href: "/resume-checker", label: "Run a free ATS check" },
  },
  {
    day: "Day 3",
    title: "Write a cover letter template",
    body:
      "Generate a base cover letter you can tweak per role — no more staring at a blank page at 11pm.",
    cta: { href: "/cover-letter-templates", label: "Browse cover letters" },
  },
  {
    day: "Day 4–5",
    title: "Tailor + apply in bulk",
    body:
      "Use the ResumeMint Apply Chrome extension to auto-fill Greenhouse, Lever, Ashby, Workable, Workday, LinkedIn and Indeed — review every submission before you click Submit.",
    cta: { href: "/extension", label: "Install the extension" },
  },
  {
    day: "Day 6",
    title: "Track everything",
    body:
      "Every application goes into your tracker so you stop losing track of who you've sent what to — and what's actually replying.",
    cta: { href: "/applications", label: "Open the tracker" },
  },
  {
    day: "Day 7",
    title: "Tune and repeat",
    body:
      "Review which applications got responses, double-down on the strongest version of your resume, and keep your weekly volume up.",
    cta: { href: "/jobs", label: "Find more roles" },
  },
];

const reasonsToHurry = [
  {
    icon: Clock,
    t: "Severance is a clock, not a cushion",
    d: "Every week you wait, your runway shrinks. Move fast — but apply smart, not spammy.",
  },
  {
    icon: Zap,
    t: "Recruiters skim in 7 seconds",
    d: "If your resume isn't tailored to the keywords in the JD, it won't even reach a human reader.",
  },
  {
    icon: ListChecks,
    t: "Volume + tailoring beats one perfect resume",
    d: "Sending 5 tailored applications per day for 30 days outperforms one polished resume sent 150 times.",
  },
  {
    icon: ShieldCheck,
    t: "Your old resume is probably stale",
    d: "Layoffs are the perfect excuse to fix the bullets you've been meaning to rewrite for two years.",
  },
];

const toolkit = [
  {
    icon: Wand2,
    t: "AI resume rewriter",
    d: "Turn duties into impact bullets with metrics, in seconds.",
  },
  {
    icon: ShieldCheck,
    t: "Free ATS checker",
    d: "See your match score for any job description — no signup.",
  },
  {
    icon: Mail,
    t: "Cover letter generator",
    d: "Personalised cover letter for every role, every time.",
  },
  {
    icon: Sparkles,
    t: "Chrome auto-apply extension",
    d: "Fill Greenhouse, Lever, Ashby, Workable, Workday + more.",
  },
  {
    icon: Briefcase,
    t: "Job board",
    d: "Search live job postings without leaving ResumeMint.",
  },
  {
    icon: FileText,
    t: "Application tracker",
    d: "Every submission logged so you know exactly where you stand.",
  },
];

const faqs = [
  {
    q: "I just got laid off — where should I start?",
    a: "Start with your resume. Import your existing one or paste your LinkedIn text into our builder, switch to an ATS-friendly template, and let AI tighten your bullets. Once it's solid, run it through the free ATS checker against a job you actually want.",
  },
  {
    q: "Do you have a discount for people who were laid off?",
    a: "We're a small team but we want to help. Email support@resumemintai.com from the address linked to your account and we'll do our best — especially if you're on a tight budget while you job-hunt.",
  },
  {
    q: "How is this different from just using ChatGPT?",
    a: "ChatGPT writes text. ResumeMint formats it into an ATS-readable PDF, scores it against the job description, auto-fills Greenhouse/Lever/Ashby/Workable/Workday application forms, and tracks every submission for you. It's the whole comeback workflow, not just the writing.",
  },
  {
    q: "Can I really apply to multiple jobs at once?",
    a: "Yes — the ResumeMint Apply Chrome extension auto-fills the form, but you always click Submit yourself. Most users do 10–20 high-quality applications per day instead of 2–3.",
  },
  {
    q: "What if my industry is being hit hardest?",
    a: "Volume + tailoring is even more important in saturated markets. The ATS checker tells you which keywords each company is actually scanning for, and the extension lets you sustain a higher apply rate without burning out.",
  },
];

export default function LaidOffPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(faqPageLd(faqs))} />
      <SiteNav />

      {/* Hero */}
      <header className="bg-white">
        <div className="max-w-3xl mx-auto px-4 py-16 md:py-20 text-center">
          <span className="inline-block text-[11px] font-semibold tracking-[0.18em] uppercase text-brand bg-brand-50 rounded-full px-3 py-1">
            For people in transition
          </span>
          <h1 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-bold text-[#1d1d20] leading-tight">
            Just got laid off? Get back to employed — faster.
          </h1>
          <p className="mt-5 text-[#52525a] text-lg max-w-2xl mx-auto leading-relaxed">
            Layoffs are brutal. The job market is louder than ever. ResumeMint gives you a 7-day
            comeback plan — rebuild your resume, beat the ATS, and auto-apply to dozens of roles
            without burning out.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/builder" className="btn-primary text-base px-7 py-3">
              Start my comeback
            </Link>
            <Link href="/resume-checker" className="text-sm text-brand hover:underline">
              Try the free ATS checker first →
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-[#52525a]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-brand" /> 14-day free trial
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-brand" /> Cancel anytime
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-brand" /> Free ATS checker, no signup
            </span>
          </div>
        </div>
      </header>

      {/* Why move fast */}
      <section className="bg-[#f8fbfc]">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-[#1d1d20]">
            Why move fast — but not panicked
          </h2>
          <p className="mt-3 text-center text-[#52525a] max-w-2xl mx-auto">
            The biggest mistake after a layoff isn&apos;t applying too slow. It&apos;s applying with the
            same generic resume to 200 jobs and getting nothing back.
          </p>
          <div className="mt-10 grid sm:grid-cols-2 gap-5">
            {reasonsToHurry.map((r) => (
              <div key={r.t} className="rounded-lg bg-white border border-gray-200 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <r.icon className="w-4 h-4 text-brand" />
                  </div>
                  <h3 className="font-semibold text-[#1d1d20]">{r.t}</h3>
                </div>
                <p className="text-sm text-[#52525a] mt-2 leading-relaxed">{r.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7-day plan */}
      <section className="bg-white">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-[#1d1d20]">
            Your 7-day comeback plan
          </h2>
          <p className="mt-3 text-center text-[#52525a] max-w-2xl mx-auto">
            One small task per day. By next week, you&apos;ll be submitting tailored applications at
            volume — not refreshing LinkedIn in pyjamas.
          </p>
          <ol className="mt-10 space-y-4">
            {sevenDayPlan.map((s, idx) => (
              <li
                key={s.day}
                className="rounded-lg border border-gray-200 bg-white p-5 flex flex-col md:flex-row md:items-center gap-4 hover:shadow-sm transition-shadow"
              >
                <div className="md:w-32 flex-shrink-0">
                  <div className="inline-flex md:flex md:w-24 md:h-9 items-center justify-center px-3 py-1 rounded-full bg-brand text-white text-xs font-semibold">
                    {s.day}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#1d1d20]">
                    Step {idx + 1}: {s.title}
                  </h3>
                  <p className="text-sm text-[#52525a] mt-1 leading-relaxed">{s.body}</p>
                </div>
                <div className="md:flex-shrink-0">
                  <Link
                    href={s.cta.href}
                    className="inline-flex items-center text-sm font-medium text-brand hover:underline"
                  >
                    {s.cta.label} →
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Toolkit */}
      <section className="bg-[#f8fbfc]">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-[#1d1d20]">
            Everything you need in one place
          </h2>
          <p className="mt-3 text-center text-[#52525a] max-w-2xl mx-auto">
            Six tools that work together — so you&apos;re not stitching together five different apps
            while you&apos;re already stressed.
          </p>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {toolkit.map((t) => (
              <div key={t.t} className="rounded-lg bg-white border border-gray-200 p-5">
                <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
                  <t.icon className="w-5 h-5 text-brand" />
                </div>
                <h3 className="mt-3 font-semibold text-[#1d1d20]">{t.t}</h3>
                <p className="text-sm text-[#52525a] mt-1">{t.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Honest section */}
      <section className="bg-white">
        <div className="max-w-3xl mx-auto px-4 py-16">
          <div className="rounded-2xl bg-brand-50 border border-brand/15 px-6 md:px-10 py-10">
            <h2 className="text-2xl font-bold text-[#1d1d20]">A note from us</h2>
            <p className="mt-3 text-[#52525a] leading-relaxed">
              We know what it&apos;s like to refresh LinkedIn and feel the floor drop. ResumeMint
              won&apos;t magically land you a job — but it will make sure your resume is actually
              read, your applications are actually tailored, and you&apos;re not losing track of who
              you&apos;ve sent what to. If you&apos;re on a tight budget while you job-hunt, email{" "}
              <a
                href="mailto:support@resumemintai.com"
                className="text-brand font-medium hover:underline"
              >
                support@resumemintai.com
              </a>{" "}
              and we&apos;ll do our best to help.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#f8fbfc]">
        <div className="max-w-3xl mx-auto px-4 py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-[#1d1d20] mb-10">
            Frequently asked
          </h2>
          <div className="divide-y divide-gray-200">
            {faqs.map((faq, i) => (
              <details key={i} className="group py-4">
                <summary className="flex items-center justify-between cursor-pointer list-none font-medium text-[#1d1d20]">
                  {faq.q}
                  <ChevronDown className="w-5 h-5 text-[#a1a1aa] group-open:rotate-180 transition-transform" />
                </summary>
                <p className="mt-3 text-sm text-[#52525a] leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-brand-50">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl font-bold text-[#1d1d20]">
            Your next role is closer than it feels.
          </h2>
          <p className="mt-3 text-[#52525a]">
            Start the comeback plan today. The first 14 days are free.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/builder" className="btn-primary inline-flex text-base">
              Start my comeback
            </Link>
            <Link href="/pricing" className="text-sm text-brand hover:underline">
              See pricing →
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
