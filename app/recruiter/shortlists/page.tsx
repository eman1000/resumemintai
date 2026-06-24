"use client";

// Saved shortlists — paginated, filterable table. Each row links to a detail
// page; rename + delete inline.

import React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import RecruiterShell from "@/components/recruiter/RecruiterShell";
import { fetchAuthed } from "@/app/builder/_client/withAuth";

type Run = {
  id: string;
  label: string;
  type: "posting" | "adhoc";
  candidates: number;
  top: { name: string; score: number } | null;
  createdAt: string;
};

function Shortlists() {
  const [items, setItems] = React.useState<Run[] | null>(null);
  const [page, setPage] = React.useState(1);
  const [pages, setPages] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [q, setQ] = React.useState("");
  const [qInput, setQInput] = React.useState("");
  const [type, setType] = React.useState<"all" | "posting" | "adhoc">("all");

  const load = React.useCallback(() => {
    setItems(null);
    const params = new URLSearchParams({ page: String(page), pageSize: "20", q, type });
    fetchAuthed(`/api/recruiter/runs?${params.toString()}`)
      .then((r) => r.json())
      .then((j) => { setItems(j.items || []); setPages(j.pages || 1); setTotal(j.total || 0); })
      .catch(() => setItems([]));
  }, [page, q, type]);

  React.useEffect(() => { load(); }, [load]);

  const rename = async (run: Run) => {
    const label = prompt("Rename shortlist", run.label);
    if (!label || !label.trim() || label.trim() === run.label) return;
    await fetchAuthed(`/api/recruiter/runs/${run.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: label.trim() }),
    });
    load();
  };

  const del = async (run: Run) => {
    if (!confirm(`Delete "${run.label}"? This cannot be undone.`)) return;
    await fetchAuthed(`/api/recruiter/runs/${run.id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="max-w-site mx-auto px-4 py-8">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <h1 className="text-2xl font-bold text-[#1d1d20]">Saved shortlists</h1>
        <Link href="/recruiter/shortlist" className="rounded-lg bg-mint-600 hover:bg-mint-700 text-white font-semibold px-4 py-2.5 text-sm transition-colors">
          New shortlist
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <form
          onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(qInput.trim()); }}
          className="relative flex-1 min-w-[220px] max-w-md"
        >
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Search by name…"
            className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint-200"
          />
        </form>
        <select
          value={type}
          onChange={(e) => { setPage(1); setType(e.target.value as any); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">All types</option>
          <option value="posting">From a posting</option>
          <option value="adhoc">Ad-hoc upload</option>
        </select>
      </div>

      {items === null ? (
        <div className="text-sm text-[#52525a]">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-[#52525a]">
          No saved shortlists{q ? " match your search" : " yet"}.
          {!q && <> Run one from the <Link href="/recruiter/shortlist" className="text-mint-700 underline">shortlist tool</Link>.</>}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-[#52525a]">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Candidates</th>
                  <th className="px-4 py-3 font-medium">Top match</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/recruiter/shortlists/${r.id}`} className="font-medium text-[#1d1d20] hover:text-mint-700">{r.label}</Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${r.type === "posting" ? "bg-mint-50 text-mint-700" : "bg-gray-100 text-gray-700"}`}>
                        {r.type === "posting" ? "Posting" : "Ad-hoc"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#1d1d20]">{r.candidates}</td>
                    <td className="px-4 py-3 text-[#52525a]">{r.top ? `${r.top.name} (${r.top.score}/100)` : "—"}</td>
                    <td className="px-4 py-3 text-[#a1a1aa]">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link href={`/recruiter/shortlists/${r.id}`} className="text-mint-700 hover:underline">View</Link>
                      <button onClick={() => rename(r)} className="text-[#52525a] hover:text-[#1d1d20] ml-3">Rename</button>
                      <button onClick={() => del(r)} className="text-red-600 hover:underline ml-3">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 text-sm text-[#52525a]">
            <span>{total} shortlist{total === 1 ? "" : "s"}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 hover:bg-gray-50"
              >
                Previous
              </button>
              <span>Page {page} of {pages}</span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ShortlistsPage() {
  return (
    <RecruiterShell>
      <Shortlists />
    </RecruiterShell>
  );
}
