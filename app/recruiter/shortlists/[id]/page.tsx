"use client";

// Saved shortlist detail — ranked candidates with evidence + gaps, rename/delete,
// and the JD it was run against.

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Pencil, Trash2, Printer, Download } from "lucide-react";
import RecruiterShell from "@/components/recruiter/RecruiterShell";
import CandidateContact from "@/components/recruiter/CandidateContact";
import { fetchAuthed } from "@/app/builder/_client/withAuth";

type Candidate = {
  id: string; name: string; score: number; verdict: string | null; strengths: string[]; gaps: string[];
  email?: string | null; phone?: string | null; links?: string[]; resumeUrl?: string | null; resumeName?: string | null;
  age?: number | null; gender?: string | null; yearsExperience?: number | null; currentRole?: string | null;
  qualification?: string | null; certifications?: string | null; education?: string | null; academicResults?: string | null;
  source?: string | null;
};
type Run = { id: string; label: string; type: "posting" | "adhoc"; candidateType: string; jobPostingId: string | null; jdText: string; createdAt: string };

function facts(c: Candidate, intern: boolean): string[] {
  const f: string[] = [];
  if (c.age != null) f.push(`Age ${c.age}`);
  if (c.gender) f.push(c.gender);
  if (intern) {
    if (c.education) f.push(c.education);
    if (c.academicResults) f.push(c.academicResults);
  } else {
    if (c.yearsExperience != null) f.push(`${c.yearsExperience} yrs exp`);
    if (c.currentRole) f.push(c.currentRole);
    if (c.qualification) f.push(c.qualification);
    if (c.certifications) f.push(c.certifications);
  }
  if (c.source) f.push(c.source);
  return f;
}

const scoreColor = (s: number) =>
  s >= 75 ? "bg-green-100 text-green-800" : s >= 50 ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700";

function Detail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [run, setRun] = React.useState<Run | null>(null);
  const [candidates, setCandidates] = React.useState<Candidate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [missing, setMissing] = React.useState(false);
  const [showJd, setShowJd] = React.useState(false);

  const load = React.useCallback(async () => {
    const r = await fetchAuthed(`/api/recruiter/runs/${id}`);
    if (!r.ok) { setMissing(true); setLoading(false); return; }
    const j = await r.json();
    setRun(j.run);
    setCandidates(j.candidates || []);
    setLoading(false);
  }, [id]);

  React.useEffect(() => { load(); }, [load]);

  const rename = async () => {
    if (!run) return;
    const label = prompt("Rename shortlist", run.label);
    if (!label || !label.trim() || label.trim() === run.label) return;
    await fetchAuthed(`/api/recruiter/runs/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: label.trim() }),
    });
    load();
  };

  const del = async () => {
    if (!run) return;
    if (!confirm(`Delete "${run.label}"? This cannot be undone.`)) return;
    await fetchAuthed(`/api/recruiter/runs/${id}`, { method: "DELETE" });
    router.replace("/recruiter/shortlists");
  };

  const getPdf = async (): Promise<string | null> => {
    const r = await fetchAuthed(`/api/recruiter/runs/${id}/pdf`);
    if (!r.ok) { alert("Could not generate the PDF."); return null; }
    return URL.createObjectURL(await r.blob());
  };
  const exportPdf = async () => {
    const url = await getPdf(); if (!url) return;
    const a = document.createElement("a");
    a.href = url; a.download = `${(run?.label || "shortlist").replace(/[^a-z0-9._-]+/gi, "_")}.pdf`;
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
    const r = await fetchAuthed(`/api/recruiter/runs/${id}/${fmt}`);
    if (!r.ok) { alert("Could not generate the file."); return; }
    const url = URL.createObjectURL(await r.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(run?.label || "shortlist").replace(/[^a-z0-9._-]+/gi, "_")}.${fmt === "docx" ? "doc" : "csv"}`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-8 text-sm text-[#52525a]">Loading…</div>;
  if (missing || !run) return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <p className="text-[#52525a]">This shortlist isn&apos;t available.</p>
      <Link href="/recruiter/shortlists" className="text-mint-700 underline mt-2 inline-block">Back to shortlists</Link>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/recruiter/shortlists" className="text-sm text-mint-700 hover:underline">← Shortlists</Link>

      <div className="mt-3 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1d1d20]">{run.label}</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            <span className={`text-xs font-semibold rounded-full px-2 py-0.5 mr-2 ${run.type === "posting" ? "bg-mint-50 text-mint-700" : "bg-gray-100 text-gray-700"}`}>
              {run.type === "posting" ? "From a posting" : "Ad-hoc upload"}
            </span>
            {candidates.length} candidate{candidates.length === 1 ? "" : "s"} · {new Date(run.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {run.jobPostingId && (
            <Link href={`/recruiter/jobs/${run.jobPostingId}`} className="text-sm text-mint-700 hover:underline mr-1">Open posting</Link>
          )}
          <button onClick={printPdf} className="inline-flex items-center gap-1.5 text-sm rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50">
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          <button onClick={exportPdf} className="inline-flex items-center gap-1.5 text-sm rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50">
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
          <button onClick={() => downloadReport("csv")} className="text-sm rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50">CSV</button>
          <button onClick={() => downloadReport("docx")} className="text-sm rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50">Word</button>
          <button onClick={rename} className="inline-flex items-center gap-1.5 text-sm rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50">
            <Pencil className="w-3.5 h-3.5" /> Rename
          </button>
          <button onClick={del} className="inline-flex items-center gap-1.5 text-sm rounded-lg border border-red-200 text-red-700 px-3 py-1.5 hover:bg-red-50">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>

      {run.jdText && (
        <div className="mt-4">
          <button onClick={() => setShowJd((v) => !v)} className="text-sm text-mint-700 hover:underline">
            {showJd ? "Hide" : "Show"} job description
          </button>
          {showJd && (
            <div className="mt-2 whitespace-pre-wrap text-sm text-gray-700 bg-white border border-gray-200 rounded-lg p-4 max-h-72 overflow-y-auto">
              {run.jdText}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {candidates.map((c, i) => (
          <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="grid place-items-center h-9 w-9 rounded-full bg-mint-600 text-white font-bold shrink-0">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-semibold text-[#1d1d20]">{c.name}</span>
                  <span className={`text-sm font-semibold rounded-full px-2.5 py-0.5 ${scoreColor(c.score)}`}>{c.score}/100</span>
                </div>
                {facts(c, run.candidateType === "intern").length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">{facts(c, run.candidateType === "intern").join("  ·  ")}</p>
                )}
                {c.verdict && <p className="text-sm text-gray-700 mt-1">{c.verdict}</p>}
                {c.strengths.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs font-semibold text-green-700 uppercase tracking-wide">Strengths</div>
                    <ul className="list-disc ms-5 text-sm text-gray-700">{c.strengths.map((s, j) => <li key={j}>{s}</li>)}</ul>
                  </div>
                )}
                {c.gaps.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs font-semibold text-red-700 uppercase tracking-wide">Gaps</div>
                    <ul className="list-disc ms-5 text-sm text-gray-700">{c.gaps.map((s, j) => <li key={j}>{s}</li>)}</ul>
                  </div>
                )}
                <CandidateContact email={c.email} phone={c.phone} links={c.links} resumeUrl={c.resumeUrl} resumeName={c.resumeName} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ShortlistDetailPage() {
  return (
    <RecruiterShell>
      <Detail />
    </RecruiterShell>
  );
}
