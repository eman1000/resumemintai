import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import { getExamplesByCategory, RESUME_EXAMPLES } from '@/lib/resumeExamples';
import { breadcrumbLd, jsonLdScript } from '@/lib/seo-ld';

export const metadata: Metadata = {
  title: 'Resume Examples by Job Title — Samples & Writing Guides',
  description:
    'Free resume examples for popular job titles. Each guide includes a sample summary, achievement bullets, key skills, and the ATS keywords recruiters look for.',
  alternates: { canonical: '/resume-examples' },
  openGraph: {
    url: '/resume-examples',
    title: 'Resume Examples by Job Title | ResumeMint',
    description:
      'Sample resumes, achievement bullets, and ATS keywords for popular job titles — free.',
    images: [
      {
        url: '/api/og?eyebrow=RESUME+EXAMPLES&title=Resume+Examples+by+Job+Title',
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function Page() {
  const grouped = getExamplesByCategory();
  const breadcrumb = breadcrumbLd([
    { name: 'Home', path: '/' },
    { name: 'Resume Examples', path: '/resume-examples' },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumb)} />
      <SiteNav />

      <header className="bg-white">
        <div className="max-w-site mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-[#1d1d20]">
            Resume Examples by Job Title
          </h1>
          <p className="mt-4 text-[#52525a] text-lg max-w-2xl mx-auto">
            {RESUME_EXAMPLES.length} free resume examples — each with a sample summary, achievement
            bullets, key skills, and the ATS keywords recruiters screen for.
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
                    href={`/resume-examples/${ex.slug}`}
                    className="card group hover:shadow-lg transition-shadow"
                  >
                    <h3 className="font-semibold text-[#1d1d20] group-hover:text-brand transition-colors">
                      {ex.title} Resume Example
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
          <h2 className="text-3xl font-bold text-[#1d1d20]">Don&apos;t just copy an example</h2>
          <p className="mt-3 text-[#52525a] max-w-2xl mx-auto">
            Examples are a starting point. ResumeMint tailors your resume to the exact job you are
            applying for — achievement-focused bullets, ATS-friendly formatting, in minutes.
          </p>
          <Link href="/builder" className="btn-primary mt-6 inline-flex text-base">
            Build my resume free
          </Link>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
