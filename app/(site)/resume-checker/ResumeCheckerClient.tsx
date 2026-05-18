"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { track } from "@/lib/track";
import { setCheckerHandoff } from "@/lib/checkerHandoff";

type Hygiene = {
  hasEmail: boolean;
  hasPhone: boolean;
  hasLink: boolean;
  hasBullets: boolean;
  hostile: string[];
  wordCountOk: boolean;
};

type Result = {
  score: number;
  band: 'low' | 'fair' | 'good' | 'excellent';
  resumeWordCount: number;
  keywords: { total: number; matched: string[]; missing: string[]; rate: number };
  hygiene: Hygiene;
  recommendations: string[];
};

const BAND_COLOURS: Record<Result['band'], { ring: string; text: string; bg: string; label: string }> = {
  excellent: { ring: 'ring-emerald-400', text: 'text-emerald-700', bg: 'bg-emerald-50', label: 'Excellent' },
  good:      { ring: 'ring-blue-400',    text: 'text-blue-700',    bg: 'bg-blue-50',    label: 'Good' },
  fair:      { ring: 'ring-amber-400',   text: 'text-amber-700',   bg: 'bg-amber-50',   label: 'Fair' },
  low:       { ring: 'ring-rose-400',    text: 'text-rose-700',    bg: 'bg-rose-50',    label: 'Needs work' },
};

