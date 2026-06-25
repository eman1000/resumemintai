"use client";

import React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { fetchAuthed } from "@/app/builder/_client/withAuth";

type Row = {
  id: string; email: string | null; userType: string; plan: string; companyName: string | null; createdAt: string;
  counts: { resumes: number; coverLetters: number; shortlistRuns: number; applications: number; jobPostings: number; subscriptions: number };
};

function UsersList() {
  const [items, setItems] = React.useState<Row[] | null>(null);
  const [page, setPage] = React.useState(1);
  const [pages, setPages] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [q, setQ] = React.useState("");
  const [qInput, setQInput] = React.useState("");
  const [type, setType] = React.useState<"all" | "recruiter" | "candidate">("all");

  const load = React.useCallback(() => {
    setItems(null);
    const p = new URLSearchParams({ page: String(page), q, type });
    fetchAuthed(`/api/admin/users?${p}`).then((r) => r.json())
      .then((j) => { setItems(j.items || []); setPages(j.pages || 1); setTotal(j.total || 0); })
      .catch(() => setItems([]));
  }, [page, q, type]);
  React.useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h1 className="text-2xl font-bold text-[#1d1d20]">Users {total > 0 && <span className="text-base text-[#a1a1aa]">({total.toLocaleString()})</span>}</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(qInput.trim()); }} className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Search email…"
            className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint-200" />
        </form>
        <select value={type} onChange={(e) => { setPage(1); setType(e.target.value as any); }} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="all">All types</option>
          <option value="recruiter">Recruiters</option>
          <option value="candidate">Candidates</option>
        </select>
      </div>

      {items === null ? (
        <div className="text-sm text-[#52525a]">Loading…</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-[#52525a]">
                <tr>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Resumes</th>
                  <th className="px-4 py-3 font-medium">Shortlists</th>
                  <th className="px-4 py-3 font-medium">Apps</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${u.id}`} className="text-mint-700 font-medium hover:underline">{u.email || "(no email)"}</Link>
                      {u.companyName && <div className="text-xs text-[#a1a1aa]">{u.companyName}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${u.userType === "recruiter" ? "bg-mint-50 text-mint-700" : "bg-gray-100 text-gray-600"}`}>{u.userType}</span>
                    </td>
                    <td className="px-4 py-3 text-[#52525a]">{u.plan}{u.counts.subscriptions > 0 ? " · sub" : ""}</td>
                    <td className="px-4 py-3">{u.counts.resumes}</td>
                    <td className="px-4 py-3">{u.counts.shortlistRuns}</td>
                    <td className="px-4 py-3">{u.counts.applications}</td>
                    <td className="px-4 py-3 text-[#a1a1aa]">{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-4 text-sm text-[#52525a]">
            <span>{total.toLocaleString()} users</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 hover:bg-gray-50">Previous</button>
              <span>Page {page} of {pages}</span>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  return <AdminShell><UsersList /></AdminShell>;
}
