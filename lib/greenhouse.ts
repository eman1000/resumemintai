// lib/greenhouse.ts
//
// Greenhouse Job Board API helpers.
//
// Greenhouse exposes a public read-only Job Board API per employer. Every
// careers page hosted at boards.greenhouse.io/{token} (and the newer
// job-boards.greenhouse.io) maps to:
//   GET  https://boards-api.greenhouse.io/v1/boards/{token}/jobs/{id}?questions=true
//
// Submissions go via:
//   POST https://boards-api.greenhouse.io/v1/boards/{token}/jobs/{id}
// with multipart/form-data containing the fields listed in `questions[]`.
//
// This module owns URL parsing + the read side. The write side (multipart
// construction + POST) lives in the route that calls it, because file blobs
// only exist inside that request scope.

export type GreenhouseRef = {
  boardToken: string;
  jobId: string;
};

const URL_PATTERNS = [
  // Classic: boards.greenhouse.io/<token>/jobs/<id>
  /^https?:\/\/(?:www\.)?boards\.greenhouse\.io\/([^\/]+)\/jobs\/(\d+)\b/i,
  // New layout: job-boards.greenhouse.io/<token>/jobs/<id>
  /^https?:\/\/(?:www\.)?job-boards\.greenhouse\.io\/([^\/]+)\/jobs\/(\d+)\b/i,
  // Embedded form: boards.greenhouse.io/embed/job_app?for=<token>&token=<id>
  // (we'll regex the query params separately if needed)
];

/** Parse a Greenhouse apply URL into { boardToken, jobId }. Returns null when
 * the URL doesn't look like a Greenhouse posting. */
export function parseGreenhouseUrl(url: string | null | undefined): GreenhouseRef | null {
  if (!url) return null;
  for (const re of URL_PATTERNS) {
    const m = url.match(re);
    if (m) return { boardToken: m[1], jobId: m[2] };
  }
  // Also handle the embedded form variant.
  try {
    const u = new URL(url);
    if (/(^|\.)greenhouse\.io$/i.test(u.hostname) && u.pathname.includes('/embed/job_app')) {
      const token = u.searchParams.get('for');
      const id = u.searchParams.get('token');
      if (token && id) return { boardToken: token, jobId: id };
    }
  } catch {}
  return null;
}

export type GreenhouseQuestionField = {
  name: string;
  /** Greenhouse-side type. We map this to UI controls in the route. */
  type: 'input_text' | 'input_file' | 'textarea' | 'multi_value_single_select_field' | 'multi_value_multi_select_field' | string;
  // Pre-known choices for selects. Each is { label, value }.
  values?: Array<{ label: string; value: string | number }>;
  // Greenhouse sometimes labels the file input "resume" but we accept any.
  required?: boolean;
};

export type GreenhouseQuestion = {
  label: string;
  required: boolean;
  fields: GreenhouseQuestionField[];
  description?: string | null;
};

export type GreenhouseJobSchema = {
  boardToken: string;
  jobId: string;
  title: string;
  location?: string | null;
  absoluteUrl: string;
  companyName?: string | null;
  /** HTML description, sanitised before display. */
  content: string;
  questions: GreenhouseQuestion[];
};

/** Fetch the Greenhouse posting + its application schema. Returns null on 404. */
export async function fetchGreenhouseSchema(ref: GreenhouseRef): Promise<GreenhouseJobSchema | null> {
  const apiUrl =
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(ref.boardToken)}/jobs/${encodeURIComponent(ref.jobId)}?questions=true`;
  const r = await fetch(apiUrl, {
    cache: 'no-store',
    headers: { accept: 'application/json' },
  });
  if (r.status === 404) return null;
  if (!r.ok) {
    throw new Error(`greenhouse_schema_${r.status}`);
  }
  const j: any = await r.json();

  const questions: GreenhouseQuestion[] = Array.isArray(j?.questions)
    ? j.questions.map((q: any) => ({
        label: String(q?.label || '').trim(),
        required: !!q?.required,
        description: q?.description ? String(q.description) : null,
        fields: Array.isArray(q?.fields)
          ? q.fields.map((f: any) => ({
              name: String(f?.name || ''),
              type: String(f?.type || 'input_text'),
              required: !!f?.required,
              values: Array.isArray(f?.values)
                ? f.values
                    .map((v: any) => ({
                      label: String(v?.label ?? v?.value ?? ''),
                      value: typeof v?.value === 'number' ? v.value : String(v?.value ?? v?.label ?? ''),
                    }))
                    .filter((v: any) => v.label && v.value !== '')
                : undefined,
            }))
          : [],
      }))
    : [];

  return {
    boardToken: ref.boardToken,
    jobId: ref.jobId,
    title: String(j?.title || '').trim() || 'Untitled role',
    location: j?.location?.name ? String(j.location.name) : null,
    companyName: j?.company_name ? String(j.company_name) : null,
    absoluteUrl: String(j?.absolute_url || ''),
    content: typeof j?.content === 'string' ? j.content : '',
    questions,
  };
}

/** Convenience: a schema URL most Greenhouse boards expose without auth. */
export function greenhouseSubmitUrl(ref: GreenhouseRef): string {
  return `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(ref.boardToken)}/jobs/${encodeURIComponent(ref.jobId)}`;
}
