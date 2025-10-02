'use client';
import { useState } from 'react';

export default function ImportTemplatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('Custom (Word)');
  const [result, setResult] = useState<{id:string;html:string}|null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    const fd = new FormData();
    fd.set('file', file);
    fd.set('name', name);
    const res = await fetch('/api/templates/auto-import', { method: 'POST', body: fd });
    const json = await res.json();
    setResult(json);
    setLoading(false);
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold">Import Word Template</h1>
      <p className="text-sm text-neutral-400 mt-1">Upload a .docx with Mustache placeholders (see below).</p>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <input type="text" value={name} onChange={e=>setName(e.target.value)} className="w-full rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-2" placeholder="Template name" />
        <input type="file" accept=".docx" onChange={e=>setFile(e.target.files?.[0] || null)} className="w-full" />
        <button disabled={!file || loading} className="rounded-xl bg-white text-black font-semibold px-4 py-2 disabled:opacity-60">
          {loading ? 'Importing…' : 'Import'}
        </button>
      </form>

      {result && (
        <div className="mt-6">
          <p className="text-sm text-neutral-400">Saved template id: <code>{result.id}</code></p>
          <div className="mt-3 rounded-xl border border-neutral-800 p-3 bg-white text-black" dangerouslySetInnerHTML={{ __html: result.html }} />
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Placeholders to use in Word</h2>
        <pre className="mt-2 bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-xs overflow-auto">
{`{{name}}
{{contact}}  (or use {{email}}, {{phone}}, {{location}} separately)

{{summary}}

Skills:
Core: {{#skills.core}}{{.}}{{^last}}, {{/last}}{{/skills.core}}
Tools: {{#skills.tools}}{{.}}{{^last}}, {{/last}}{{/skills.tools}}
Soft:  {{#skills.soft}}{{.}}{{^last}}, {{/last}}{{/skills.soft}}

Experience:
{{#experience}}
  {{role}} — {{company}}
  {{#bullets}}• {{.}}
  {{/bullets}}

{{/experience}}

Achievements:
{{#achievements}}• {{.}}
{{/achievements}}`}
        </pre>
        <p className="text-sm text-neutral-400 mt-2">You can paste these tags into your Word doc, save as .docx, then import.</p>
      </section>
    </main>
  );
}
