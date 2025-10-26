// app/api/resumes/[id]/thumbnail/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/app/api/server/auth/getUserFromRequest';
import { run } from '@/app/api/server/db';
import { adminBucket } from '@/lib/firebaseAdmin';
import pool from '@/app/api/server/db/pool';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const fb = await getUserFromRequest();

    // read raw body as ArrayBuffer
    const arrayBuf = await req.arrayBuffer();
    const buf = Buffer.from(arrayBuf);

    // Ensure the resume belongs to the caller
    const { rows } = await run(pool, (c) =>
      c.query(
        `
        SELECT r.id
        FROM public.resumes r
        JOIN public.users u ON u.id = r.user_id
        WHERE r.id = $1 AND u.firebase_uid = $2
        LIMIT 1
        `,
        [params.id, fb.uid],
      ),
    );
    if (!rows.length) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // upload to storage
    const objectPath = `thumbnails/${params.id}.png`;
    const file = adminBucket.file(objectPath);

    await file.save(buf, {
      contentType: 'image/png',
      resumable: false,
      public: true, // if you want a public URL
      metadata: {
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });

    // Build public URL (since we set public: true)
    const publicUrl = `https://storage.googleapis.com/${adminBucket.name}/${objectPath}`;

    // Persist in DB for the resume
    await run(pool, (c) =>
      c.query(
        `UPDATE public.resumes SET thumbnail_url = $2, updated_at = NOW() WHERE id = $1`,
        [params.id, publicUrl],
      ),
    );

    return NextResponse.json({ url: publicUrl });
  } catch (e: any) {
    console.error('[PUT /api/resumes/:id/thumbnail]', e);
    const status = e?.name === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: 'upload_failed', detail: e?.message }, { status });
  }
}
