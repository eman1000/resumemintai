// app/api/extension/cover-letters/route.ts
// The user's cover letters, for the side-panel "Cover letters" tab.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { userIdFromExtensionRequest } from "@/lib/extensionToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  let userId: string;
  try {
    userId = userIdFromExtensionRequest(req);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rows = await prisma.coverLetter.findMany({
    where: { userId, archived: false },
    select: { id: true, title: true, tailoredForJob: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const coverLetters = rows.map((r) => {
    const t = r.tailoredForJob as { title?: string; company?: string } | null | undefined;
    return {
      id: r.id,
      title: r.title,
      isTailored: !!t,
      tailoredFor: t ? { title: t.title, company: t.company } : undefined,
      updatedAt: r.updatedAt.toISOString(),
    };
  });

  return NextResponse.json({ coverLetters });
}
