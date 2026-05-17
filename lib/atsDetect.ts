// Detect the ATS / job board behind a job listing's apply URL so we can
// show host-specific paste-and-go instructions. Pattern-only; no requests.

export type AtsHost = {
  id:
    | 'greenhouse'
    | 'lever'
    | 'workday'
    | 'smartrecruiters'
    | 'workable'
    | 'icims'
    | 'taleo'
    | 'successfactors'
    | 'bamboohr'
    | 'ashby'
    | 'recruitee'
    | 'jobvite'
    | 'linkedin'
    | 'indeed'
    | 'glassdoor'
    | 'generic';
  label: string;
  /** Friendly checklist shown after the user clicks Apply. */
  checklist: string[];
  /** True if the host typically supports a single resume PDF upload. */
  acceptsResumeUpload: boolean;
  /** True if there's a dedicated cover letter text field. */
  hasCoverLetterField: boolean;
};

const HOSTS: Array<{ test: RegExp; meta: AtsHost }> = [
  {
    test: /(^|\.)greenhouse\.io|boards\.greenhouse\.io|job-boards\.greenhouse\.io/i,
    meta: {
      id: 'greenhouse',
      label: 'Greenhouse',
      acceptsResumeUpload: true,
      hasCoverLetterField: true,
      checklist: [
        'Upload tailored-resume.pdf in the Resume field',
        'Paste the cover letter (already on your clipboard) into the Cover Letter box',
        'LinkedIn / website fields → paste your contact info',
        'Answer any short questions, then Submit',
      ],
    },
  },
  {
    test: /jobs\.lever\.co|lever\.co\/apply/i,
    meta: {
      id: 'lever',
      label: 'Lever',
      acceptsResumeUpload: true,
      hasCoverLetterField: true,
      checklist: [
        'Upload tailored-resume.pdf',
        'Paste cover letter into the "Additional information" or cover letter field',
        'Fill name, email, LinkedIn — all on your clipboard',
        'Click Submit application',
      ],
    },
  },
  {
    test: /myworkdayjobs\.com|wd[0-9]+\.myworkdayjobs|workday\.com/i,
    meta: {
      id: 'workday',
      label: 'Workday',
      acceptsResumeUpload: true,
      hasCoverLetterField: false,
      checklist: [
        'Create an account or sign in (Workday almost always requires this)',
        'Upload tailored-resume.pdf — Workday parses fields from it',
        'Review parsed fields, fix anything wrong',
        'Workday has no cover-letter field — paste it into the "About yourself" / additional section if present',
        'Step through Questions, Voluntary Disclosures, Review, Submit',
      ],
    },
  },
  {
    test: /smartrecruiters\.com|jobs\.smartrecruiters\.com|careers\.smartrecruiters\.com/i,
    meta: {
      id: 'smartrecruiters',
      label: 'SmartRecruiters',
      acceptsResumeUpload: true,
      hasCoverLetterField: true,
      checklist: [
        'Upload tailored-resume.pdf',
        'Paste cover letter (clipboard) into the message / cover-letter field',
        'Fill remaining fields from your clipboard contact info',
        'Submit',
      ],
    },
  },
  {
    test: /jobs\.workable\.com|apply\.workable\.com/i,
    meta: {
      id: 'workable',
      label: 'Workable',
      acceptsResumeUpload: true,
      hasCoverLetterField: true,
      checklist: [
        'Upload tailored-resume.pdf',
        'Paste cover letter into the Cover Letter field',
        'Fill name, email, phone, LinkedIn',
        'Submit',
      ],
    },
  },
  {
    test: /\.icims\.com/i,
    meta: {
      id: 'icims',
      label: 'iCIMS',
      acceptsResumeUpload: true,
      hasCoverLetterField: true,
      checklist: [
        'Account creation is usually required',
        'Upload tailored-resume.pdf',
        'Paste cover letter into the additional information / cover-letter field',
        'Complete EEO + work-auth screens, then Submit',
      ],
    },
  },
  {
    test: /\.taleo\.net|tbe\.taleo\.net/i,
    meta: {
      id: 'taleo',
      label: 'Taleo',
      acceptsResumeUpload: true,
      hasCoverLetterField: true,
      checklist: [
        'Account creation usually required',
        'Upload tailored-resume.pdf — parser is finicky, double-check the auto-filled fields',
        'Paste cover letter into the cover-letter field',
        'Step through all wizard pages — Taleo silently drops applications that skip steps',
      ],
    },
  },
  {
    test: /successfactors\.com|jobs.*sap\.com/i,
    meta: {
      id: 'successfactors',
      label: 'SuccessFactors',
      acceptsResumeUpload: true,
      hasCoverLetterField: true,
      checklist: [
        'Sign in or create an account',
        'Upload tailored-resume.pdf',
        'Paste cover letter into the cover-letter / additional documents area',
        'Complete remaining required fields and Submit',
      ],
    },
  },
  {
    test: /\.bamboohr\.com/i,
    meta: {
      id: 'bamboohr',
      label: 'BambooHR',
      acceptsResumeUpload: true,
      hasCoverLetterField: true,
      checklist: [
        'Upload tailored-resume.pdf',
        'Paste cover letter into the cover-letter field',
        'Fill name, email, phone',
        'Submit',
      ],
    },
  },
  {
    test: /jobs\.ashbyhq\.com|ashbyhq\.com\/apply/i,
    meta: {
      id: 'ashby',
      label: 'Ashby',
      acceptsResumeUpload: true,
      hasCoverLetterField: true,
      checklist: [
        'Upload tailored-resume.pdf',
        'Paste cover letter into the Cover Letter box',
        'Fill name, email, LinkedIn, location',
        'Answer any custom questions and Submit',
      ],
    },
  },
  {
    test: /recruitee\.com\/o\/|recruitee\.com\/careers/i,
    meta: {
      id: 'recruitee',
      label: 'Recruitee',
      acceptsResumeUpload: true,
      hasCoverLetterField: true,
      checklist: [
        'Upload tailored-resume.pdf',
        'Paste cover letter',
        'Fill remaining fields and Submit',
      ],
    },
  },
  {
    test: /jobs\.jobvite\.com/i,
    meta: {
      id: 'jobvite',
      label: 'Jobvite',
      acceptsResumeUpload: true,
      hasCoverLetterField: true,
      checklist: [
        'Upload tailored-resume.pdf',
        'Paste cover letter',
        'Fill the rest from your clipboard contact info',
        'Submit',
      ],
    },
  },
  {
    test: /\.linkedin\.com/i,
    meta: {
      id: 'linkedin',
      label: 'LinkedIn',
      acceptsResumeUpload: true,
      hasCoverLetterField: false,
      checklist: [
        'If "Easy Apply", LinkedIn uses your LinkedIn profile — make sure it matches your tailored resume',
        'For external apply, you\'ll be redirected to the employer\'s ATS — paste-and-go applies there',
        'Cover letter usually goes in the message / additional info field',
      ],
    },
  },
  {
    test: /\.indeed\.com/i,
    meta: {
      id: 'indeed',
      label: 'Indeed',
      acceptsResumeUpload: true,
      hasCoverLetterField: true,
      checklist: [
        'Indeed often routes to the employer\'s ATS — check the destination',
        'If staying on Indeed: upload tailored-resume.pdf, paste cover letter',
        'Submit',
      ],
    },
  },
  {
    test: /\.glassdoor\.(com|co)/i,
    meta: {
      id: 'glassdoor',
      label: 'Glassdoor',
      acceptsResumeUpload: true,
      hasCoverLetterField: true,
      checklist: [
        'Glassdoor usually redirects to the employer\'s ATS — check destination',
        'Upload tailored-resume.pdf, paste cover letter',
        'Submit',
      ],
    },
  },
];

