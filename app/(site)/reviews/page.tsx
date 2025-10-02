import PageShell from '@/components/PageShell';

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
