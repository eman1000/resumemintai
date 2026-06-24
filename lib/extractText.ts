// lib/extractText.ts
// Extract plain text from an uploaded resume file (PDF / DOCX / txt). Server-only
// (uses pdf-parse + mammoth). Shared by import + recruiter shortlisting.
import mammoth from "mammoth";
import pdfParse from "pdf-parse";

export async function extractBufferText(buf: Buffer, fileName: string, type?: string): Promise<string> {
  const name = (fileName || "").toLowerCase();
  if (name.endsWith(".pdf") || type === "application/pdf") {
    // pdf-parse can throw intermittently under memory pressure on a cold
    // serverless instance — retry once before giving up.
    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const parsed = await pdfParse(buf);
        return (parsed.text || "").trim();
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr;
  }
  if (
    name.endsWith(".docx") ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const res = await mammoth.extractRawText({ buffer: buf });
    return (res.value || "").trim();
  }
  // Plain text / fallback.
  return buf.toString("utf8").trim();
}

export async function extractFileText(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  return extractBufferText(buf, file.name || "", file.type);
}
