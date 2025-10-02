import PageShell from '@/components/PageShell';

export default function Terms() {
  return (
    <PageShell title="Terms & Conditions">
      <div className="prose prose-invert max-w-none">
        <h2>Service Overview</h2>
        <p>This is an AI-powered tool that tailors your resume to a job description. Features and content may change without prior notice.</p>
        <h2>Acceptable Use</h2>
        <p>No illegal or harmful content. Do not upload information you are not authorized to share.</p>
        <h2>Disclaimer</h2>
        <p>We do not guarantee employment outcomes. Use at your own discretion.</p>
      </div>
    </PageShell>
  );
}
