"use client";

import React from "react";
import Link from "next/link";
import { Users, FileText, ListChecks, Briefcase, Mail, CreditCard, UserCheck, ClipboardList } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { fetchAuthed } from "@/app/builder/_client/withAuth";

type Overview = {
  counts: { users: number; newUsers: number; recruiters: number; resumes: number; coverLetters: number; shortlistRuns: number; applications: number; jobPostings: number; activeSubs: number };
  recentUsers: { id: string; email: string | null; userType: string; plan: string; createdAt: string }[];
  recentRuns: { id: string; label: string; email: string | null; candidates: number; createdAt: string }[];
};

function Overview() {
  const [d, setD] = React.useState<Overview | null>(null);
  React.useEffect(() => {
    fetchAuthed("/api/admin/overview").then((r) => r.json()).then(setD).catch(() => {});
  }, []);

  if (!d) return <div className="text-sm text-[#52525a]">Loading…</div>;
  const c = d.counts;
  const stat = (icon: any, label: string, value: number, sub?: string) => ({ icon, label, value, sub });
  const stats = [
    stat(Users, "Users", c.users, `+${c.newUsers} this week`),
    stat(UserCheck, "Recruiters", c.recruiters),
    stat(CreditCard, "Active subscriptions", c.activeSubs),
    stat(FileText, "Resumes", c.resumes),
    stat(Mail, "Cover letters", c.coverLetters),
    stat(ListChecks, "Shortlist runs", c.shortlistRuns),
    stat(Briefcase, "Job postings", c.jobPostings),
    stat(ClipboardList, "Applications", c.applications),
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1d1d20] mb-6">Overview</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2 text-[#52525a] text-xs"><s.icon className="w-4 h-4" /> {s.label}</div>
            <div className="text-2xl font-bold text-[#1d1d20] mt-1">{s.value.toLocaleString()}</div>
            {s.sub && <div className="text-xs text-mint-700 mt-0.5">{s.sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="font-semibold text-[#1d1d20] mb-2">Recent signups</h2>
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            {d.recentUsers.map((u) => (
              <Link key={u.id} href={`/admin/users/${u.id}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
                <div className="min-w-0">
                  <div className="text-sm text-[#1d1d20] truncate">{u.email || "(no email)"}</div>
                  <div className="text-xs text-[#a1a1aa]">{u.userType} · {u.plan}</div>
                </div>
                <span className="text-xs text-[#a1a1aa]">{new Date(u.createdAt).toLocaleDateString()}</span>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-semibold text-[#1d1d20] mb-2">Recent shortlists</h2>
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            {d.recentRuns.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="min-w-0">
                  <div className="text-sm text-[#1d1d20] truncate">{r.label}</div>
                  <div className="text-xs text-[#a1a1aa] truncate">{r.email} · {r.candidates} candidates</div>
                </div>
                <span className="text-xs text-[#a1a1aa]">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  return <AdminShell><Overview /></AdminShell>;
}
