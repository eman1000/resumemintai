// app/api/resumes/[id]/route.ts
import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/app/api/server/auth/getUserFromRequest';
import { run } from '@/app/api/server/db';
import pool from '../../server/db/pool';
import { BASE_LANG_LABELS, LanguageCode } from '@/lib/i18n';

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

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const fb = await getUserFromRequest();
    const userId = await getDbUserIdByFirebaseUid(fb.uid);
    if (!userId) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const { rows } = await run(pool, (c) =>
      c.query(
        `
        select r.id, r.title, r.renderer, r.data, r.updated_at as "updatedAt", r.language
        from public.resumes r
        where r.id = $1 and r.user_id = $2
        limit 1
        `,
        [params.id, userId],
      ),
    );

    if (!rows.length) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const r = rows[0];
    return NextResponse.json({
      id: r.id,
      title: r.title ?? 'Untitled CV',
      renderer: r.renderer ?? 'professional',
      data: r.data ?? null,
      language: r.language,
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : null,
    });
  } catch (e: any) {
    if (e?.name === 'UNAUTHORIZED') {
      return NextResponse.json({ error: e.message || 'unauthorized' }, { status: 401 });
    }
    console.error('[GET /api/resumes/:id]', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

// /api/resumes/[id]/route.ts (PATCH)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const fb = await getUserFromRequest();
    const userId = await getDbUserIdByFirebaseUid(fb.uid);
    if (!userId) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const title: string | undefined = body.title?.toString();
    const renderer: string | undefined = body.renderer?.toString();
    const data = body.data;
    const language: LanguageCode | undefined = body.language?.toString(); // 👈 NEW

    if (renderer && !ALLOWED_RENDERERS.has(renderer)) {
      return NextResponse.json({ error: 'invalid_renderer' }, { status: 400 });
    }

    // (optional) validate language against your i18n set
  const ALLOWED_LANGUAGES = new Set<LanguageCode>(
    Object.keys(BASE_LANG_LABELS) as LanguageCode[]
  );
    if (language && !ALLOWED_LANGUAGES.has(language)) {
      return NextResponse.json({ error: 'invalid_language' }, { status: 400 });
    }

    const sets: string[] = [];
    const vals: any[] = [];
    if (title !== undefined)    sets.push(`title = $${vals.push(title.slice(0, 200))}`);
    if (renderer !== undefined) sets.push(`renderer = $${vals.push(renderer)}`);
    if (data !== undefined)     sets.push(`data = $${vals.push(JSON.stringify(data))}::jsonb`);
    if (language !== undefined) sets.push(`language = $${vals.push(language)}`); // 👈 NEW
    sets.push(`updated_at = now()`);

    if (sets.length === 1) return NextResponse.json({ ok: true }); // nothing to update

    const { rowCount } = await run(pool, (c) =>
      c.query(
        `
        update public.resumes
        set ${sets.join(', ')}
        where id = $${vals.push(params.id)} and user_id = $${vals.push(userId)}
        `,
        vals,
      ),
    );

    if (!rowCount) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.name === 'UNAUTHORIZED') {
      return NextResponse.json({ error: e.message || 'unauthorized' }, { status: 401 });
    }
    console.error('[PATCH /api/resumes/:id]', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}


export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const fb = await getUserFromRequest();
    const userId = await getDbUserIdByFirebaseUid(fb.uid);
    if (!userId) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const { rowCount } = await run(pool, (c) =>
      c.query(
        `delete from public.resumes where id = $1 and user_id = $2`,
        [params.id, userId],
      ),
    );
    if (!rowCount) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.name === 'UNAUTHORIZED') {
      return NextResponse.json({ error: e.message || 'unauthorized' }, { status: 401 });
    }
    console.error('[DELETE /api/resumes/:id]', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
