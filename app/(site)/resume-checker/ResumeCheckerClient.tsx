"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/track";
import { setCheckerHandoff } from "@/lib/checkerHandoff";

type CheckStatus = "pass" | "warn" | "fail";
type Check = {
  id: string;
  name: string;
  status: CheckStatus;
  summary: string;
  fixHint?: string;
  evidence?: string[];
  score: number;
};
type Category = {
  id: string;
  name: string;
  description: string;
  scorePercent: number;
  weight: number;
  issueCount: number;
  checks: Check[];
  keywords?: { total: number; matched: string[]; missing: string[]; rate: number };
};
type Result = {
  score: number;
  band: "low" | "fair" | "good" | "excellent";
  resumeWordCount: number;
  keywords: { total: number; matched: string[]; missing: string[]; rate: number };
  categories: Category[];
};

const BAND_COLOURS: Record<Result["band"], { ring: string; text: string; bg: string; label: string }> = {
  excellent: { ring: "ring-emerald-400", text: "text-emerald-700", bg: "bg-emerald-50", label: "Excellent" },
  good:      { ring: "ring-blue-400",    text: "text-blue-700",    bg: "bg-blue-50",    label: "Good" },
  fair:      { ring: "ring-amber-400",   text: "text-amber-700",   bg: "bg-amber-50",   label: "Fair" },
  low:       { ring: "ring-rose-400",    text: "text-rose-700",    bg: "bg-rose-50",    label: "Needs work" },
};

const PROGRESS_STEPS = [
  "Parsing your resume",
  "Extracting your skills",
  "Analyzing your experience",
  "Generating recommendations",
];

