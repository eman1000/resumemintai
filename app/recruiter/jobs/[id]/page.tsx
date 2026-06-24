"use client";

// Manage one posting: status controls, applicants, and AI shortlisting of
// applicants (ranked with evidence + gaps).

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ExternalLink, Wand2, Trash2 } from "lucide-react";
import RecruiterShell from "@/components/recruiter/RecruiterShell";
import CandidateContact from "@/components/recruiter/CandidateContact";
import { fetchAuthed } from "@/app/builder/_client/withAuth";

type Ranking = { score: number; verdict: string | null; strengths: string[]; gaps: string[] };
type Applicant = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  links: string[];
  status: string;
  note: string | null;
  resumeId: string | null;
  resumeUrl: string | null;
  hasResumeText: boolean;
  createdAt: string;
  ranking: Ranking | null;
};
type Job = {
  id: string;
  slug: string;
  title: string;
  company: string;
  location: string | null;
  employmentType: string | null;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  status: string;
  description: string;
  createdAt: string;
};

function salaryLabel(j: Job) {
  if (!j.salaryMin && !j.salaryMax) return null;
  const c = j.currency || "USD";
  const fmt = (n: number) => `${c} ${n.toLocaleString()}`;
  if (j.salaryMin && j.salaryMax) return `${fmt(j.salaryMin)} – ${fmt(j.salaryMax)}`;
  return fmt((j.salaryMin || j.salaryMax)!);
}

const APP_STATUSES = ["submitted", "reviewing", "shortlisted", "rejected"];
const scoreColor = (s: number) =>
  s >= 75 ? "bg-green-100 text-green-800" : s >= 50 ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700";

