import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, AlertTriangle, ArrowRight, FileText } from 'lucide-react';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import {
  getCoverLetterExample,
  getAllCoverLetterSlugs,
  getRelatedCoverLetters,
} from '@/lib/coverLetterExamples';
import { getResumeExample, exampleEmail } from '@/lib/resumeExamples';
import { breadcrumbLd, jsonLdScript } from '@/lib/seo-ld';

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return getAllCoverLetterSlugs().map((slug) => ({ slug }));
}

export const dynamicParams = false;

export function generateMetadata({ params }: { params: Params }): Metadata {
  const ex = getCoverLetterExample(params.slug);
  if (!ex) return {};
  const title = `${ex.title} Cover Letter Example & Writing Guide`;
  const description = `${ex.title} cover letter example with ${ex.metaAngle}. See what makes it work, then write your own in minutes.`;
  return {
    title,
    description,
    alternates: { canonical: `/cover-letter-examples/${ex.slug}` },
    openGraph: {
      url: `/cover-letter-examples/${ex.slug}`,
      title: `${title} | ResumeMint`,
      description,
      images: [
        {
          url: `/api/og?eyebrow=COVER+LETTER+EXAMPLE&title=${encodeURIComponent(ex.title)}+Cover+Letter`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default function Page({ params }: { params: Params }) {
  const ex = getCoverLetterExample(params.slug);
  if (!ex) notFound();

  const resume = getResumeExample(ex.slug);
  const candidateName = resume?.candidateName ?? 'Alex Morgan';
  const candidateLocation = resume?.candidateLocation ?? '';
  const candidatePhone = resume?.candidatePhone ?? '';
  const email = exampleEmail(candidateName);

  const related = getRelatedCoverLetters(ex.slug);
  const breadcrumb = breadcrumbLd([
    { name: 'Home', path: '/' },
    { name: 'Cover Letter Examples', path: '/cover-letter-examples' },
    { name: ex.title, path: `/cover-letter-examples/${ex.slug}` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumb)} />
      <SiteNav />

      {/* Hero */}
      <header className="bg-white">
        <div className="max-w-site mx-auto px-4 pt-10 pb-12">
          <nav className="text-sm text-[#a1a1aa] mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-brand">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/cover-letter-examples" className="hover:text-brand">Cover Letter Examples</Link>
            <span className="mx-2">/</span>
            <span className="text-[#52525a]">{ex.title}</span>
          </nav>
          <span className="inline-block text-[11px] font-semibold tracking-[0.18em] uppercase text-brand bg-brand-50 rounded-full px-3 py-1">
            {ex.category}
          </span>
          <h1 className="mt-4 text-3xl md:text-5xl font-bold text-[#1d1d20] leading-tight">
            {ex.title} Cover Letter Example
          </h1>
          <p className="mt-4 text-[#52525a] text-lg max-w-3xl">{ex.intro}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/builder" className="btn-primary text-base">
              Write my {ex.title.toLowerCase()} cover letter
            </Link>
            <Link
              href={`/resume-examples/${ex.slug}`}
              className="inline-flex items-center justify-center rounded-pill border border-gray-300 px-5 py-2.5 text-sm font-medium text-[#1d1d20] hover:border-brand hover:text-brand transition-colors"
            >
              See the matching resume example
            </Link>
          </div>
        </div>
      </header>

      {/* Sample cover letter */}
      <section className="bg-[#f8fbfc]">
        <div className="max-w-3xl mx-auto px-4 py-14">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1d1d20]">
            {ex.title} cover letter sample
          </h2>
          <p className="mt-2 text-sm text-[#52525a]">
            A complete example you can adapt — swap in your own details and the real company,
            role, and achievements. The candidate and employer below are illustrative only.
          </p>

          <article className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-md overflow-hidden">
            <div className="bg-brand h-2 w-full" />
            <div className="p-7 md:p-10 text-[15px] leading-relaxed text-[#1d1d20]">
              {/* Sender */}
              <div className="text-sm text-[#52525a]">
                <div className="font-semibold text-[#1d1d20]">{candidateName}</div>
                {candidateLocation && <div>{candidateLocation}</div>}
                {candidatePhone && <div>{candidatePhone}</div>}
                <div>{email}</div>
              </div>

              {/* Recipient */}
              <div className="mt-6 text-sm text-[#52525a]">
                <div>Hiring Manager</div>
                <div>{ex.targetCompany}</div>
              </div>

              {/* Body */}
              <p className="mt-6">{ex.greeting}</p>
              {ex.paragraphs.map((p, i) => (
                <p key={i} className="mt-4">{p}</p>
              ))}

              {/* Sign-off */}
              <p className="mt-6">{ex.signOff}</p>
              <p className="font-semibold text-[#1d1d20]">{candidateName}</p>
            </div>
          </article>

          <p className="mt-3 text-xs text-[#a1a1aa] text-center">
            Illustrative sample — {candidateName} and {ex.targetCompany} are not real. Use it as a
            structure: every claim in your own letter must be true to your experience.
          </p>
        </div>
      </section>

      {/* Why it works */}
      <section className="bg-white">
        <div className="max-w-3xl mx-auto px-4 py-14">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1d1d20]">
            Why this {ex.title.toLowerCase()} cover letter works
          </h2>
          <ul className="mt-6 space-y-4">
            {ex.keyPoints.map((k, i) => (
              <li key={i} className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" />
                <span className="text-[#52525a]">{k}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Common mistakes */}
      <section className="bg-[#f8fbfc]">
        <div className="max-w-3xl mx-auto px-4 py-14">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1d1d20]">
            Common {ex.title.toLowerCase()} cover letter mistakes
          </h2>
          <ul className="mt-6 space-y-4">
            {ex.mistakes.map((m, i) => (
              <li key={i} className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <span className="text-[#52525a]">{m}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Resume cross-link */}
      <section className="bg-white">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <Link
            href={`/resume-examples/${ex.slug}`}
            className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md hover:border-brand/30 transition-all"
          >
            <div className="w-11 h-11 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-brand" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-[#1d1d20]">
                Pair it with the {ex.title.toLowerCase()} resume example
              </div>
              <div className="text-sm text-[#52525a]">
                A complete sample resume with achievement bullets, skills, and ATS keywords.
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-brand flex-shrink-0" />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-50">
        <div className="max-w-site mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1d1d20]">
            Write your {ex.title.toLowerCase()} cover letter in minutes
          </h2>
          <p className="mt-3 text-[#52525a] max-w-2xl mx-auto">
            ResumeMint drafts a cover letter matched to the job description and your resume, in a
            template that complements it. Start free — no credit card needed.
          </p>
          <Link href="/builder" className="btn-primary mt-6 inline-flex text-base">
            Start my cover letter — it&apos;s free
          </Link>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="bg-white">
          <div className="max-w-site mx-auto px-4 py-14">
            <h2 className="text-2xl font-bold text-[#1d1d20] mb-6">More cover letter examples</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/cover-letter-examples/${r.slug}`}
                  className="card group hover:shadow-lg transition-shadow"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a1a1aa]">
                    {r.category}
                  </span>
                  <h3 className="mt-1 font-semibold text-[#1d1d20] group-hover:text-brand transition-colors">
                    {r.title}
                  </h3>
                  <span className="mt-2 inline-flex items-center gap-1 text-sm text-brand">
                    View example <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              ))}
            </div>
            <div className="mt-8">
              <Link href="/cover-letter-examples" className="text-brand font-medium hover:underline">
                Browse all cover letter examples →
              </Link>
            </div>
          </div>
        </section>
      )}

      <SiteFooter />
    </>
  );
}
