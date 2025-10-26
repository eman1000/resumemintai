// app/api/resumes/route.ts
import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/app/api/server/auth/getUserFromRequest';
import { run } from '@/app/api/server/db';
import pool from '../server/db/pool';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_RENDERERS = new Set(['circular','professional','elegant','classic']);

async function getDbUserIdByFirebaseUid(firebaseUid: string) {
  const { rows } = await run(pool, (c) =>
    c.query<{ id: string }>(
      `select id from public.users where firebase_uid = $1 limit 1`,
      [firebaseUid],
    )
  );
  return rows[0]?.id ?? null;
}

export async function GET() {
  try {
    const user = await getUserFromRequest();

    const { rows } = await run(pool, (c) =>
      c.query(
        `
        SELECT r.id, r.title, r.renderer, r.updated_at AS "updatedAt", r.thumbnail_url AS "thumbnailUrl"
        FROM public.resumes r
        JOIN public.users u ON u.id = r.user_id
        WHERE u.firebase_uid = $1
        ORDER BY r.updated_at DESC NULLS LAST, r.created_at DESC
        `,
        [user.uid],
      ),
    );

    const items = rows.map((r: any) => ({
      id: r.id,
      title: r.title ?? 'Untitled CV',
      renderer: r.renderer ?? 'professional',
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : null,
      thumbnailUrl: r.thumbnailUrl || null,
    }));

    return NextResponse.json(items, { status: 200 });
  } catch (e: any) {
    if (e?.name === 'UNAUTHORIZED') {
      return NextResponse.json({ error: e.message || 'unauthorized' }, { status: 401 });
    }
    console.error('[GET /api/resumes]', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

type CreatePayload = { title?: string; renderer?: string; data?: unknown };

export async function POST(req: Request) {
  try {
    const fb = await getUserFromRequest();
    const userId = await getDbUserIdByFirebaseUid(fb.uid);
    if (!userId) return NextResponse.json({ error: 'no_user' }, { status: 403 });

    const body = (await req.json()) as CreatePayload;
    const title = (body.title ?? 'Untitled CV').toString().slice(0, 200);
    const renderer = (body.renderer ?? 'professional').toString();
    const data = body.data ?? { id: 'local', sections: [] };

    if (!ALLOWED_RENDERERS.has(renderer)) {
      return NextResponse.json({ error: 'invalid_renderer' }, { status: 400 });
    }

    const { rows } = await run(pool, (c) =>
      c.query<{ id: string }>(
        `
        insert into public.resumes (user_id, title, renderer, data, created_at, updated_at, archived)
        values ($1, $2, $3, $4::jsonb, now(), now(), false)
        returning id
        `,
        [userId, title, renderer, JSON.stringify(data)],
      ),
    );

    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (e: any) {
    if (e?.name === 'UNAUTHORIZED') {
      return NextResponse.json({ error: e.message || 'unauthorized' }, { status: 401 });
    }
    console.error('[POST /api/resumes]', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
