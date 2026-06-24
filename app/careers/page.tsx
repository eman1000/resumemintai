"use client";

// Public job board — open internal postings. Anyone can browse; applying
// requires a (free) candidate account.

import React from "react";
import Link from "next/link";
import { Search, MapPin, Briefcase } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

type Job = {
  slug: string;
  title: string;
  company: string;
  location: string | null;
  employmentType: string | null;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  createdAt: string;
};

function salary(j: Job) {
  if (!j.salaryMin && !j.salaryMax) return null;
  const c = j.currency || "USD";
  const fmt = (n: number) => `${c} ${n.toLocaleString()}`;
  if (j.salaryMin && j.salaryMax) return `${fmt(j.salaryMin)} – ${fmt(j.salaryMax)}`;
  return fmt((j.salaryMin || j.salaryMax)!);
}

export default function CareersPage() {
  const [jobs, setJobs] = React.useState<Job[] | null>(null);
  const [q, setQ] = React.useState("");

  const load = React.useCallback((query: string) => {
    setJobs(null);
    fetch(`/api/board?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((j) => setJobs(j.items || []))
      .catch(() => setJobs([]));
  }, []);

  React.useEffect(() => { load(""); }, [load]);

  return (
    <>
      <SiteNav />
      <main className="max-w-site mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#1d1d20]">Job board</h1>
          <p className="mt-3 text-[#52525a]">Open roles posted by companies hiring through ResumeMint.</p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); load(q); }}
          className="max-w-xl mx-auto flex gap-2 mb-10"
        >
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, company, location…"
              className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <button className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 text-sm transition-colors">Search</button>
        </form>

        {jobs === null ? (
          <div className="text-center text-sm text-[#52525a]">Loading roles…</div>
        ) : jobs.length === 0 ? (
          <div className="text-center text-[#52525a] py-12">No open roles right now. Check back soon.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((j) => (
              <Link key={j.slug} href={`/careers/${j.slug}`} className="card group hover:shadow-lg transition-shadow">
                <h3 className="font-semibold text-[#1d1d20] group-hover:text-blue-700 transition-colors">{j.title}</h3>
                <p className="text-sm text-[#52525a] mt-0.5">{j.company}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#52525a]">
                  {j.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{j.location}</span>}
                  {j.remote && <span className="rounded-full bg-blue-50 text-blue-700 px-2 py-0.5">Remote</span>}
                  {j.employmentType && <span className="inline-flex items-center gap-1"><Briefcase className="w-3 h-3" />{j.employmentType}</span>}
                </div>
                {salary(j) && <div className="mt-2 text-xs font-medium text-[#1d1d20]">{salary(j)}</div>}
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