export default function ResumeCheckerClient() {
  const router = useRouter();
  const [resume, setResume] = React.useState("");
  const [job, setJob] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [uploadedName, setUploadedName] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<Result | null>(null);
  const resultRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function onUpload(file: File) {
    setError(null);
    setUploading(true);
    setUploadedName(null);
    try {
      track({ event: 'ats_check_upload', props: { size: file.size, type: file.type } });
      const form = new FormData();
      form.append('file', file);
      const r = await fetch('/api/ats/extract', { method: 'POST', body: form });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.detail || j?.error || 'extract_failed');
      setResume(j.text || '');
      setUploadedName(j.filename || file.name);
    } catch (e: any) {
      setError(e?.message || 'Could not read that file.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function clearUpload() {
    setUploadedName(null);
    setResume('');
  }

  async function onCheck() {
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      track({ event: 'ats_check_start', props: { resume_len: resume.length, job_len: job.length } });
      const r = await fetch('/api/ats/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, job }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.detail || j?.error || 'check_failed');
      setResult(j as Result);
      track({ event: 'ats_check_complete', props: { score: j.score, band: j.band } });
      // Scroll the result into view on next paint.
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (e: any) {
      setError(e?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = resume.trim().length >= 100 && job.trim().length >= 30 && !loading;

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-lg bg-white border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-2">
            <label className="block text-sm font-semibold text-[#1d1d20]">
              1. Your resume
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-xs font-medium px-3 py-1.5 rounded-md border border-gray-300 text-[#1d1d20] hover:bg-gray-50 disabled:opacity-60"
              >
                {uploading ? 'Reading…' : 'Upload PDF / DOCX'}
              </button>
            </div>
          </div>
          {uploadedName && (
            <div className="mb-2 flex items-center gap-2 text-[11px] rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-1">
              <span className="truncate">📄 {uploadedName}</span>
              <button
                type="button"
                onClick={clearUpload}
                className="ml-auto text-emerald-700 hover:underline"
              >
                clear
              </button>
            </div>
          )}
          <textarea
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            placeholder="Paste your full resume text here — or upload a PDF / DOCX above."
            rows={14}
            className="w-full text-sm rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-y leading-relaxed text-[#1d1d20]"
            spellCheck={false}
          />
          <div className="mt-1 text-[11px] text-[#a1a1aa]">
            {resume.trim().length} characters
          </div>
        </div>
        <div className="rounded-lg bg-white border border-gray-200 p-5 shadow-sm">
          <label className="block text-sm font-semibold text-[#1d1d20] mb-2">
            2. Paste the job description
          </label>
          <textarea
            value={job}
            onChange={(e) => setJob(e.target.value)}
            placeholder="Paste the full job posting you want to apply for…"
            rows={14}
            className="w-full text-sm rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-y leading-relaxed text-[#1d1d20]"
            spellCheck={false}
          />
          <div className="mt-1 text-[11px] text-[#a1a1aa]">
            {job.trim().length} characters
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
        <button
          onClick={onCheck}
          disabled={!canSubmit}
          className="btn-primary px-8 py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Scoring…' : 'Check my resume'}
        </button>
        <p className="text-xs text-[#52525a]">
          Free · no signup · instant
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 text-rose-800 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div ref={resultRef} className="mt-8 space-y-5">
          <ResultCard result={result} />

          {/* Bottom CTA */}
          <div className="rounded-lg bg-brand-50 border border-brand-100 p-6 text-center">
            <h3 className="text-xl font-semibold text-[#1d1d20]">
              Want a perfectly tailored resume?
            </h3>
            <p className="mt-2 text-sm text-[#52525a]">
              ResumeMint AI rewrites your bullets, adds the missing keywords where they truthfully fit,
              and exports a clean ATS-friendly PDF in minutes.
            </p>
            <button
              type="button"
              onClick={() => {
                setCheckerHandoff({
                  resumeText: resume,
                  jdText: job,
                  score: result.score,
                });
                track({ event: 'ats_check_to_builder', props: { score: result.score, band: result.band } });
                router.push('/builder?from=resume-checker');
              }}
              className="btn-primary mt-4 inline-flex"
            >
              Build my tailored resume
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultCard({ result }: { result: Result }) {
  const band = BAND_COLOURS[result.band];
  const matchedPct = Math.round(result.keywords.rate * 100);

  return (
    <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      <div className="grid md:grid-cols-[280px_1fr] gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-200">
        {/* Score circle */}
        <div className="p-6 flex flex-col items-center justify-center text-center">
          <div className={`relative h-32 w-32 rounded-full ${band.bg} ring-4 ${band.ring} grid place-items-center`}>
            <div>
              <div className={`text-4xl font-bold ${band.text}`}>{result.score}</div>
              <div className="text-[10px] uppercase tracking-wide text-[#52525a]">/ 100</div>
            </div>
          </div>
          <div className={`mt-3 inline-block text-xs font-semibold uppercase tracking-wide ${band.text}`}>
            {band.label}
          </div>
          <div className="mt-1 text-[11px] text-[#52525a]">
            {result.resumeWordCount} words
          </div>
        </div>

        {/* Breakdown */}
        <div className="p-6 space-y-5">
          {/* Keyword bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-sm font-semibold text-[#1d1d20]">Keyword coverage</div>
              <div className="text-sm text-[#52525a]">
                {result.keywords.matched.length} / {result.keywords.total} ({matchedPct}%)
              </div>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-brand transition-all duration-500"
                style={{ width: `${matchedPct}%` }}
              />
            </div>
          </div>

          {/* Hygiene chips */}
          <div>
            <div className="text-sm font-semibold text-[#1d1d20] mb-2">Formatting hygiene</div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Chip ok={result.hygiene.hasEmail} label="Email" />
              <Chip ok={result.hygiene.hasPhone} label="Phone" />
              <Chip ok={result.hygiene.hasLink} label="LinkedIn / web" />
              <Chip ok={result.hygiene.hasBullets} label="Bullets" />
              <Chip ok={result.hygiene.wordCountOk} label="Length (250–1100 words)" />
              <Chip ok={result.hygiene.hostile.length === 0} label="ATS-safe characters" />
            </div>
          </div>

          {/* Missing keywords */}
          {result.keywords.missing.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-[#1d1d20] mb-2">
                Top JD keywords missing from your resume
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.keywords.missing.slice(0, 14).map((kw) => (
                  <span
                    key={kw}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200"
                  >
                    {kw}
                  </span>
                ))}
                {result.keywords.missing.length > 14 && (
                  <span className="text-[11px] text-[#a1a1aa]">+{result.keywords.missing.length - 14} more</span>
                )}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-[#1d1d20] mb-2">What to fix</div>
              <ul className="space-y-1.5 text-sm text-[#52525a] list-disc pl-5">
                {result.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${
        ok
          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
          : 'bg-rose-50 text-rose-800 border-rose-200'
      }`}
    >
      <span aria-hidden>{ok ? '✓' : '✗'}</span>
      {label}
    </span>
  );
}
