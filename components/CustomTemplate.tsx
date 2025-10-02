// components/CustomTemplate.tsx
// @ts-nocheck
'use client';
import React, { useMemo } from 'react';
import Mustache from 'mustache';
import DOMPurify from 'isomorphic-dompurify';
import type { ResumeOutput } from '@/types';

const toStrings = (arr: any): string[] =>
  Array.isArray(arr) ? arr.map((v) => (typeof v === 'string' ? v : v?.value ?? v?.name ?? v?.label ?? String(v))).filter(Boolean) : [];

const buildDoc = (bodyHtml: string, headHtml = '') => `<!doctype html>
<html><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${headHtml}
<style>@page{size:A4;margin:16mm}html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact;background:#fff}</style>
</head><body>${bodyHtml}</body></html>`;

export default function CustomTemplate(props: {
  html: string; data: ResumeOutput;
  name?: string; email?: string; phone?: string; location?: string; website?: string; avatar?: string;
}) {
  const view = useMemo(() => {
    const d = props.data || ({} as any);
    const core = toStrings(d.skills?.core);
    const tools = toStrings(d.skills?.tools);
    const soft  = toStrings(d.skills?.soft);

    // @ts-ignore
    const edu = Array.isArray(d.education) ? d.education.map((e: any) => ({ ...e, notes: Array.isArray(e?.notes) ? e.notes : [] })) : [];

        // NEW
    const languages  = Array.isArray(d.languages) ? d.languages.filter(Boolean) : [];
    const references = Array.isArray(d.references) ? d.references.filter((r: any) => r && r.name) : [];

    const flags = {
      _hasSummary: !!d.summary,
      _hasExperience: Array.isArray(d.experience) && d.experience.length > 0,
      _hasEducation: edu.length > 0,
      _hasSkills: !!(core.length || tools.length || soft.length),
      _hasSkillsCore: core.length > 0,
      _hasSkillsTools: tools.length > 0,
      _hasSkillsSoft: soft.length > 0,
      _hasAchievements: Array.isArray(d.achievements) && d.achievements.length > 0,
            // NEW guards
      _hasLanguages: Array.isArray(d.languages) && d.languages.length > 0,
      _hasReferences: Array.isArray(d.references) && d.references.length > 0,
    };

    return {
      ...d,
      ...flags,
      name: props.name ?? d.name,
      email: props.email ?? d.contact?.email,
      phone: props.phone ?? d.contact?.phone,
      location: props.location ?? d.contact?.location,
      website: props.website ?? d.contact?.website,
      avatar: props.avatar,
      contact: [props.email ?? d.contact?.email, props.phone ?? d.contact?.phone, props.location ?? d.contact?.location]
        .filter(Boolean).join(' • '),

      // both shapes supported
      skills: { core, tools, soft },
      skills2: { core: core.map((value) => ({ value })), tools: tools.map((value) => ({ value })), soft: soft.map((value) => ({ value })) },
      education: edu,
      languages: Array.isArray(d.languages) ? d.languages : [],
      references: Array.isArray(d.references) ? d.references : [],
    };
  }, [props]);

  const srcDoc = useMemo(() => {
    const rendered = Mustache.render(props.html, view);

    // move <style>/<link> to head, sanitize BODY only
    const tmp = document.implementation.createHTMLDocument('');
    tmp.body.innerHTML = rendered;
    const styleTags = Array.from(tmp.querySelectorAll('style'));
    const linkTags  = Array.from(tmp.querySelectorAll('link[rel="stylesheet"],link[href*="fonts.googleapis"]'));

    const headBits: string[] = [];
    linkTags.forEach(l => headBits.push(l.outerHTML));
    styleTags.forEach(s => headBits.push(s.outerHTML));
    styleTags.forEach(n => n.remove());
    linkTags.forEach(n => n.remove());

    const safeBody = DOMPurify.sanitize(tmp.body.innerHTML, {
      ADD_TAGS: ['img','figure','figcaption'],
      ADD_ATTR: ['style','src','alt','width','height','loading'],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|data|blob):|\/|#)/i,
      FORBID_TAGS: ['script'],
      FORBID_ATTR: [/^on/i],
    });

    return buildDoc(safeBody, headBits.join('\n'));
  }, [props.html, view]);

  return <iframe title="resume-preview" srcDoc={srcDoc} style={{ width: '100%', height: 1123, border: 0, borderRadius: 16, background: 'white' }} />;
}
