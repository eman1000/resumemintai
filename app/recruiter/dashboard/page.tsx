"use client";

// Recruiter dashboard: postings overview + recent AI shortlist runs.

import React from "react";
import Link from "next/link";
import { Briefcase, Users, ListChecks, Plus, Wand2 } from "lucide-react";
import RecruiterShell from "@/components/recruiter/RecruiterShell";
import { fetchAuthed } from "@/app/builder/_client/withAuth";

type Job = {
  id: string;
  slug: string;
  title: string;
  company: string;
  location: string | null;
  status: string;
  applicants: number;
  createdAt: string;
};
type Run = {
  id: string;
  label: string;
  jobPostingId: string | null;
  candidates: number;
  top: { name: string; score: number } | null;
  createdAt: string;
};

const statusBadge = (s: string) =>
  s === "open"
    ? "bg-green-100 text-green-800"
    : s === "draft"
      ? "bg-gray-100 text-gray-700"
      : "bg-red-100 text-red-700";

function Dashboard() {
  const [jobs, setJobs] = React.useState<Job[] | null>(null);
  const [runs, setRuns] = React.useState<Run[] | null>(null);

  React.useEffect(() => {
    fetchAuthed("/api/recruiter/jobs")
      .then((r) => r.json())
      .then((j) => setJobs(j.items || []))
      .catch(() => setJobs([]));
    fetchAuthed("/api/recruiter/runs")
      .then((r) => r.json())
      .then((j) => setRuns(j.items || []))
      .catch(() => setRuns([]));
  }, []);

  const openCount = jobs?.filter((j) => j.status === "open").length ?? 0;
  const totalApplicants = jobs?.reduce((n, j) => n + j.applicants, 0) ?? 0;

  return (
    <div className="max-w-site mx-auto px-4 py-8">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <h1 className="text-2xl font-bold text-[#1d1d20]">Recruiter dashboard</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/recruiter/shortlists?new=1"
            className="inline-flex items-center gap-2 rounded-lg bg-mint-600 hover:bg-mint-700 text-white font-semibold px-4 py-2.5 text-sm transition-colors"
          >
            <Wand2 className="w-4 h-4" /> Shortlist candidates
          </Link>
          <Link
            href="/recruiter/jobs/new"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 text-[#1d1d20] hover:bg-gray-50 font-semibold px-4 py-2.5 text-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Post a job
          </Link>
        </div>
      </div>

      {/* Primary feature: AI shortlisting */}
      <Link
        href="/recruiter/shortlists?new=1"
        className="block mb-8 rounded-2xl bg-[#0f1b2d] p-6 hover:bg-[#13233a] transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-mint-500/20 flex items-center justify-center shrink-0">
            <Wand2 className="w-6 h-6 text-mint-300" />
          </div>
          <div className="flex-1">
            <div className="text-white font-semibold text-lg">AI candidate shortlisting</div>
            <div className="text-mint-100/70 text-sm">Paste or upload a JD and a stack of resumes — get a ranked shortlist with evidence and honest gaps.</div>
          </div>
          <span className="hidden sm:inline-flex items-center rounded-lg bg-mint-600 text-white font-semibold px-4 py-2 text-sm">Open tool →</span>
        </div>
      </Link>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Stat icon={Briefcase} label="Open postings" value={openCount} />
        <Stat icon={Users} label="Total applicants" value={totalApplicants} />
        <Link href="/recruiter/shortlists" className="block">
          <Stat icon={ListChecks} label="Saved shortlists" value={runs?.length ?? 0} />
        </Link>
      </div>

      {/* Postings */}
      <h2 className="text-lg font-semibold text-[#1d1d20] mb-3">Your postings</h2>
      {jobs === null ? (
        <div className="text-sm text-[#52525a]">Loading…</div>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-[#52525a]">You haven&apos;t posted any jobs yet.</p>
          <Link href="/recruiter/jobs/new" className="inline-flex mt-4 rounded-lg bg-mint-600 hover:bg-mint-700 text-white font-semibold px-4 py-2.5 text-sm transition-colors">
            Post your first job
          </Link>
          <p className="text-xs text-[#a1a1aa] mt-4">
            Or use the <Link href="/recruiter/shortlists?new=1" className="text-mint-700 underline">ad-hoc shortlist tool</Link> to rank a stack of resumes without posting.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-[#52525a]">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Applicants</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.map((j) => (
                <tr key={j.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#1d1d20]">{j.title}</div>
                    <div className="text-xs text-[#a1a1aa]">{j.company}{j.location ? ` · ${j.location}` : ""}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${statusBadge(j.status)}`}>{j.status}</span>
                  </td>
                  <td className="px-4 py-3 text-[#1d1d20]">{j.applicants}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/recruiter/jobs/${j.id}`} className="text-mint-700 font-medium hover:underline">Manage</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent runs */}
      {runs && runs.length > 0 && (
        <>
          <div className="flex items-center justify-between mt-10 mb-3">
            <h2 className="text-lg font-semibold text-[#1d1d20]">Recent shortlists</h2>
            <Link href="/recruiter/shortlists" className="text-sm text-mint-700 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {runs.slice(0, 8).map((r) => (
              <Link key={r.id} href={`/recruiter/shortlists/${r.id}`} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50">
                <div>
                  <div className="font-medium text-[#1d1d20]">{r.label}</div>
                  <div className="text-xs text-[#a1a1aa]">
                    {r.candidates} candidate{r.candidates === 1 ? "" : "s"}
                    {r.top ? ` · top: ${r.top.name} (${r.top.score}/100)` : ""} · {new Date(r.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <span className="text-sm text-mint-700">View</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-mint-50 flex items-center justify-center">
        <Icon className="w-5 h-5 text-mint-700" />
      </div>
      <div>
        <div className="text-2xl font-bold text-[#1d1d20]">{value}</div>
        <div className="text-xs text-[#52525a]">{label}</div>
      </div>
    </div>
  );
}

export default function RecruiterDashboardPage() {
  return (
    <RecruiterShell>
      <Dashboard />
    </RecruiterShell>
  );
}
