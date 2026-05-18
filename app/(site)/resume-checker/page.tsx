import type { Metadata } from 'next';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import ResumeCheckerClient from './ResumeCheckerClient';
import { faqPageLd, jsonLdScript } from '@/lib/seo-ld';

export const metadata: Metadata = {
  title: 'Free ATS Resume Checker — Score Your Resume Against Any Job',
  description:
    'Paste your resume and a job description. Get an instant ATS score, see which keywords you matched, and find out what to fix — free, no signup required.',
  alternates: { canonical: '/resume-checker' },
  openGraph: {
    url: '/resume-checker',
    title: 'Free ATS Resume Checker',
    description: 'Instant ATS score, keyword coverage, and fix-it tips — free, no signup.',
    images: [
      {
        url: '/api/og?eyebrow=FREE+TOOL&title=Free+ATS+Resume+Checker&subtitle=Score+your+resume+against+any+job',
        width: 1200,
        height: 630,
      },
    ],
  },
};

const FAQS = [
  {
    q: 'What is an ATS resume checker?',
    a: 'An ATS (Applicant Tracking System) resume checker compares your resume against a job description and flags how well they match. ResumeMint scores keyword coverage, formatting, and contact info so you can fix issues before recruiters see them.',
  },
  {
    q: 'Is the ATS checker free?',
    a: 'Yes — completely free. Paste your resume and a job description, get an instant score and improvement tips. No signup needed.',
  },
  {
    q: 'How accurate is the ATS score?',
    a: 'The score is a deterministic blend of (1) JD keyword coverage and (2) formatting hygiene. It mirrors the parsing logic real ATS systems apply at the screening stage. A higher score means more keywords matched and fewer formatting issues.',
  },
  {
    q: 'What should I do after I get my score?',
    a: 'Weave in any missing keywords where they truthfully apply, fix flagged formatting issues, and aim for 400–700 words on a single page. Then use ResumeMint to generate a fully tailored, ATS-friendly resume in minutes.',
  },
];

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(faqPageLd(FAQS))} />
      <SiteNav />

      <header className="bg-white">
        <div className="max-w-site mx-auto px-4 py-16 text-center">
          <span className="inline-block text-[11px] font-semibold tracking-[0.18em] uppercase text-brand bg-brand-50 rounded-full px-3 py-1">
            Free tool · no signup
          </span>
          <h1 className="mt-4 text-4xl md:text-5xl font-bold text-[#1d1d20]">
            Free ATS Resume Checker
          </h1>
          <p className="mt-4 text-[#52525a] text-lg max-w-2xl mx-auto">
            Paste your resume and the job description. Get an instant ATS score, see which keywords
            you matched, and find out exactly what to fix.
          </p>
        </div>
      </header>

      <section className="bg-[#f8fbfc]">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <ResumeCheckerClient />
        </div>
      </section>

      {/* Why */}
      <section className="bg-white">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-[#1d1d20]">
            Why most resumes fail ATS
          </h2>
          <div className="mt-8 grid sm:grid-cols-3 gap-6 text-sm">
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="text-2xl font-bold text-brand">75%</div>
              <p className="mt-1 text-[#52525a]">of resumes are filtered out by ATS software before a human ever reads them.</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="text-2xl font-bold text-brand">&lt; 7s</div>
              <p className="mt-1 text-[#52525a]">is the average time a recruiter spends on a resume that does pass ATS.</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="text-2xl font-bold text-brand">3×</div>
              <p className="mt-1 text-[#52525a]">more interview callbacks when your resume keyword-matches the job description.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#f8fbfc]">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center text-[#1d1d20] mb-8">Frequently asked questions</h2>
          <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-200">
            {FAQS.map((f, i) => (
              <details key={i} className="group p-5">
                <summary className="cursor-pointer font-medium text-[#1d1d20] list-none flex items-center justify-between">
                  <span>{f.q}</span>
                  <span className="text-[#a1a1aa] group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-sm text-[#52525a] leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
