import { NextRequest, NextResponse } from 'next/server';
import * as mammoth from 'mammoth';
import { openai } from '@/lib/ai';
import type { Resume } from '@/types/resume';

export const runtime = 'nodejs';


async function extractFromDocx(buf: Buffer) {
  const { value } = await mammoth.convertToHtml({ buffer: buf });
  const text = value.replace(/<[^>]+>/g, '\n').replace(/\n{2,}/g, '\n').trim();
  return text;
}

// Robust PDF text extractor for Next.js app routes
// Robust PDF text extractor for Next.js app routes (no invalid paths)
async function extractFromPdf(buf: Buffer) {
  // 1) Try pdf-parse via dynamic import (works in Node app routes)
  try {
    const { default: pdfParse } = await import('pdf-parse');
    const res = await pdfParse(buf);
    const txt = (res.text || '').replace(/\n{2,}/g, '\n').trim();
    if (txt) return txt;
  } catch (e: any) {
    console.warn('[ingest] pdf-parse failed:', e?.message || e);
  }

  // 2) Fallback to pdfjs-dist (ESM). DO NOT import build/pdf.js (removed in v4)
  let pdfjs: any;
  try {
    // v4 recommended entry
    pdfjs = await import('pdfjs-dist');
  } catch {
    // older installs sometimes expose legacy ESM entry
    pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  }

  const { getDocument, GlobalWorkerOptions } = pdfjs as any;

  // No worker in Node
  if (GlobalWorkerOptions) {
    GlobalWorkerOptions.workerSrc = undefined as any;
  }

  const uint8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf as any);
  const doc = await getDocument({ data: uint8 }).promise;

  let out = '';
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    out += content.items
      .map((it: any) => (typeof it.str === 'string' ? it.str : (it?.unicode || '')))
      .join(' ') + '\n';
  }
  return out.replace(/\s+\n/g, '\n').replace(/\n{2,}/g, '\n').trim();
}



const SYS = `You take raw resume text and return CLEAN JSON strictly matching this schema:
{
  "name": "string",
  "contact": { "email": "string?", "phone": "string?", "website": "string?", "location": "string?" },
  "summary": "string",
  "skills": { "core": "string[]", "tools": "string[]", "soft": "string[]" },
  "experience": [
    { "role": "string", "company": "string?", "location": "string?", "start": "string?", "end": "string?", "bullets": "string[]" }
  ],
  "education": [
    { "degree": "string", "school": "string", "dates": "string?", "notes": "string[]?" }
  ],
  "achievements": "string[]?",
  "keywords": "string[]?",
  "ats_notes": "string[]?"
}
Rules:
- Prefer bullet points with outcomes + metrics.
- Normalize dates to "Mon YYYY" or "YYYY" and "Present".
- Do NOT invent facts; leave fields empty if unknown.
`;

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 });
    }

    const form = await req.formData();
    const file = form.get('file') as File | null;
    const jobDesc = (form.get('jd') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'file missing. Send multipart/form-data with a `file` field.' }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const lower = file.name.toLowerCase();

    let plain = '';
    if (lower.endsWith('.doc') || lower.endsWith('.docx')) plain = await extractFromDocx(buf);
    else if (lower.endsWith('.pdf')) plain = await extractFromPdf(buf);
    else return NextResponse.json({ error: 'unsupported type' }, { status: 400 });

    const user = `RESUME TEXT:\n${plain}\n\nJOB DESCRIPTION (optional):\n${jobDesc || '(none)'}\n\nReturn ONLY JSON object.`;

    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYS },
        { role: 'user', content: user }
      ],
      temperature: 0.2,
    });

    const json = JSON.parse(resp.choices[0].message.content || '{}') as Resume;
    return NextResponse.json(json);
  } catch (err: any) {
    console.error('INGEST ERROR:', err);
    return NextResponse.json({ error: err?.message || 'unexpected error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, route: '/api/ingest' });
}
