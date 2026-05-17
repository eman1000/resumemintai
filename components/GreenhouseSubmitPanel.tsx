"use client";

// components/GreenhouseSubmitPanel.tsx
//
// Phase A "Submit on Greenhouse" panel. Embedded in the jobs page when the
// selected job is detected as a Greenhouse posting. Reviewable, user-confirms
// before any POST happens — no autonomous submission.
//
// Flow:
//   1. Fetch /api/jobs/greenhouse/schema?url=... → render fields with prefill.
//   2. User reviews/edits, attaches a resume PDF (and optional cover letter PDF).
//   3. "Submit application" → multipart POST to /api/jobs/greenhouse/submit.
//   4. Show success + link to /jobs/applications (future tracker).

import * as React from "react";
import toast from "react-hot-toast";
import { withAuth } from "@/app/builder/_client/withAuth";

type Field = {
  name: string;
  type: string;
  required?: boolean;
  values?: Array<{ label: string; value: string | number }>;
};
type Question = { label: string; required: boolean; fields: Field[]; description?: string | null };

type Schema = {
  ref: { boardToken: string; jobId: string };
  schema: {
    title: string;
    location?: string | null;
    companyName?: string | null;
    questions: Question[];
  };
  prefill: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    linkedIn: string;
    location: string;
  };
  resumeIdSuggested: string | null;
  coverLetterIdSuggested: string | null;
};

