// app/api/recruiter/shortlist/route.ts
//
// Recruiter AI shortlisting: POST a JD (text) + N candidate resume files
// (PDF/DOCX/txt, multipart). Extracts each resume's text, ranks candidates by
// fit with honest evidence-based reasons, and returns the ranking. Auth-gated
// and metered (recruiter-shortlist; one run per call).

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAiUsage, recordAiUsage, quotaBlockedResponse, MAX_SHORTLIST_RESUMES } from "@/lib/aiUsage";
import { extractBufferText } from "@/lib/extractText";
import { shortlistCandidates, type ShortlistInput } from "@/lib/shortlist";
import { requireRecruiter, RecruiterGateError, recruiterGateResponse } from "@/lib/recruiterBilling";
import { extractContact } from "@/lib/contact";
import { storeShortlistResume } from "@/lib/resumeStore";

// Per-candidate metadata captured during extraction (contact + stored resume).
type CandMeta = { email: string | null; phone: string | null; links: string[]; resumeUrl: string | null; resumeName: string };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const { userId } = await requireRecruiter();
    const dbUser = { id: userId };

    const quota = await checkAiUsage(dbUser.id, "recruiter-shortlist");
    if (!quota.ok) return NextResponse.json(quotaBlockedResponse(quota), { status: 429 });

    const form = await req.formData();
    let jdText = String(form.get("jdText") || "").trim();

    // JD can be pasted OR uploaded as a PDF/DOCX. If no text was pasted, extract
    // it from the uploaded JD file.
    if (!jdText) {
      const jdFile = form.get("jdFile");
      if (jdFile instanceof File) {
        let extracted = "";
        try {
          const jdBuf = Buffer.from(await jdFile.arrayBuffer());
          extracted = (await extractBufferText(jdBuf, jdFile.name || "jd", jdFile.type)).trim();
        } catch {
          /* fall through to the friendly error below */
        }
        if (extracted.length > 20) {
          jdText = extracted;
        } else {
          return NextResponse.json(
            {
              error: "jd_unreadable",
              detail:
                "Couldn't read text from the JD file. If it's a scanned/image PDF it has no text layer — paste the job description into the box instead.",
            },
            { status: 422 },
          );
        }
      }
    }
    if (!jdText) {
      return NextResponse.json(
        { error: "missing_jd", detail: "Paste the job description or upload a JD file with selectable text." },
        { status: 400 },
      );
    }

    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (!files.length) return NextResponse.json({ error: "no_resumes" }, { status: 400 });
    if (files.length > MAX_SHORTLIST_RESUMES) {
      return NextResponse.json(
        { error: "too_many", detail: `Max ${MAX_SHORTLIST_RESUMES} resumes per run.` },
        { status: 400 },
      );
    }

    // Extract text from each resume (skip ones we can't read — usually scanned
    // PDFs). Also extract contact details and preserve the file for download.
    const candidates: ShortlistInput[] = [];
    const meta = new Map<string, CandMeta>();
    const skipped: string[] = [];
    await Promise.all(
      files.map(async (f, i) => {
        const id = `c${i}`;
        const name = f.name || `file ${i + 1}`;
        try {
          const buf = Buffer.from(await f.arrayBuffer());
          const text = await extractBufferText(buf, name, f.type);
          if (text && text.length > 40) {
            candidates.push({ id, name: name.replace(/\.[^.]+$/, ""), text });
            const contact = extractContact(text);
            const resumeUrl = await storeShortlistResume(buf, name, f.type || "application/octet-stream");
            meta.set(id, { ...contact, resumeUrl, resumeName: name });
          } else {
            skipped.push(name);
          }
        } catch {
          skipped.push(name);
        }
      }),
    );

    if (!candidates.length) {
      return NextResponse.json(
        { error: "unreadable", detail: "Couldn't read any resume text (scanned PDFs aren't supported)." },
        { status: 422 },
      );
    }

    const ranked = await shortlistCandidates(jdText, candidates);
    await recordAiUsage(dbUser.id, "recruiter-shortlist");

    // Merge ranking + extracted contact/resume metadata by candidate id.
    const results = ranked.map((r) => {
      const m = meta.get(r.id);
      return {
        ...r,
        email: m?.email || null,
        phone: m?.phone || null,
        links: m?.links || [],
        resumeUrl: m?.resumeUrl || null,
        resumeName: m?.resumeName || null,
      };
    });

    // Persist the run + ranked candidates (with contacts + preserved resume).
    let runId: string | null = null;
    try {
      const runLabel = String(form.get("label") || "").trim().slice(0, 120) || "Ad-hoc shortlist";
      const run = await prisma.shortlistRun.create({
        data: {
          recruiterId: dbUser.id,
          jobPostingId: null,
          label: runLabel,
          jdText: jdText.slice(0, 20000),
          candidates: {
            create: results.map((r) => ({
              name: r.name,
              score: r.score,
              verdict: r.verdict || null,
              strengths: r.strengths as any,
              gaps: r.gaps as any,
              email: r.email,
              phone: r.phone,
              links: r.links as any,
              resumeUrl: r.resumeUrl,
              resumeName: r.resumeName,
            })),
          },
        },
        select: { id: true },
      });
      runId = run.id;
    } catch (e) {
      console.warn("[recruiter/shortlist] run persist failed:", (e as any)?.message || e);
    }

    return NextResponse.json({
      runId,
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
    if (e instanceof RecruiterGateError) {
      const r = recruiterGateResponse(e);
      return NextResponse.json(r.body, { status: r.status });
    }
    if (e?.name === "UNAUTHORIZED" || e?.code === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/recruiter/shortlist]", e);
    return NextResponse.json({ error: "shortlist_failed", detail: e?.message }, { status: 500 });
  }
}
