// app/api/ats/extract/route.ts
//
// Public, no-auth plain-text extraction for the /resume-checker upload flow.
// Accepts PDF and DOCX; returns just the raw text. No AI structuring (the
// checker itself is deterministic and uses the text directly).
//
// Rate-limited per IP, mirroring /api/ats/check.

import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const RATE_LIMIT = 30;
const WINDOW_MS = 60 * 60 * 1000;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function ipFromRequest(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || req.ip || 'unknown';
}

function rateLimit(ip: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }
  if (b.count >= RATE_LIMIT) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true };
}

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  const ip = ipFromRequest(req);
  const rl = rateLimit(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'rate_limited', detail: `Too many uploads. Try again in ${rl.retryAfterSec}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'invalid_multipart' }, { status: 400 });
  }
  const file = form.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'missing_file', detail: 'Upload a PDF or DOCX.' }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: 'file_too_large', detail: 'File must be under 5 MB.' },
      { status: 413 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const lower = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();

  let text = '';
  try {
    if (lower.endsWith('.pdf') || type === 'application/pdf') {
      const parsed = await pdfParse(buf);
      text = (parsed.text || '').trim();
    } else if (
      lower.endsWith('.docx') ||
      type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const res = await mammoth.extractRawText({ buffer: buf });
      text = (res.value || '').trim();
    } else {
      return NextResponse.json(
        { error: 'unsupported_format', detail: 'Upload a PDF or DOCX file.' },
        { status: 415 },
      );
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: 'parse_failed', detail: e?.message || 'Could not read the file.' },
      { status: 500 },
    );
  }

  if (!text) {
    return NextResponse.json(
      {
        error: 'no_text',
        detail: 'No extractable text — looks like a scanned image. Paste the text instead.',
      },
      { status: 422 },
    );
  }

  return NextResponse.json({ text, charCount: text.length, filename: file.name });
}
