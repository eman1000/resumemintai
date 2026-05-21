// app/api/extension/resumes/route.ts
//
// Returns the user's resumes (base + tailored) with enough metadata for the
// agent on the side panel to pick the best match for the current job.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { userIdFromExtensionRequest } from "@/lib/extensionToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ResumeSummary = {
  id: string;
  title: string;
  isTailored: boolean;
  tailoredFor?: {
    title?: string;
    company?: string;
    location?: string;
    source?: string;
  };
  updatedAt: string;
};

export async function GET(req: Request) {
  let userId: string;
  try {
    userId = userIdFromExtensionRequest(req);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rows = await prisma.resume.findMany({
    where: { userId, archived: false },
    select: {
      id: true,
      title: true,
      tailoredForJob: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 60,
  });

  const resumes: ResumeSummary[] = rows.map((r) => {
    const tailored = r.tailoredForJob as
      | { title?: string; company?: string; location?: string; source?: string }
      | null
      | undefined;
    return {
      id: r.id,
      title: r.title,
      isTailored: !!tailored,
      tailoredFor: tailored
        ? {
            title: tailored.title,
            company: tailored.company,
            location: tailored.location,
            source: tailored.source,
          }
        : undefined,
      updatedAt: r.updatedAt.toISOString(),
    };
  });

  return NextResponse.json({ resumes });
}
