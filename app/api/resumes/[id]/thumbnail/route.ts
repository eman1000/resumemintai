// app/api/resumes/[id]/thumbnail/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/app/api/server/auth/getUserFromRequest';
import { adminBucket } from '@/lib/firebaseAdmin';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
