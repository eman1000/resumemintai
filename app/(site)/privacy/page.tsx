import PageShell from '@/components/PageShell';

export default function Privacy() {
  return (
    <PageShell title="Privacy Policy">
      <div className="prose prose-invert max-w-none">
        <h2>Data Access, Edit, and Deletion</h2>
        <p>Users have the right to access, edit, or delete their personal data. To exercise any of these rights, email us from the address associated with your account.</p>
        <h2>What We Process</h2>
        <p>Resume text and job descriptions you provide are sent to our AI provider for the sole purpose of generating outputs you request.</p>
        <h2>Retention</h2>
        <p>We retain data as needed to provide the service or as required by law. You can request deletion at any time.</p>
        <h2>Contact</h2>
        <p>help@resumemintai.com/</p>
      </div>
    </PageShell>
  );
}
