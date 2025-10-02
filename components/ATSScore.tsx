'use client';
import React, { useMemo } from 'react';

const ACTION_VERBS = [
  'led','built','delivered','launched','owned','optimized','designed','shipped','migrated','reduced','increased',
  'automated','improved','created','implemented','developed','architected','scaled','refactored','mentored','drove'
];

function tokenize(s: string) {
  return (s || '').toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(Boolean);
}

export function computeATS(resumeText: string, jobText: string, keywords: string[] = []) {
  const resumeTokens = new Set(tokenize(resumeText));
  const jobTokens = new Set(tokenize(jobText));
  const kw = new Set(keywords.map(k => k.toLowerCase()));
  const overlap = [...jobTokens].filter(t => resumeTokens.has(t));
  const kwHit = [...kw].filter(k => resumeTokens.has(k));
  const numbers = (resumeText.match(/\b\d+(%|k|m|x)?\b/gi) || []).length;
  const verbs = ACTION_VERBS.filter(v => resumeTokens.has(v)).length;
  const lengthOk = resumeText.length >= 1200 && resumeText.length <= 6000;

  // crude but useful heuristic
  let score = 40 * (kw.size ? kwHit.length / Math.max(1, kw.size) : 0);
  score += 25 * (overlap.length / Math.max(20, jobTokens.size)); // cap
  score += Math.min(10, numbers * 2);
  score += Math.min(10, verbs * 2);
  score += lengthOk ? 5 : 0;
  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, kwHit, kwTotal: kw.size, overlapCount: overlap.length };
}

export default function ATSScore({ resume, job, keywords }: { resume: string; job: string; keywords: string[]; }) {
  const res = useMemo(() => computeATS(resume, job, keywords), [resume, job, keywords]);
  const barWidth = `${res.score}%`;
  return (
    <div className="rounded-2xl border border-neutral-800 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-neutral-300">ATS Match</h3>
        <span className="text-lg font-semibold">{res.score}/100</span>
      </div>
      <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden mb-3">
        <div className="h-full bg-green-500" style={{ width: barWidth }} />
      </div>
      <p className="text-xs text-neutral-400">
        Keywords matched: <span className="font-semibold text-neutral-200">{res.kwHit.length}</span>
        {res.kwTotal ? <> / {res.kwTotal}</> : null}
      </p>
    </div>
  );
}
