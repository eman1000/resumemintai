// app/api/jobs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { subDays } from "date-fns";

import { getUserFromRequest } from "@/app/api/server/auth/getUserFromRequest";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ApplyOption = {
  url: string;
  publisher?: string;     // "LinkedIn", "Greenhouse", employer name, etc.
  isDirect?: boolean;     // JSearch's signal that the link is the employer's own ATS, not an aggregator
};

type JobCard = {
  title: string;
  company: string;
  location: string;
  employmentType?: string;
  salary?: string;
  tags?: string[];
  postedAt?: string;
  description?: string;
  /** Primary apply URL — typically the most popular aggregator (LinkedIn/Indeed). */
  source?: string;
  /** All apply links JSearch returned for this listing. The direct ATS link
   * (Greenhouse / Lever / Ashby / Workable) often hides in here even when
   * `source` is a LinkedIn redirect. */
  applyOptions?: ApplyOption[];
};

function parsePostedAt(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function normalizeRecentJobs(jobs: JobCard[], today: Date): JobCard[] {
  const cutoff = subDays(today, 30);
  return jobs.filter((j) => {
    const d = parsePostedAt(j.postedAt);
    if (!d) return true;
    const tooOld = d < cutoff;
    const future = d > today;
    return !tooOld && !future;
  });
}

function dedupeJobs(jobs: JobCard[]): JobCard[] {
  const seen = new Set<string>();
  return jobs.filter((j) => {
    const key = `${j.title || ""}||${j.location || ""}||${(j.description || "").slice(0, 220)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function scrubCompanies(jobs: JobCard[]): JobCard[] {
  return jobs.map((j) => ({ ...j, company: "" }));
}

async function getDbUserIdByFirebaseUid(firebaseUid: string) {
  const u = await prisma.user.findUnique({
    where: { firebaseUid },
    select: { id: true },
  });
  return u?.id ?? null;
}

async function fetchFromJSearch(opts: {
  role: string;
  location: string;
  country: string;
  count: number;
}) {
  const { role, location, country, count } = opts;
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    const err: any = new Error("Missing RAPIDAPI_KEY");
    err.code = "JOBS_UNCONFIGURED";
    throw err;
  }
  const rapidHost = process.env.RAPIDAPI_HOST || "jsearch.p.rapidapi.com";

  const url = new URL(`https://${rapidHost}/search`);
  const query = location ? `${role} in ${location}` : `${role} in ${country}`;
  url.searchParams.set("query", query);
  url.searchParams.set("page", "1");
  const pages = Math.min(5, Math.ceil(count / 10));
  url.searchParams.set("num_pages", String(pages));
  url.searchParams.set("country", country || "us");
  url.searchParams.set("date_posted", "month");

  const res = await fetch(url.toString(), {
    headers: {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": rapidHost,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 403) {
      const err: any = new Error("jsearch_forbidden");
      err.code = "JSEARCH_FORBIDDEN";
      err.detail = text.slice(0, 200);
      err.host = rapidHost;
      err.keyHint = `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
      throw err;
    }
    // Tagged so the route handler can return a clean upstream error to the
    // client instead of a generic 500 / "internal_error".
    const err: any = new Error(`jsearch_failed: ${res.status}`);
    err.code = "JSEARCH_FAILED";
    err.status = res.status;
    err.detail = text.slice(0, 300);
    throw err;
  }
  const data = await res.json();
  const items: any[] = Array.isArray(data?.data) ? data.data : [];

  const mapped: JobCard[] = items.map((j) => {
    // JSearch returns `apply_options[]` separately from `job_apply_link`.
    // The direct-ATS link (Greenhouse / Lever / Ashby) is often only present
    // in that array, hidden behind a LinkedIn redirect as the headline link.
    const rawOpts: any[] = Array.isArray(j.apply_options)
      ? j.apply_options
      : Array.isArray(j.job_apply_options)
        ? j.job_apply_options
        : [];
    const applyOptions: ApplyOption[] = rawOpts
      .map((o: any) => ({
        url: String(o?.apply_link || ""),
        publisher: o?.publisher ? String(o.publisher) : undefined,
        isDirect: !!o?.is_direct,
      }))
      .filter((o: ApplyOption) => /^https?:\/\//i.test(o.url));

    return {
      title: j.job_title || "",
      company: j.employer_name || "",
      location: [j.job_city, j.job_country].filter(Boolean).join(", "),
      employmentType: j.job_employment_type || "",
      salary: j.job_min_salary && j.job_max_salary
        ? `${j.job_min_salary}–${j.job_max_salary} ${j.job_salary_currency || ""}`.trim()
        : undefined,
      tags: [j.job_employment_type, j.job_city, j.job_state].filter(Boolean),
      postedAt: j.job_posted_at_datetime_utc || j.job_posted_at || undefined,
      description: j.job_description || "",
      source: j.job_apply_link || (applyOptions[0]?.url || ""),
      applyOptions: applyOptions.length > 0 ? applyOptions : undefined,
    };
  });

  return dedupeJobs(scrubCompanies(normalizeRecentJobs(mapped, new Date()))).slice(0, count);
}

export async function GET(req: NextRequest) {
  try {
    // Guests don't have a JobResult cache to read from — just return empty.
    let userId: string | null = null;
    try {
      const fb = await getUserFromRequest();
      userId = await getDbUserIdByFirebaseUid(fb.uid);
    } catch {
      return NextResponse.json({ jobs: [], createdAt: null }, { status: 200 });
    }
    if (!userId) return NextResponse.json({ jobs: [], createdAt: null }, { status: 200 });

    const { searchParams } = new URL(req.url);
    const location = searchParams.get("location");
    const country = searchParams.get("country");

    const thirtyDaysAgo = subDays(new Date(), 30);

    // Prune stale rows
    await prisma.jobResult.deleteMany({
      where: {
        userId,
        ...(location ? { location: { equals: location, mode: "insensitive" } } : {}),
        ...(country ? { country: { equals: country, mode: "insensitive" } } : {}),
        createdAt: { lte: thirtyDaysAgo },
      },
    });

    const row = await prisma.jobResult.findFirst({
      where: {
        userId,
        ...(location ? { location: { equals: location, mode: "insensitive" } } : {}),
        ...(country ? { country: { equals: country, mode: "insensitive" } } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    if (!row) return NextResponse.json({ jobs: [], createdAt: null }, { status: 200 });

    const today = new Date();
    const results = Array.isArray(row.results) ? (row.results as unknown as JobCard[]) : [];
    const filtered = normalizeRecentJobs(results, today);

    if (!filtered.length) {
      await prisma.jobResult.delete({ where: { id: row.id } });
      return NextResponse.json({ jobs: [], createdAt: null }, { status: 200 });
    }

    return NextResponse.json({
      id: row.id,
      requestedRole: row.requestedRole,
      location: row.location,
      country: row.country,
      jobs: filtered,
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
      cached: true,
    });
  } catch (e: any) {
    if (e?.name === "UNAUTHORIZED") {
      return NextResponse.json({ error: e.message || "unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/jobs]", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Guests can search jobs (soft paywall on the UI gates view/apply).
    // Only signed-in users get a JobResult cache row.
    let userId: string | null = null;
    try {
      const fb = await getUserFromRequest();
      userId = await getDbUserIdByFirebaseUid(fb.uid);
    } catch {
      userId = null;
    }

    const { role, location, country = "us", count = 30 } = await req.json();

    const safeRole = (role || "generalist").toString().slice(0, 120);
    const safeLocation = (typeof location === "string" ? location : "").slice(0, 120);
    const safeCountry = country.toString().slice(0, 5).toLowerCase();
    const n = Math.max(10, Math.min(50, Number(count) || 30));

    const thirtyDaysAgo = subDays(new Date(), 30);

    if (userId) {
      // Prune stale for this user
      await prisma.jobResult.deleteMany({
        where: {
          userId,
          location: { equals: safeLocation, mode: "insensitive" },
          country: { equals: safeCountry, mode: "insensitive" },
          createdAt: { lte: thirtyDaysAgo },
        },
      });

      // Serve cache if fresh
      const cached = await prisma.jobResult.findFirst({
        where: {
          userId,
          location: { equals: safeLocation, mode: "insensitive" },
          country: { equals: safeCountry, mode: "insensitive" },
          createdAt: { gt: thirtyDaysAgo },
        },
        orderBy: { createdAt: "desc" },
      });

      if (cached) {
        const today = new Date();
        const cachedResults = Array.isArray(cached.results) ? (cached.results as unknown as JobCard[]) : [];
        const filtered = normalizeRecentJobs(cachedResults, today);
        if (filtered.length) {
          return NextResponse.json({
            id: cached.id,
            jobs: filtered,
            cached: true,
            createdAt: cached.createdAt ? cached.createdAt.toISOString() : null,
          });
        }
        await prisma.jobResult.delete({ where: { id: cached.id } });
      }
    }

    const jobs = await fetchFromJSearch({
      role: safeRole,
      location: safeLocation,
      country: safeCountry,
      count: n,
    });

    if (userId) {
      const created = await prisma.jobResult.create({
        data: {
          userId,
          requestedRole: safeRole,
          location: safeLocation,
          country: safeCountry,
          results: jobs as any,
        },
        select: { id: true },
      });
      return NextResponse.json({ id: created.id, jobs });
    }
    return NextResponse.json({ jobs });
  } catch (e: any) {
    if (e?.code === "JSEARCH_FORBIDDEN") {
      return NextResponse.json(
        {
          error: "jsearch_forbidden",
          detail: e?.detail || "Subscription missing",
          hint: "RapidAPI key is present, but this key/app is not subscribed to JSearch in RapidAPI dashboard.",
          rapidapiHost: e?.host || process.env.RAPIDAPI_HOST || "jsearch.p.rapidapi.com",
          keyHint: e?.keyHint || "unknown",
        },
        { status: 402 },
      );
    }
    if (e?.code === "JOBS_UNCONFIGURED") {
      console.error("[POST /api/jobs] jobs feature not configured (no RAPIDAPI_KEY)");
      return NextResponse.json(
        {
          error: "jobs_unavailable",
          detail: "Job search is temporarily unavailable. We're working on it.",
        },
        { status: 503 },
      );
    }
    if (e?.code === "JSEARCH_FAILED") {
      console.error("[POST /api/jobs] jsearch_failed", e?.status, e?.detail);
      // 4xx from JSearch usually means "no coverage for this country / query
      // shape" — degrade gracefully so the jobs page shows an empty state
      // instead of a hard error.
      if (e.status >= 400 && e.status < 500) {
        return NextResponse.json(
          { jobs: [], cached: false, createdAt: null, upstream: { status: e.status, detail: e.detail } },
          { status: 200 },
        );
      }
      return NextResponse.json(
        { error: "jsearch_failed", detail: e?.detail || `HTTP ${e?.status}`, upstreamStatus: e?.status },
        { status: 502 },
      );
    }
    if (e?.name === "UNAUTHORIZED") {
      return NextResponse.json({ error: e.message || "unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/jobs]", e);
    return NextResponse.json(
      { error: "internal_error", detail: e?.message || "unexpected_error" },
      { status: 500 },
    );
  }
}
