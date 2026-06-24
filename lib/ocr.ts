// lib/ocr.ts
// OCR fallback for scanned / image-only PDFs that have no extractable text
// layer. We send the PDF straight to a vision-capable model (gpt-4o) via the
// Responses API and ask it to transcribe the text — no local rasterization.
// Used only when pdf-parse returns (almost) nothing.

import OpenAI from "openai";

const MODEL = process.env.OPENAI_MODEL_PREMIUM || "gpt-4o";

// Don't OCR huge files (cost/time). ~10MB cap.
const MAX_OCR_BYTES = 10 * 1024 * 1024;

/** Transcribe text from a (likely scanned) PDF buffer. Returns "" on failure
 * so callers can fall back gracefully. */
export async function ocrPdf(buf: Buffer): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return "";
  if (!buf || buf.length === 0 || buf.length > MAX_OCR_BYTES) return "";

  try {
    const client = new OpenAI({ apiKey });
    const dataUrl = `data:application/pdf;base64,${buf.toString("base64")}`;
    const resp = await client.responses.create({
      model: MODEL,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "This is a scanned document (resume or job description). Transcribe ALL of its " +
                "text exactly as written, preserving order and line breaks. Output only the raw " +
                "text — no commentary, no markdown.",
            },
            { type: "input_file", filename: "document.pdf", file_data: dataUrl } as any,
          ],
        },
      ],
    });
    return (resp.output_text || "").trim();
  } catch (e) {
    console.warn("[ocr] failed:", (e as any)?.message || e);
    return "";
  }
}

/** Extracted text good enough to use? (more than a couple of words). */
export function isUsableText(t: string): boolean {
  return !!t && t.trim().length > 40;
}
