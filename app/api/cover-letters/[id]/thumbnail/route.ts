// app/api/cover-letters/[id]/thumbnail/route.ts
//
// Mirror of /api/resumes/[id]/thumbnail. The cover-letter editor uses
// html-to-image to rasterize its HTML preview into a PNG blob; this route
// uploads that to Firebase Storage and stores the public URL on the row.

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
    if (buf.length === 0) {
      return NextResponse.json({ error: 'empty_body' }, { status: 400 });
    }

    // Ownership check
    const owned = await prisma.coverLetter.findFirst({
      where: { id: params.id, user: { firebaseUid: fb.uid } },
      select: { id: true },
    });
    if (!owned) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const objectPath = `cover-letter-thumbnails/${params.id}.png`;
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

    await prisma.coverLetter.update({
      where: { id: params.id },
      data: { thumbnailUrl: publicUrl },
    });

    return NextResponse.json({ url: publicUrl });
  } catch (e: any) {
    console.error('[PUT /api/cover-letters/:id/thumbnail]', e);
    const status = e?.name === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json(
      { error: 'upload_failed', detail: e?.message || 'unexpected_error' },
      { status },
    );
  }
}
