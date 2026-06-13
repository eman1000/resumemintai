// lib/masterResume.ts
//
// The "master" resume is the user's single source of truth — their original /
// first resume. Tailoring derives non-destructive COPIES from it, so per-job
// edits never drift the master.
//
// v1 resolves the master by CONVENTION (no DB schema change): the earliest
// non-tailored ("organic") resume the user owns. Resumes produced by tailoring
// carry `tailoredForJob`, so they are excluded. A future explicit `isMaster`
// column (lets the user re-designate the master) would need a prod migration.

import prisma from "@/lib/prisma";

const baseSelect = {
  id: true,
  title: true,
  renderer: true,
  data: true,
  language: true,
} as const;

/** Resolve the user's master resume, or null if they have none yet. */
export async function getMasterResume(userId: string) {
  // Prefer the oldest organic resume (no job tag) = the user's original.
  const organic = await prisma.resume.findFirst({
    where: { userId, archived: false, tailoredForJob: { equals: null } },
    orderBy: { createdAt: "asc" },
    select: baseSelect,
  });
  if (organic) return organic;

  // Fallback: oldest resume of any kind (user may only have tailored ones).
  return prisma.resume.findFirst({
    where: { userId, archived: false },
    orderBy: { createdAt: "asc" },
    select: baseSelect,
  });
}

/** Convenience: just the master resume's id (or null). */
export async function getMasterResumeId(userId: string): Promise<string | null> {
  const m = await getMasterResume(userId);
  return m?.id ?? null;
}
