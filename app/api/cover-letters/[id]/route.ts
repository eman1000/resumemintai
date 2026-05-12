// app/api/cover-letters/[id]/route.ts
import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/app/api/server/auth/getUserFromRequest';
import prisma from '@/lib/prisma';
import { BASE_LANG_LABELS, LanguageCode } from '@/lib/i18n';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_RENDERERS = new Set(['circular', 'professional', 'elegant', 'classic']);

async function getDbUserIdByFirebaseUid(firebaseUid: string) {
  const u = await prisma.user.findUnique({
    where: { firebaseUid },
    select: { id: true },
  });
  return u?.id ?? null;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const fb = await getUserFromRequest();
    const userId = await getDbUserIdByFirebaseUid(fb.uid);
    if (!userId) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const r = await prisma.coverLetter.findFirst({
      where: { id: params.id, userId },
      select: {
        id: true,
        title: true,
        renderer: true,
        data: true,
        updatedAt: true,
        language: true,
        resumeId: true,
      },
    });

    if (!r) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    return NextResponse.json({
      id: r.id,
      title: r.title ?? 'Untitled Cover Letter',
      renderer: r.renderer ?? 'professional',
      data: r.data ?? null,
      language: r.language,
      resumeId: r.resumeId || null,
      updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null,
    });
  } catch (e: any) {
    if (e?.name === 'UNAUTHORIZED') {
      return NextResponse.json({ error: e.message || 'unauthorized' }, { status: 401 });
    }
    console.error('[GET /api/cover-letters/:id]', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const fb = await getUserFromRequest();
    const userId = await getDbUserIdByFirebaseUid(fb.uid);
    if (!userId) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const title: string | undefined = body.title?.toString();
    const renderer: string | undefined = body.renderer?.toString();
    const data = body.data;
    const language: LanguageCode | undefined = body.language?.toString() as LanguageCode | undefined;

    if (renderer && !ALLOWED_RENDERERS.has(renderer)) {
      return NextResponse.json({ error: 'invalid_renderer' }, { status: 400 });
    }

    const ALLOWED_LANGUAGES = new Set<LanguageCode>(
      Object.keys(BASE_LANG_LABELS) as LanguageCode[],
    );
    if (language && !ALLOWED_LANGUAGES.has(language)) {
      return NextResponse.json({ error: 'invalid_language' }, { status: 400 });
    }

    const updateData: any = {};
    if (title !== undefined)    updateData.title = title.slice(0, 200);
    if (renderer !== undefined) updateData.renderer = renderer;
    if (data !== undefined)     updateData.data = data;
    if (language !== undefined) updateData.language = language;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ ok: true });
    }

    const result = await prisma.coverLetter.updateMany({
      where: { id: params.id, userId },
      data: updateData,
    });

    if (!result.count) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.name === 'UNAUTHORIZED') {
      return NextResponse.json({ error: e.message || 'unauthorized' }, { status: 401 });
    }
    console.error('[PATCH /api/cover-letters/:id]', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const fb = await getUserFromRequest();
    const userId = await getDbUserIdByFirebaseUid(fb.uid);
    if (!userId) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const result = await prisma.coverLetter.deleteMany({
      where: { id: params.id, userId },
    });
    if (!result.count) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.name === 'UNAUTHORIZED') {
      return NextResponse.json({ error: e.message || 'unauthorized' }, { status: 401 });
    }
    console.error('[DELETE /api/cover-letters/:id]', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
