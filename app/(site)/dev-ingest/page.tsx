'use client';
import React, { useRef, useState } from 'react';

import type { Resume } from '@/types/resume';
import { TEMPLATE_META, TEMPLATES } from '@/components/templates';

export default function DevIngest() {
  const [file, setFile] = useState<File|null>(null);
  const [jd, setJd] = useState('');
  const [resume, setResume] = useState<Resume|null>(null);
  const [tpl, setTpl] = useState<keyof typeof TEMPLATES>('executive-ats');
  const previewRef = useRef<HTMLDivElement>(null);

  const onIngest = async () => {
    if (!file) return;
    const fd = new FormData();
    fd.set('file', file);
    if (jd) fd.set('jd', jd);
    const res = await fetch('/api/ingest', { method: 'POST', body: fd });
    const json = await res.json();
    setResume(json);
  };

// in app/(site)/dev-ingest/page.tsx
const onExport = async () => {
  if (!resume) return;
  const res = await fetch('/api/export/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: resume, template: tpl, accent: '#7c3aed' }),
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'resume.pdf'; a.click();
  URL.revokeObjectURL(url);
};


  const Template = TEMPLATES[tpl];

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Dev Ingest</h1>
      <div className="flex flex-wrap gap-3 items-center">
        <input type="file" accept=".pdf,.doc,.docx" onChange={e=>setFile(e.target.files?.[0] || null)} />
        <textarea placeholder="(optional) Paste JD…" value={jd} onChange={e=>setJd(e.target.value)}
          className="min-w-[320px] h-20 rounded-lg bg-neutral-900 border border-neutral-800 p-2 text-sm" />
        <button onClick={onIngest} className="rounded-xl bg-white text-black font-semibold px-4 py-2 disabled:opacity-60"
          disabled={!file}>Ingest</button>
        {resume && (
          <>
            <select value={tpl} onChange={e=>setTpl(e.target.value as any)}
              className="rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-2">
              {Object.entries(TEMPLATE_META).map(([k,v]) => <option key={k} value={k}>{v.name}</option>)}
            </select>
            <button onClick={onExport} className="rounded-xl bg-white text-black font-semibold px-4 py-2">Export PDF</button>
          </>
        )}
      </div>

      {resume && (
        <div ref={previewRef} className="bg-neutral-100 p-6 rounded-2xl">
          <div className="w-full flex justify-center">
  <div className="a4-preview-wrap">
    <div className="a4-sheet">
      <Template data={resume} accent={"#7c3aed"} />
    </div>
  </div>
</div>
        </div>
      )}
    </main>
  );
}
