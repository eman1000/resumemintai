import PageShell from '@/components/PageShell';
import '../../policies.scss';
const LAST_UPDATED = '05 Oct 2025';

export default function Unsubscribe() {
  return (
    <PageShell title="Unsubscribe / Cancel">
      <div className="policy">
        <p className="text-sm opacity-70">Last updated: {LAST_UPDATED}</p>

        <h2>How to Cancel</h2>
        <ol>
          <li>Open your <strong>Account</strong> page in the app.</li>
          <li>Choose <strong>“Cancel at period end”</strong> or <strong>“Cancel immediately”</strong> (if available).</li>
          <li>Follow the on-screen confirmation.</li>
        </ol>
        <p>
          Can’t access your account? Email <a href="mailto:support@plenqor.com">support@plenqor.com</a> from your purchase email
          and request cancellation. We’ll confirm by reply.
        </p>

        <h2>What Happens Next</h2>
        <ul>
          <li><strong>Cancel at period end:</strong> keep access until the end of the current 28-day cycle, then it stops.</li>
          <li><strong>Immediate cancel (if available):</strong> access stops immediately.</li>
        </ul>

        <h2>Prevent Future Charges</h2>
        <p>Cancel before the next renewal date. If you cancel during the trial, the recurring fee will not be charged.</p>
      </div>
    </PageShell>
  );
}
