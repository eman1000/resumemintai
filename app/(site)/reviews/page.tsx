import type { Metadata } from 'next';
import PageShell from '@/components/PageShell';

export const metadata: Metadata = {
  title: 'AI Reviews: Success Stories & Testimonials',
  description:
    "Discover how ResumeMint's AI resume builder helps job-seekers beat ATS, tailor applications, and secure interviews effortlessly.",
  alternates: { canonical: '/reviews' },
  openGraph: {
    url: '/reviews',
    title: 'ResumeMint AI Reviews: Success Stories & Testimonials',
    description: 'Testimonials from job-seekers who used ResumeMint to beat ATS and secure interviews.',
    images: [{ url: '/api/og?eyebrow=REVIEWS&title=What+job-seekers+say+about+us', width: 1200, height: 630 }],
  },
};

export default function Page() {
  return (
    <PageShell title="Reviews" subtitle="Early days — and we'd love your feedback.">
      <div className="prose prose-invert max-w-none">
        <p>
          ResumeMint is newly launched, so we&apos;re not publishing testimonials we
          haven&apos;t earned yet. As job-seekers use the builder, the ATS checker, and
          the cover-letter tools, we&apos;ll share their real results here — with their
          permission.
        </p>
        <p>
          Used ResumeMint to land an interview or sharpen your resume? We&apos;d genuinely
          like to hear about it — email <a href="mailto:hello@resumemintai.com">hello@resumemintai.com</a> and
          you may be one of the first stories featured on this page.
        </p>
        <p>
          In the meantime, try the{' '}
          <a href="/resume-checker">free ATS resume checker</a> — no signup needed — or
          start a <a href="/builder">14-day free trial</a> of the builder.
        </p>
      </div>
    </PageShell>
  );
}
