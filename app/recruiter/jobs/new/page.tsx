"use client";

// Create a job posting. On success → the posting's manage page.

import React from "react";
import { useRouter } from "next/navigation";
import RecruiterShell from "@/components/recruiter/RecruiterShell";
import { fetchAuthed } from "@/app/builder/_client/withAuth";

const EMPLOYMENT = ["full-time", "part-time", "contract", "internship", "temporary"];

function NewJob() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [f, setF] = React.useState({
    title: "",
    company: "",
    location: "",
    employmentType: "full-time",
    remote: false,
    description: "",
    salaryMin: "",
    salaryMax: "",
    currency: "USD",
    status: "open",
  });

  const set = (k: keyof typeof f, v: any) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (status: "open" | "draft") => {
    if (!f.title.trim()) { setError("Add a job title."); return; }
    if (!f.company.trim()) { setError("Add the company name."); return; }
    if (f.description.trim().length < 20) { setError("Add a fuller job description."); return; }
    setBusy(true); setError(null);
    try {
      const r = await fetchAuthed("/api/recruiter/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...f,
          status,
          salaryMin: f.salaryMin ? Number(f.salaryMin) : null,
          salaryMax: f.salaryMax ? Number(f.salaryMax) : null,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.detail || j?.error || "Could not create posting");
      router.replace(`/recruiter/jobs/${j.id}`);
    } catch (e: any) {
      setError(e?.message || "Could not create posting");
      setBusy(false);
    }
  };

  const input = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[#1d1d20] mb-6">Post a job</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job title *</label>
          <input className={input} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Senior Backend Engineer" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
            <input className={input} value={f.company} onChange={(e) => set("company", e.target.value)} placeholder="Acme Inc." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input className={input} value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="Dublin, Ireland" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employment type</label>
            <select className={input} value={f.employmentType} onChange={(e) => set("employmentType", e.target.value)}>
              {EMPLOYMENT.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={f.remote} onChange={(e) => set("remote", e.target.checked)} />
              Remote-friendly
            </label>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Salary min</label>
            <input className={input} type="number" value={f.salaryMin} onChange={(e) => set("salaryMin", e.target.value)} placeholder="60000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Salary max</label>
            <input className={input} type="number" value={f.salaryMax} onChange={(e) => set("salaryMax", e.target.value)} placeholder="90000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <input className={input} value={f.currency} onChange={(e) => set("currency", e.target.value)} placeholder="USD" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job description *</label>
          <textarea
            className={`${input} h-64`}
            value={f.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Responsibilities, requirements, must-have skills, nice-to-haves… The richer this is, the better the AI shortlist."
          />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={() => submit("open")}
            disabled={busy}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 text-sm disabled:opacity-60 transition-colors"
          >
            {busy ? "Publishing…" : "Publish to job board"}
          </button>
          <button
            onClick={() => submit("draft")}
            disabled={busy}
            className="rounded-lg border border-gray-300 text-[#1d1d20] font-semibold px-5 py-2.5 text-sm hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            Save as draft
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewJobPage() {
  return (
    <RecruiterShell>
      <NewJob />
    </RecruiterShell>
  );
}
