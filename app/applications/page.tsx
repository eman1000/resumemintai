"use client";

import * as React from "react";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import DashboardSidebar from "@/app/builder/components/DashboardSidebar";
import { fetchAuthed } from "@/app/builder/_client/withAuth";
import { auth } from "@/app/firebase";

type JobSnapshot = {
  source?: string;
  title?: string;
  company?: string;
  location?: string;
  postedAt?: string;
};

type Application = {
  id: string;
  ats: string;
  jobSnapshot: JobSnapshot | null;
  status: string;
  externalRef: string | null;
  resumeId: string | null;
  coverLetterId: string | null;
  notes: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_OPTIONS = [
  { value: "submitted", label: "Submitted", cls: "bg-blue-100 text-blue-800" },
  { value: "applied", label: "Applied", cls: "bg-indigo-100 text-indigo-800" },
  { value: "interviewing", label: "Interviewing", cls: "bg-violet-100 text-violet-800" },
  { value: "offer", label: "Offer", cls: "bg-emerald-100 text-emerald-800" },
  { value: "rejected", label: "Rejected", cls: "bg-rose-100 text-rose-800" },
  { value: "withdrawn", label: "Withdrawn", cls: "bg-gray-100 text-gray-700" },
];

const FILTERS: Array<{ id: string; label: string }> = [
  { id: "all", label: "All" },
  { id: "submitted", label: "Submitted" },
  { id: "applied", label: "Applied" },
  { id: "interviewing", label: "Interviewing" },
  { id: "offer", label: "Offer" },
  { id: "rejected", label: "Rejected" },
  { id: "withdrawn", label: "Withdrawn" },
];

function statusBadge(status: string) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status);
  if (!opt) return <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">{status}</span>;
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${opt.cls}`}>{opt.label}</span>;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function Inner() {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [items, setItems] = React.useState<Application[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<string>("all");
  const [updating, setUpdating] = React.useState<string | null>(null);

  const userName = auth.currentUser?.displayName || auth.currentUser?.email || "Account";

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const r = await fetchAuthed("/api/applications");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setItems(j.items as Application[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
      setItems([]);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    try {
      const r = await fetchAuthed(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setItems((prev) =>
        prev ? prev.map((a) => (a.id === id ? { ...a, status } : a)) : prev,
      );
    } catch (e: any) {
      alert(`Could not update status: ${e?.message || e}`);
    } finally {
      setUpdating(null);
    }
  }

  const visible = React.useMemo(() => {
    if (!items) return [];
    if (filter === "all") return items;
    return items.filter((a) => a.status === filter);
  }, [items, filter]);

  const counts = React.useMemo(() => {
    const out: Record<string, number> = { all: items?.length ?? 0 };
    for (const a of items ?? []) out[a.status] = (out[a.status] ?? 0) + 1;
    return out;
  }, [items]);

  return (
    <div className="flex">
      <DashboardSidebar
        userName={userName}
        onNew={() => { window.location.href = "/builder"; }}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <main className="flex-1 min-h-screen bg-[#f8fbfc]">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <header className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#1d1d20]">Applications</h1>
              <p className="text-sm text-[#52525a] mt-1">
                Every job you&apos;ve submitted through ResumeMint — keep track of progress and outcomes.
              </p>
            </div>
            <Link href="/jobs" className="btn-primary text-sm !px-4 !py-2 shrink-0">
              Find jobs
            </Link>
          </header>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {FILTERS.map((f) => {
              const active = f.id === filter;
              const count = counts[f.id] ?? 0;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    active
                      ? "bg-brand text-white"
                      : "bg-white border border-gray-200 text-[#52525a] hover:border-brand hover:text-brand"
                  }`}
                >
                  {f.label}
                  {count > 0 && (
                    <span className={`ml-2 text-xs ${active ? "opacity-80" : "opacity-60"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-800 px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          {items === null ? (
            <div className="rounded-lg bg-white border border-gray-200 p-8 text-center text-[#52525a]">
              Loading…
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-lg bg-white border border-gray-200 p-10 text-center">
              <p className="text-[#1d1d20] font-medium">
                {filter === "all"
                  ? "No applications yet."
                  : `No applications in “${FILTERS.find((f) => f.id === filter)?.label}”.`}
              </p>
              <p className="text-sm text-[#52525a] mt-1">
                Submit your first job through{" "}
                <Link href="/jobs" className="text-brand underline">Jobs</Link>{" "}
                and it&apos;ll appear here.
              </p>
            </div>
          ) : (
            <div className="rounded-lg bg-white border border-gray-200 overflow-hidden">
              {/* Header — desktop only */}
              <div className="hidden md:grid grid-cols-[1fr_120px_140px_140px_60px] gap-3 px-4 py-2 border-b border-gray-200 text-xs font-medium text-[#52525a] uppercase tracking-wide">
                <div>Job</div>
                <div>ATS</div>
                <div>Submitted</div>
                <div>Status</div>
                <div></div>
              </div>
              <ul className="divide-y divide-gray-100">
                {visible.map((a) => {
                  const snap = a.jobSnapshot || {};
                  const title = snap.title || "Untitled role";
                  const company = snap.company || "Unknown company";
                  const source = snap.source;
                  return (
                    <li
                      key={a.id}
                      className="grid grid-cols-1 md:grid-cols-[1fr_120px_140px_140px_60px] gap-3 px-4 py-3 hover:bg-gray-50/40 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-[#1d1d20] truncate">{title}</div>
                        <div className="text-sm text-[#52525a] truncate">
                          {company}
                          {snap.location ? ` · ${snap.location}` : ""}
                        </div>
                      </div>

                      <div className="text-sm text-[#52525a] md:flex items-center">
                        <span className="capitalize">{a.ats}</span>
                      </div>

                      <div className="text-sm text-[#52525a] md:flex items-center">
                        {formatDate(a.submittedAt ?? a.createdAt)}
                      </div>

                      <div className="flex items-center gap-2">
                        {statusBadge(a.status)}
                        <select
                          aria-label="Change status"
                          disabled={updating === a.id}
                          value={a.status}
                          onChange={(e) => updateStatus(a.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white text-[#52525a]"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex md:justify-end items-center">
                        {source ? (
                          <a
                            href={source}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-xs text-brand underline"
                          >
                            View
                          </a>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <AuthGate>
      <Inner />
    </AuthGate>
  );
}