const GENERIC: AtsHost = {
  id: 'generic',
  label: 'Application page',
  acceptsResumeUpload: true,
  hasCoverLetterField: true,
  checklist: [
    'Upload tailored-resume.pdf (in your Downloads)',
    'Paste cover letter (already on your clipboard) into the cover-letter or message field',
    'Fill name, email, phone, LinkedIn — also on your clipboard',
    'Answer any custom questions and Submit',
  ],
};

/** Detect the host metadata for an apply URL. Returns a generic fallback for
 * unknown hosts so the UI always has *something* helpful to show. */
export function detectAts(url?: string | null): AtsHost {
  if (!url) return GENERIC;
  try {
    const u = new URL(url);
    const host = u.hostname;
    for (const { test, meta } of HOSTS) {
      if (test.test(host)) return meta;
    }
  } catch {}
  return GENERIC;
}

/** ATS hosts ResumeMint can submit to directly (Phase A = greenhouse only;
 * extend as adapters land). Anything in this set unlocks the "one-click apply"
 * UI surface. */
export const AUTO_SUBMIT_ATS: ReadonlySet<AtsHost['id']> = new Set(['greenhouse']);

export type ApplyOptionLike = { url: string; publisher?: string; isDirect?: boolean };

/** Given a primary `source` URL and an optional `applyOptions[]` array (from
 * JSearch), return the BEST apply link to surface — preferring direct ATS
 * URLs we can submit to, then any direct employer ATS we recognise, then any
 * apply option, falling back to the primary source. Also returns the
 * detected ATS metadata for that URL. */
export function pickBestApply(
  source?: string | null,
  applyOptions?: ApplyOptionLike[] | null,
): { url: string; ats: AtsHost; isAutoSubmit: boolean } {
  const candidates: string[] = [];
  // 1) Auto-submittable hosts first
  for (const o of applyOptions || []) {
    if (AUTO_SUBMIT_ATS.has(detectAts(o.url).id)) candidates.push(o.url);
  }
  // 2) Any other known direct-ATS hosts
  for (const o of applyOptions || []) {
    if (detectAts(o.url).id !== 'generic') candidates.push(o.url);
  }
  // 3) JSearch's "is_direct" hint, even if we don't know the host
  for (const o of applyOptions || []) {
    if (o.isDirect) candidates.push(o.url);
  }
  // 4) The headline source
  if (source) candidates.push(source);
  // 5) First option as last resort
  if (applyOptions?.[0]?.url) candidates.push(applyOptions[0].url);

  const url = candidates.find(Boolean) || '';
  const ats = detectAts(url);
  return { url, ats, isAutoSubmit: AUTO_SUBMIT_ATS.has(ats.id) };
}
