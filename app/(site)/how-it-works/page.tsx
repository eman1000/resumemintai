import PageShell from '@/components/PageShell';

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
