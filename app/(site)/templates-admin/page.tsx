'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { db, auth } from '@/app/firebase';
import {
  addDoc, deleteDoc, collection, doc,
  getDocs, serverTimestamp, query, orderBy
} from 'firebase/firestore';
import toast from 'react-hot-toast';

// Schema/validator utilities
import {
  validateTemplateHtml,
  autoFixTemplateHtml,
  TEMPLATE_VERSION,
  TEMPLATE_MINIMAL_SKELETON,
} from '@/lib/templateSchema';

// Local fallback type (keeps this file self-contained)
type TemplateValidation = { ok: boolean; errors: string[] };

type CustomTpl = {
  id?: string;
  name: string;
  html: string;
  public?: boolean;
  createdAt?: any;
  ownerId?: string | null;
  version?: number;
};

/** Contract-compliant sample templates (valid out of the box). */
const SAMPLE_TEMPLATES: Omit<CustomTpl,'id'>[] = [
  {
    name: 'Professional One-Column (Contract)',
    html: `
<!-- ${TEMPLATE_VERSION} -->
<style>
  .resume{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#222;line-height:1.6}
  .resume .h{font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#3b82f6;margin:16px 0 8px}
  .resume ul{margin:6px 0 0 18px}
</style>
<div class="resume">
  <div class="h" style="font-size:28px;color:#111">{{name}}</div>
  <div style="opacity:.75">{{contact}}</div>

  {{#_hasSummary}}
  <div class="h">Summary</div>
  <p>{{summary}}</p>
  {{/_hasSummary}}

  {{#_hasExperience}}
  <div class="h">Experience</div>
  <div>
    {{#experience}}
      <div style="margin:8px 0">
        <div><strong>{{role}}</strong>{{#company}} — {{company}}{{/company}}</div>
        <div style="opacity:.7">{{location}}{{#start}} • {{start}}{{/start}}{{#end}} – {{end}}{{/end}}</div>
        {{#bullets.length}}<ul>{{#bullets}}<li>{{.}}</li>{{/bullets}}</ul>{{/bullets.length}}
      </div>
    {{/experience}}
  </div>
  {{/_hasExperience}}

  {{#_hasEducation}}
  <div class="h">Education</div>
  <div>
    {{#education}}
      <div style="margin:8px 0">
        <div><strong>{{degree}}</strong>{{#school}} — {{school}}{{/school}}</div>
        <div style="opacity:.7">{{location}}{{#dates}} • {{dates}}{{/dates}}</div>
        {{#notes.length}}<ul>{{#notes}}<li>{{.}}</li>{{/notes}}</ul>{{/notes.length}}
      </div>
    {{/education}}
  </div>
  {{/_hasEducation}}

  {{#_hasSkills}}
  <div class="h">Skills</div>
  <div>
    {{#_hasSkillsCore}}<div><strong>Core:</strong> {{#skills.core}}<span>{{value}}</span>{{/skills.core}}</div>{{/_hasSkillsCore}}
    {{#_hasSkillsTools}}<div><strong>Tools:</strong> {{#skills.tools}}<span>{{value}}</span>{{/skills.tools}}</div>{{/_hasSkillsTools}}
    {{#_hasSkillsSoft}}<div><strong>Soft:</strong>  {{#skills.soft}}<span>{{value}}</span>{{/skills.soft}}</div>{{/_hasSkillsSoft}}
  </div>
  {{/_hasSkills}}

  {{#_hasAchievements}}
  <div class="h">Achievements</div>
  <ul>{{#achievements}}<li>{{.}}</li>{{/achievements}}</ul>
  {{/_hasAchievements}}
</div>
`.trim()
  },
  {
    name: 'Table Layout (Contract + repeat marker)',
    html: `
<!-- ${TEMPLATE_VERSION} -->
<style>
  .resume{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}
  table{width:100%;border-collapse:collapse}
  th,td{padding:6px 4px;border-bottom:1px solid #eee;vertical-align:top}
  .h{font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#3b82f6;margin:16px 0 8px}
</style>
<div class="resume">
  <h1 style="margin:0">{{name}}</h1>
  <div style="opacity:.75">{{contact}}</div>

  {{#_hasSummary}}
  <div class="h">Summary</div>
  <p>{{summary}}</p>
  {{/_hasSummary}}

  {{#_hasSkills}}
  <div class="h">Skills</div>
  {{#_hasSkillsCore}}<p><strong>Core:</strong> {{#skills.core}}<span>{{value}}</span>{{/skills.core}}</p>{{/_hasSkillsCore}}
  {{#_hasSkillsTools}}<p><strong>Tools:</strong> {{#skills.tools}}<span>{{value}}</span>{{/skills.tools}}</p>{{/_hasSkillsTools}}
  {{#_hasSkillsSoft}}<p><strong>Soft:</strong>  {{#skills.soft}}<span>{{value}}</span>{{/skills.soft}}</p>{{/_hasSkillsSoft}}
  {{/_hasSkills}}

  {{#_hasExperience}}
  <div class="h">Experience</div>
  <!-- Regular mustache loop -->
  {{#experience}}
  <table>
    <tr>
      <td style="width:42%"><strong>{{role}}</strong>{{#company}} — {{company}}{{/company}}</td>
      <td>{{#bullets.length}}<ul style="margin:6px 0 0 18px">{{#bullets}}<li>{{.}}</li>{{/bullets}}</ul>{{/bullets.length}}</td>
    </tr>
  </table>
  {{/experience}}

  <!-- Optional row-clone marker -->
  <table>
    <tbody>
      <tr>
        <td style="width:42%">[[repeat:experience]] <strong>{{role}}</strong>{{#company}} — {{company}}{{/company}}</td>
        <td>{{#bullets.length}}<ul style="margin:6px 0 0 18px">{{#bullets}}<li>{{.}}</li>{{/bullets}}</ul>{{/bullets.length}}</td>
      </tr>
    </tbody>
  </table>
  {{/_hasExperience}}

  {{#_hasEducation}}
  <div class="h">Education</div>
  {{#education}}
    <div><strong>{{degree}}</strong>{{#school}} — {{school}}{{/school}} {{#dates}}• {{dates}}{{/dates}}</div>
    {{#notes.length}}<ul style="margin:6px 0 12px 18px">{{#notes}}<li>{{.}}</li>{{/notes}}</ul>{{/notes.length}}
  {{/education}}
  {{/_hasEducation}}
</div>
`.trim()
  }
];

