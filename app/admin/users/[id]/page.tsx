"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { fetchAuthed } from "@/app/builder/_client/withAuth";

type Detail = {
  user: { id: string; email: string | null; firebaseUid: string | null; userType: string; plan: string; companyName: string | null; stripeCustomerId: string | null; applicantProfile: any; createdAt: string };
  subscriptions: { id: string; status: string; priceId: string | null; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean; createdAt: string }[];
  resumes: { id: string; title: string; renderer: string; isMaster: boolean; isTailored: boolean; archived: boolean; thumbnailUrl: string | null; updatedAt: string }[];
  coverLetters: { id: string; title: string; renderer: string; archived: boolean; updatedAt: string }[];
  applications: { id: string; ats: string; status: string; jobSnapshot: any; createdAt: string }[];
  jobPostings: { id: string; title: string; company: string; status: string; applicants: number; createdAt: string }[];
  shortlistRuns: { id: string; label: string; candidateType: string | null; candidates: number; createdAt: string }[];
  events: { event: string; path: string | null; country: string | null; city: string | null; ts: string }[];
};

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="font-semibold text-[#1d1d20] mb-2">{title}{count != null && <span className="text-[#a1a1aa] font-normal"> ({count})</span>}</h2>
      <div className="rounded-xl border border-gray-200 bg-white">{children}</div>
    </div>
  );
}

