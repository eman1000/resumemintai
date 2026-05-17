// app/render/resume/[id]/print/page.tsx
//
// Print-only render of a single resume. Reachable via a short-lived signed
// token (?t=...) so the Greenhouse submit route can have Puppeteer fetch it
// without a Firebase session. Not meant for humans.

import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { verifyPrintToken } from '@/lib/printToken';
import PrintClient from './PrintClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Strip all SEO surface; this page should never show in search.
export const metadata = {
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { t?: string };
}) {
  const token = searchParams.t || '';
  const verified = verifyPrintToken(token);
  if (!verified || verified.resumeId !== params.id) {
    notFound();
  }

  const resume = await prisma.resume.findUnique({
    where: { id: params.id },
    select: { id: true, renderer: true, data: true },
  });
  if (!resume) notFound();

  return (
    <PrintClient
      renderer={resume.renderer || 'professional'}
      data={(resume.data ?? {}) as any}
    />
  );
}
