// app/landing/[label]/page.tsx
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { LANDING_VARIANTS, type LandingVariant } from './landingData';
import ClientLanding from './ClientLanding'; // 👈 client component below
import { faqPageLd, breadcrumbLd, jsonLdScript } from '@/lib/seo-ld';

type Props = { params: { label: string } };

export function generateMetadata({ params }: Props): Metadata {
  const cfg = LANDING_VARIANTS[params.label] ?? LANDING_VARIANTS.vtdft;
  const canonical = `/landing/${params.label}`;
  return {
    title: cfg.seo.title,
    description: cfg.seo.description,
    alternates: { canonical },
    openGraph: {
      title: cfg.seo.title,
      description: cfg.seo.description,
      url: canonical,
      images: cfg.seo.ogImage ? [{ url: cfg.seo.ogImage }] : undefined,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: cfg.seo.title,
      description: cfg.seo.description,
      images: cfg.seo.ogImage ? [cfg.seo.ogImage] : undefined,
    },
  };
}


export default function LandingPage({ params }: Props) {
  const cfg: LandingVariant | undefined =
    LANDING_VARIANTS[params.label] ??
    (params.label === 'vtdft' ? LANDING_VARIANTS.vtdft : undefined);

  if (!cfg) return notFound();

  const label = decodeURIComponent(params.label || 'vtdft');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(faqPageLd(cfg.faq))} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(breadcrumbLd([
          { name: 'Home', path: '/' },
          { name: 'Landing', path: '/landing' },
          { name: cfg.seo.title, path: `/landing/${label}` },
        ]))}
      />
      <ClientLanding cfg={cfg} label={label} />
    </>
  );
}
