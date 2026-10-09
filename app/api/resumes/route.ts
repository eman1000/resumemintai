// app/api/resumes/route.ts
import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/app/api/server/auth/getUserFromRequest';
import prisma from '@/lib/prisma';
import { RESUME_THEME_IDS } from '@/lib/resumeThemesMeta';
import { getMasterResumeId } from '@/lib/masterResume';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_RENDERERS = new Set<string>([
  ...RESUME_THEME_IDS, // JSON Resume themes (current)
  // legacy SVG ids (old resumes still save; mapped to themes at render time)
  'iconic','circular','professional','elegant','classic','modern','minimal',
  'creative','compact','executive','chrono','horizontal','casual',
]);

async function getDbUserIdByFirebaseUid(firebaseUid: string) {
  const u = await prisma.user.findUnique({
    where: { firebaseUid },
    select: { id: true },
  });
  return u?.id ?? null;
}

export async function GET() {
  try {
    const user = await getUserFromRequest();
    const dbUser = await prisma.user.findUnique({ where: { firebaseUid: user.uid }, select: { id: true } });

    const rows = await prisma.resume.findMany({
      where: { user: { firebaseUid: user.uid } },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        renderer: true,
        updatedAt: true,
        thumbnailUrl: true,
        tailoredForJob: true,
      },
    });

    // Resolve the master via the canonical resolver (explicit flag → earliest
    // organic fallback) so EXACTLY one card is tagged, even if the flag was
    // never set on legacy data.
    const masterId = dbUser?.id ? await getMasterResumeId(dbUser.id) : null;

    const items = rows.map((r) => ({
      id: r.id,
      title: r.title ?? 'Untitled CV',
      renderer: r.renderer ?? 'professional',
      updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null,
      thumbnailUrl: r.thumbnailUrl || null,
      isMaster: r.id === masterId,
      isTailored: !!r.tailoredForJob,
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

type CreatePayload = { title?: string; renderer?: string; data?: unknown; tailoredForJob?: unknown; language?: string };

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

    // A tailored copy carries its job tag so it is excluded from master
    // resolution (master = earliest organic resume). Organic creates omit it.
    const tailoredForJob =
      body.tailoredForJob && typeof body.tailoredForJob === "object" ? body.tailoredForJob : undefined;
    const language = typeof body.language === "string" ? body.language : undefined;

    const created = await prisma.resume.create({
      data: {
        userId,
        title,
        renderer,
        data: data as any,
        archived: false,
        ...(tailoredForJob ? { tailoredForJob: tailoredForJob as any } : {}),
        ...(language ? { language } : {}),
      },
      select: { id: true },
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (e: any) {
    if (e?.name === 'UNAUTHORIZED') {
      return NextResponse.json({ error: e.message || 'unauthorized' }, { status: 401 });
    }
    console.error('[POST /api/resumes]', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
