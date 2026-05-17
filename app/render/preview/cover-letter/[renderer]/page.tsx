// app/render/preview/cover-letter/[renderer]/page.tsx
//
// Public, no-auth render of a cover letter template with bundled demo data.

import { notFound } from 'next/navigation';
import PreviewClient from './PreviewClient';
import { DEMO_COVER_LETTER_DATA, COVER_LETTER_RENDERERS_LIST } from '@/lib/demoCoverLetter';

export const dynamic = 'force-static';

export const metadata = {
  robots: { index: false, follow: false },
};

export default function Page({ params }: { params: { renderer: string } }) {
  if (!COVER_LETTER_RENDERERS_LIST.includes(params.renderer as any)) notFound();
  return <PreviewClient renderer={params.renderer} data={DEMO_COVER_LETTER_DATA} />;
}
