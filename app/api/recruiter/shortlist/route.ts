// app/api/recruiter/shortlist/route.ts
//
// Recruiter AI shortlisting: POST a JD (text) + N candidate resume files
// (PDF/DOCX/txt, multipart). Extracts each resume's text, ranks candidates by
// fit with honest evidence-based reasons, and returns the ranking. Auth-gated
// and metered (recruiter-shortlist; one run per call).

import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/app/api/server/auth/getUserFromRequest";
import prisma from "@/lib/prisma";
import { checkAiUsage, recordAiUsage, quotaBlockedResponse, MAX_SHORTLIST_RESUMES } from "@/lib/aiUsage";
import { extractFileText } from "@/lib/extractText";
import { shortlistCandidates, type ShortlistInput } from "@/lib/shortlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const fb = await getUserFromRequest();
    const dbUser = await prisma.user.findUnique({ where: { firebaseUid: fb.uid }, select: { id: true } });
    if (!dbUser?.id) return NextResponse.json({ error: "no_user" }, { status: 403 });

    const quota = await checkAiUsage(dbUser.id, "recruiter-shortlist");
    if (!quota.ok) return NextResponse.json(quotaBlockedResponse(quota), { status: 429 });

    const form = await req.formData();
    const jdText = String(form.get("jdText") || "").trim();
    if (!jdText) return NextResponse.json({ error: "missing_jd" }, { status: 400 });

    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (!files.length) return NextResponse.json({ error: "no_resumes" }, { status: 400 });
    if (files.length > MAX_SHORTLIST_RESUMES) {
      return NextResponse.json(
        { error: "too_many", detail: `Max ${MAX_SHORTLIST_RESUMES} resumes per run.` },
        { status: 400 },
      );
    }

    // Extract text from each resume (skip ones we can't read — usually scanned PDFs).
    const candidates: ShortlistInput[] = [];
    const skipped: string[] = [];
    await Promise.all(
      files.map(async (f, i) => {
        try {
          const text = await extractFileText(f);
          if (text && text.length > 40) {
            candidates.push({ id: `c${i}`, name: (f.name || `Candidate ${i + 1}`).replace(/\.[^.]+$/, ""), text });
          } else {
            skipped.push(f.name || `file ${i + 1}`);
          }
        } catch {
          skipped.push(f.name || `file ${i + 1}`);
        }
      }),
    );

    if (!candidates.length) {
      return NextResponse.json(
        { error: "unreadable", detail: "Couldn't read any resume text (scanned PDFs aren't supported)." },
        { status: 422 },
      );
    }

    const results = await shortlistCandidates(jdText, candidates);
    await recordAiUsage(dbUser.id, "recruiter-shortlist");

    return NextResponse.json({
      results,
      skipped,
      counted: candidates.length,
      quota: {
        remainingDay: Math.max(0, quota.remainingDay - 1),
        remainingMonth: Math.max(0, quota.remainingMonth - 1),
        monthLimit: quota.monthLimit,
      },
    });
  } catch (e: any) {
    if (e?.name === "UNAUTHORIZED" || e?.code === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/recruiter/shortlist]", e);
    return NextResponse.json({ error: "shortlist_failed", detail: e?.message }, { status: 500 });
  }
}
