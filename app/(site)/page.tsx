import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Wand2, ShieldCheck, Clock, FileText, Star, ChevronDown, Briefcase, PenLine, LayoutTemplate } from 'lucide-react';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import {
  organizationLd,
  webSiteLd,
  softwareApplicationLd,
  faqPageLd,
  jsonLdScript,
} from '@/lib/seo-ld';

export const metadata: Metadata = {
  title: 'AI Resume Builder & ATS Optimizer',
  description:
    'Create ATS-friendly resumes in minutes with AI. Tailor your resume to any job, generate matching cover letters, and apply with one click. Try ResumeMint today.',
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

      {/* Hero */}
      <header className="bg-white">
        <div className="max-w-site mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1d1d20] leading-tight">
            Create your professional resume
          </h1>
          <p className="mt-4 text-[#52525a] text-lg max-w-2xl mx-auto">
            Build a job-winning resume in minutes with AI-powered suggestions, professional templates, and one-click PDF export.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/builder" className="btn-primary text-base">
              Get started
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-[#52525a]">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-brand" /> 14-day free trial</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-brand" /> No credit card to start</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-brand" /> Cancel anytime</span>
          </div>
        </div>
      </header>

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
