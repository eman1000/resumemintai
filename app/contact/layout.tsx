import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact: Quick Support & Inquiries',
  description:
    'Reach out to ResumeMint for product inquiries, billing issues, or account support. Expect a response within one business day.',
  alternates: { canonical: '/contact' },
  openGraph: {
    url: '/contact',
    title: 'Contact ResumeMint | Quick Support & Inquiries',
    description: 'Product, billing, and account support — typically a one-business-day reply.',
    images: [{ url: '/api/og?eyebrow=CONTACT&title=Get+in+touch', width: 1200, height: 630 }],
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
