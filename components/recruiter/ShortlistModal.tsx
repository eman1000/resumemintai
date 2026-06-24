"use client";

// Ad-hoc shortlist tool as a modal (opened from the Shortlists tab/button).
// Collects JD + resumes, shows a creative loading animation with live statuses
// while ranking, then routes to the saved shortlist detail.

import React from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { fetchAuthed } from "@/app/builder/_client/withAuth";

const MAX = 50;

const STATUSES = [
  "Reading the job description…",
  "Reading the resumes…",
  "Extracting skills, experience & contacts…",
  "Matching candidates to the role…",
  "Scoring & ranking candidates…",
  "Compiling your shortlist…",
];

function LoadingScene({ count }: { count: number }) {
  const [statusIdx, setStatusIdx] = React.useState(0);
  const [progress, setProgress] = React.useState(8);

  React.useEffect(() => {
    const s = setInterval(() => setStatusIdx((i) => Math.min(i + 1, STATUSES.length - 1)), 2200);
    const p = setInterval(() => setProgress((v) => (v < 92 ? v + Math.max(1, Math.round((92 - v) / 12)) : v)), 600);
    return () => { clearInterval(s); clearInterval(p); };
  }, []);

  const status = statusIdx === 1 && count ? `Reading ${count} resume${count === 1 ? "" : "s"}…` : STATUSES[statusIdx];

  return (
    <div className="py-10 flex flex-col items-center text-center">
      {/* Scanning document */}
      <div className="relative w-28 h-36 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="absolute inset-0 p-3 space-y-2">
          <div className="rm-shimmer h-2 w-3/4 rounded bg-gray-200" />
          <div className="rm-shimmer h-2 w-full rounded bg-gray-200" style={{ animationDelay: ".15s" }} />
          <div className="rm-shimmer h-2 w-5/6 rounded bg-gray-200" style={{ animationDelay: ".3s" }} />
          <div className="rm-shimmer h-2 w-2/3 rounded bg-gray-200" style={{ animationDelay: ".45s" }} />
          <div className="rm-shimmer h-2 w-full rounded bg-gray-200" style={{ animationDelay: ".6s" }} />
          <div className="rm-shimmer h-2 w-1/2 rounded bg-gray-200" style={{ animationDelay: ".75s" }} />
        </div>
        {/* sweeping scan bar */}
        <div className="rm-scan-bar absolute left-0 right-0 h-6 bg-gradient-to-b from-mint-400/0 via-mint-400/40 to-mint-400/0" />
      </div>

      {/* spinner + status */}
      <div className="mt-6 flex items-center gap-2 text-[#1d1d20] font-medium">
        <span className="rm-spin-ring inline-block w-4 h-4 rounded-full border-2 border-mint-200 border-t-mint-600" />
        <span key={status} className="animate-[fadeIn_.4s_ease-out]">{status}</span>
      </div>

      {/* progress */}
      <div className="mt-4 w-64 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full bg-mint-600 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-3 text-xs text-[#a1a1aa]">Honest, evidence-based ranking — this can take a moment for large batches.</p>
    </div>
  );
}

