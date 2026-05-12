// app/api/cover-letters/route.ts
import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/app/api/server/auth/getUserFromRequest';
import prisma from '@/lib/prisma';

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

export async function GET() {
  try {
    const user = await getUserFromRequest();

    const rows = await prisma.coverLetter.findMany({
      where: { user: { firebaseUid: user.uid }, archived: false },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        renderer: true,
        updatedAt: true,
        thumbnailUrl: true,
      },
    });

    const items = rows.map((r) => ({
      id: r.id,
      title: r.title ?? 'Untitled Cover Letter',
      renderer: r.renderer ?? 'professional',
      updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null,
      thumbnailUrl: r.thumbnailUrl || null,
    }));

    return NextResponse.json(items, { status: 200 });
  } catch (e: any) {
    if (e?.name === 'UNAUTHORIZED') {
      return NextResponse.json({ error: e.message || 'unauthorized' }, { status: 401 });
    }
    console.error('[GET /api/cover-letters]', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

type CreatePayload = { title?: string; renderer?: string; data?: unknown; resume_id?: string };

export async function POST(req: Request) {
  try {
    const fb = await getUserFromRequest();
    const userId = await getDbUserIdByFirebaseUid(fb.uid);
    if (!userId) return NextResponse.json({ error: 'no_user' }, { status: 403 });

    const body = (await req.json()) as CreatePayload;
    const title = (body.title ?? 'Untitled Cover Letter').toString().slice(0, 200);
    const renderer = (body.renderer ?? 'professional').toString();
    const data = body.data ?? {
      id: 'local',
      sender: { fullName: '', email: '', phone: '', address: '', city: '' },
      recipient: { name: '', title: '', company: '', address: '', city: '' },
      date: '',
      subject: '',
      salutation: 'Dear Hiring Manager,',
      paragraphs: [''],
      closing: 'Sincerely,',
      signatureName: '',
    };
    const resumeId = body.resume_id || null;

    if (!ALLOWED_RENDERERS.has(renderer)) {
      return NextResponse.json({ error: 'invalid_renderer' }, { status: 400 });
    }

    const created = await prisma.coverLetter.create({
      data: {
        userId,
        title,
        renderer,
        data: data as any,
        resumeId,
        archived: false,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (e: any) {
    if (e?.name === 'UNAUTHORIZED') {
      return NextResponse.json({ error: e.message || 'unauthorized' }, { status: 401 });
    }
    console.error('[POST /api/cover-letters]', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
