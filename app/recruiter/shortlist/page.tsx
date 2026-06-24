"use client";

// /recruiter/shortlist — upload candidate resumes + a JD, AI ranks the best fits
// with evidence-based reasons. Phase 1 of the recruiter product (stateless).

import React from "react";
import { fetchAuthed } from "@/app/builder/_client/withAuth";
import RecruiterShell from "@/components/recruiter/RecruiterShell";
import CandidateContact from "@/components/recruiter/CandidateContact";

type Result = {
  id: string;
  name: string;
  score: number;
  verdict: string;
  strengths: string[];
  gaps: string[];
  email?: string | null;
  phone?: string | null;
  links?: string[];
  resumeUrl?: string | null;
  resumeName?: string | null;
  age?: number | null;
  gender?: string | null;
  yearsExperience?: number | null;
  currentRole?: string | null;
  qualification?: string | null;
  certifications?: string | null;
  education?: string | null;
  academicResults?: string | null;
};

function CandidateFacts({ r, intern }: { r: Result; intern: boolean }) {
  const facts: string[] = [];
  if (r.age != null) facts.push(`Age ${r.age}`);
  if (r.gender) facts.push(r.gender);
  if (intern) {
    if (r.education) facts.push(r.education);
    if (r.academicResults) facts.push(r.academicResults);
  } else {
    if (r.yearsExperience != null) facts.push(`${r.yearsExperience} yrs exp`);
    if (r.currentRole) facts.push(r.currentRole);
    if (r.qualification) facts.push(r.qualification);
    if (r.certifications) facts.push(r.certifications);
  }
  if (!facts.length) return null;
  return <p className="text-xs text-gray-500 mt-1">{facts.join("  ·  ")}</p>;
}

const MAX = 50;

