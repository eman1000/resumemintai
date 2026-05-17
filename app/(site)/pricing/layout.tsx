import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Simple ResumeMint pricing — one plan with full access to AI tailoring, all 12 resume templates, cover letters, and job matching. Cancel anytime.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    url: '/pricing',
    title: 'ResumeMint pricing',
    description: 'One simple plan with full access to AI tailoring and every template.',
    images: [{ url: '/api/og?eyebrow=PRICING&title=Simple+pricing.+Cancel+anytime.', width: 1200, height: 630 }],
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
