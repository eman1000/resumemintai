"use client";

// Public job detail + internal application. Browsing is open; applying needs a
// (free) candidate account and picks one of the candidate's resumes.

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MapPin, Briefcase, CheckCircle2 } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { fetchAuthed } from "@/app/builder/_client/withAuth";

type Job = {
  slug: string; title: string; company: string; location: string | null;
  employmentType: string | null; remote: boolean; description: string;
  salaryMin: number | null; salaryMax: number | null; currency: string | null;
};
type ResumeCard = { id: string; title: string; isMaster?: boolean };

export default function JobDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, isAuthenticated, loading: authLoading } = useAuthStatus();

  const [job, setJob] = React.useState<Job | null | "missing">(null);
  const [resumes, setResumes] = React.useState<ResumeCard[]>([]);
  const [resumeId, setResumeId] = React.useState("");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch(`/api/board/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => setJob(j.job))
      .catch(() => setJob("missing"));
  }, [slug]);

  React.useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    setName(user?.displayName || "");
    setEmail(user?.email || "");
    fetchAuthed("/api/resumes")
      .then((r) => r.json())
      .then((items: ResumeCard[]) => {
        setResumes(items || []);
        const master = items?.find((x) => x.isMaster) || items?.[0];
        if (master) setResumeId(master.id);
      })
      .catch(() => {});
  }, [authLoading, isAuthenticated, user]);

  const apply = async () => {
    if (!resumeId) { setError("Choose a resume to apply with."); return; }
    setBusy(true); setError(null);
    try {
      const r = await fetchAuthed(`/api/board/${slug}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId, name, email, note }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.detail || j?.error || "Could not submit application");
      setDone(true);
    } catch (e: any) {
      setError(e?.message || "Could not submit application");
    } finally {
      setBusy(false);
    }
  };

  if (job === null) return (<><SiteNav /><main className="max-w-3xl mx-auto px-4 py-16 text-sm text-[#52525a]">Loading…</main></>);
  if (job === "missing") return (<><SiteNav /><main className="max-w-3xl mx-auto px-4 py-16 text-center"><p className="text-[#52525a]">This role isn&apos;t available.</p><Link href="/careers" className="text-blue-700 underline mt-3 inline-block">Back to job board</Link></main></>);

  const input = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200";

  return (
    <>
      <SiteNav />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/careers" className="text-sm text-blue-700 hover:underline">← All jobs</Link>
        <h1 className="mt-3 text-3xl font-bold text-[#1d1d20]">{job.title}</h1>
        <p className="text-[#52525a] mt-1">{job.company}</p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-[#52525a]">
          {job.location && <span className="inline-flex items-center gap-1"><MapPin className="w-4 h-4" />{job.location}</span>}
          {job.remote && <span className="rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-xs">Remote</span>}
          {job.employmentType && <span className="inline-flex items-center gap-1"><Briefcase className="w-4 h-4" />{job.employmentType}</span>}
        </div>

        <div className="mt-8 whitespace-pre-wrap text-[#1d1d20] leading-relaxed">{job.description}</div>

        {/* Apply */}
        <div id="apply" className="mt-10 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-[#1d1d20] mb-4">Apply for this role</h2>

          {done ? (
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" /> Application submitted — the hiring team will see it in their dashboard.
            </div>
          ) : authLoading ? (
            <div className="text-sm text-[#52525a]">Checking your account…</div>
          ) : !isAuthenticated ? (
            <div>
              <p className="text-sm text-[#52525a] mb-3">Sign in (or create a free account) to apply with one of your resumes.</p>
              <Link href={`/login?return=/careers/${slug}`} className="inline-flex rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 text-sm transition-colors">
                Sign in to apply
              </Link>
            </div>
          ) : resumes.length === 0 ? (
            <div>
              <p className="text-sm text-[#52525a] mb-3">You don&apos;t have a resume yet. Create one, then come back to apply.</p>
              <Link href="/builder" className="inline-flex rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 text-sm transition-colors">Build a resume</Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
                  <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input className={input} value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resume</label>
                <select className={input} value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
                  {resumes.map((r) => <option key={r.id} value={r.id}>{r.title}{r.isMaster ? " (master)" : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note to the hiring team (optional)</label>
                <textarea className={`${input} h-24`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="A short message about why you're a great fit…" />
              </div>
              {error && <div className="text-sm text-red-600">{error}</div>}
              <button onClick={apply} disabled={busy} className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 text-sm disabled:opacity-60 transition-colors">
                {busy ? "Submitting…" : "Submit application"}
              </button>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
