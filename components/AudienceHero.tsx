'use client';

// Dual-audience hero: one switch toggles the headline, copy, and CTAs between
// job seekers (build/tailor/apply) and recruiters (shortlist/post/hire). Both
// sign in through the same Firebase auth — the difference is the entry point and
// where they land after login.

import Link from 'next/link';
import { useState } from 'react';
import { CheckCircle2, ShieldCheck, Users, FileText, Sparkles } from 'lucide-react';

type Audience = 'seeker' | 'recruiter';

export default function AudienceHero() {
  const [audience, setAudience] = useState<Audience>('seeker');
  const isRecruiter = audience === 'recruiter';

  return (
    <header className="bg-white">
      <div className="max-w-site mx-auto px-4 pt-10 pb-20 text-center">
        {/* Audience switch */}
        <p className="text-sm font-medium text-[#52525a] mb-3">I&apos;m here to…</p>
        <div
          role="tablist"
          aria-label="Choose what you're here to do"
          className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 p-1.5 text-base font-semibold shadow-sm ring-1 ring-gray-200"
        >
          <button
            role="tab"
            aria-selected={!isRecruiter}
            onClick={() => setAudience('seeker')}
            className={`flex items-center gap-2 rounded-full px-6 py-2.5 transition-all ${
              !isRecruiter ? 'bg-brand text-white shadow-md' : 'bg-brand-50 text-brand hover:bg-brand-100'
            }`}
          >
            <FileText className="w-5 h-5" /> I&apos;m job hunting
          </button>
          <button
            role="tab"
            aria-selected={isRecruiter}
            onClick={() => setAudience('recruiter')}
            className={`flex items-center gap-2 rounded-full px-6 py-2.5 transition-all ${
              isRecruiter ? 'bg-mint-600 text-white shadow-md' : 'bg-mint-50 text-mint-700 hover:bg-mint-100'
            }`}
          >
            <Users className="w-5 h-5" /> I&apos;m hiring
          </button>
        </div>

        {isRecruiter ? (
          <div className="mt-8">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase text-mint-700 bg-mint-50 rounded-full px-3 py-1">
              <Sparkles className="w-3.5 h-3.5" /> For recruiters &amp; hiring teams
            </span>
            <h1 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-bold text-[#1d1d20] leading-tight">
              Hire the right candidate, faster
            </h1>
            <p className="mt-4 text-[#52525a] text-lg max-w-2xl mx-auto">
              Drop in a job description and a stack of resumes — AI ranks the best-fit candidates
              with evidence-based reasons and honest gaps. Post jobs to our board and manage
              applications end to end.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/recruiter/shortlist"
                className="rounded-lg bg-mint-600 hover:bg-mint-700 text-white font-semibold px-6 py-3 text-base transition-colors"
              >
                Shortlist candidates
              </Link>
              <Link
                href="/login?return=/recruiter/shortlist&role=recruiter"
                className="rounded-lg border border-gray-300 text-[#1d1d20] font-semibold px-6 py-3 text-base hover:bg-gray-50 transition-colors"
              >
                Recruiter login
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-[#52525a]">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-mint-600" /> 14-day free trial</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-mint-600" /> Evidence-based ranking</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-mint-600" /> Cancel anytime</span>
            </div>
          </div>
        ) : (
          <div className="mt-8">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase text-brand bg-brand-50 rounded-full px-3 py-1">
              <Sparkles className="w-3.5 h-3.5" /> For job seekers
            </span>
            <h1 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-bold text-[#1d1d20] leading-tight">
              Land your next job, faster
            </h1>
            <p className="mt-4 text-[#52525a] text-lg max-w-2xl mx-auto">
              Build an ATS-ready resume in minutes, tailor it to any job with AI, generate matching
              cover letters, and apply with confidence.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/builder" className="btn-primary text-base">
                Build my resume
              </Link>
              <Link
                href="/resume-checker"
                className="rounded-lg border border-gray-300 text-[#1d1d20] font-semibold px-6 py-3 text-base hover:bg-gray-50 transition-colors"
              >
                Check my resume free
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-[#52525a]">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-brand" /> 14-day free trial</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-brand" /> No credit card to start</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-brand" /> Cancel anytime</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