function Detail() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = React.useState<Detail | null>(null);
  const [missing, setMissing] = React.useState(false);

  React.useEffect(() => {
    fetchAuthed(`/api/admin/users/${id}`).then((r) => (r.ok ? r.json() : Promise.reject())).then(setD).catch(() => setMissing(true));
  }, [id]);

  if (missing) return <div><Link href="/admin/users" className="text-mint-700 hover:underline">← Users</Link><p className="mt-3 text-[#52525a]">User not found.</p></div>;
  if (!d) return <div className="text-sm text-[#52525a]">Loading…</div>;
  const u = d.user;
  const rowCls = "px-4 py-2.5 text-sm border-b border-gray-100 last:border-0";

  return (
    <div>
      <Link href="/admin/users" className="text-sm text-mint-700 hover:underline">← Users</Link>
      <div className="mt-2 mb-6">
        <h1 className="text-2xl font-bold text-[#1d1d20]">{u.email || "(no email)"}</h1>
        <div className="mt-1 flex flex-wrap gap-2 text-xs">
          <span className={`rounded-full px-2 py-0.5 font-semibold ${u.userType === "recruiter" ? "bg-mint-50 text-mint-700" : "bg-gray-100 text-gray-600"}`}>{u.userType}</span>
          <span className="rounded-full bg-gray-100 text-gray-600 px-2 py-0.5">plan: {u.plan}</span>
          {u.companyName && <span className="rounded-full bg-gray-100 text-gray-600 px-2 py-0.5">{u.companyName}</span>}
          <span className="text-[#a1a1aa]">joined {new Date(u.createdAt).toLocaleString()}</span>
        </div>
        <div className="mt-1 text-xs text-[#a1a1aa] break-all">uid: {u.firebaseUid || "—"} · stripe: {u.stripeCustomerId || "—"}</div>
      </div>

      <Section title="Subscriptions" count={d.subscriptions.length}>
        {d.subscriptions.length === 0 ? <div className={rowCls + " text-[#a1a1aa]"}>None</div> : d.subscriptions.map((s) => (
          <div key={s.id} className={rowCls + " flex items-center justify-between gap-2 flex-wrap"}>
            <span><b>{s.status}</b> · {s.priceId || "—"}{s.cancelAtPeriodEnd ? " · cancels at period end" : ""}</span>
            <span className="text-[#a1a1aa]">until {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : "—"}</span>
          </div>
        ))}
      </Section>

      <div className="grid md:grid-cols-2 gap-x-6">
        <Section title="Resumes" count={d.resumes.length}>
          {d.resumes.length === 0 ? <div className={rowCls + " text-[#a1a1aa]"}>None</div> : d.resumes.map((r) => (
            <div key={r.id} className={rowCls + " flex items-center gap-3"}>
              {r.thumbnailUrl ? <img src={r.thumbnailUrl} alt="" className="w-8 h-10 object-cover rounded border border-gray-200" /> : <div className="w-8 h-10 rounded bg-gray-100" />}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[#1d1d20]">{r.title}{r.isMaster && <span className="ml-1 text-[10px] text-amber-600">★ master</span>}{r.isTailored && <span className="ml-1 text-[10px] text-gray-500">tailored</span>}{r.archived && <span className="ml-1 text-[10px] text-red-500">archived</span>}</div>
                <div className="text-xs text-[#a1a1aa]">{r.renderer} · {new Date(r.updatedAt).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </Section>

        <Section title="Cover letters" count={d.coverLetters.length}>
          {d.coverLetters.length === 0 ? <div className={rowCls + " text-[#a1a1aa]"}>None</div> : d.coverLetters.map((c) => (
            <div key={c.id} className={rowCls}><div className="truncate text-[#1d1d20]">{c.title}</div><div className="text-xs text-[#a1a1aa]">{c.renderer} · {new Date(c.updatedAt).toLocaleDateString()}</div></div>
          ))}
        </Section>

        <Section title="Shortlist runs" count={d.shortlistRuns.length}>
          {d.shortlistRuns.length === 0 ? <div className={rowCls + " text-[#a1a1aa]"}>None</div> : d.shortlistRuns.map((r) => (
            <div key={r.id} className={rowCls + " flex items-center justify-between gap-2"}>
              <span className="truncate text-[#1d1d20]">{r.label} <span className="text-xs text-[#a1a1aa]">· {r.candidateType || "experienced"} · {r.candidates} candidates</span></span>
              <span className="text-xs text-[#a1a1aa]">{new Date(r.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
        </Section>

        <Section title="Job postings" count={d.jobPostings.length}>
          {d.jobPostings.length === 0 ? <div className={rowCls + " text-[#a1a1aa]"}>None</div> : d.jobPostings.map((j) => (
            <div key={j.id} className={rowCls + " flex items-center justify-between gap-2"}>
              <span className="truncate text-[#1d1d20]">{j.title} <span className="text-xs text-[#a1a1aa]">· {j.company} · {j.status} · {j.applicants} applicants</span></span>
              <span className="text-xs text-[#a1a1aa]">{new Date(j.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
        </Section>

        <Section title="Applications" count={d.applications.length}>
          {d.applications.length === 0 ? <div className={rowCls + " text-[#a1a1aa]"}>None</div> : d.applications.map((a) => (
            <div key={a.id} className={rowCls + " flex items-center justify-between gap-2"}>
              <span className="truncate text-[#1d1d20]">{a.jobSnapshot?.title || "—"} <span className="text-xs text-[#a1a1aa]">· {a.jobSnapshot?.company || a.ats} · {a.status}</span></span>
              <span className="text-xs text-[#a1a1aa]">{new Date(a.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
        </Section>

        <Section title="Recent activity" count={d.events.length}>
          {d.events.length === 0 ? <div className={rowCls + " text-[#a1a1aa]"}>No tracked events</div> : d.events.map((e, i) => (
            <div key={i} className={rowCls + " flex items-center justify-between gap-2"}>
              <span className="truncate text-[#1d1d20]">{e.event} <span className="text-xs text-[#a1a1aa]">{e.path || ""}{e.city ? ` · ${e.city}` : ""}{e.country ? `, ${e.country}` : ""}</span></span>
              <span className="text-xs text-[#a1a1aa] whitespace-nowrap">{new Date(e.ts).toLocaleString()}</span>
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}

export default function AdminUserDetailPage() {
  return <AdminShell><Detail /></AdminShell>;
}
