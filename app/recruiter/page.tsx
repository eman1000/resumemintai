import type { Metadata } from 'next';
import Link from 'next/link';
import { ListChecks, Megaphone, Users, ShieldCheck, Clock, ScanSearch, CheckCircle2 } from 'lucide-react';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import SocialProof from '@/components/SocialProof';

export const metadata: Metadata = {
  title: 'AI Candidate Shortlisting for Recruiters',
  description:
    'Upload a job description and a stack of resumes — ResumeMint ranks the best-fit candidates with evidence-based reasons and honest gaps. Post jobs and manage applications end to end.',
  alternates: { canonical: '/recruiter' },
  openGraph: {
    url: '/recruiter',
    title: 'AI Candidate Shortlisting for Recruiters | ResumeMint',
    description:
      'Let AI do the first pass. Rank candidates from a stack of resumes with reasons you can trust.',
  },
};

const steps = [
  { n: '1', t: 'Paste the job description', d: 'Drop in the full JD or requirements — no setup, no integrations.' },
  { n: '2', t: 'Upload the resumes', d: 'Add up to 50 candidate resumes (PDF or DOCX) in one go.' },
  { n: '3', t: 'Get a ranked shortlist', d: 'AI scores each candidate 0–100 with strengths, honest gaps, and a one-line verdict.' },
];

const features = [
  { icon: ScanSearch, t: 'Evidence-based ranking', d: 'Every score is justified by what the resume actually says — no invented qualifications.' },
  { icon: ShieldCheck, t: 'Honest gaps', d: 'Missing or weak requirements are flagged, not glossed over, so you screen with confidence.' },
  { icon: Clock, t: 'Minutes, not hours', d: 'Replace the first read-through of a resume pile with a ranked list in under a minute.' },
  { icon: Megaphone, t: 'Post to the job board', d: 'Publish openings to the ResumeMint board and reach candidates who are actively applying.' },
  { icon: Users, t: 'Applications end to end', d: 'Receive applications and shortlist applicants with the same AI ranking — all in one place.' },
  { icon: ListChecks, t: 'Works for any role', d: 'Shortlist candidates even for jobs you didn’t post here — bring your own resumes and JD.' },
];

export default function RecruiterLanding() {
  return (
    <>
      <SiteNav />

      {/* Hero */}
      <header className="bg-[#0f1b2d]">
        <div className="max-w-site mx-auto px-4 py-20 text-center">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase text-mint-200 bg-white/10 rounded-full px-3 py-1">
            <Users className="w-3.5 h-3.5" /> For recruiters &amp; hiring teams
          </span>
          <h1 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
            Hire the right candidate, faster
          </h1>
          <p className="mt-4 text-mint-100/80 text-lg max-w-2xl mx-auto">
            Drop in a job description and a stack of resumes — AI ranks the best-fit candidates with
            evidence-based reasons and honest gaps. Post jobs to our board and manage applications
            end to end.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/recruiter/shortlist"
              className="rounded-lg bg-mint-600 hover:bg-mint-500 text-white font-semibold px-6 py-3 text-base transition-colors"
            >
              Shortlist candidates
            </Link>
            <Link
              href="/login?return=/recruiter/shortlist&role=recruiter"
              className="rounded-lg border border-white/25 text-white font-semibold px-6 py-3 text-base hover:bg-white/10 transition-colors"
            >
              Recruiter login
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-mint-100/70">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-mint-300" /> 14-day free trial</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-mint-300" /> Evidence-based ranking</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-mint-300" /> Cancel anytime</span>
          </div>
        </div>
      </header>

      {/* How it works */}
      <section className="bg-white">
        <div className="max-w-site mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center text-[#1d1d20] mb-10">How shortlisting works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((s) => (
              <div key={s.n} className="card text-center">
                <div className="w-12 h-12 rounded-full bg-mint-50 text-mint-700 font-bold text-xl flex items-center justify-center mx-auto">
                  {s.n}
                </div>
                <h3 className="mt-4 font-semibold text-[#1d1d20]">{s.t}</h3>
                <p className="mt-2 text-sm text-[#52525a]">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-[#f8fbfc]">
        <div className="max-w-site mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center text-[#1d1d20] mb-10">Built for honest, fast screening</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.t} className="card">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-mint-50 flex items-center justify-center flex-shrink-0">
                    <f.icon className="w-4 h-4 text-mint-700" />
                  </div>
                  <h3 className="font-semibold text-[#1d1d20]">{f.t}</h3>
                </div>
                <p className="text-sm text-[#52525a] mt-2">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing note + CTA */}
      <section className="bg-white">
        <div className="max-w-site mx-auto px-4 py-16">
          <div className="rounded-2xl bg-[#0f1b2d] px-6 py-12 md:px-12 text-center">
            <h2 className="text-3xl font-bold text-white">Try it on your next role</h2>
            <p className="mt-3 text-mint-100/80 max-w-2xl mx-auto">
              Start with a 14-day free trial. The recruiter plan is $49/month with a generous monthly
              shortlisting allowance — cancel anytime.
            </p>
            <Link
              href="/recruiter/shortlist"
              className="inline-flex mt-6 rounded-lg bg-mint-600 hover:bg-mint-500 text-white font-semibold px-6 py-3 text-base transition-colors"
            >
              Shortlist candidates free
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
      <SocialProof variant="recruiter" />
    </>
  );
}