function ShortlistTool() {
  const [name, setName] = React.useState("");
  const [candidateType, setCandidateType] = React.useState<"experienced" | "intern">("experienced");
  const [jd, setJd] = React.useState("");
  const [jdFile, setJdFile] = React.useState<File | null>(null);
  const [files, setFiles] = React.useState<File[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<Result[] | null>(null);
  const [skipped, setSkipped] = React.useState<string[]>([]);
  const [savedRunId, setSavedRunId] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const jdInputRef = React.useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      if (next.length >= MAX) break;
      if (!next.some((x) => x.name === f.name && x.size === f.size)) next.push(f);
    }
    setFiles(next);
  };

  const getPdf = async (): Promise<string | null> => {
    if (!savedRunId) return null;
    const r = await fetchAuthed(`/api/recruiter/runs/${savedRunId}/pdf`);
    if (!r.ok) { alert("Could not generate the PDF."); return null; }
    return URL.createObjectURL(await r.blob());
  };
  const exportPdf = async () => {
    const url = await getPdf(); if (!url) return;
    const a = document.createElement("a");
    a.href = url; a.download = `${(name.trim() || "shortlist").replace(/[^a-z0-9._-]+/gi, "_")}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };
  const printPdf = async () => {
    const url = await getPdf(); if (!url) return;
    const w = window.open(url, "_blank");
    if (w) w.onload = () => { try { w.focus(); w.print(); } catch {} };
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
  const downloadReport = async (fmt: "csv" | "docx") => {
    if (!savedRunId) return;
    const r = await fetchAuthed(`/api/recruiter/runs/${savedRunId}/${fmt}`);
    if (!r.ok) { alert("Could not generate the file."); return; }
    const url = URL.createObjectURL(await r.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(name.trim() || "shortlist").replace(/[^a-z0-9._-]+/gi, "_")}.${fmt === "docx" ? "doc" : "csv"}`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const run = async () => {
    if (!jd.trim() && !jdFile) { setError("Paste the job description or upload a JD file first."); return; }
    if (!files.length) { setError("Add at least one candidate resume."); return; }
    setBusy(true); setError(null); setResults(null); setSkipped([]); setSavedRunId(null);
    try {
      const fd = new FormData();
      fd.append("jdText", jd);
      fd.append("candidateType", candidateType);
      if (jdFile) fd.append("jdFile", jdFile);
      if (name.trim()) fd.append("label", name.trim());
      files.forEach((f) => fd.append("files", f));
      const res = await fetchAuthed("/api/recruiter/shortlist", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.detail || json?.error || "Shortlisting failed");
      setResults(json.results || []);
      setSkipped(json.skipped || []);
      setSavedRunId(json.runId || null);
    } catch (e: any) {
      setError((e?.message || e).toString());
    } finally {
      setBusy(false);
    }
  };

  return (
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-6">
          <span className="inline-block text-[11px] font-semibold tracking-[0.18em] uppercase text-mint-700 bg-mint-50 rounded-full px-3 py-1">
            For recruiters
          </span>
          <h1 className="mt-3 text-3xl font-bold text-gray-900">AI candidate shortlisting</h1>
          <p className="mt-2 text-gray-600 max-w-2xl">
            Drop in a job description and a stack of resumes — the AI ranks the best-fit candidates with
            evidence-based reasons and honest gaps. It only judges what each resume actually says.
          </p>
        </div>

        {/* Name + candidate type */}
        <div className="mb-4 grid sm:grid-cols-2 gap-4 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shortlist name <span className="text-gray-400">(optional)</span>
            </label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint-200"
              placeholder="e.g. Backend Engineer — June batch"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Candidate type</label>
            <div className="inline-flex rounded-lg border border-gray-300 p-0.5 text-sm w-full">
              {([["experienced", "Experienced"], ["intern", "Intern / student"]] as const).map(([val, lbl]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setCandidateType(val)}
                  className={`flex-1 rounded-md px-3 py-1.5 transition-colors ${
                    candidateType === val ? "bg-mint-600 text-white" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {candidateType === "intern"
                ? "Ranks on field of study + academic results; experience not required."
                : "Ranks on relevant experience, skills, and qualifications."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* JD */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job description <span className="text-gray-400">(paste or upload)</span>
            </label>
            <textarea
              className="w-full h-52 rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-mint-200"
              placeholder={jdFile ? "Using the uploaded JD file — or paste here to override it…" : "Paste the full job description / requirements here…"}
              value={jd}
              onChange={(e) => setJd(e.target.value)}
            />
            <div className="mt-2 flex items-center gap-2 text-sm">
              {jdFile ? (
                <span className="flex items-center gap-2 bg-mint-50 text-mint-800 rounded px-2 py-1">
                  <span className="truncate max-w-[16rem]">{jdFile.name}</span>
                  <button
                    type="button"
                    className="text-mint-700 hover:text-red-600"
                    onClick={() => { setJdFile(null); if (jdInputRef.current) jdInputRef.current.value = ""; }}
                  >
                    ✕
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => jdInputRef.current?.click()}
                  className="text-mint-700 hover:underline"
                >
                  ＋ Upload JD (PDF / DOCX)
                </button>
              )}
              <input
                ref={jdInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) { setJdFile(f); setJd(""); } }}
              />
            </div>
          </div>

          {/* Resumes */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Candidate resumes <span className="text-gray-400">(PDF / DOCX · up to {MAX})</span>
              </label>
              {files.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setFiles([]); if (inputRef.current) inputRef.current.value = ""; }}
                  className="text-xs text-gray-500 hover:text-red-600"
                >
                  Clear all
                </button>
              )}
            </div>
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
            className="rounded-lg bg-mint-600 hover:bg-mint-700 text-white font-semibold px-6 py-3 text-base disabled:opacity-60 transition-colors"
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
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Ranked candidates {results.length > 0 && <span className="text-gray-400 text-base">({results.length})</span>}
              </h2>
              {savedRunId && (
                <div className="flex items-center gap-3 text-sm flex-wrap">
                  <button onClick={printPdf} className="text-gray-600 hover:text-gray-900">Print</button>
                  <button onClick={exportPdf} className="text-gray-600 hover:text-gray-900">PDF</button>
                  <button onClick={() => downloadReport("csv")} className="text-gray-600 hover:text-gray-900">CSV</button>
                  <button onClick={() => downloadReport("docx")} className="text-gray-600 hover:text-gray-900">Word</button>
                  <a href={`/recruiter/shortlists/${savedRunId}`} className="text-mint-700 hover:underline">Saved ✓</a>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {results.map((r, i) => (
                <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="grid place-items-center h-9 w-9 rounded-full bg-mint-600 text-white font-bold shrink-0">
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
                      <CandidateFacts r={r} intern={candidateType === "intern"} />
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
                      <CandidateContact email={r.email} phone={r.phone} links={r.links} resumeUrl={r.resumeUrl} resumeName={r.resumeName} />
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
