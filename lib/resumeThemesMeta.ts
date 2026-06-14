// lib/resumeThemesMeta.ts
//
// CLIENT-SAFE theme metadata (no node imports) — usable in the builder UI,
// pickers, and the public /templates page. The server render registry
// (lib/resumeThemes.ts) maps these ids to their npm packages.

export type ResumeThemeMeta = {
  id: string;
  label: string;
  /** Free tier vs PRO (preserves the old isFree gating in the picker). */
  isFree: boolean;
  blurb?: string;
};

export const RESUME_THEMES_META: ResumeThemeMeta[] = [
  { id: "professional", label: "Professional", isFree: true, blurb: "Clean single-column, recruiter- and ATS-friendly." },
  { id: "even", label: "Even", isFree: true, blurb: "Clean two-column with a soft header band." },
  { id: "stackoverflow", label: "Stack", isFree: true, blurb: "Compact, skills-forward, fits a lot per page." },
  { id: "kendall", label: "Kendall", isFree: true, blurb: "Balanced, classic single-column." },
  { id: "flat", label: "Flat", isFree: true, blurb: "Minimal, lots of whitespace." },
  { id: "elegant", label: "Elegant", isFree: false, blurb: "Refined serif accents." },
  { id: "onepage", label: "One Page", isFree: false, blurb: "Dense, designed to stay on one page." },
  { id: "macchiato", label: "Macchiato", isFree: false, blurb: "Warm, modern column layout." },
  { id: "paper", label: "Paper", isFree: false, blurb: "Print-first, understated." },
  { id: "short", label: "Short", isFree: false, blurb: "Tight, summary-led." },
  { id: "spartan", label: "Spartan", isFree: false, blurb: "No-frills, highly readable." },
  { id: "caffeine", label: "Caffeine", isFree: false, blurb: "Bold headers, energetic." },
];

export const RESUME_THEME_IDS = RESUME_THEMES_META.map((t) => t.id);

/** Map legacy SVG-template ids (stored in resume.renderer) → a theme id. */
export const RENDERER_TO_THEME: Record<string, string> = {
  // 'professional' is now a real theme id (see RESUME_THEMES_META), so it
  // resolves to itself — no alias needed here.
  circular: "kendall",
  iconic: "stackoverflow",
  elegant: "elegant",
  classic: "flat",
  modern: "kendall",
  minimal: "onepage",
  creative: "kards",
  compact: "short",
  executive: "elegant",
  chrono: "even",
  horizontal: "macchiato",
  casual: "caffeine",
};

export const DEFAULT_THEME_ID = "even";

/** Resolve any stored renderer/theme id to a valid theme id. */
export function resolveTheme(id: string | null | undefined): string {
  if (id && RESUME_THEME_IDS.includes(id)) return id;
  if (id && RENDERER_TO_THEME[id]) return RENDERER_TO_THEME[id];
  return DEFAULT_THEME_ID;
}
