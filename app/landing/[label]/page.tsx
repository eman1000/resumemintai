// app/landing/[label]/page.tsx
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { LANDING_VARIANTS, type LandingVariant } from './landingData';
import ClientLanding from './ClientLanding'; // 👈 client component below

type Props = { params: { label: string } };

export function generateMetadata({ params }: Props): Metadata {
  const cfg = LANDING_VARIANTS[params.label] ?? LANDING_VARIANTS.vtdft;
  return {
    title: cfg.seo.title,
    description: cfg.seo.description,
    openGraph: {
      title: cfg.seo.title,
      description: cfg.seo.description,
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

  // pass only serializable props
  return <ClientLanding cfg={cfg} label={decodeURIComponent(params.label || 'vtdft')} />;
}
