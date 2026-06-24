import type { Metadata } from 'next';
import SocialProof from '@/components/SocialProof';

// (site) route-group layout. The root layout (app/layout.tsx) already
// renders <html> + <body>, so this layout is a plain wrapper. Per-page
// metadata files cascade through this.
export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SocialProof variant="candidate" />
    </>
  );
}