function Manage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = React.useState<Job | null>(null);
  const [applicants, setApplicants] = React.useState<Applicant[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [ranking, setRanking] = React.useState(false);

  const load = React.useCallback(async () => {
    const r = await fetchAuthed(`/api/recruiter/jobs/${id}`);
    if (!r.ok) { setError("Could not load posting."); setLoading(false); return; }
    const j = await r.json();
    setJob(j.job);
    setApplicants(j.applicants || []);
    setLoading(false);
  }, [id]);

  React.useEffect(() => { load(); }, [load]);

  const setStatus = async (status: string) => {
    await fetchAuthed(`/api/recruiter/jobs/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    load();
  };

  const setApplicantStatus = async (applicationId: string, applicantStatus: string) => {
    setApplicants((xs) => xs.map((a) => (a.id === applicationId ? { ...a, status: applicantStatus } : a)));
    await fetchAuthed(`/api/recruiter/jobs/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicationId, applicantStatus }),
    });
  };

  const runShortlist = async () => {
    setRanking(true); setError(null);
    try {
      const r = await fetchAuthed(`/api/recruiter/jobs/${id}/shortlist`, { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.detail || j?.error || "Shortlisting failed");
      await load();
    } catch (e: any) {
      setError(e?.message || "Shortlisting failed");
    } finally {
      setRanking(false);
    }
  };

  const del = async () => {
    if (!confirm("Delete this posting and all its applications? This cannot be undone.")) return;
    await fetchAuthed(`/api/recruiter/jobs/${id}`, { method: "DELETE" });
    router.replace("/recruiter/dashboard");
  };

  if (loading) return <div className="max-w-site mx-auto px-4 py-8 text-sm text-[#52525a]">Loading…</div>;
  if (!job) return <div className="max-w-site mx-auto px-4 py-8 text-sm text-red-600">{error || "Not found"}</div>;

  const withResume = applicants.filter((a) => a.hasResumeText).length;
  const sorted = [...applicants].sort((a, b) => (b.ranking?.score ?? -1) - (a.ranking?.score ?? -1));

  return (
    <div className="max-w-site mx-auto px-4 py-8">
      <Link href="/recruiter/dashboard" className="text-sm text-mint-700 hover:underline">← Dashboard</Link>

      {/* Header */}
      <div className="mt-3 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1d1d20]">{job.title}</h1>
          <p className="text-[#52525a]">{job.company}{job.location ? ` · ${job.location}` : ""}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {job.employmentType && <span className="rounded-full bg-gray-100 text-gray-700 px-2 py-0.5">{job.employmentType}</span>}
            {job.remote && <span className="rounded-full bg-mint-50 text-mint-700 px-2 py-0.5">Remote-friendly</span>}
            {salaryLabel(job) && <span className="rounded-full bg-gray-100 text-gray-700 px-2 py-0.5">{salaryLabel(job)}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {job.status === "open" && (
            <Link href={`/careers/${job.slug}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm text-mint-700 hover:underline">
              <ExternalLink className="w-4 h-4" /> View public listing
            </Link>
          )}
        </div>
      </div>

      {/* Status controls */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${
          job.status === "open" ? "bg-green-100 text-green-800" : job.status === "draft" ? "bg-gray-100 text-gray-700" : "bg-red-100 text-red-700"
        }`}>{job.status}</span>
        {job.status !== "open" && (
          <button onClick={() => setStatus("open")} className="text-sm rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50">Publish / reopen</button>
        )}
        {job.status === "open" && (
          <button onClick={() => setStatus("closed")} className="text-sm rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50">Close posting</button>
        )}
        <button onClick={del} className="text-sm rounded-lg border border-red-200 text-red-700 px-3 py-1.5 hover:bg-red-50 inline-flex items-center gap-1.5">
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </button>
      </div>

      {/* Applicants */}
      <div className="mt-8 flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-[#1d1d20]">Applicants ({applicants.length})</h2>
        <button
          onClick={runShortlist}
          disabled={ranking || withResume === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-mint-600 hover:bg-mint-700 text-white font-semibold px-4 py-2 text-sm disabled:opacity-60 transition-colors"
          title={withResume === 0 ? "No applicants with readable resumes yet" : "Rank applicants with AI"}
        >
          <Wand2 className="w-4 h-4" /> {ranking ? "Ranking…" : "AI shortlist applicants"}
        </button>
      </div>
      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

      {applicants.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-[#52525a]">
          No applications yet. Share your <Link href={`/careers/${job.slug}`} className="text-mint-700 underline">public listing</Link>.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {sorted.map((a, i) => (
            <div key={a.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start gap-3">
                {a.ranking ? (
                  <div className="grid place-items-center h-9 w-9 rounded-full bg-mint-600 text-white font-bold shrink-0">{i + 1}</div>
                ) : (
                  <div className="grid place-items-center h-9 w-9 rounded-full bg-gray-100 text-gray-500 font-bold shrink-0">–</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-[#1d1d20]">{a.name}</span>
                    <div className="flex items-center gap-2">
                      {a.ranking && (
                        <span className={`text-sm font-semibold rounded-full px-2.5 py-0.5 ${scoreColor(a.ranking.score)}`}>{a.ranking.score}/100</span>
                      )}
                      <select
                        value={a.status}
                        onChange={(e) => setApplicantStatus(a.id, e.target.value)}
                        className="text-sm rounded-lg border border-gray-300 px-2 py-1"
                      >
                        {APP_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  {a.note && <p className="text-sm text-gray-600 mt-1 italic">“{a.note}”</p>}
                  {a.ranking?.verdict && <p className="text-sm text-gray-700 mt-1">{a.ranking.verdict}</p>}
                  {a.ranking && a.ranking.strengths.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-semibold text-green-700 uppercase tracking-wide">Strengths</div>
                      <ul className="list-disc ms-5 text-sm text-gray-700">{a.ranking.strengths.map((s, j) => <li key={j}>{s}</li>)}</ul>
                    </div>
                  )}
                  {a.ranking && a.ranking.gaps.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-semibold text-red-700 uppercase tracking-wide">Gaps</div>
                      <ul className="list-disc ms-5 text-sm text-gray-700">{a.ranking.gaps.map((s, j) => <li key={j}>{s}</li>)}</ul>
                    </div>
                  )}
                  {!a.hasResumeText && <p className="text-xs text-amber-700 mt-1">Resume text unavailable — won&apos;t be AI-ranked.</p>}
                  <CandidateContact email={a.email} phone={a.phone} links={a.links} resumeUrl={a.resumeUrl} resumeName={a.resumeId ? "resume" : null} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ManageJobPage() {
  return (
    <RecruiterShell>
      <Manage />
    </RecruiterShell>
  );
}
