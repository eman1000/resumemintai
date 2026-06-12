// app/api/extension/resume-pdf/route.ts
//
// Returns the user's resume rendered to PDF, for the extension agent's
// upload_resume action (attaching the resume to ATS file inputs).
// Auth: extension bearer token. Metered via the `extension-resume-pdf`
// AiUsage feature — Puppeteer renders are heavyweight, so the cap is tight.
//
// GET /api/extension/resume-pdf?resumeId=<id>
//   → { filename, base64 }  (JSON, base64 keeps the extension messaging simple)

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { userIdFromExtensionRequest } from "@/lib/extensionToken";
import { signPrintToken } from "@/lib/printToken";
import { renderResumePdfFromId } from "@/lib/resumePdf";
import {
  checkAiUsage,
  recordAiUsage,
  quotaBlockedResponse,
} from "@/lib/aiUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** True if the resume has real renderable content (a name + at least one
 * non-empty body record). Handles both object- and array-shaped values. */
function resumeHasContent(data: any): boolean {
  if (!data || typeof data !== "object") return false;
  const sections: any[] = Array.isArray(data.sections) ? data.sections : [];
  let hasName = false;
  let hasBody = false;
  for (const sec of sections) {
    const key = String(sec?.key || "").toLowerCase();
    const records: any[] = Array.isArray(sec?.records) ? sec.records : [];
    for (const r of records) {
      const v = r?.values;
      const texts: string[] = [];
      if (Array.isArray(v)) v.forEach((x) => typeof x === "string" && texts.push(x));
      else if (v && typeof v === "object") Object.values(v).forEach((x) => typeof x === "string" && texts.push(x as string));
      const nonEmpty = texts.some((t) => t.replace(/<[^>]+>/g, "").trim().length > 0);
      if (key.includes("personaldetail")) {
        if (v?.givenName || v?.familyName || nonEmpty) hasName = true;
      } else if (key !== "signature" && key !== "footer" && nonEmpty) {
        hasBody = true;
      }
    }
  }
  return hasName || hasBody;
}

export async function GET(req: Request) {
  let userId: string;
  try {
    userId = userIdFromExtensionRequest(req);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const quota = await checkAiUsage(userId, "extension-resume-pdf");
  if (!quota.ok) return NextResponse.json(quotaBlockedResponse(quota), { status: 429 });

  const url = new URL(req.url);
  const resumeIdParam = url.searchParams.get("resumeId");

  // Resolve the resume: requested id (must be owned) or most-recent.
  const owned = resumeIdParam
    ? await prisma.resume.findFirst({
        where: { id: resumeIdParam, userId },
        select: { id: true, title: true, data: true },
      })
    : await prisma.resume.findFirst({
        where: { userId, archived: false },
        orderBy: [{ updatedAt: "desc" }],
        select: { id: true, title: true, data: true },
      });
  if (!owned) {
    return NextResponse.json(
      { error: "resume_not_found", detail: "No matching resume for this account." },
      { status: 404 },
    );
  }

  // Guard: don't attach a blank PDF. If the resume has no real content,
  // tell the user to fill it in instead of silently uploading an empty file.
  if (!resumeHasContent(owned.data)) {
    return NextResponse.json(
      {
        error: "resume_empty",
        detail:
          "Your resume looks empty. Add your details at resumemintai.com/builder, then try applying again.",
      },
      { status: 422 },
    );
  }

  const token = signPrintToken(owned.id, 120);
  // Derive the origin from the request itself so Puppeteer renders against
  // THIS server (dev hits localhost, prod hits prod). NEXT_PUBLIC_SITE_URL
  // would point a dev server at production, where the resume doesn't exist.
  const host = req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https");
  const origin = host
    ? `${proto}://${host}`
    : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const bytes = await renderResumePdfFromId({ resumeId: owned.id, token, origin });
    await recordAiUsage(userId, "extension-resume-pdf");
    const safeTitle =
      (owned.title || "resume").replace(/[^a-zA-Z0-9-_]+/g, "-").slice(0, 60) || "resume";
    return NextResponse.json({
      filename: `${safeTitle}.pdf`,
      base64: bytes.toString("base64"),
    });
  } catch (e: any) {
    console.error("[extension/resume-pdf]", e?.message);
    return NextResponse.json(
      { error: "pdf_render_failed", detail: e?.message || "Could not render the resume." },
      { status: 500 },
    );
  }
}
