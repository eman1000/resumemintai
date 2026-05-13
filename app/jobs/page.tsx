"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faBriefcase, faLocationDot, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

import AuthGate from "@/components/AuthGate";
import { withAuth } from "@/app/builder/_client/withAuth";
import { useGeo } from "@/lib/useGeo";
import DashboardSidebar from "@/app/builder/components/DashboardSidebar";
import { auth } from "@/app/firebase";

type JobCard = {
  title: string;
  company: string;
  location: string;
  employmentType?: string;
  salary?: string;
  tags?: string[];
  postedAt?: string;
  description?: string;
  source?: string;
};

const COUNTRIES = [
  { code: "us", label: "United States" },
  { code: "se", label: "Sweden" },
  { code: "gb", label: "United Kingdom" },
  { code: "ca", label: "Canada" },
  { code: "au", label: "Australia" },
  { code: "de", label: "Germany" },
  { code: "nl", label: "Netherlands" },
  { code: "in", label: "India" },
  { code: "zw", label: "Zimbabwe" },
];

function validCountry(code?: string | null) {
  const c = (code || "").toLowerCase();
  return COUNTRIES.some((x) => x.code === c) ? c : "us";
}

function buildFallbackApplyUrl(job: JobCard, country: string) {
  const q = encodeURIComponent(`${job.title || "job"} ${job.location || country}`);
  return `https://www.google.com/search?q=${q}`;
}

export default function JobsPage() {
  const router = useRouter();
  const { data: geo } = useGeo();

  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const [role, setRole] = React.useState<string>("");
  const [location, setLocation] = React.useState<string>("");
  const [country, setCountry] = React.useState<string>("us");
  const [jobs, setJobs] = React.useState<JobCard[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<JobCard | null>(null);
  const [bootstrapped, setBootstrapped] = React.useState(false);

  const runSearch = React.useCallback(
    async (next?: { role?: string; location?: string; country?: string }) => {
      const payload = {
        role: (next?.role ?? role ?? "generalist").trim() || "generalist",
        location: (next?.location ?? location ?? "").trim(),
        country: (next?.country ?? country ?? "us").toLowerCase(),
        count: 30,
      };
      setError(null);
      setLoading(true);
      try {
        const res = await fetch(
          "/api/jobs",
          await withAuth({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        );
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.detail || j?.error || "Failed to load jobs");
        setJobs(Array.isArray(j?.jobs) ? j.jobs : []);
        setSelected(null);
      } catch (e: any) {
        setError(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    },
    [role, location, country]
  );

  React.useEffect(() => {
    if (bootstrapped) return;
    const nextCountry = validCountry(geo?.country_code);
    const nextLocation = geo?.city?.trim() || "";
    setCountry(nextCountry);
    setLocation(nextLocation);
    setBootstrapped(true);
    void runSearch({ country: nextCountry, location: nextLocation, role: role || "generalist" });
  }, [bootstrapped, geo?.country_code, geo?.city, runSearch, role]);

  React.useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, []);

  return (
    <AuthGate>
      <div className="min-h-screen bg-[#f8fbfc] text-[#1d1d20] flex">
        <DashboardSidebar
          userName={auth?.currentUser?.displayName || auth?.currentUser?.email || "Account"}
          onNew={() => router.push("/builder")}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        <main className="flex-1 bg-[#f8fbfc] text-[#1d1d20]">
          <div className="sm:hidden sticky top-0 z-10 bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
              <button
                className="grid place-items-center w-9 h-9 rounded-md hover:bg-black/5"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <FontAwesomeIcon icon={faBars} className="w-4 h-4" />
              </button>
              <div className="font-semibold">Jobs</div>
              <div className="w-9 h-9" />
            </div>
          </div>

          <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
            <header className="rounded-2xl bg-white border p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center">
                  <FontAwesomeIcon icon={faBriefcase} className="w-4 h-4 block" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold">Jobs</h1>
                  <p className="text-sm text-gray-600">Live listings by country and city</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Desired role</label>
                  <input
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Frontend Engineer"
                    className="w-full rounded-lg border px-3 py-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City (optional)"
                    className="w-full rounded-lg border px-3 py-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 bg-white"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => runSearch()}
                    disabled={loading}
                    className="w-full rounded-lg bg-brand hover:bg-brand-700 text-white py-2.5 font-medium disabled:opacity-60 inline-flex items-center justify-center"
                  >
                    <span className="inline-flex items-center justify-center gap-2 leading-none">
                      <FontAwesomeIcon icon={faMagnifyingGlass} className="w-3 h-3 block" />
                      {loading ? "Loading..." : "Search"}
                    </span>
                  </button>
                </div>
              </div>
            </header>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
            )}

            <section className="space-y-3">
              {jobs.map((job, idx) => (
                <button
                  key={`${job.title}-${idx}`}
                  onClick={() => setSelected(job)}
                  className="w-full text-left rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-lg truncate">{job.title || "Untitled role"}</h3>
                      <p className="text-sm text-gray-600 mt-0.5">
                        <FontAwesomeIcon icon={faLocationDot} className="w-3 h-3 mr-1" />
                        {job.location || country.toUpperCase()}
                      </p>
                    </div>
                    {job.postedAt && <span className="text-xs text-gray-500 shrink-0">{job.postedAt}</span>}
                  </div>

                  <p className="mt-3 text-sm text-gray-700 line-clamp-3">{job.description || "No description"}</p>

                  <div className="mt-3 text-xs text-gray-700 flex flex-wrap gap-2">
                    {job.employmentType && <span className="rounded bg-gray-100 px-2 py-1">{job.employmentType}</span>}
                    {job.salary && <span className="rounded bg-gray-100 px-2 py-1">{job.salary}</span>}
                    {(job.tags || []).slice(0, 4).map((t) => (
                      <span key={t} className="rounded bg-gray-100 px-2 py-1">
                        {t}
                      </span>
                    ))}
                  </div>
                </button>
              ))}

              {!jobs.length && !loading && (
                <div className="rounded-xl border bg-white p-6 text-sm text-gray-600">
                  No jobs found for current filters. Try another country or role.
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {selected && (
        <div className="fixed inset-0 z-40 bg-black/55 flex items-center justify-center p-4">
          <div className="bg-white text-gray-900 w-full max-w-3xl max-h-[90vh] overflow-auto rounded-xl shadow-xl p-6 relative">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
              aria-label="Close"
            >
              x
            </button>
            <h2 className="text-xl font-semibold text-gray-900">{selected.title || "Untitled role"}</h2>
            <p className="text-sm text-gray-600 mt-1">{selected.location || country.toUpperCase()}</p>
            <div className="mt-3 text-xs text-gray-700 flex flex-wrap gap-2">
              {selected.employmentType && <span className="rounded bg-gray-100 px-2 py-1">{selected.employmentType}</span>}
              {selected.salary && <span className="rounded bg-gray-100 px-2 py-1">{selected.salary}</span>}
              {(selected.tags || []).map((t) => (
                <span key={t} className="rounded bg-gray-100 px-2 py-1">
                  {t}
                </span>
              ))}
            </div>
            <p className="text-sm text-gray-800 whitespace-pre-line mt-4">{selected.description || "No description provided."}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={selected.source || buildFallbackApplyUrl(selected, country)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg bg-brand hover:bg-brand-700 text-white px-4 py-2 text-sm font-medium"
              >
                Apply now
              </a>
              <a
                href={buildFallbackApplyUrl(selected, country)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-800 px-4 py-2 text-sm font-medium"
              >
                Search similar jobs
              </a>
            </div>
          </div>
        </div>
      )}
    </AuthGate>
  );
}
