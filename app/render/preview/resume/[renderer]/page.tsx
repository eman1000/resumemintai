// app/render/preview/resume/[renderer]/page.tsx
//
// Public, no-auth render of a single resume template with the bundled demo
// data. Used to capture marketing thumbnails (scripts/capture-template-
// previews.mjs). Not exposed in nav — robots:noindex via metadata.

import { notFound } from 'next/navigation';
import PreviewClient from './PreviewClient';
import { DEMO_RESUME_DATA, RESUME_RENDERERS } from '@/lib/demoResume';

export const dynamic = 'force-static';

export const metadata = {
  robots: { index: false, follow: false },
};

export default function Page({ params }: { params: { renderer: string } }) {
  if (!RESUME_RENDERERS.includes(params.renderer as any)) notFound();
  return <PreviewClient renderer={params.renderer} data={DEMO_RESUME_DATA} />;
}
