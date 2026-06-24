import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Wand2, ShieldCheck, Clock, FileText, Star, ChevronDown, Briefcase, PenLine, LayoutTemplate, Users, ListChecks, Megaphone } from 'lucide-react';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import LaidOffBanner from '@/components/LaidOffBanner';
import AudienceHero from '@/components/AudienceHero';
import {
  organizationLd,
  webSiteLd,
  softwareApplicationLd,
  faqPageLd,
  jsonLdScript,
} from '@/lib/seo-ld';

export const metadata: Metadata = {
  title: 'AI Resume Builder & Recruiter Shortlisting',
  description:
    'For job seekers: build ATS-friendly resumes, tailor to any job, and apply in one click. For recruiters: AI shortlists the best-fit candidates from a stack of resumes. Try ResumeMint today.',
  alternates: { canonical: '/' },
  openGraph: {
    url: '/',
    title: 'Build Your ATS-Ready Resume with AI | ResumeMint',
    description:
      'Effortlessly create and optimize resumes with AI. Tailor to any job, generate cover letters, and apply with ease.',
    images: [{ url: '/api/og?eyebrow=RESUMEMINT&title=AI+Resume+Builder+that+beats+ATS', width: 1200, height: 630 }],
  },
};

const features = [
  { icon: Wand2, t: 'AI-Powered Writing', d: 'Get intelligent suggestions for every section of your resume.' },
  { icon: ShieldCheck, t: 'ATS Compatible', d: 'Clean structure that parsing systems read perfectly.' },
  { icon: Clock, t: 'Ready in Minutes', d: 'Create a polished resume in under 5 minutes.' },
  { icon: FileText, t: 'Keyword Optimization', d: 'Surface and include critical keywords from job descriptions.' },
  { icon: Star, t: '12 Professional Templates', d: 'Choose from modern, elegant, and classic designs.' },
  { icon: CheckCircle2, t: 'PDF Export', d: 'Download your resume as a professional PDF instantly.' },
];

const tools = [
  { icon: FileText, t: 'Resume Builder', d: 'Create professional resumes with AI assistance and 12 templates.', href: '/templates' },
  { icon: PenLine, t: 'Cover Letters', d: 'Write compelling cover letters matched to each application.', href: '/cover-letter-templates' },
  { icon: LayoutTemplate, t: 'Templates', d: 'Browse all resume and cover letter templates.', href: '/templates' },
  { icon: Briefcase, t: 'Job Tracker', d: 'Search and track job opportunities in one place.', href: '/login?return=/jobs' },
];

const steps = [
  { n: '1', t: 'Fill in your details', d: 'Add your work experience, education, and skills — or import from LinkedIn.' },
  { n: '2', t: 'Choose a template', d: 'Pick from 12 professionally designed templates that suit your style.' },
  { n: '3', t: 'Download & apply', d: 'Export as PDF and start applying to jobs with confidence.' },
];

const recruiterPoints = [
  { icon: ListChecks, t: 'AI candidate shortlisting', d: 'Upload a JD and a stack of resumes — AI ranks the best fits with evidence-based reasons and honest gaps.' },
  { icon: Megaphone, t: 'Post jobs to our board', d: 'Publish openings to the ResumeMint job board and reach candidates who are actively applying.' },
  { icon: Users, t: 'Applications, end to end', d: 'Receive applications, then shortlist applicants with the same AI ranking — all in one place.' },
];

const faqs = [
  { q: 'Is there a free trial?', a: 'Yes! You get a 14-day free trial with full access to all features, templates, and AI tools. No commitment required.' },
  { q: 'Can I cancel anytime?', a: 'Absolutely. You can cancel your subscription at any time from your account settings. No questions asked.' },
  { q: 'What file formats can I export?', a: 'You can export your resume and cover letters as PDF files, optimized for both digital submission and printing.' },
  { q: 'Is my data secure?', a: 'Yes. We use industry-standard encryption and never share your personal information with third parties.' },
  { q: 'Can I create multiple resumes?', a: 'Yes! Create as many resumes and cover letters as you need, each tailored to different job applications.' },
];

