import type { Metadata } from 'next';
import PageShell from '@/components/PageShell';
import '../../policies.scss';

const LAST_UPDATED = '05 Oct 2025';

export const metadata: Metadata = {
  title: 'Refund Policy & Subscription Details',
  description:
    "Learn about ResumeMint's refund policy: trials, renewals, cancellations, and how to request a refund effectively.",
  alternates: { canonical: '/refund' },
  robots: { index: true, follow: true },
  openGraph: {
    url: '/refund',
    title: 'ResumeMint Refund Policy & Subscription Details',
    description: 'Trials, renewals, cancellations, and how to request a refund.',
    images: [{ url: '/api/og?eyebrow=REFUND&title=Refund+Policy', width: 1200, height: 630 }],
  },
};

export default function Refund() {
  return (
    <PageShell title="Refund Policy">
      <div className="policy">
        <p className="text-sm opacity-70">Last updated: {LAST_UPDATED}</p>

        <h2>What We Sell</h2>
        <p>Digital subscription to ResumeMint’s AI resume tools.</p>

        <h2>Trials, Charges & Renewals</h2>
        <ul>
          <li><strong>Trial:</strong> $0.00 for 1 day.</li>
          <li><strong>After trial:</strong> $19.99 every 28 days, auto-renewing.</li>
          <li>Cancel during the trial to avoid the recurring fee.</li>
        </ul>

        <h2>Refunds</h2>
        <p>
          We do not offer refunds for partial billing periods once charged, except where required by law. We may refund:
        </p>
        <ul>
          <li>Duplicate charges</li>
          <li>Confirmed unauthorized payments</li>
          <li>
            Verified, persistent technical issues preventing reasonable use after you contacted support and cooperated in
            troubleshooting
          </li>
        </ul>

        <h2>How to Request</h2>
        <p>
          Email <a href="mailto:support@plenqor.com">support@plenqor.com</a> from your purchase email with your subscription ID
          (or last 4 digits, charge date/amount). We normally respond in 3–7 business days.
        </p>

        <h2>Chargebacks</h2>
        <p>Please contact us first—most issues are resolved faster than a bank dispute.</p>

        <h2>Consumer Rights</h2>
        <p>
          This policy does not limit any statutory rights you may have (e.g., EU/UK consumer laws). Note: 14-day
          withdrawal for digital services may not apply once delivery begins with your consent (trial access is service
          delivery).
        </p>
      </div>
    </PageShell>
  );
}
