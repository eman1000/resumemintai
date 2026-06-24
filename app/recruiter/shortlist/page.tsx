"use client";

// /recruiter/shortlist — upload candidate resumes + a JD, AI ranks the best fits
// with evidence-based reasons. Phase 1 of the recruiter product (stateless).

import React from "react";
import { fetchAuthed } from "@/app/builder/_client/withAuth";
import RecruiterShell from "@/components/recruiter/RecruiterShell";

type Result = {
  id: string;
  name: string;
  score: number;
  verdict: string;
  strengths: string[];
  gaps: string[];
};

const MAX = 50;

function ShortlistTool() {
  const [jd, setJd] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<Result[] | null>(null);
  const [skipped, setSkipped] = React.useState<string[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      if (next.length >= MAX) break;
      if (!next.some((x) => x.name === f.name && x.size === f.size)) next.push(f);
    }
    setFiles(next);
  };

  const run = async () => {
    if (!jd.trim()) { setError("Paste the job description first."); return; }
    if (!files.length) { setError("Add at least one candidate resume."); return; }
    setBusy(true); setError(null); setResults(null); setSkipped([]);
    try {
      const fd = new FormData();
      fd.append("jdText", jd);
      files.forEach((f) => fd.append("files", f));
      const res = await fetchAuthed("/api/recruiter/shortlist", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.detail || json?.error || "Shortlisting failed");
      setResults(json.results || []);
      setSkipped(json.skipped || []);
    } catch (e: any) {
      setError((e?.message || e).toString());
    } finally {
      setBusy(false);
    }
  };

  return (
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-6">
          <span className="inline-block text-[11px] font-semibold tracking-[0.18em] uppercase text-blue-700 bg-blue-50 rounded-full px-3 py-1">
            For recruiters
          </span>
          <h1 className="mt-3 text-3xl font-bold text-gray-900">AI candidate shortlisting</h1>
          <p className="mt-2 text-gray-600 max-w-2xl">
            Drop in a job description and a stack of resumes — the AI ranks the best-fit candidates with
            evidence-based reasons and honest gaps. It only judges what each resume actually says.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* JD */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job description</label>
            <textarea
              className="w-full h-64 rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Paste the full job description / requirements here…"
              value={jd}
              onChange={(e) => setJd(e.target.value)}
            />
          </div>

          {/* Resumes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Candidate resumes <span className="text-gray-400">(PDF / DOCX · up to {MAX})</span>
            </label>
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
              className="h-64 rounded-lg border-2 border-dashed border-gray-300 p-3 cursor-pointer hover:bg-gray-50 overflow-y-auto"
            >
              {files.length === 0 ? (
                <div className="h-full grid place-items-center text-center text-gray-500 text-sm">
                  <div>
                    <div className="text-2xl">＋</div>
                    Drop resumes here or click to choose<br />
                    <span className="text-xs text-gray-400">PDF or DOCX, multiple files</span>
                  </div>
                </div>
              ) : (
                <ul className="space-y-1">
                  {files.map((f, i) => (
                    <li key={i} className="flex items-center justify-between text-sm bg-gray-50 rounded px-2 py-1">
                      <span className="truncate">{f.name}</span>
                      <button
                        className="text-gray-400 hover:text-red-600 ml-2"
                        onClick={(e) => { e.stopPropagation(); setFiles(files.filter((_, j) => j !== i)); }}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              hidden
              onChange={(e) => addFiles(e.target.files)}
            />
            {files.length > 0 && (
              <div className="mt-1 text-xs text-gray-500">{files.length} resume{files.length === 1 ? "" : "s"} added</div>
            )}
          </div>
        </div>

        {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

        <div className="mt-6">
          <button
            onClick={run}
            disabled={busy}
            className="btn-primary px-6 py-3 text-base disabled:opacity-60"
          >
            {busy ? "Ranking candidates…" : `Shortlist ${files.length || ""} candidate${files.length === 1 ? "" : "s"}`}
          </button>
        </div>

        {skipped.length > 0 && (
          <div className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Couldn’t read {skipped.length} file{skipped.length === 1 ? "" : "s"} (likely scanned/image PDFs): {skipped.join(", ")}
          </div>
        )}

        {results && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Ranked candidates {results.length > 0 && <span className="text-gray-400 text-base">({results.length})</span>}
            </h2>
            <div className="space-y-3">
              {results.map((r, i) => (
                <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="grid place-items-center h-9 w-9 rounded-full bg-blue-600 text-white font-bold shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{r.name}</span>
                        <span className={`text-sm font-semibold rounded-full px-2.5 py-0.5 ${
                          r.score >= 75 ? "bg-green-100 text-green-800" :
                          r.score >= 50 ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700"
                        }`}>
                          {r.score}/100 fit
                        </span>
                      </div>
                      {r.verdict && <p className="text-sm text-gray-700 mt-1">{r.verdict}</p>}
                      {r.strengths.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs font-semibold text-green-700 uppercase tracking-wide">Strengths</div>
                          <ul className="list-disc ms-5 text-sm text-gray-700">
                            {r.strengths.map((s, j) => <li key={j}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                      {r.gaps.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs font-semibold text-red-700 uppercase tracking-wide">Gaps</div>
                          <ul className="list-disc ms-5 text-sm text-gray-700">
                            {r.gaps.map((s, j) => <li key={j}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
  );
}

export default function ShortlistPage() {
  return (
    <RecruiterShell>
      <ShortlistTool />
    </RecruiterShell>
  );
}
