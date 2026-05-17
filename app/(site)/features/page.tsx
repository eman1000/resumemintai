import type { Metadata } from 'next';
import PageShell from '@/components/PageShell';

export const metadata: Metadata = {
  title: 'Features',
  description:
    'See how ResumeMint helps you build an ATS-friendly resume: AI-tailored bullets, 12 templates, cover letters, match scoring, one-click apply on supported boards.',
  alternates: { canonical: '/features' },
  openGraph: {
    url: '/features',
    title: 'ResumeMint features',
    description: 'AI tailoring, 12 templates, cover letters, match scoring, one-click apply.',
    images: [{ url: '/api/og?eyebrow=FEATURES&title=Everything+ResumeMint+can+do', width: 1200, height: 630 }],
  },
};

export default function Page() {
  return (
    <PageShell title="Features" subtitle="A focused tool that does the essentials extremely well.">
      <div className="prose prose-invert max-w-none">

<ul className="list-disc pl-6 space-y-2">
  <li>ATS-optimized, quantified bullets</li>
  <li>Keyword suggestions & quick ATS score</li>
  <li>1-click cover letters</li>
  <li>Print-perfect PDF export</li>
</ul>

      </div>
    </PageShell>
  );
}