export default function TemplatesAdmin() {
  const [items, setItems] = useState<CustomTpl[]>([]);
  const [name, setName] = useState('');
  const [html, setHtml] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [validation, setValidation] = useState<TemplateValidation>({ ok: true, errors: [] });

  const col = collection(db, 'templates');
  const ownerId = (auth as any)?.currentUser?.uid ?? null;

  const load = async () => {
    const snap = await getDocs(query(col, orderBy('createdAt', 'desc')));
    setItems(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
  };

  useEffect(() => { load(); }, []);

  // live validation as you type
  useEffect(() => {
    if (!html.trim()) { setValidation({ ok: true, errors: [] }); return; }
    setValidation(validateTemplateHtml(html.trim()) as TemplateValidation);
  }, [html]);

  const create = async () => {
    const trimmedName = name.trim();
    const trimmedHtml = html.trim();

    if (!trimmedName || !trimmedHtml) {
      toast.error('Name and HTML are required.');
      return;
    }

    // Validate first
    let v = validateTemplateHtml(trimmedHtml) as TemplateValidation;

    let htmlToSave = trimmedHtml;
    if (!v.ok) {
      // Try a safe auto-fix (wrap .resume, add anchors, etc.)
      const fixed = autoFixTemplateHtml(trimmedHtml);
      const v2 = validateTemplateHtml(fixed) as TemplateValidation;
      if (!v2.ok) {
        setValidation(v2);
        toast.error('Template rejected:\n' + v2.errors.join('\n'));
        return;
      }
      htmlToSave = fixed;
      v = v2;
    }

    await addDoc(col, {
      name: trimmedName,
      html: htmlToSave,
      public: isPublic,
      version: TEMPLATE_VERSION,
      createdAt: serverTimestamp(),
      ownerId,
    });

    toast.success(v.ok ? 'Template saved ✔️' : 'Template auto-fixed & saved ✔️');
    setName(''); setHtml('');
    await load();
  };

  const seed = async () => {
    let created = 0;
    for (const t of SAMPLE_TEMPLATES) {
      const v = validateTemplateHtml(t.html) as TemplateValidation;
      if (!v.ok) { console.warn('Seed skipped (invalid):', t.name, v.errors); continue; }
      await addDoc(col, {
        ...t,
        public: true,
        version: TEMPLATE_VERSION,
        createdAt: serverTimestamp(),
        ownerId,
      });
      created++;
    }
    await load();
    toast.success(`Seeded ${created} sample template${created === 1 ? '' : 's'}.`);
  };

  const insertSkeleton = () => {
    setName((n) => n || 'Professional resume');
    setHtml(TEMPLATE_MINIMAL_SKELETON);
    toast('Inserted minimal skeleton');
  };

  const remove = async (id: string) => {
    await deleteDoc(doc(db, 'templates', id));
    await load();
    toast.success('Deleted');
  };

  const validBadge = useMemo(() => {
    if (html.trim().length === 0) return null;
    if (validation.ok) {
      return <span className="text-xs px-2 py-1 rounded-full bg-emerald-600/20 text-emerald-400">Valid ✓</span>;
    }
    return <span className="text-xs px-2 py-1 rounded-full bg-red-600/20 text-red-400">Invalid</span>;
  }, [html, validation]);

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Templates Admin</h1>

      <div className="flex gap-2 flex-wrap">
        <button onClick={seed} className="rounded-lg bg-white text-black px-3 py-2 font-semibold">Seed sample templates</button>
        <button onClick={insertSkeleton} className="rounded-lg bg-neutral-100 text-black px-3 py-2 font-semibold">Insert minimal skeleton</button>
        <button onClick={load} className="rounded-lg bg-neutral-800 px-3 py-2">Refresh</button>
      </div>

      <div className="grid gap-3">
        <div className="flex items-center gap-3">
          <input
            value={name}
            onChange={e=>setName(e.target.value)}
            placeholder="Template name"
            className="flex-1 rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-2"
          />
          {validBadge}
        </div>

        <label className="flex items-center gap-2 text-sm text-neutral-400">
          <input type="checkbox" checked={isPublic} onChange={e=>setIsPublic(e.target.checked)} />
          Public
        </label>

        <textarea
          value={html}
          onChange={e=>setHtml(e.target.value)}
          rows={16}
          placeholder="Paste Mustache/HTML template that follows the contract…"
          className="rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-2 font-mono text-xs"
        />

        {!validation.ok && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            <div className="font-semibold mb-1">Template must be fixed before saving:</div>
            <ul className="list-disc pl-5 space-y-1">
              {validation.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
            <div className="text-xs mt-2 opacity-80">
              Tip: click “Create template” and I’ll try to auto-fix common issues (wrap missing
              <code className="mx-1">.resume</code> root, add anchors, etc.).
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={create} className="rounded-lg bg-white text-black px-3 py-2 font-semibold">
            Create template
          </button>
        </div>
      </div>

      <div className="divide-y divide-neutral-800 rounded-xl border border-neutral-800">
        {items.map(t => (
          <div key={t.id} className="p-4 flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold">{t.name}</div>
              <div className="text-xs text-neutral-500">id: {t.id}</div>
              {t.version != null && <div className="text-[10px] text-neutral-500 mt-1">version: {t.version}</div>}
              <div className="text-xs text-neutral-400 mt-2 line-clamp-2">{t.html.slice(0, 200)}...</div>
            </div>
            <button onClick={()=>remove(t.id!)} className="text-sm text-red-400 hover:underline">Delete</button>
          </div>
        ))}
        {!items.length && <div className="p-4 text-sm text-neutral-400">No templates yet.</div>}
      </div>
    </main>
  );
}
