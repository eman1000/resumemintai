import type { Metadata } from 'next';
import PageShell from '@/components/PageShell';

export const metadata: Metadata = {
  title: 'Reviews',
  description:
    'What job-seekers say about ResumeMint — the AI resume builder that beats ATS and tailors every application in seconds.',
  alternates: { canonical: '/reviews' },
  openGraph: {
    url: '/reviews',
    title: 'ResumeMint reviews',
    description: 'What job-seekers say about ResumeMint.',
    images: [{ url: '/api/og?eyebrow=REVIEWS&title=What+job-seekers+say+about+us', width: 1200, height: 630 }],
  },
};

export default function Page() {
  return (
    <PageShell title="Reviews" subtitle="What users say.">
      <div className="prose prose-invert max-w-none">

<div className="space-y-3">
  <p>“Got interviews within a week—bullets finally show impact.” — S.</p>
  <p>“ATS score + keywords helped me pass initial screens.” — T.</p>
  <p>“Cover letters are short, specific, and painless.” — R.</p>
</div>

      </div>
    </PageShell>
  );
}
