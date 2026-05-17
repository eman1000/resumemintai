import type { Metadata } from 'next';
import PageShell from '@/components/PageShell';

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'Three steps to a tailored resume: pick a template, paste a job description, let ResumeMint AI rewrite your bullets and generate a matching cover letter.',
  alternates: { canonical: '/how-it-works' },
  openGraph: {
    url: '/how-it-works',
    title: 'How ResumeMint works',
    description: 'Three steps to a tailored, ATS-friendly resume.',
    images: [{ url: '/api/og?eyebrow=HOW+IT+WORKS&title=Tailor+your+resume+in+three+steps', width: 1200, height: 630 }],
  },
};

export default function Page() {
  return (
    <PageShell title="How it Works" subtitle="Three simple steps.">
      <div className="prose prose-invert max-w-none">

<ol className="list-decimal pl-6 space-y-2">
  <li>Paste your resume (or work history)</li>
  <li>Paste the target job description</li>
  <li>Review, switch template, and export to PDF</li>
</ol>

      </div>
    </PageShell>
  );
}
