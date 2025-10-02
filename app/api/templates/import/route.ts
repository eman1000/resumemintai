import { NextRequest, NextResponse } from 'next/server';
import * as mammoth from 'mammoth';
import DOMPurify from 'isomorphic-dompurify';
import { db } from '@/app/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// POST multipart/form-data with field "file" (.docx) and optional "name"
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const name = (formData.get('name') as string) || 'Custom (Word)';

  if (!file) return NextResponse.json({ error: 'file missing' }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const { value: html } = await mammoth.convertToHtml({ buffer: buf }, {
    styleMap: [
      // fine-tune mappings if desired
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Heading 3'] => h3:fresh",
    ],
  });

  // sanitize
  const clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });

  // Save (anonymous – caller must be authed on client to link to a user id)
  const ref = await addDoc(collection(db, 'templates'), {
    name,
    html: clean,
    createdAt: serverTimestamp(),
  });

  return NextResponse.json({ id: ref.id, name, html: clean });
}
