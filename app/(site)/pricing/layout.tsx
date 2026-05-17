import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Affordable Pricing: AI Resumes & More',
  description:
    "Discover ResumeMint's simple pricing: unlimited AI resumes, cover letters, and job matching. Start with a free trial. Cancel anytime.",
  alternates: { canonical: '/pricing' },
  openGraph: {
    url: '/pricing',
    title: 'Affordable ResumeMint Pricing: AI Resumes & More',
    description: 'Transparent pricing with full access to AI tools, templates, and more.',
    images: [{ url: '/api/og?eyebrow=PRICING&title=Simple+pricing.+Cancel+anytime.', width: 1200, height: 630 }],
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
