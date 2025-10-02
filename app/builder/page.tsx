'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Loader2, FileDown, Wand2 } from 'lucide-react';
import type { ResumeOutput } from '@/types';
// ❌ remove react-to-print (we'll export via /api/export/pdf)
// import { useReactToPrint } from 'react-to-print';
import { db } from '@/app/firebase';
import { getDocs, collection, query, orderBy, limit } from 'firebase/firestore';
import ATSScore from '@/components/ATSScore';
import CustomTemplate from '@/components/CustomTemplate';
import { ResumePreview } from '@/components/Preview';
import Mustache from 'mustache';
import DOMPurify from 'isomorphic-dompurify';
import { normalize } from '@/lib/normalize';
import SiteNavAuth from '@/components/SiteNavAuth';
import AuthGate from '@/components/AuthGate';
import ForceLinkAccount from '@/components/ForceLinkAccount';

const Schema = z.object({
  resumeText: z.string().min(50, 'Paste your existing resume or work history (50+ chars).'),
  jobDescription: z.string().optional(),
  role: z.string().optional(),
  seniority: z.enum(['junior','mid','senior']).optional(),
  tone: z.enum(['professional','friendly','impactful','concise']).optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
});

type FormVals = z.infer<typeof Schema>;
type CustomTpl = { id: string; name: string; html: string };
function toStrings(arr: any): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((v) => (typeof v === 'string' ? v : v?.value ?? v?.name ?? v?.label ?? String(v)));
}

