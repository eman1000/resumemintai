import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import { getCoverLettersByCategory, COVER_LETTER_EXAMPLES } from '@/lib/coverLetterExamples';
import { breadcrumbLd, jsonLdScript } from '@/lib/seo-ld';

export const metadata: Metadata = {
  title: 'Cover Letter Examples by Job Title — Samples & Writing Guides',
  description:
    'Free cover letter examples for popular job titles. Each guide includes a full sample letter, a why-it-works breakdown, and the mistakes to avoid.',
  alternates: { canonical: '/cover-letter-examples' },
  openGraph: {
    url: '/cover-letter-examples',
    title: 'Cover Letter Examples by Job Title | ResumeMint',
    description:
      'Full sample cover letters and writing guides for popular job titles — free.',
    images: [
      {
        url: '/api/og?eyebrow=COVER+LETTER+EXAMPLES&title=Cover+Letter+Examples+by+Job+Title',
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function Page() {
  const grouped = getCoverLettersByCategory();
  const breadcrumb = breadcrumbLd([
    { name: 'Home', path: '/' },
    { name: 'Cover Letter Examples', path: '/cover-letter-examples' },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumb)} />
      <SiteNav />

      <header className="bg-white">
        <div className="max-w-site mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-[#1d1d20]">
            Cover Letter Examples by Job Title
          </h1>
          <p className="mt-4 text-[#52525a] text-lg max-w-2xl mx-auto">
            {COVER_LETTER_EXAMPLES.length} free cover letter examples — each with a full sample
            letter, a breakdown of why it works, and the mistakes to avoid.
          </p>
        </div>
      </header>

      <section className="bg-[#f8fbfc]">
        <div className="max-w-site mx-auto px-4 py-14 space-y-12">
          {grouped.map(({ category, examples }) => (
            <div key={category}>
              <h2 className="text-xl font-bold text-[#1d1d20] mb-5">{category}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {examples.map((ex) => (
                  <Link
                    key={ex.slug}
                    href={`/cover-letter-examples/${ex.slug}`}
                    className="card group hover:shadow-lg transition-shadow"
                  >
                    <h3 className="font-semibold text-[#1d1d20] group-hover:text-brand transition-colors">
                      {ex.title} Cover Letter Example
                    </h3>
                    <p className="mt-1 text-sm text-[#52525a] line-clamp-2">{ex.intro}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm text-brand">
                      View example <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-brand-50">
        <div className="max-w-site mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl font-bold text-[#1d1d20]">Match it to the job, not a template</h2>
          <p className="mt-3 text-[#52525a] max-w-2xl mx-auto">
            A strong cover letter speaks to one specific role. ResumeMint drafts yours from the job
            description and your resume — in a design that complements it.
          </p>
          <Link href="/builder" className="btn-primary mt-6 inline-flex text-base">
            Write my cover letter free
          </Link>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