export default function GreenhouseSubmitPanel({
  jobUrl,
  isSubscribed,
  onUnsubscribed,
  onSubmitted,
}: {
  jobUrl: string;
  isSubscribed: boolean;
  onUnsubscribed: () => void;
  onSubmitted: (info: { applicationId: string; remainingToday: number }) => void;
}) {
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [schema, setSchema] = React.useState<Schema | null>(null);

  // Field state, keyed by Greenhouse field name. Strings, multi-selects join with comma.
  const [values, setValues] = React.useState<Record<string, string | string[]>>({});
  const [resumeFile, setResumeFile] = React.useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = React.useState<File | null>(null);
  // Source for the resume: 'saved' uses the suggested resumeId and lets the
  // server auto-generate the PDF; 'upload' uses a user-picked file.
  const [resumeSource, setResumeSource] = React.useState<'saved' | 'upload'>('saved');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr(null);
      try {
        const r = await fetch(
          `/api/jobs/greenhouse/schema?url=${encodeURIComponent(jobUrl)}`,
          await withAuth(),
        );
        const j = await r.json();
        if (!r.ok) throw new Error(j?.detail || j?.error || "schema_failed");
        if (!alive) return;
        setSchema(j as Schema);
        // Build initial value map from prefill + Greenhouse's standard field names.
        const init: Record<string, string | string[]> = {};
        for (const q of j.schema.questions) {
          for (const f of q.fields) {
            const name = f.name.toLowerCase();
            if (name.includes("first") && name.includes("name")) init[f.name] = j.prefill.firstName;
            else if (name.includes("last") && name.includes("name")) init[f.name] = j.prefill.lastName;
            else if (name === "email" || name.includes("email")) init[f.name] = j.prefill.email;
            else if (name === "phone" || name.includes("phone")) init[f.name] = j.prefill.phone;
            else if (name.includes("linkedin")) init[f.name] = j.prefill.linkedIn;
            else if (name.includes("location") || name === "city") init[f.name] = j.prefill.location;
            else init[f.name] = f.type.startsWith("multi_value_multi") ? [] : "";
          }
        }
        setValues(init);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Couldn't load this Greenhouse posting.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [jobUrl]);

  function setField(name: string, value: string | string[]) {
    setValues((cur) => ({ ...cur, [name]: value }));
  }

  async function submit() {
    if (!schema) return;
    if (!isSubscribed) { onUnsubscribed(); return; }
    const useSavedResume = resumeSource === 'saved' && !!schema.resumeIdSuggested;
    if (!useSavedResume && !resumeFile) {
      toast.error("Attach your resume PDF first.");
      return;
    }
    // Validate required fields.
    for (const q of schema.schema.questions) {
      if (!q.required) continue;
      for (const f of q.fields) {
        if (f.type === "input_file") continue; // resume handled separately
        const v = values[f.name];
        const isEmpty = v == null
          || (typeof v === "string" && v.trim().length === 0)
          || (Array.isArray(v) && v.length === 0);
        if (isEmpty) {
          toast.error(`"${q.label}" is required`);
          return;
        }
      }
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("url", jobUrl);
      form.append("answers", JSON.stringify(values));
      if (useSavedResume) {
        // Server auto-generates the resume PDF from the saved row.
        form.append("resumeId", schema.resumeIdSuggested!);
      } else if (resumeFile) {
        form.append("resume", resumeFile, resumeFile.name || "resume.pdf");
        if (schema.resumeIdSuggested) form.append("resumeId", schema.resumeIdSuggested);
      }
      if (coverLetterFile) form.append("cover_letter", coverLetterFile, coverLetterFile.name || "cover-letter.pdf");
      if (schema.coverLetterIdSuggested) form.append("coverLetterId", schema.coverLetterIdSuggested);

      const init = await withAuth({ method: "POST", body: form });
      const r = await fetch("/api/jobs/greenhouse/submit", init);
      const j = await r.json();
      if (!r.ok) {
        if (r.status === 402) { onUnsubscribed(); return; }
        throw new Error(j?.detail || j?.error || "submit_failed");
      }
      toast.success("Application submitted to Greenhouse!");
      onSubmitted({ applicationId: j.applicationId, remainingToday: j.remainingToday ?? 0 });
    } catch (e: any) {
      toast.error(e?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
        Loading Greenhouse application form…
      </div>
    );
  }
  if (err) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {err}
      </div>
    );
  }
  if (!schema) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Apply on Greenhouse — review &amp; submit</h3>
          <p className="text-xs text-gray-600 mt-0.5">
            We&rsquo;ve pre-filled what we know. Edit anything, attach your resume PDF, then submit directly from here.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5">
          Greenhouse
        </span>
      </div>

      <div className="space-y-4">
        {schema.schema.questions.map((q, qi) => (
          <div key={qi}>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
              {q.label}{q.required && <span className="text-red-500"> *</span>}
            </div>
            {q.description && (
              <div className="text-[11px] text-gray-500 mb-1.5"
                   dangerouslySetInnerHTML={{ __html: q.description }} />
            )}
            <div className="space-y-2">
              {q.fields.map((f) => (
                <FieldInput
                  key={f.name}
                  field={f}
                  value={values[f.name] ?? ""}
                  onChange={(v) => setField(f.name, v)}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Resume + optional cover letter */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
            Resume (PDF) <span className="text-red-500">*</span>
          </div>
          {schema.resumeIdSuggested ? (
            <div className="space-y-2">
              <label className={`flex items-start gap-2 rounded-md border px-3 py-2 cursor-pointer ${resumeSource === 'saved' ? 'border-brand bg-brand-50' : 'border-gray-200'}`}>
                <input
                  type="radio"
                  name="resumeSource"
                  checked={resumeSource === 'saved'}
                  onChange={() => setResumeSource('saved')}
                  className="mt-0.5"
                />
                <div className="text-xs">
                  <div className="font-medium text-gray-900">Use my tailored resume</div>
                  <div className="text-[11px] text-gray-500">
                    We&rsquo;ll auto-generate the PDF from your saved resume — no upload needed.
                  </div>
                </div>
              </label>
              <label className={`flex items-start gap-2 rounded-md border px-3 py-2 cursor-pointer ${resumeSource === 'upload' ? 'border-brand bg-brand-50' : 'border-gray-200'}`}>
                <input
                  type="radio"
                  name="resumeSource"
                  checked={resumeSource === 'upload'}
                  onChange={() => setResumeSource('upload')}
                  className="mt-0.5"
                />
                <div className="text-xs flex-1">
                  <div className="font-medium text-gray-900">Upload my own PDF</div>
                  {resumeSource === 'upload' && (
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                      className="mt-1 block w-full text-xs file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-brand file:text-white file:cursor-pointer"
                    />
                  )}
                </div>
              </label>
            </div>
          ) : (
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
              className="block w-full text-xs file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-brand file:text-white file:cursor-pointer"
            />
          )}
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
            Cover letter (PDF, optional)
          </div>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setCoverLetterFile(e.target.files?.[0] ?? null)}
            className="block w-full text-xs file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-gray-200 file:text-gray-800 file:cursor-pointer"
          />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <button
          onClick={submit}
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-3 py-2 disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit application"}
        </button>
        <span className="text-[11px] text-gray-500">
          One-click submit to the company&rsquo;s Greenhouse board. No third-party scraping.
        </span>
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: string | string[];
  onChange: (v: string | string[]) => void;
}) {
  const common =
    "w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 focus:border-brand focus:ring-1 focus:ring-brand outline-none";

  if (field.type === "textarea") {
    return (
      <textarea
        rows={4}
        value={String(value || "")}
        onChange={(e) => onChange(e.target.value)}
        className={common}
        placeholder={field.name}
      />
    );
  }

  if (field.type === "multi_value_single_select_field" && field.values) {
    return (
      <select
        value={String(value || "")}
        onChange={(e) => onChange(e.target.value)}
        className={common}
      >
        <option value="">— select —</option>
        {field.values.map((v) => (
          <option key={String(v.value)} value={String(v.value)}>{v.label}</option>
        ))}
      </select>
    );
  }

  if (field.type === "multi_value_multi_select_field" && field.values) {
    const cur = Array.isArray(value) ? value : (value ? [String(value)] : []);
    return (
      <div className="flex flex-wrap gap-1.5">
        {field.values.map((v) => {
          const sv = String(v.value);
          const active = cur.includes(sv);
          return (
            <button
              key={sv}
              type="button"
              onClick={() => onChange(active ? cur.filter((x) => x !== sv) : [...cur, sv])}
              className={[
                "rounded-full px-2.5 py-1 text-xs border transition",
                active ? "bg-brand text-white border-brand" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
              ].join(" ")}
            >
              {v.label}
            </button>
          );
        })}
      </div>
    );
  }

  // input_file is rendered as the dedicated resume/cover-letter inputs above —
  // skip rendering for embedded input_file fields here.
  if (field.type === "input_file") return null;

  return (
    <input
      type="text"
      value={String(value || "")}
      onChange={(e) => onChange(e.target.value)}
      className={common}
      placeholder={field.name}
    />
  );
}
