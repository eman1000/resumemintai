"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faBriefcase, faLocationDot, faMagnifyingGlass, faArrowLeft, faXmark, faCirclePlus, faClipboardCheck } from "@fortawesome/free-solid-svg-icons";
import { detectAts, pickBestApply, AUTO_SUBMIT_ATS, type AtsHost } from "@/lib/atsDetect";
import GreenhouseSubmitPanel from "@/components/GreenhouseSubmitPanel";

import AuthGate from "@/components/AuthGate";
import { withAuth } from "@/app/builder/_client/withAuth";
import { useGeo } from "@/lib/useGeo";
import DashboardSidebar from "@/app/builder/components/DashboardSidebar";
import { auth } from "@/app/firebase";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import SubscribeSlidePanel from "@/components/SubscribeSlidePanel";
import { faWandMagicSparkles, faLock, faCheck, faArrowRight } from "@fortawesome/free-solid-svg-icons";

type ApplyOption = { url: string; publisher?: string; isDirect?: boolean };

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
  applyOptions?: ApplyOption[];
};

type JobMatch = { index: number; score: number; matched: string[]; missing: string[] };

/** Tier colour for the match badge. */
function matchTier(score: number): { label: string; cls: string; ring: string } {
  if (score >= 70) return { label: "Strong match", cls: "bg-emerald-100 text-emerald-800", ring: "ring-emerald-200" };
  if (score >= 40) return { label: "Good match", cls: "bg-amber-100 text-amber-800", ring: "ring-amber-200" };
  if (score > 0)   return { label: "Weak match", cls: "bg-gray-100 text-gray-700", ring: "ring-gray-200" };
  return { label: "Unrated", cls: "bg-gray-50 text-gray-500", ring: "ring-gray-100" };
}

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

// Wrap in Suspense at the export boundary so `useSearchParams()` doesn't
// force the entire build to error out at prerender time.
export default function JobsPage() {
  return (
    <React.Suspense fallback={null}>
      <JobsPageInner />
    </React.Suspense>
  );
}

function JobsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  /** Deep-link from toasts / emails: ?source=<encoded apply url>. We try to
   * auto-select that job once the listing loads. */
  const focusSourceFromQuery = searchParams?.get("source") || "";
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

  // Match scoring (free feature, foundation for tailored-apply premium)
  const [matchesByIndex, setMatchesByIndex] = React.useState<Record<number, JobMatch>>({});
  const [matchWarning, setMatchWarning] = React.useState<string | null>(null);
  const [matching, setMatching] = React.useState(false);
  const [sortByMatch, setSortByMatch] = React.useState(true);
  /** Listing filter chips. "all" passes everything; "oneClick" keeps only
   * jobs whose best apply URL maps to an ATS we can submit to;
   * "highMatch" keeps jobs scored ≥ 60 against the user's resume. */
  type JobFilter = "all" | "oneClick" | "highMatch";
  const [filter, setFilter] = React.useState<JobFilter>("all");

  // PRO: "Tailor for this job" state
  const { isSubscribed } = useAuthStatus();
  const [subscribeOpen, setSubscribeOpen] = React.useState(false);
  const [tailoring, setTailoring] = React.useState(false);
  const [tailorResult, setTailorResult] = React.useState<
    | { resumeId: string; coverLetterId: string; title: string; summary?: string }
    | null
  >(null);
  const [tailorError, setTailorError] = React.useState<string | null>(null);
  const [tailorQuota, setTailorQuota] = React.useState<
    | { remainingDay: number; remainingMonth: number; dayLimit: number; monthLimit: number }
    | null
  >(null);
  const [tailorBlockedAt, setTailorBlockedAt] = React.useState<string | null>(null);
  // After tailoring (or finding an existing kit), the pane swaps to "applying
  // mode" showing the ATS checklist.
  const [applyMode, setApplyMode] = React.useState(false);

  // Does the user have a non-empty resume? We need to know before showing
  // the Tailor CTA — refuse to invent experience if the base is empty.
  type ResumeProbe = { hasResume: boolean; hasContent: boolean };
  const [resumeProbe, setResumeProbe] = React.useState<ResumeProbe | null>(null);
  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch(
          "/api/jobs/tailored-kit?probe=resume",
          await withAuth(),
        );
        if (r.ok) setResumeProbe(await r.json());
      } catch { /* non-fatal */ }
    })();
  }, []);

  // Existing kit for the currently-selected job. Resets per selection.
  type ExistingKit = {
    resumeId: string;
    resumeTitle: string;
    coverLetterId: string | null;
    coverLetterTitle: string | null;
    tailoredAt: string | null;
  };
  const [existingKit, setExistingKit] = React.useState<ExistingKit | null>(null);
  const [kitLoading, setKitLoading] = React.useState(false);

  // Reset the tailor panel each time the user opens a different job.
  React.useEffect(() => {
    setTailorResult(null);
    setTailorError(null);
    setTailorBlockedAt(null);
    setApplyMode(false);
    setExistingKit(null);
    if (!selected?.source) return;
    setKitLoading(true);
    (async () => {
      try {
        const r = await fetch(
          `/api/jobs/tailored-kit?source=${encodeURIComponent(selected.source!)}`,
          await withAuth(),
        );
        if (r.ok) {
          const j = await r.json();
          if (j?.kit) setExistingKit(j.kit);
        }
      } catch { /* non-fatal */ }
      finally { setKitLoading(false); }
    })();
  }, [selected]);

  async function runTailorKit() {
    if (!selected) return;
    if (!isSubscribed) { setSubscribeOpen(true); return; }
    // Hard guard — surface a friendly message instead of letting the API
    // refuse us with "empty_resume".
    if (resumeProbe && !resumeProbe.hasContent) {
      setTailorError(
        "Add some real content to a resume first (one job with bullets, three skills, or a profile summary). We tailor your real story; we don't invent it.",
      );
      return;
    }
    setTailoring(true);
    setTailorError(null);
    try {
      const res = await fetch(
        "/api/jobs/tailor-kit",
        await withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job: selected }),
        }),
      );
      const j = await res.json();
      if (!res.ok) {
        if (res.status === 402) { setSubscribeOpen(true); return; }
        if (res.status === 429) {
          setTailorError(j?.detail || "You've hit your AI usage limit.");
          setTailorBlockedAt(j?.resetAt || null);
          return;
        }
        if (res.status === 400 || res.status === 422) {
          // empty_resume / no_resume → show the detail verbatim
          setTailorError(j?.detail || "Add a resume with real content first.");
          return;
        }
        throw new Error(j?.detail || j?.error || "tailor_failed");
      }
      setTailorResult(j);
      if (j.quota) setTailorQuota(j.quota);
      // Cache as the "existing kit" so the next view of this job remembers
      setExistingKit({
        resumeId: j.resumeId,
        resumeTitle: j.title,
        coverLetterId: j.coverLetterId,
        coverLetterTitle: j.title + " — Cover Letter",
        tailoredAt: new Date().toISOString(),
      });
    } catch (e: any) {
      setTailorError(e?.message || "Tailoring failed");
    } finally {
      setTailoring(false);
    }
  }

  /** Fetch the saved cover letter text by id so we can write it to the
   * clipboard during the Apply Kit flow. */
  async function readCoverLetterText(id: string): Promise<string> {
    try {
      const r = await fetch(`/api/cover-letters/${id}`, await withAuth());
      const j = await r.json();
      if (!r.ok) return "";
      const d = j?.data || {};
      const parts: string[] = [];
      if (d.salutation) parts.push(d.salutation);
      parts.push("");
      for (const p of d.paragraphs || []) if (p) { parts.push(p); parts.push(""); }
      if (d.closing) parts.push(d.closing);
      if (d.signatureName) parts.push(d.signatureName);
      return parts.join("\n");
    } catch { return ""; }
  }

  /** Apply-with-kit: copy CL body + contact JSON to clipboard, open the
   * external apply URL in a new tab, swap the pane into checklist mode. */
  async function applyWithKit(kit: ExistingKit) {
    if (!selected) return;
    const apply = selected.source || buildFallbackApplyUrl(selected, country);
    let clText = "";
    if (kit.coverLetterId) clText = await readCoverLetterText(kit.coverLetterId);
    try {
      // Best-effort clipboard. May fail if the document isn't focused at the
      // moment of write — that's OK, the user can still copy from the editor.
      if (navigator.clipboard?.writeText && clText) {
        await navigator.clipboard.writeText(clText);
      }
    } catch { /* non-fatal */ }
    setApplyMode(true);
    // Open in a new tab so our pane stays visible alongside the apply form.
    window.open(apply, "_blank", "noopener,noreferrer");
  }

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
      setMatchesByIndex({});
      setMatchWarning(null);
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
        const newJobs: JobCard[] = Array.isArray(j?.jobs) ? j.jobs : [];
        setJobs(newJobs);
        setSelected(null);

        // Fire and forget — match score is a progressive enhancement, the
        // listing renders regardless.
        if (newJobs.length > 0) {
          setMatching(true);
          fetch(
            "/api/jobs/match",
            await withAuth({
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jobs: newJobs }),
            })
          )
            .then((r) => r.json())
            .then((data) => {
              if (data?.warn) setMatchWarning(data.warn);
              const map: Record<number, JobMatch> = {};
              for (const m of data?.matches || []) map[m.index] = m;
              setMatchesByIndex(map);
            })
            .catch(() => { /* non-fatal */ })
            .finally(() => setMatching(false));
        }
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

  // Honour ?source=<url> deep-link from toasts/emails: once the jobs list is
  // populated, find the matching listing and auto-select it.
  React.useEffect(() => {
    if (!focusSourceFromQuery || !jobs.length || selected) return;
    const hit = jobs.find((j) => (j.source || "") === focusSourceFromQuery);
    if (hit) setSelected(hit);
  }, [focusSourceFromQuery, jobs, selected]);

  // Indexed view of jobs: keeps the original index (so matchesByIndex lookup
  // stays valid) but can be sorted by match score when the toggle is on
  // and filtered to one-click-apply / high-match jobs when those chips are on.
  const indexedJobs = React.useMemo(() => {
    let arr = jobs.map((j, i) => ({ job: j, originalIndex: i }));
    if (filter === "oneClick") {
      arr = arr.filter(({ job }) => pickBestApply(job.source, job.applyOptions).isAutoSubmit);
    } else if (filter === "highMatch") {
      arr = arr.filter(({ originalIndex }) => (matchesByIndex[originalIndex]?.score ?? 0) >= 60);
    }
    if (!sortByMatch || Object.keys(matchesByIndex).length === 0) return arr;
    return arr.sort((a, b) => {
      const sa = matchesByIndex[a.originalIndex]?.score ?? -1;
      const sb = matchesByIndex[b.originalIndex]?.score ?? -1;
      return sb - sa;
    });
  }, [jobs, matchesByIndex, sortByMatch, filter]);

  /** Per-chip counts so each filter button can show how many it'd reveal. */
  const filterCounts = React.useMemo(() => {
    const oneClick = jobs.filter((j) => pickBestApply(j.source, j.applyOptions).isAutoSubmit).length;
    const highMatch = jobs.reduce(
      (n, _j, i) => n + ((matchesByIndex[i]?.score ?? 0) >= 60 ? 1 : 0),
      0,
    );
    return { all: jobs.length, oneClick, highMatch };
  }, [jobs, matchesByIndex]);

  const selectedIndex = selected
    ? jobs.findIndex((j) => j === selected)
    : -1;
  const selectedMatch = selectedIndex >= 0 ? matchesByIndex[selectedIndex] : undefined;

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

            {/* Match status bar */}
            {jobs.length > 0 && (
              <div className="flex items-center justify-between rounded-xl border bg-white px-4 py-2.5 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <FontAwesomeIcon icon={faBriefcase} className="w-3.5 h-3.5 text-brand" />
                  {matching ? (
                    <span>Scoring jobs against your resume…</span>
                  ) : matchWarning === "no_resume_to_compare" ? (
                    <span>
                      <span className="text-amber-700">No resume yet —</span>{" "}
                      <button onClick={() => router.push("/builder")} className="text-brand hover:underline">
                        create one
                      </button>{" "}
                      to see match scores.
                    </span>
                  ) : Object.keys(matchesByIndex).length > 0 ? (
                    <span>
                      Showing <strong>{indexedJobs.length}</strong> jobs ranked by match with your resume
                    </span>
                  ) : (
                    <span>Showing {indexedJobs.length} jobs</span>
                  )}
                </div>
                {Object.keys(matchesByIndex).length > 0 && (
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sortByMatch}
                      onChange={(e) => setSortByMatch(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Sort by match
                  </label>
                )}
              </div>
            )}

            {/* Split layout: list on the left, sticky details on the right.
                On mobile the list and detail stack — opening a job swaps the
                viewport for the detail page; "Back" returns to the list. */}
            <div className="grid lg:grid-cols-[minmax(340px,420px)_1fr] gap-4">
              {/* LIST */}
              <section
                className={[
                  "space-y-3",
                  // Hide the list on mobile when a job is selected
                  selected ? "hidden lg:block" : "block",
                ].join(" ")}
              >
                {/* Filter chip row */}
                {jobs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 -mt-1 mb-1">
                    <FilterChip
                      label="All"
                      active={filter === "all"}
                      count={filterCounts.all}
                      onClick={() => setFilter("all")}
                    />
                    <FilterChip
                      label="⚡ One-click apply"
                      active={filter === "oneClick"}
                      count={filterCounts.oneClick}
                      disabled={filterCounts.oneClick === 0}
                      tone="emerald"
                      onClick={() => setFilter("oneClick")}
                      title="Jobs ResumeMint can submit to directly (Greenhouse-backed boards)"
                    />
                    <FilterChip
                      label="High match"
                      active={filter === "highMatch"}
                      count={filterCounts.highMatch}
                      disabled={Object.keys(matchesByIndex).length === 0 || filterCounts.highMatch === 0}
                      tone="brand"
                      onClick={() => setFilter("highMatch")}
                      title="Jobs scored 60% or higher against your resume"
                    />
                  </div>
                )}

                {/* Empty-after-filter helper */}
                {jobs.length > 0 && indexedJobs.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-white/60 p-4 text-xs text-gray-600">
                    No jobs match this filter right now.{" "}
                    <button
                      onClick={() => setFilter("all")}
                      className="text-brand hover:underline font-medium"
                    >
                      Show all jobs
                    </button>
                    .
                  </div>
                )}

                {indexedJobs.map(({ job, originalIndex }) => {
                  const match = matchesByIndex[originalIndex];
                  const tier = match ? matchTier(match.score) : null;
                  const isActive = selected === job;
                  const best = pickBestApply(job.source, job.applyOptions);
                  return (
                    <button
                      key={`${job.title}-${originalIndex}`}
                      onClick={() => setSelected(job)}
                      className={[
                        "w-full text-left rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition",
                        isActive ? "border-brand ring-2 ring-brand/20" : "",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-base lg:text-[15px] truncate">{job.title || "Untitled role"}</h3>
                          <p className="text-xs text-gray-600 mt-0.5">
                            <FontAwesomeIcon icon={faLocationDot} className="w-3 h-3 mr-1" />
                            {job.location || country.toUpperCase()}
                          </p>
                        </div>
                        {tier && match && match.score > 0 && (
                          <span
                            className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${tier.cls} ${tier.ring}`}
                            title={tier.label}
                          >
                            {match.score}%
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-xs text-gray-700 line-clamp-2">{job.description || "No description"}</p>

                      <div className="mt-2 text-[10px] text-gray-700 flex flex-wrap items-center gap-1">
                        {best.isAutoSubmit && (
                          <span
                            className="rounded-full bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5"
                            title={`Submit directly via ${best.ats.label} without leaving ResumeMint`}
                          >
                            ⚡ One-click apply
                          </span>
                        )}
                        {job.employmentType && <span className="rounded bg-gray-100 px-1.5 py-0.5">{job.employmentType}</span>}
                        {job.salary && <span className="rounded bg-gray-100 px-1.5 py-0.5">{job.salary}</span>}
                        {(job.tags || []).slice(0, 3).map((t) => (
                          <span key={t} className="rounded bg-gray-100 px-1.5 py-0.5">{t}</span>
                        ))}
                        {job.postedAt && <span className="ml-auto text-gray-400">{job.postedAt}</span>}
                      </div>
                    </button>
                  );
                })}

                {!jobs.length && !loading && (
                  <div className="rounded-xl border bg-white p-6 text-sm text-gray-600">
                    No jobs found for current filters. Try another country or role.
                  </div>
                )}
              </section>

              {/* DETAILS PANE — sticky on desktop, full-width on mobile */}
              <section className={selected ? "block" : "hidden lg:block"}>
                <div className="lg:sticky lg:top-4">
                  {selected ? (
                    <JobDetailsPane
                      job={selected}
                      match={selectedMatch}
                      country={country}
                      onClose={() => setSelected(null)}
                      onTailor={runTailorKit}
                      tailoring={tailoring}
                      tailorResult={tailorResult}
                      tailorError={tailorError}
                      isSubscribed={isSubscribed}
                      onOpenResume={(id) => router.push(`/builder/${id}/edit`)}
                      onOpenCoverLetter={(id) => router.push(`/builder/cover-letters/${id}/edit`)}
                      resumeProbe={resumeProbe}
                      existingKit={existingKit}
                      kitLoading={kitLoading}
                      applyMode={applyMode}
                      onApplyWithKit={applyWithKit}
                      onResetApplyMode={() => setApplyMode(false)}
                      onGoToBuilder={() => router.push("/builder")}
                      quota={tailorQuota}
                      blockedResetAt={tailorBlockedAt}
                    />
                  ) : (
                    <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white/60 p-10 text-center text-gray-500">
                      <FontAwesomeIcon icon={faBriefcase} className="w-6 h-6 text-gray-300 mb-2 block mx-auto" />
                      <div className="font-medium text-gray-700">Pick a job to see details</div>
                      <p className="text-sm mt-1">Click any listing on the left to see the full description, match insights, and tailor your application.</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>

      <SubscribeSlidePanel open={subscribeOpen} onClose={() => setSubscribeOpen(false)} />
    </AuthGate>
  );
}

/* ---------------------------------------------------------------------------
   JobDetailsPane — replaces the old modal. Renders on the right side of the
   split layout on desktop and as a full-width panel on mobile (with a back
   arrow because mobile users don't get a side-by-side context).
--------------------------------------------------------------------------- */
/* ---------------------------------------------------------------------------
   FilterChip — toggle-style pill used above the jobs list. Inactive chips are
   subtle; active chips paint with the chip's tone colour. Disabled chips
   render greyed and are unclickable (still showing the count so users see
   "0 of N matching").
--------------------------------------------------------------------------- */
function FilterChip({
  label,
  active,
  count,
  disabled,
  tone = "gray",
  onClick,
  title,
}: {
  label: string;
  active: boolean;
  count: number;
  disabled?: boolean;
  tone?: "gray" | "emerald" | "brand";
  onClick: () => void;
  title?: string;
}) {
  const palette = {
    gray:    { activeBg: "bg-gray-900",   activeText: "text-white",      countActive: "bg-white/20 text-white",        idleBg: "bg-white",      idleText: "text-gray-800",   countIdle: "bg-gray-100 text-gray-700" },
    emerald: { activeBg: "bg-emerald-600",activeText: "text-white",      countActive: "bg-white/20 text-white",        idleBg: "bg-white",      idleText: "text-emerald-700",countIdle: "bg-emerald-100 text-emerald-800" },
    brand:   { activeBg: "bg-brand",      activeText: "text-white",      countActive: "bg-white/20 text-white",        idleBg: "bg-white",      idleText: "text-brand",      countIdle: "bg-brand-50 text-brand-700" },
  }[tone];

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
        active
          ? `${palette.activeBg} ${palette.activeText} border-transparent shadow-sm`
          : `${palette.idleBg} ${palette.idleText} border-gray-200 hover:bg-gray-50`,
        disabled ? "opacity-50 cursor-not-allowed hover:bg-white" : "cursor-pointer",
      ].join(" ")}
    >
      <span>{label}</span>
      <span
        className={[
          "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold",
          active ? palette.countActive : palette.countIdle,
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
}

function JobDetailsPane({
  job,
  match,
  country,
  onClose,
  onTailor,
  tailoring,
  tailorResult,
  tailorError,
  isSubscribed,
  onOpenResume,
  onOpenCoverLetter,
  resumeProbe,
  existingKit,
  kitLoading,
  applyMode,
  onApplyWithKit,
  onResetApplyMode,
  onGoToBuilder,
}: {
  job: JobCard;
  match?: JobMatch;
  country: string;
  onClose: () => void;
  onTailor: () => void;
  tailoring: boolean;
  tailorResult: { resumeId: string; coverLetterId: string; title: string; summary?: string } | null;
  tailorError: string | null;
  isSubscribed: boolean;
  onOpenResume: (id: string) => void;
  onOpenCoverLetter: (id: string) => void;
  resumeProbe: { hasResume: boolean; hasContent: boolean } | null;
  existingKit: {
    resumeId: string;
    resumeTitle: string;
    coverLetterId: string | null;
    coverLetterTitle: string | null;
    tailoredAt: string | null;
  } | null;
  kitLoading: boolean;
  applyMode: boolean;
  onApplyWithKit: (kit: NonNullable<typeof existingKit>) => void;
  onResetApplyMode: () => void;
  onGoToBuilder: () => void;
  quota: { remainingDay: number; remainingMonth: number; dayLimit: number; monthLimit: number } | null;
  blockedResetAt: string | null;
}) {
  // Pick the best apply URL: prefers an auto-submittable ATS link from
  // applyOptions[] over a LinkedIn/Indeed redirect headlining `source`.
  const best = pickBestApply(job.source, job.applyOptions);
  const ats: AtsHost = best.ats;
  const bestApplyUrl = best.url || job.source || "";
  const tier = match && match.score > 0 ? matchTier(match.score) : null;
  // Phase A: full Greenhouse submission supported in-app.
  const isGreenhouse = ats.id === "greenhouse" && !!bestApplyUrl;
  const [ghOpen, setGhOpen] = React.useState(false);
  const [ghSubmitted, setGhSubmitted] = React.useState<
    | { applicationId: string; remainingToday: number }
    | null
  >(null);
  React.useEffect(() => {
    setGhOpen(false);
    setGhSubmitted(null);
  }, [job]);
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Sticky toolbar inside the pane */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 bg-white">
        <button
          onClick={onClose}
          className="lg:hidden inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          aria-label="Back to list"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="w-3.5 h-3.5" />
          Back
        </button>
        <div className="hidden lg:block text-xs text-gray-500">Details</div>
        <button
          onClick={onClose}
          className="hidden lg:inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100"
          aria-label="Close"
        >
          <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-5 py-5 max-h-[calc(100vh-12rem)] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-gray-900">{job.title || "Untitled role"}</h2>
            <p className="text-sm text-gray-600 mt-1">
              <FontAwesomeIcon icon={faLocationDot} className="w-3 h-3 mr-1" />
              {job.location || country.toUpperCase()}
              {job.postedAt && <span className="ml-2 text-gray-400">· {job.postedAt}</span>}
            </p>
          </div>
          {tier && match && (
            <span
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${tier.cls} ${tier.ring}`}
            >
              <span aria-hidden>●</span>
              {match.score}% match
            </span>
          )}
        </div>

        <div className="mt-3 text-xs text-gray-700 flex flex-wrap gap-2">
          {job.employmentType && <span className="rounded bg-gray-100 px-2 py-1">{job.employmentType}</span>}
          {job.salary && <span className="rounded bg-gray-100 px-2 py-1">{job.salary}</span>}
          {(job.tags || []).map((t) => (
            <span key={t} className="rounded bg-gray-100 px-2 py-1">{t}</span>
          ))}
        </div>

        {/* Phase A: Submit directly via Greenhouse */}
        {isGreenhouse && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            {ghSubmitted ? (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-emerald-900">
                    Submitted ✓
                  </div>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Application sent to this employer&rsquo;s Greenhouse board.
                    {ghSubmitted.remainingToday > 0 && (
                      <> {ghSubmitted.remainingToday} submissions left today.</>
                    )}
                  </p>
                </div>
              </div>
            ) : !ghOpen ? (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-600 text-white text-[10px] font-semibold px-2 py-0.5">
                      One-click
                    </span>
                    <h3 className="text-sm font-semibold text-gray-900">
                      Submit on Greenhouse without leaving ResumeMint
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-gray-700">
                    We&rsquo;ll fetch the application form, pre-fill what we know,
                    and POST it straight to the employer&rsquo;s Greenhouse board after
                    you review.
                  </p>
                </div>
                <button
                  onClick={() => setGhOpen(true)}
                  className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-3 py-2"
                >
                  Review &amp; submit
                </button>
              </div>
            ) : (
              <GreenhouseSubmitPanel
                jobUrl={bestApplyUrl}
                isSubscribed={isSubscribed}
                onUnsubscribed={() => { /* parent handles via 402, but in case */ }}
                onSubmitted={(info) => setGhSubmitted(info)}
              />
            )}
          </div>
        )}

        {/* Secondary actions only — primary "Apply" sits inside the kit panel
            below because it should follow tailoring, not precede it. */}
        <div className="mt-5">
          <a
            href={buildFallbackApplyUrl(job, country)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-brand hover:underline"
          >
            Search similar roles →
          </a>
        </div>

        {/* === Apply Kit panel — three states + applyMode checklist === */}
        <div className="mt-4 rounded-xl border border-gray-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-4">
          {/* STATE A — Apply mode: external tab opened, here's what to do */}
          {applyMode && existingKit ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faClipboardCheck} className="w-4 h-4 text-violet-600" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    Applying on {ats.label}
                  </h3>
                </div>
                <button onClick={onResetApplyMode} className="text-[11px] text-gray-500 hover:text-gray-800">
                  Done
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-700">
                Cover letter is on your clipboard (⌘V to paste).
                Resume PDF: open <button onClick={() => onOpenResume(existingKit.resumeId)} className="underline text-violet-700">tailored resume</button> and click Download.
              </p>
              <ol className="mt-3 space-y-1.5 text-xs text-gray-800 list-decimal pl-4">
                {ats.checklist.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ol>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={job.source || buildFallbackApplyUrl(job, country)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-brand text-white text-xs font-medium px-3 py-1.5 hover:bg-brand-700"
                >
                  Reopen application tab
                </a>
                <button
                  onClick={() => onOpenResume(existingKit.resumeId)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 text-gray-800 text-xs font-medium px-3 py-1.5 hover:bg-gray-50"
                >
                  Open resume
                </button>
                {existingKit.coverLetterId && (
                  <button
                    onClick={() => onOpenCoverLetter(existingKit.coverLetterId!)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 text-gray-800 text-xs font-medium px-3 py-1.5 hover:bg-gray-50"
                  >
                    Open cover letter
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faWandMagicSparkles} className="w-4 h-4 text-violet-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Tailor & Apply</h3>
                    <span className="text-[10px] font-semibold uppercase tracking-wide rounded bg-amber-100 text-amber-800 px-1.5 py-0.5">
                      PRO
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-700">
                    {existingKit
                      ? "You've already tailored a kit for this job."
                      : "Generate a tailored resume + cover letter, then we open the apply page with your cover letter pre-copied to the clipboard."}
                  </p>
                </div>
              </div>

              {/* STATE B — No resume at all: send to builder */}
              {resumeProbe && !resumeProbe.hasResume && (
                <div className="mt-3 rounded-lg bg-white border border-gray-200 p-3">
                  <div className="text-xs text-gray-800">
                    You don&rsquo;t have a resume yet. Tailoring needs a base — we customise <em>your</em> story, we don&rsquo;t invent one.
                  </div>
                  <button
                    onClick={onGoToBuilder}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-brand text-white text-xs font-medium px-3 py-1.5 hover:bg-brand-700"
                  >
                    <FontAwesomeIcon icon={faCirclePlus} className="w-3 h-3" />
                    Create your first resume
                  </button>
                </div>
              )}

              {/* STATE C — Resume exists but is empty */}
              {resumeProbe && resumeProbe.hasResume && !resumeProbe.hasContent && (
                <div className="mt-3 rounded-lg bg-white border border-amber-200 p-3">
                  <div className="text-xs text-amber-900">
                    Your resume is mostly empty. Add at least one role with bullets, three skills, or a profile summary, then come back.
                  </div>
                  <button
                    onClick={onGoToBuilder}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-amber-600 text-white text-xs font-medium px-3 py-1.5 hover:bg-amber-700"
                  >
                    Fill in your resume
                  </button>
                </div>
              )}

              {/* STATE D — Existing kit for this job */}
              {existingKit && resumeProbe?.hasContent && (
                <div className="mt-3 rounded-lg bg-white border border-emerald-200 p-3">
                  <div className="flex items-center gap-2 text-emerald-700 text-sm font-semibold">
                    <FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5" />
                    Your tailored kit is ready
                  </div>
                  {existingKit.tailoredAt && (
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      Tailored {new Date(existingKit.tailoredAt).toLocaleString()}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => onApplyWithKit(existingKit)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-brand text-white text-xs font-medium px-3 py-1.5 hover:bg-brand-700"
                    >
                      <FontAwesomeIcon icon={faClipboardCheck} className="w-3 h-3" />
                      Apply with kit
                    </button>
                    <button
                      onClick={() => onOpenResume(existingKit.resumeId)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 text-gray-800 text-xs font-medium px-3 py-1.5 hover:bg-gray-50"
                    >
                      Open resume
                    </button>
                    {existingKit.coverLetterId && (
                      <button
                        onClick={() => onOpenCoverLetter(existingKit.coverLetterId!)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 text-gray-800 text-xs font-medium px-3 py-1.5 hover:bg-gray-50"
                      >
                        Open cover letter
                      </button>
                    )}
                    <button
                      onClick={onTailor}
                      disabled={tailoring}
                      className="inline-flex items-center gap-1.5 rounded-md text-[11px] text-violet-700 underline disabled:opacity-60"
                    >
                      {tailoring ? "Re-tailoring…" : "Re-tailor"}
                    </button>
                  </div>
                </div>
              )}

              {/* STATE E — Ready to tailor (has content, no existing kit) */}
              {!existingKit && !kitLoading && resumeProbe?.hasContent && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={onTailor}
                    disabled={tailoring}
                    className="inline-flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-3 py-2 disabled:opacity-60"
                  >
                    {!isSubscribed && <FontAwesomeIcon icon={faLock} className="w-3 h-3" />}
                    {tailoring ? "Tailoring…" : isSubscribed ? "Tailor with AI" : "Unlock with PRO"}
                  </button>
                  <a
                    href={job.source || buildFallbackApplyUrl(job, country)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-600 hover:text-gray-900"
                  >
                    or apply without tailoring →
                  </a>
                </div>
              )}

              {tailorError && (
                <div className="mt-3 rounded-md bg-red-100 text-red-800 text-xs px-3 py-2">
                  {tailorError}
                  {blockedResetAt && (
                    <div className="mt-1 text-[10px] text-red-700/80">
                      Quota resets {new Date(blockedResetAt).toLocaleString()}.
                    </div>
                  )}
                </div>
              )}

              {quota && (
                <div className="mt-3 text-[11px] text-gray-600">
                  AI usage today: <strong>{quota.dayLimit - quota.remainingDay}/{quota.dayLimit}</strong>
                  <span className="mx-1.5 text-gray-300">·</span>
                  this month: <strong>{quota.monthLimit - quota.remainingMonth}/{quota.monthLimit}</strong>
                </div>
              )}

              {/* Just-tailored success — same look as state D, used when the
                  effect hasn't picked up the new kit yet. */}
              {tailorResult && !existingKit && (
                <div className="mt-3 rounded-lg bg-white border border-emerald-200 p-3">
                  <div className="flex items-center gap-2 text-emerald-700 text-sm font-semibold">
                    <FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5" />
                    Tailored kit ready
                  </div>
                  {tailorResult.summary && (
                    <p className="mt-1 text-xs text-gray-600">{tailorResult.summary}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        onApplyWithKit({
                          resumeId: tailorResult.resumeId,
                          resumeTitle: tailorResult.title,
                          coverLetterId: tailorResult.coverLetterId,
                          coverLetterTitle: tailorResult.title + " — Cover Letter",
                          tailoredAt: new Date().toISOString(),
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-md bg-brand text-white text-xs font-medium px-3 py-1.5 hover:bg-brand-700"
                    >
                      <FontAwesomeIcon icon={faClipboardCheck} className="w-3 h-3" />
                      Apply with kit
                    </button>
                    <button
                      onClick={() => onOpenResume(tailorResult.resumeId)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 text-gray-800 text-xs font-medium px-3 py-1.5 hover:bg-gray-50"
                    >
                      Open resume
                    </button>
                    <button
                      onClick={() => onOpenCoverLetter(tailorResult.coverLetterId)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 text-gray-800 text-xs font-medium px-3 py-1.5 hover:bg-gray-50"
                    >
                      Open cover letter
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Match insight panel */}
        {match && (match.matched.length > 0 || match.missing.length > 0) && (
          <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">Why we matched you</h3>
              <span className="text-[11px] text-gray-500">based on your most recent resume</span>
            </div>
            {match.matched.length > 0 && (
              <div className="mt-3">
                <div className="text-[11px] uppercase tracking-wide text-emerald-700 font-medium">
                  Strengths the JD mentions ({match.matched.length})
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {match.matched.slice(0, 12).map((k) => (
                    <span key={k} className="rounded bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5">{k}</span>
                  ))}
                  {match.matched.length > 12 && (
                    <span className="text-xs text-gray-500">+{match.matched.length - 12} more</span>
                  )}
                </div>
              </div>
            )}
            {match.missing.length > 0 && (
              <div className="mt-3">
                <div className="text-[11px] uppercase tracking-wide text-amber-700 font-medium">
                  Worth highlighting in your cover letter
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {match.missing.slice(0, 8).map((k) => (
                    <span key={k} className="rounded bg-amber-100 text-amber-800 text-xs px-2 py-0.5">{k}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Job description body */}
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Job description</h3>
          <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
            {job.description || "No description provided."}
          </p>
        </div>
      </div>
    </div>
  );
}
