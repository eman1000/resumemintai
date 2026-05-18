import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import {
  getResumeExample,
  getAllResumeExampleSlugs,
  getRelatedExamples,
} from '@/lib/resumeExamples';
import { breadcrumbLd, jsonLdScript } from '@/lib/seo-ld';

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return getAllResumeExampleSlugs().map((slug) => ({ slug }));
}

export const dynamicParams = false;

export function generateMetadata({ params }: { params: Params }): Metadata {
  const ex = getResumeExample(params.slug);
  if (!ex) return {};
  const title = `${ex.title} Resume Example & Writing Guide`;
  const description = `${ex.title} resume example with ${ex.metaAngle}. See what recruiters and ATS software look for, then build your own in minutes.`;
  return {
    title,
    description,
    alternates: { canonical: `/resume-examples/${ex.slug}` },
    openGraph: {
      url: `/resume-examples/${ex.slug}`,
      title: `${title} | ResumeMint`,
      description,
      images: [
        {
          url: `/api/og?eyebrow=RESUME+EXAMPLE&title=${encodeURIComponent(ex.title)}+Resume+Example`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default function Page({ params }: { params: Params }) {
  const ex = getResumeExample(params.slug);
  if (!ex) notFound();

  const related = getRelatedExamples(ex.slug);
  const breadcrumb = breadcrumbLd([
    { name: 'Home', path: '/' },
    { name: 'Resume Examples', path: '/resume-examples' },
    { name: ex.title, path: `/resume-examples/${ex.slug}` },
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
            <Link href="/resume-examples" className="hover:text-brand">Resume Examples</Link>
            <span className="mx-2">/</span>
            <span className="text-[#52525a]">{ex.title}</span>
          </nav>
          <span className="inline-block text-[11px] font-semibold tracking-[0.18em] uppercase text-brand bg-brand-50 rounded-full px-3 py-1">
            {ex.category}
          </span>
          <h1 className="mt-4 text-3xl md:text-5xl font-bold text-[#1d1d20] leading-tight">
            {ex.title} Resume Example
          </h1>
          <p className="mt-4 text-[#52525a] text-lg max-w-3xl">{ex.intro}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/builder" className="btn-primary text-base">
              Build my {ex.title.toLowerCase()} resume
            </Link>
            <Link
              href="/resume-checker"
              className="inline-flex items-center justify-center rounded-pill border border-gray-300 px-5 py-2.5 text-sm font-medium text-[#1d1d20] hover:border-brand hover:text-brand transition-colors"
            >
              Score my current resume free
            </Link>
          </div>
        </div>
      </header>

      {/* Sample resume */}
      <section className="bg-[#f8fbfc]">
        <div className="max-w-3xl mx-auto px-4 py-14">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1d1d20]">
            {ex.title} resume sample
          </h2>
          <p className="mt-2 text-sm text-[#52525a]">
            A sample you can adapt — swap in your own details, metrics, and employers.
          </p>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-md overflow-hidden">
            <div className="bg-brand h-2 w-full" />
            <div className="p-7">
              <div className="text-xs font-semibold uppercase tracking-wider text-brand">
                Professional Summary
              </div>
              <p className="mt-2 text-[#1d1d20] leading-relaxed">{ex.summary}</p>

              <div className="mt-7 text-xs font-semibold uppercase tracking-wider text-brand">
                Experience
              </div>
              <p className="mt-2 font-semibold text-[#1d1d20]">{ex.sampleRole}</p>
              <ul className="mt-3 space-y-2">
                {ex.bullets.map((b, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-[#52525a]">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-brand flex-shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-7 text-xs font-semibold uppercase tracking-wider text-brand">
                Skills
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {ex.skills.map((s) => (
                  <span
                    key={s}
                    className="text-xs bg-gray-100 text-[#1d1d20] rounded-md px-2.5 py-1"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key skills */}
      <section className="bg-white">
        <div className="max-w-3xl mx-auto px-4 py-14">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1d1d20]">
            Key skills for a {ex.title.toLowerCase()} resume
          </h2>
          <p className="mt-2 text-[#52525a]">
            Include the skills below where they truthfully apply — and match the exact wording
            used in the job description you are targeting.
          </p>
          <div className="mt-6 grid sm:grid-cols-2 gap-x-8 gap-y-2.5">
            {ex.skills.map((s) => (
              <div key={s} className="flex items-center gap-2.5 text-sm text-[#1d1d20]">
                <CheckCircle2 className="w-4 h-4 text-brand flex-shrink-0" />
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ATS keywords */}
      <section className="bg-[#f8fbfc]">
        <div className="max-w-3xl mx-auto px-4 py-14">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1d1d20]">
            ATS keywords for {ex.title.toLowerCase()} resumes
          </h2>
          <p className="mt-2 text-[#52525a]">
            Applicant tracking systems rank resumes partly on keyword match. These terms commonly
            appear in {ex.title.toLowerCase()} job descriptions — weave in the ones that genuinely
            describe your experience.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {ex.atsKeywords.map((k) => (
              <span
                key={k}
                className="text-sm bg-white border border-brand/20 text-[#1d1d20] rounded-pill px-3 py-1.5"
              >
                {k}
              </span>
            ))}
          </div>
          <div className="mt-6">
            <Link href="/resume-checker" className="inline-flex items-center gap-1.5 text-brand font-medium hover:underline">
              Check which keywords your resume is missing
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Common mistakes */}
      <section className="bg-white">
        <div className="max-w-3xl mx-auto px-4 py-14">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1d1d20]">
            Common {ex.title.toLowerCase()} resume mistakes
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

      {/* CTA */}
      <section className="bg-brand-50">
        <div className="max-w-site mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1d1d20]">
            Build your {ex.title.toLowerCase()} resume in minutes
          </h2>
          <p className="mt-3 text-[#52525a] max-w-2xl mx-auto">
            ResumeMint tailors your resume to any job description, suggests achievement-focused
            bullets, and keeps the formatting ATS-friendly. Start free — no credit card needed.
          </p>
          <Link href="/builder" className="btn-primary mt-6 inline-flex text-base">
            Start my resume — it&apos;s free
          </Link>
        </div>
      </section>

      {/* Related examples */}
      {related.length > 0 && (
        <section className="bg-white">
          <div className="max-w-site mx-auto px-4 py-14">
            <h2 className="text-2xl font-bold text-[#1d1d20] mb-6">More resume examples</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/resume-examples/${r.slug}`}
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
              <Link href="/resume-examples" className="text-brand font-medium hover:underline">
                Browse all resume examples →
              </Link>
            </div>
          </div>
        </section>
      )}

      <SiteFooter />
    </>
  );
}
