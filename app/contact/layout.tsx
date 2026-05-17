import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with ResumeMint — questions about the product, billing, or your account. We typically reply within one business day.',
  alternates: { canonical: '/contact' },
  openGraph: {
    url: '/contact',
    title: 'Contact ResumeMint',
    description: 'Questions about the product, billing, or your account.',
    images: [{ url: '/api/og?eyebrow=CONTACT&title=Get+in+touch', width: 1200, height: 630 }],
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
