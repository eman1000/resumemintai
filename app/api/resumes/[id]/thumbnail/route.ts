// app/api/resumes/[id]/thumbnail/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/app/api/server/auth/getUserFromRequest';
import { adminBucket } from '@/lib/firebaseAdmin';
import prisma from '@/lib/prisma';
import { renderResumeThumbnailPng } from '@/lib/resumeThemes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function storeThumbnail(id: string, buf: Buffer): Promise<string> {
  const objectPath = `thumbnails/${id}.png`;
  const file = adminBucket.file(objectPath);
  await file.save(buf, {
    contentType: 'image/png',
    resumable: false,
    public: true,
    // Bust the immutable cache per save with a version query on the URL.
    metadata: { cacheControl: 'public, max-age=31536000, immutable' },
  });
  const publicUrl = `https://storage.googleapis.com/${adminBucket.name}/${objectPath}`;
  await prisma.resume.update({ where: { id }, data: { thumbnailUrl: publicUrl } });
  return publicUrl;
}

// Server-side thumbnail: render the resume's first page with the SAME theme
// pipeline as the PDF/preview and store it. Used now that the preview is an
// HTML iframe (the client can't screenshot it).
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const fb = await getUserFromRequest();
    const resume = await prisma.resume.findFirst({
      where: { id: params.id, user: { firebaseUid: fb.uid } },
      select: { id: true, data: true, renderer: true },
    });
    if (!resume) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const buf = await renderResumeThumbnailPng(resume.data as any, resume.renderer);
    const url = await storeThumbnail(params.id, buf);
    return NextResponse.json({ url });
  } catch (e: any) {
    console.error('[POST /api/resumes/:id/thumbnail]', e);
    const status = e?.name === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: 'thumbnail_failed', detail: e?.message }, { status });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const fb = await getUserFromRequest();

    const arrayBuf = await req.arrayBuffer();
    const buf = Buffer.from(arrayBuf);

    // Ensure the resume belongs to the caller
    const owned = await prisma.resume.findFirst({
      where: { id: params.id, user: { firebaseUid: fb.uid } },
      select: { id: true },
    });
    if (!owned) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const objectPath = `thumbnails/${params.id}.png`;
    const file = adminBucket.file(objectPath);

    await file.save(buf, {
      contentType: 'image/png',
      resumable: false,
      public: true,
      metadata: {
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });

    const publicUrl = `https://storage.googleapis.com/${adminBucket.name}/${objectPath}`;

    await prisma.resume.update({
      where: { id: params.id },
      data: { thumbnailUrl: publicUrl },
    });

    return NextResponse.json({ url: publicUrl });
  } catch (e: any) {
    console.error('[PUT /api/resumes/:id/thumbnail]', e);
    const status = e?.name === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: 'upload_failed', detail: e?.message }, { status });
  }
}