export default function ResumeCheckerClient() {
  const router = useRouter();
  const [resume, setResume] = React.useState("");
  const [job, setJob] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [progressStep, setProgressStep] = React.useState(0);
  const [uploading, setUploading] = React.useState(false);
  const [uploadedName, setUploadedName] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<Result | null>(null);
  const [activeCategoryId, setActiveCategoryId] = React.useState<string | null>(null);
  const resultRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function onUpload(file: File) {
    setError(null);
    setUploading(true);
    setUploadedName(null);
    try {
      track({ event: "ats_check_upload", props: { size: file.size, type: file.type } });
      const form = new FormData();
      form.append("file", file);
      const r = await fetch("/api/ats/extract", { method: "POST", body: form });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.detail || j?.error || "extract_failed");
      setResume(j.text || "");
      setUploadedName(j.filename || file.name);
    } catch (e: any) {
      setError(e?.message || "Could not read that file.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function clearUpload() {
    setUploadedName(null);
    setResume("");
  }

  async function onCheck() {
    setError(null);
    setResult(null);
    setLoading(true);
    setProgressStep(0);

    // Animate the progress steps for delight.
    const stepInterval = setInterval(() => {
      setProgressStep((s) => Math.min(PROGRESS_STEPS.length - 1, s + 1));
    }, 600);

    try {
      track({ event: "ats_check_start", props: { resume_len: resume.length, job_len: job.length } });
      const r = await fetch("/api/ats/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, job }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.detail || j?.error || "check_failed");

      // Hold loading state long enough to read the last step.
      clearInterval(stepInterval);
      setProgressStep(PROGRESS_STEPS.length - 1);
      await new Promise((res) => setTimeout(res, 400));

      setResult(j as Result);
      setActiveCategoryId((j as Result).categories[0]?.id ?? null);
      track({ event: "ats_check_complete", props: { score: j.score, band: j.band } });
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      clearInterval(stepInterval);
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
                {uploading ? "Reading…" : "Upload PDF / DOCX"}
              </button>
            </div>
          </div>
          {uploadedName && (
            <div className="mb-2 flex items-center gap-2 text-[11px] rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-1">
              <span className="truncate">📄 {uploadedName}</span>
              <button type="button" onClick={clearUpload} className="ml-auto text-emerald-700 hover:underline">
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
          <div className="mt-1 text-[11px] text-[#a1a1aa]">{resume.trim().length} characters</div>
        </div>
        <div className="rounded-lg bg-white border border-gray-200 p-5 shadow-sm">
          <label className="block text-sm font-semibold text-[#1d1d20] mb-2">2. Paste the job description</label>
          <textarea
            value={job}
            onChange={(e) => setJob(e.target.value)}
            placeholder="Paste the full job posting you want to apply for…"
            rows={14}
            className="w-full text-sm rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-y leading-relaxed text-[#1d1d20]"
            spellCheck={false}
          />
          <div className="mt-1 text-[11px] text-[#a1a1aa]">{job.trim().length} characters</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
        <button
          onClick={onCheck}
          disabled={!canSubmit}
          className="btn-primary px-8 py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Scoring…" : "Check my resume"}
        </button>
        <p className="text-xs text-[#52525a]">Free · no signup · everything visible</p>
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 text-rose-800 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Loading sequence */}
      {loading && <LoadingSequence step={progressStep} />}

      {/* Result */}
      {result && (
        <div ref={resultRef} className="mt-8 grid lg:grid-cols-[320px_1fr] gap-6">
          {/* Sidebar */}
          <ScoreSidebar
            result={result}
            activeCategoryId={activeCategoryId}
            onSelect={setActiveCategoryId}
          />
          {/* Main panel */}
          <div className="space-y-5">
            <CategoryPanel
              category={result.categories.find((c) => c.id === activeCategoryId) ?? result.categories[0]}
            />

            {/* Bottom CTA — same as before */}
            <div className="rounded-lg bg-brand-50 border border-brand-100 p-6 text-center">
              <h3 className="text-xl font-semibold text-[#1d1d20]">Fix everything in one click</h3>
              <p className="mt-2 text-sm text-[#52525a]">
                ResumeMint AI rewrites your bullets, adds missing keywords where they truthfully apply,
                and exports a clean ATS-friendly PDF in minutes.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCheckerHandoff({ resumeText: resume, jdText: job, score: result.score });
                  track({ event: "ats_check_to_builder", props: { score: result.score, band: result.band } });
                  router.push("/builder?from=resume-checker");
                }}
                className="btn-primary mt-4 inline-flex"
              >
                Build my tailored resume
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingSequence({ step }: { step: number }) {
  return (
    <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-8 grid md:grid-cols-[280px_1fr] gap-6 items-center">
      <div className="flex flex-col items-center gap-3">
        <div className="relative h-32 w-32">
          <svg viewBox="0 0 100 100" className="h-32 w-32 -rotate-90">
            <circle cx="50" cy="50" r="44" stroke="#eef0f4" strokeWidth="10" fill="none" />
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke="currentColor"
              strokeWidth="10"
              fill="none"
              strokeDasharray="276.5"
              strokeDashoffset={276.5 - (276.5 * (step + 1)) / PROGRESS_STEPS.length}
              className="text-brand transition-all duration-500 ease-out"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#a1a1aa]">Auditing</div>
              <div className="text-[11px] text-[#52525a]">{step + 1} / {PROGRESS_STEPS.length}</div>
            </div>
          </div>
        </div>
      </div>
      <ul className="space-y-3">
        {PROGRESS_STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={i} className="flex items-center gap-3">
              <span
                className={`grid place-items-center h-6 w-6 rounded-full transition-colors ${
                  done
                    ? "bg-brand text-white"
                    : active
                      ? "bg-brand/15 text-brand ring-2 ring-brand/40"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {done ? "✓" : active ? "…" : "·"}
              </span>
              <span
                className={`text-sm ${
                  done ? "text-[#1d1d20]" : active ? "text-[#1d1d20] font-medium" : "text-[#a1a1aa]"
                }`}
              >
                {s}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ScoreSidebar({
  result,
  activeCategoryId,
  onSelect,
}: {
  result: Result;
  activeCategoryId: string | null;
  onSelect: (id: string) => void;
}) {
  const band = BAND_COLOURS[result.band];
  return (
    <aside className="rounded-xl bg-white border border-gray-200 shadow-sm p-5 lg:sticky lg:top-20 h-fit">
      <div className="text-center">
        <div className="text-sm font-semibold text-[#1d1d20]">Your score</div>
        <div className="mt-3 relative h-32 w-32 mx-auto">
          <svg viewBox="0 0 100 100" className="h-32 w-32 -rotate-90">
            <circle cx="50" cy="50" r="44" stroke="#eef0f4" strokeWidth="10" fill="none" />
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke="currentColor"
              strokeWidth="10"
              fill="none"
              strokeDasharray="276.5"
              strokeDashoffset={276.5 - (276.5 * result.score) / 100}
              className={band.text}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div>
              <div className={`text-3xl font-bold ${band.text}`}>{result.score}</div>
              <div className="text-[10px] uppercase tracking-wide text-[#52525a]">/ 100</div>
            </div>
          </div>
        </div>
        <div className={`mt-2 inline-block text-xs font-semibold uppercase tracking-wide ${band.text}`}>
          {band.label}
        </div>
        <div className="mt-1 text-[11px] text-[#52525a]">
          {result.resumeWordCount} words ·
          {' '}
          {result.categories.reduce((s, c) => s + c.issueCount, 0)} issues
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-gray-100 space-y-1">
        {result.categories.map((c) => {
          const isActive = c.id === activeCategoryId;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-left transition-colors ${
                isActive ? "bg-brand-50 text-[#1d1d20]" : "hover:bg-gray-50 text-[#52525a]"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wide font-semibold">{c.name}</span>
                {c.issueCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
                    {c.issueCount}
                  </span>
                )}
              </span>
              <span className={`text-xs font-semibold ${scoreColor(c.scorePercent)}`}>{c.scorePercent}%</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function CategoryPanel({ category }: { category: Category }) {
  return (
    <div className="rounded-xl bg-white border border-gray-200 shadow-sm">
      <header className="flex items-start justify-between gap-4 p-5 border-b border-gray-100">
        <div>
          <h3 className="text-lg font-semibold text-[#1d1d20]">{category.name}</h3>
          <p className="text-sm text-[#52525a] mt-1">{category.description}</p>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-2xl font-bold ${scoreColor(category.scorePercent)}`}>{category.scorePercent}%</div>
          <div className="text-[11px] text-[#52525a]">
            {category.issueCount} {category.issueCount === 1 ? "issue" : "issues"}
          </div>
        </div>
      </header>

      <ul className="divide-y divide-gray-100">
        {category.checks.map((c) => (
          <li key={c.id} className="p-5">
            <CheckRow check={c} />
          </li>
        ))}
      </ul>

      {category.keywords && category.keywords.missing.length > 0 && (
        <div className="p-5 border-t border-gray-100 bg-[#f8fbfc]">
          <div className="text-sm font-semibold text-[#1d1d20]">Top missing JD keywords</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {category.keywords.missing.slice(0, 16).map((kw) => (
              <span
                key={kw}
                className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200"
              >
                {kw}
              </span>
            ))}
            {category.keywords.missing.length > 16 && (
              <span className="text-[11px] text-[#a1a1aa]">+{category.keywords.missing.length - 16} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CheckRow({ check }: { check: Check }) {
  const meta = STATUS_META[check.status];
  return (
    <div className="flex items-start gap-3">
      <span
        className={`grid place-items-center h-6 w-6 rounded-full shrink-0 ${meta.bg} ${meta.text} text-xs font-bold`}
      >
        {meta.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#1d1d20]">{check.name}</span>
          <span className={`text-[10px] uppercase tracking-wide font-semibold ${meta.text}`}>
            {meta.label}
          </span>
        </div>
        <p className="mt-1 text-sm text-[#52525a]">{check.summary}</p>
        {check.fixHint && check.status !== "pass" && (
          <p className="mt-2 text-sm text-[#1d1d20]">
            <span className="font-semibold">Fix:</span> {check.fixHint}
          </p>
        )}
        {check.evidence && check.evidence.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {check.evidence.map((e, i) => (
              <li
                key={i}
                className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-[#52525a] border border-gray-200 font-mono"
              >
                {e}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function scoreColor(pct: number): string {
  if (pct >= 85) return "text-emerald-700";
  if (pct >= 70) return "text-blue-700";
  if (pct >= 50) return "text-amber-700";
  return "text-rose-700";
}

const STATUS_META: Record<CheckStatus, { icon: string; label: string; bg: string; text: string }> = {
  pass: { icon: "✓", label: "OK",       bg: "bg-emerald-100", text: "text-emerald-700" },
  warn: { icon: "!", label: "Warning",  bg: "bg-amber-100",   text: "text-amber-700" },
  fail: { icon: "✗", label: "Fix",      bg: "bg-rose-100",    text: "text-rose-700" },
};
