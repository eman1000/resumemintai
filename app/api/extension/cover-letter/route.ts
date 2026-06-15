// app/api/extension/cover-letter/route.ts
//
// Generate a cover letter for the job the extension is applying to, grounded in
// the user's MASTER resume. Returns the body text (to fill a cover-letter field)
// + the structured doc. Honest: only uses resume-evidenced content + any
// confirmedSkills passed in — never invented skills.

import { NextResponse } from "next/server";
import { userIdFromExtensionRequest } from "@/lib/extensionToken";
import { checkAiUsage, recordAiUsage, quotaBlockedResponse } from "@/lib/aiUsage";
import { getMasterResume } from "@/lib/masterResume";
import { generateCoverLetterDoc, coverLetterToText, coverLetterToHtml } from "@/lib/coverLetterGen";
import { renderHtmlToPdf } from "@/lib/resumeThemes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const userId = userIdFromExtensionRequest(req);

    const quota = await checkAiUsage(userId, "cover-letter-tailor");
    if (!quota.ok) return NextResponse.json(quotaBlockedResponse(quota), { status: 429 });

    const body = await req.json().catch(() => ({}));
    const job = {
      title: String(body?.title || body?.job?.title || ""),
      company: String(body?.company || body?.job?.company || ""),
      description: String(body?.jdText || body?.description || body?.job?.description || ""),
      keywords: Array.isArray(body?.keywords) ? body.keywords : body?.job?.keywords,
    };
    const confirmedSkills: string[] = Array.isArray(body?.confirmedSkills) ? body.confirmedSkills : [];

    const master = await getMasterResume(userId);
    if (!master) {
      return NextResponse.json({ error: "no_resume", detail: "Create a resume on resumemintai.com first." }, { status: 404 });
    }

    const doc = await generateCoverLetterDoc({ resumeData: (master as any).data, job, confirmedSkills });
    await recordAiUsage(userId, "cover-letter-tailor");

    // Also render a one-page PDF (base64) for download / form file-attach.
    let pdfBase64 = "";
    try {
      const pdf = await renderHtmlToPdf(coverLetterToHtml(doc));
      pdfBase64 = pdf.toString("base64");
    } catch { /* text still works without the PDF */ }

    return NextResponse.json({ subject: doc.subject, text: coverLetterToText(doc), doc, pdf: pdfBase64 });
  } catch (e: any) {
    if (e?.message === "unauthorized" || e?.name === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/extension/cover-letter]", e);
    return NextResponse.json({ error: "cover_letter_failed", detail: e?.message }, { status: 500 });
  }
}
