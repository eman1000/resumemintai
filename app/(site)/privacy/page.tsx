import type { Metadata } from 'next';
import PageShell from '@/components/PageShell';
import '../../policies.scss';
const LAST_UPDATED = '05 Oct 2025';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How ResumeMint (Plenqor LLC) collects, uses, and protects your data — account info, payments, content, and analytics.',
  alternates: { canonical: '/privacy' },
  robots: { index: true, follow: true },
  openGraph: {
    url: '/privacy',
    title: 'ResumeMint Privacy Policy',
    description: 'How ResumeMint collects, uses, and protects your data.',
    images: [{ url: '/api/og?eyebrow=PRIVACY&title=Privacy+Policy', width: 1200, height: 630 }],
  },
};

export default function Privacy() {
  return (
    <PageShell title="Privacy Policy">
      <div className="policy">
        <p className="text-sm opacity-70">Last updated: {LAST_UPDATED}</p>

        <h2>Overview</h2>
        <p>
          ResumeMint is operated by <strong>Plenqor LLC</strong> (Wyoming, USA). Contact:
          <a href="mailto:support@plenqor.com"> support@plenqor.com</a>. Address: 1309 Coffeen Avenue STE 1200, Sheridan, Wyoming 82801, USA.
        </p>

        <h2>Data We Collect</h2>
        <ul>
          <li><strong>Account data:</strong> email, password/Auth ID, session identifiers.</li>
          <li><strong>Payment data:</strong> processed by Stripe; we receive status, last 4, token IDs, outcomes. We do not store full card numbers.</li>
          <li><strong>Usage data:</strong> page views, clicks, device/browser info, IP (security/anti-fraud), cookies.</li>
          <li><strong>Content:</strong> resume text, job descriptions, profile details, avatar, generated outputs.</li>
          <li><strong>Support:</strong> emails and messages you send us.</li>
        </ul>

        <h2>How We Use Data</h2>
        <ul>
          <li><strong>Provide the Service</strong> (contract): auth, payments, saving content, generating results.</li>
          <li><strong>Improve & secure</strong> (legitimate interests): analytics, debugging, preventing abuse/fraud.</li>
          <li><strong>Communicate</strong> (contract/legitimate interests): transactional emails, notices.</li>
          <li><strong>Marketing</strong> (consent where required): analytics/ads via GTM, GA, Google Ads.</li>
        </ul>

        <h2>Cookies & Tracking</h2>
        <p>
          We use essential cookies for login/session; analytics via Google Tag Manager/Analytics; and advertising tags
          (e.g., Google Ads) where consented/required. You can manage preferences via your browser and any cookie banner.
        </p>

        <h2>Processors / Third Parties</h2>
        <ul>
          <li>Stripe (payments & recurring billing)</li>
          <li>Firebase (auth/hosting/database if enabled)</li>
          <li>Google Tag Manager / Google Analytics / Google Ads</li>
          <li>Hosting/CDN & error logging (e.g., Vercel, monitoring tools)</li>
        </ul>
        <p>We require processors to protect data and process it only as instructed.</p>

        <h2>International Transfers</h2>
        <p>
          Data may be processed in the United States and other countries. Where required, we use appropriate safeguards
          (e.g., SCCs).
        </p>

        <h2>Retention</h2>
        <p>
          We retain data as long as needed for the Service and legal/financial obligations. You can request deletion; some
          records (e.g., invoices/logs) may be retained as required.
        </p>

        <h2>Your Rights</h2>
        <p>
          Depending on your location, you may have rights to access, correct, delete, restrict, object, or port your data.
          Email <a href="mailto:info@plenqor.com">info@plenqor.com</a> from your account email to exercise rights.
        </p>

        <h2>Children</h2>
        <p>The Service is not directed to children under 16 (and is 18+ to subscribe).</p>

        <h2>Security</h2>
        <p>
          We use technical and organizational measures (encryption in transit, access controls, monitoring). No system is
          100% secure—keep your credentials safe.
        </p>

        <h2>Changes</h2>
        <p>We may update this Policy; we’ll post changes here and update the date above.</p>

        <h2>Contact</h2>
        <p>
          Plenqor LLC (dba “ResumeMint”) • <a href="mailto:info@plenqor.com">info@plenqor.com</a> • 1309 Coffeen Avenue STE 1200, Sheridan, Wyoming 82801, USA.
        </p>
      </div>
    </PageShell>
  );
}