export default function LandingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(organizationLd())} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(webSiteLd())} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(softwareApplicationLd())} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(faqPageLd(faqs))} />
      <SiteNav />
      <LaidOffBanner />

      {/* Hero — dual audience (job seekers + recruiters) */}
      <AudienceHero />

      {/* How it Works */}
      <section className="bg-[#f8fbfc]">
        <div className="max-w-site mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center text-[#1d1d20] mb-10">How it works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((s) => (
              <div key={s.n} className="card text-center">
                <div className="w-12 h-12 rounded-full bg-brand-50 text-brand font-bold text-xl flex items-center justify-center mx-auto">
                  {s.n}
                </div>
                <h3 className="mt-4 font-semibold text-[#1d1d20]">{s.t}</h3>
                <p className="mt-2 text-sm text-[#52525a]">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tools */}
      <section className="bg-white">
        <div className="max-w-site mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center text-[#1d1d20] mb-10">Our tools</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {tools.map((t) => (
              <Link key={t.t} href={t.href} className="card group hover:shadow-lg transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center mb-3">
                  <t.icon className="w-5 h-5 text-brand" />
                </div>
                <h3 className="font-semibold text-[#1d1d20] group-hover:text-brand transition-colors">{t.t}</h3>
                <p className="mt-1 text-sm text-[#52525a]">{t.d}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-[#f8fbfc]">
        <div className="max-w-site mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center text-[#1d1d20] mb-10">Why choose ResumeMint?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, idx) => (
              <div key={idx} className="card">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <f.icon className="w-4 h-4 text-brand" />
                  </div>
                  <h3 className="font-semibold text-[#1d1d20]">{f.t}</h3>
                </div>
                <p className="text-sm text-[#52525a] mt-2">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Free ATS checker */}
      <section id="ats-checker" className="bg-white">
        <div className="max-w-site mx-auto px-4 py-16">
          <div className="rounded-2xl bg-brand-50 border border-brand/15 px-6 py-12 md:px-12 text-center">
            <span className="inline-block text-[11px] font-semibold tracking-[0.18em] uppercase text-brand bg-white rounded-full px-3 py-1">
              Free tool · no signup
            </span>
            <h2 className="mt-4 text-3xl font-bold text-[#1d1d20]">Not sure your resume passes ATS?</h2>
            <p className="mt-3 text-[#52525a] max-w-2xl mx-auto">
              Paste your resume and a job description into our free ATS checker. Get an instant score
              and see exactly which keywords you&apos;re missing — no account needed.
            </p>
            <Link href="/resume-checker" className="btn-primary mt-6 inline-flex text-base">
              Check my resume free
            </Link>
          </div>
        </div>
      </section>

      {/* For recruiters */}
      <section id="recruiters" className="bg-[#0f1b2d]">
        <div className="max-w-site mx-auto px-4 py-16">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase text-blue-200 bg-white/10 rounded-full px-3 py-1">
              <Users className="w-3.5 h-3.5" /> For recruiters &amp; hiring teams
            </span>
            <h2 className="mt-4 text-3xl font-bold text-white">Hiring? Let AI do the first pass.</h2>
            <p className="mt-3 text-blue-100/80 max-w-2xl mx-auto">
              Stop reading hundreds of resumes by hand. Drop in a job description and a stack of
              resumes — AI ranks the best-fit candidates with reasons you can trust.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mt-10">
            {recruiterPoints.map((p) => (
              <div key={p.t} className="rounded-2xl bg-white/5 border border-white/10 p-6">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-3">
                  <p.icon className="w-5 h-5 text-blue-300" />
                </div>
                <h3 className="font-semibold text-white">{p.t}</h3>
                <p className="mt-1 text-sm text-blue-100/70">{p.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/recruiter/shortlist"
              className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 text-base transition-colors"
            >
              Shortlist candidates
            </Link>
            <Link
              href="/recruiter"
              className="rounded-lg border border-white/25 text-white font-semibold px-6 py-3 text-base hover:bg-white/10 transition-colors"
            >
              See how it works
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#f8fbfc]">
        <div className="max-w-site mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center text-[#1d1d20] mb-10">Frequently asked questions</h2>
          <div className="max-w-2xl mx-auto divide-y divide-gray-200">
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
        <div className="max-w-site mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl font-bold text-[#1d1d20]">Ready to build your resume?</h2>
          <p className="mt-3 text-[#52525a]">Tailor your resume to any job and apply with confidence — your first 14 days are free.</p>
          <Link href="/builder" className="btn-primary mt-6 inline-flex text-base">
            Get started — it&apos;s free
          </Link>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