export default function ShortlistModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [candidateType, setCandidateType] = React.useState<"experienced" | "intern">("experienced");
  const [jd, setJd] = React.useState("");
  const [jdFile, setJdFile] = React.useState<File | null>(null);
  const [files, setFiles] = React.useState<File[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [skipped, setSkipped] = React.useState<string[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const jdInputRef = React.useRef<HTMLInputElement>(null);

  if (!open) return null;

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
    if (!jd.trim() && !jdFile) { setError("Paste the job description or upload a JD file first."); return; }
    if (!files.length) { setError("Add at least one candidate resume."); return; }
    setBusy(true); setError(null); setSkipped([]);
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
      if (json.runId) { router.push(`/recruiter/shortlists/${json.runId}`); return; }
      setError("Ranked, but couldn't open the saved shortlist.");
      setBusy(false);
    } catch (e: any) {
      setError((e?.message || e).toString());
      setBusy(false);
    }
  };

  const input = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint-200";

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl my-auto">
        {/* header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-[#1d1d20]">AI candidate shortlisting</h2>
          {!busy && (
            <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="px-6 py-5">
          {busy ? (
            <LoadingScene count={files.length} />
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shortlist name <span className="text-gray-400">(optional)</span></label>
                  <input className={input} placeholder="e.g. Accountant — June batch" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Candidate type</label>
                  <div className="inline-flex rounded-lg border border-gray-300 p-0.5 text-sm w-full">
                    {([["experienced", "Experienced"], ["intern", "Intern / student"]] as const).map(([val, lbl]) => (
                      <button key={val} type="button" onClick={() => setCandidateType(val)}
                        className={`flex-1 rounded-md px-3 py-1.5 transition-colors ${candidateType === val ? "bg-mint-600 text-white" : "text-gray-600 hover:text-gray-900"}`}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* JD */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job description <span className="text-gray-400">(paste or upload)</span></label>
                  <textarea
                    className={`${input} h-44`}
                    placeholder={jdFile ? "Using the uploaded JD file — or paste to override…" : "Paste the full job description…"}
                    value={jd}
                    onChange={(e) => setJd(e.target.value)}
                  />
                  <div className="mt-2 text-sm">
                    {jdFile ? (
                      <span className="flex items-center gap-2 bg-mint-50 text-mint-800 rounded px-2 py-1 w-fit">
                        <span className="truncate max-w-[14rem]">{jdFile.name}</span>
                        <button type="button" className="text-mint-700 hover:text-red-600" onClick={() => { setJdFile(null); if (jdInputRef.current) jdInputRef.current.value = ""; }}>✕</button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => jdInputRef.current?.click()} className="text-mint-700 hover:underline">＋ Upload JD (PDF / DOCX)</button>
                    )}
                    <input ref={jdInputRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) { setJdFile(f); setJd(""); } }} />
                  </div>
                </div>

                {/* Resumes */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Candidate resumes <span className="text-gray-400">(up to {MAX})</span></label>
                    {files.length > 0 && (
                      <button type="button" onClick={() => { setFiles([]); if (inputRef.current) inputRef.current.value = ""; }} className="text-xs text-gray-500 hover:text-red-600">Clear all</button>
                    )}
                  </div>
                  <div
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
                    className="h-44 rounded-lg border-2 border-dashed border-gray-300 p-3 cursor-pointer hover:bg-gray-50 overflow-y-auto"
                  >
                    {files.length === 0 ? (
                      <div className="h-full grid place-items-center text-center text-gray-500 text-sm">
                        <div><div className="text-2xl">＋</div>Drop resumes or click<br /><span className="text-xs text-gray-400">PDF or DOCX</span></div>
                      </div>
                    ) : (
                      <ul className="space-y-1">
                        {files.map((f, i) => (
                          <li key={i} className="flex items-center justify-between text-sm bg-gray-50 rounded px-2 py-1">
                            <span className="truncate">{f.name}</span>
                            <button className="text-gray-400 hover:text-red-600 ml-2" onClick={(e) => { e.stopPropagation(); setFiles(files.filter((_, j) => j !== i)); }}>✕</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <input ref={inputRef} type="file" multiple accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange={(e) => addFiles(e.target.files)} />
                  {files.length > 0 && <div className="mt-1 text-xs text-gray-500">{files.length} added</div>}
                </div>
              </div>

              {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

              <div className="mt-5 flex justify-end gap-2">
                <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={run} className="rounded-lg bg-mint-600 hover:bg-mint-700 text-white font-semibold px-5 py-2.5 text-sm transition-colors">
                  Shortlist {files.length || ""} candidate{files.length === 1 ? "" : "s"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