// Build a full standalone HTML document (for Puppeteer)
function buildDoc(htmlBody: string, headExtra = '') {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<!-- speed up font loading -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${headExtra}
<style>
  /* Respect template @page if present; otherwise these are safe fallbacks */
  @page { size: A4; margin: 16mm; }
  html, body { background: #fff; }
  /* keep colors & weights in PDFs identical to screen */
  html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style>
</head>
<body>${htmlBody}</body>
</html>`;
}


/**
 * Render a CustomTemplate HTML string exactly like the iframe preview:
 * - Mustache render
 * - keep <style> and <link rel="stylesheet"> in <head>
 * - sanitize BODY only (allow images + data: URIs)
 */
function renderCustomTemplateDoc(templateHtml: string, view: any): string {
  // 1) First Mustache pass
  const rendered = Mustache.render(templateHtml, view);

  // 2) Move <style>/<link rel="stylesheet"> into <head>
  const tmp = document.implementation.createHTMLDocument('');
  tmp.body.innerHTML = rendered;

  const styleTags = Array.from(tmp.querySelectorAll('style'));
  const linkTags  = Array.from(tmp.querySelectorAll('link[rel="stylesheet"],link[href*="fonts.googleapis"]'));

  const headBits: string[] = [];
  linkTags.forEach(l => headBits.push(l.outerHTML));
  styleTags.forEach(s => headBits.push(s.outerHTML));
  styleTags.forEach(n => n.remove());
  linkTags.forEach(n => n.remove());

  // 3) Sanitize the BODY only (preserve inline styles and data: URIs)
  const safeBody = DOMPurify.sanitize(tmp.body.innerHTML, {
    ADD_TAGS: ['img','figure','figcaption'],
    ADD_ATTR: ['style','src','alt','width','height','loading'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|data|blob):|\/|#)/i,
    FORBID_TAGS: ['script'],
    // @ts-ignore
    FORBID_ATTR: [/^on/i],
  });

  // 4) Return complete document
  return buildDoc(safeBody, headBits.join('\n'));
}

export default function ResumeForm() {
  const { register, handleSubmit, watch, formState: { errors } } =
    useForm<FormVals>({ resolver: zodResolver(Schema) });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResumeOutput | null>(null);
  const [letter, setLetter] = useState('');
  const [template, setTemplate] = useState<'ats'|'modern'>('ats');
  const [customTemplates, setCustomTemplates] = useState<CustomTpl[]>([]);
  const [selectedCustomId, setSelectedCustomId] = useState('');
const [avatar, setAvatar] = useState<string>("");
const [account, setAccount] = useState<{accountId:string; externalUid:string; primaryEmail:string} | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
  let mounted = true;
  (async () => {
    try {
      const res = await fetch('/api/account/ensure', { method: 'POST' });
      if (!res.ok) throw new Error('ensure failed');
      const json = await res.json();
      if (mounted) setAccount(json);
    } catch (e) { console.error(e); }
  })();
  return () => { mounted = false; };
}, []);

  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, 'templates'), orderBy('createdAt', 'desc'), limit(20));
        const snap = await getDocs(q);
        const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as CustomTpl[];
        setCustomTemplates(items.filter(t => t.html));
      } catch (e) {
        console.error('Failed to load templates', e);
      }
    })();
    
  }, []);


async function fileToDataUrl(file: File, max = 512): Promise<string> {
  // downscale so PDFs stay small
  const img = document.createElement("img");
  img.src = URL.createObjectURL(file);
  await new Promise(r => (img.onload = r));

  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  URL.revokeObjectURL(img.src);
  return dataUrl;
}

async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) return;
  const dataUrl = await fileToDataUrl(file, 640);
  setAvatar(dataUrl);
}

  const onGenerate = async (data: FormVals) => {
    try {
      setLoading(true);
      setLetter('');
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to generate');
      const json = await res.json();
      // @ts-ignore
      setResult(normalize(json));

      toast.success('Tailored resume ready');
    } catch (e: any) {
      toast.error(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const onCoverLetter = async () => {
    if (!result || !watch('jobDescription')) return toast('Add a job description first');
    try {
      setLoading(true);
      const res = await fetch('/api/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: result.summary,
          jobDescription: watch('jobDescription'),
          tone: watch('tone'),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed generating letter');
      setLetter(json.letter);
      toast.success('Cover letter generated');
    } catch (e: any) {
      toast.error(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  // --- NEW: export to PDF via our /api/export/pdf (A4, includes Tailwind because it prints /print)
const onExportPdf = async () => {
  if (!result) return toast('Generate the resume first');

  try {
    setLoading(true);

    // CUSTOM TEMPLATE → export the exact preview HTML
    if (selectedCustomId && result) {
      const tpl = customTemplates.find(t => t.id === selectedCustomId);
      if (!tpl?.html) throw new Error('Template missing HTML');

      // helpers to mirror preview
      const asStrings = (arr: any): string[] =>
        Array.isArray(arr)
          ? arr.map((v) => (typeof v === 'string' ? v : v?.value ?? v?.name ?? v?.label ?? String(v)))
          : [];
      const asObjs = (arr: string[]) => arr.map(value => ({ value }));

      // normalize data
      const coreS  = asStrings(result.skills?.core);
      const toolsS = asStrings(result.skills?.tools);
      const softS  = asStrings(result.skills?.soft);
// @ts-ignore
      const education = Array.isArray(result.education)
      // @ts-ignore
        ? result.education.map((e) => ({ ...e, notes: Array.isArray(e?.notes) ? e.notes : [] }))
        : [];
      const experience    = Array.isArray(result.experience) ? result.experience : [];
      const achievements  = Array.isArray(result.achievements) ? result.achievements : [];

      // the view CustomTemplate expects
      const view = {
        ...result,
        name: watch('name'),
        email: watch('email'),
        phone: watch('phone'),
        location: watch('location'),
        avatar,
        contact: [watch('email'), watch('phone'), watch('location')].filter(Boolean).join(' • '),

        // skills as {value} objects
        skills: { core: asObjs(coreS), tools: asObjs(toolsS), soft: asObjs(softS) },
        // (keep skills2 for legacy templates if any)
        skills2: { core: asObjs(coreS), tools: asObjs(toolsS), soft: asObjs(softS) },

        education,
        experience,
        achievements,

        // guard flags used by contract templates
        _hasSummary: !!result.summary,
        _hasExperience: experience.length > 0,
        _hasEducation: education.length > 0,
        _hasSkills: (coreS.length + toolsS.length + softS.length) > 0,
        _hasSkillsCore: coreS.length > 0,
        _hasSkillsTools: toolsS.length > 0,
        _hasSkillsSoft: softS.length > 0,
        _hasAchievements: achievements.length > 0,
      };

      // build full standalone HTML (keeps <style>/<link> in <head>)
      const fullHtml = renderCustomTemplateDoc(tpl.html, view);

      // optional debug: ensure the HTML actually contains your sections
      // console.log(fullHtml.slice(0, 2000));

      const res = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: fullHtml }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resume.pdf';
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    // BUILT-IN TEMPLATES → keep slug flow
    const slug = template === 'ats' ? 'executive-ats' : 'modern-two-col';
    const res = await fetch('/api/export/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: result,
        template: slug,
        accent: '#7c3aed',
      }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Export failed');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resume.pdf';
    a.click();
    URL.revokeObjectURL(url);
  } catch (e: any) {
    toast.error(e.message || 'PDF export failed');
  } finally {
    setLoading(false);
  }
};



  const resumeText = watch('resumeText') || '';
  const jobDescription = watch('jobDescription') || '';

  return (
    <AuthGate>
      {account && (
  <div className="text-xs text-neutral-400">
    UID: <code>{account.externalUid}</code>
    <button
      className="ml-2 underline"
      onClick={() => navigator.clipboard.writeText(`${location.origin}/?uid=${account.externalUid}`)}
    >
      Copy tracking link
    </button>
  </div>
)}
      <SiteNavAuth />
      <ForceLinkAccount /> 

    
    <div className="builder grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT: Form */}
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <input className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2" placeholder="Target role (e.g., Senior Frontend Engineer)" {...register('role')} />
          <select className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2" {...register('seniority')}>
            <option value="">Seniority</option>
            <option value="junior">Junior</option>
            <option value="mid">Mid</option>
            <option value="senior">Senior</option>
          </select>
          <select className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2" {...register('tone')}>
            <option value="professional">Tone: Professional</option>
            <option value="friendly">Tone: Friendly</option>
            <option value="impactful">Tone: Impactful</option>
            <option value="concise">Tone: Concise</option>
          </select>
          <input className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2" placeholder="Name (for header)" {...register('name')} />
          <input className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2" placeholder="Email" {...register('email')} />
          <input className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2" placeholder="Phone" {...register('phone')} />
          <input className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2 sm:col-span-2" placeholder="Location" {...register('location')} />
        </div>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-neutral-800 overflow-hidden flex items-center justify-center">
            {avatar ? (
              <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-neutral-500">No photo</span>
            )}
          </div>

          <label className="inline-flex items-center gap-2 rounded-xl bg-neutral-800 text-white px-3 py-2 cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={onAvatarChange}
              className="hidden"
            />
            Upload Avatar
          </label>

          {avatar && (
            <button
              type="button"
              className="text-sm text-neutral-400 underline"
              onClick={() => setAvatar("")}
            >
              Remove
            </button>
          )}
        </div>

        <label className="block text-sm text-neutral-300">Current resume / work history</label>
        <textarea rows={10} className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2" placeholder="Paste your resume..." {...register('resumeText')} />
        {errors.resumeText && <p className="text-xs text-red-400">{errors.resumeText.message}</p>}

        <label className="block text-sm text-neutral-300">Job description (optional, for tailoring)</label>
        <textarea rows={8} className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2" placeholder="Paste the JD..." {...register('jobDescription')} />


        <div className="flex flex-wrap items-center gap-3">
          <button onClick={handleSubmit(onGenerate)} className="inline-flex items-center gap-2 rounded-xl bg-white text-black px-4 py-2 font-semibold disabled:opacity-60 btn-gradient">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            Tailor Resume
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={onCoverLetter} className="inline-flex items-center gap-2 rounded-xl bg-neutral-800 text-white px-4 py-2 font-semibold disabled:opacity-60">
            Generate Cover Letter
          </button>
          <button
            onClick={() => setTemplate(t => (t === 'ats' ? 'modern' : 'ats'))}
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-800 text-white px-4 py-2 font-semibold"
          >
            Switch to {template === 'ats' ? 'Modern' : 'ATS'} Template
          </button>
          <button onClick={onExportPdf} className="inline-flex items-center gap-2 rounded-xl bg-neutral-800 text-white px-4 py-2 font-semibold">
            <FileDown className="w-4 h-4" /> Export PDF
          </button>
        </div>

        {/* Custom template picker */}
        {customTemplates.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-neutral-400">Custom template:</span>
            <select
              value={selectedCustomId}
              onChange={(e) => setSelectedCustomId(e.target.value)}
              className="rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2"
            >
              <option value="">— Built-in templates —</option>
              {customTemplates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {selectedCustomId && (
              <button type="button" onClick={() => setSelectedCustomId('')} className="text-sm text-neutral-400 underline">
                Clear
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ATSScore
            resume={result ? [result.summary, ...result.experience.flatMap(e => e.bullets)].join('\n') : resumeText}
            job={jobDescription}
            keywords={result?.keywords || []}
          />
          {result && (
            <div className="rounded-2xl border border-neutral-800 p-4">
              <h3 className="text-sm font-medium text-neutral-300 mb-2">Suggestions</h3>
              <ul className="list-disc text-sm pl-5 text-neutral-400">
                {result.ats_notes.map((n, i) => (<li key={i}>{n}</li>))}
              </ul>
            </div>
          )}
        </div>

        {result && (
          <div className="rounded-2xl border border-neutral-800 p-4">
            <h3 className="text-sm font-medium text-neutral-300 mb-2">ATS Keywords</h3>
            <div className="flex flex-wrap gap-2">
              {result.keywords.map((k, i) => (<span key={i} className="px-2 py-1 rounded-lg bg-neutral-800 text-xs">{k}</span>))}
            </div>
          </div>
        )}

        {letter && (
          <div className="rounded-2xl border border-neutral-800 p-4">
            <h3 className="text-sm font-medium text-neutral-300 mb-2">Cover Letter</h3>
            <pre className="whitespace-pre-wrap text-sm text-neutral-300">{letter}</pre>
          </div>
        )}
      </div>

      {/* RIGHT: A4 Preview (built-in OR custom) */}
      <div className="sticky top-4 h-fit flex justify-center">
        <div className="a4-preview-wrap">
          <div ref={previewRef} className="a4-sheet p-6">
            {selectedCustomId && result ? (
              <CustomTemplate
                html={customTemplates.find(t => t.id === selectedCustomId)!.html}
                data={result}
                name={watch('name')}
                email={watch('email')}
                phone={watch('phone')}
                location={watch('location')}
                avatar={avatar}
              />
            ) : (
              <ResumePreview
                data={result}
                template={template}
                name={watch('name')}
                email={watch('email')}
                phone={watch('phone')}
                location={watch('location')}
              />
            )}
          </div>
        </div>
      </div>
    </div>
    </AuthGate>
  );
}
