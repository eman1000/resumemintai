import type { Metadata } from 'next';
import PageShell from '@/components/PageShell';
import '../../policies.scss';

const LAST_UPDATED = '05 Oct 2025';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The terms that govern your use of ResumeMint — subscriptions, acceptable use, content ownership, and Plenqor LLC company details.',
  alternates: { canonical: '/terms' },
  robots: { index: true, follow: true },
  openGraph: {
    url: '/terms',
    title: 'ResumeMint Terms of Service',
    description: 'The terms that govern your use of ResumeMint.',
    images: [{ url: '/api/og?eyebrow=TERMS&title=Terms+of+Service', width: 1200, height: 630 }],
  },
};

export default function Terms() {
  return (
    <PageShell title="Terms of Service">
      <div className="policy">
        <p className="text-sm opacity-70">Last updated: {LAST_UPDATED}</p>

        <h2>Who We Are</h2>
        <p>
          ResumeMint is operated by <strong>Plenqor LLC</strong> (dba “ResumeMint”), registered in Wyoming, USA
          (“we”, “us”, “our”). Contact: <a href="mailto:support@plenqor.com">support@plenqor.com</a>. Address:
          1309 Coffeen Avenue STE 1200, Sheridan, Wyoming 82801, USA.
        </p>

        <h2>Service</h2>
        <p>
          ResumeMint provides AI-assisted resume and career tools on a subscription basis. You must be 18+ to use the
          Service. You are responsible for activity on your account and for keeping credentials secure.
        </p>

        <h2>Pricing, Trial & Billing</h2>
        <ul>
          <li><strong>Trial:</strong> €0.00 for 1 day.</li>
          <li><strong>After trial:</strong> €19.99 every 28 days (auto-renew) until canceled.</li>
          <li>Prices shown in EUR; your issuer may apply FX fees. Taxes may apply where required.</li>
          <li>Charges appear as <strong>RESUMEMINT</strong> (Plenqor LLC).</li>
        </ul>
        <p>
          Payments are processed by Stripe. We do not store full card numbers; Stripe may store tokens for recurring
          billing.
        </p>

        <h2>Cancellations</h2>
        <p>
          Cancel anytime from your Account page or by emailing <a href="mailto:info@plenqor.com">info@plenqor.com</a>.
          Unless stated otherwise, cancellation takes effect at the end of the current 28-day cycle; you keep access
          until then. If you cancel during the trial, the recurring fee will not be charged.
        </p>

        <h2>Refunds</h2>
        <p>
          No refunds for partial billing periods once charged, except where required by law. We may refund duplicate
          charges or confirmed unauthorized payments. See our <a href="/refund">Refund Policy</a> for details.
        </p>

        <h2>Acceptable Use</h2>
        <ul>
          <li>No unlawful, infringing, or harmful content.</li>
          <li>No scraping, reverse engineering, or interference with the Service.</li>
          <li>No resale, redistribution, or training competing models/services without permission.</li>
        </ul>

        <h2>Intellectual Property</h2>
        <p>
          We retain all rights to the Service. We grant you a limited, non-exclusive, non-transferable license to use it
          for personal job-seeking purposes. Content you export is yours to use; we may store it to operate the Service.
        </p>

        <h2>Disclaimers</h2>
        <p>
          The Service is provided “as is”. We do not guarantee job outcomes, interviews, or ATS results.
        </p>

        <h2>Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, we are not liable for indirect, incidental, special, or consequential
          damages. Our aggregate liability is limited to amounts you paid in the preceding 3 months.
        </p>

        <h2>Privacy</h2>
        <p>
          See our <a href="/privacy">Privacy Policy</a> for how we process personal data.
        </p>

        <h2>Changes</h2>
        <p>
          We may update the Service and these Terms. If changes are material, we’ll provide reasonable notice (e.g.,
          in-app or email). Continued use after the effective date means you accept the changes.
        </p>

        <h2>Governing Law</h2>
        <p>
          These Terms are governed by the laws of Wyoming, USA. Venue and jurisdiction lie with the state and federal
          courts in Wyoming. Class actions are waived to the extent permitted by law.
        </p>
      </div>
    </PageShell>
  );
}
