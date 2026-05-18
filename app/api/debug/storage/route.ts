// app/api/debug/storage/route.ts
//
// Diagnostic endpoint for the thumbnail upload pipeline. Writes a tiny test
// PNG to Firebase Storage and reports the exact failure mode — bucket missing,
// IAM not granted, uniform-bucket-level-access blocking `public: true`, etc.
//
// Gated on auth + a hardcoded admin email list so it can't be hammered.

import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/app/api/server/auth/getUserFromRequest';
import { adminBucket } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Locked to the project owner. Update if you want other accounts to be able
// to hit this endpoint.
const ADMIN_EMAILS = new Set([
  'emanzoelife@gmail.com',
  'claude-code@mediatropy.com',
]);

// 1×1 transparent PNG so we can prove the write end-to-end.
const TEST_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

export async function GET() {
  const out: any = {
    env: {
      FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || '(unset — falling back to <project>.appspot.com)',
    },
    bucket: { name: null as string | null },
    write: { ok: false, error: null as string | null, code: null as string | null },
    publicUrl: null as string | null,
  };

  try {
    const u = await getUserFromRequest();
    if (!ADMIN_EMAILS.has((u.email || '').toLowerCase())) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    out.bucket.name = adminBucket.name;
  } catch (e: any) {
    out.bucket.name = `(bucket() threw: ${e?.message || e})`;
  }

  // Write a probe object and try `public: true`. Mirror the same code path
  // the thumbnail route uses so the failure modes match.
  try {
    const objectPath = `debug-probes/${Date.now()}.png`;
    const file = adminBucket.file(objectPath);
    await file.save(TEST_PNG, {
      contentType: 'image/png',
      resumable: false,
      public: true,
      metadata: { cacheControl: 'no-store' },
    });
    out.write.ok = true;
    out.publicUrl = `https://storage.googleapis.com/${adminBucket.name}/${objectPath}`;
    // Best-effort cleanup so we don't pile up probes.
    file.delete({ ignoreNotFound: true }).catch(() => {});
  } catch (e: any) {
    out.write.error = e?.message || String(e);
    out.write.code = e?.code || e?.errors?.[0]?.reason || null;
  }

  return NextResponse.json(out);
}
