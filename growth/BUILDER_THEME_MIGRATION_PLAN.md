# Builder: SVG templates → JSON Resume themes migration

Replace the 13 custom SVG templates with the 12 vetted JSON Resume themes across
the builder preview, the template picker, the public /templates page, and the
download/thumbnail/greenhouse paths — so preview == PDF == auto-apply, all
ATS-readable.

## Already done (don't rebuild)
- `lib/jsonResume.ts` (data → JSON Resume schema), `lib/resumeThemes.ts`
  (12-theme registry, `renderResumeHtml`, `renderResumeThemedPdf` via child
  node process), `/api/extension/resume-pdf` (themed), `/api/resume/preview-html`
  (POST {data,theme}→{html} for live preview).

## THE BIGGEST RISK
The builder's **download AND thumbnail both rasterize the live `svg[data-page]`
out of the DOM** (`exportSvgContainerToPdf` + `captureThumbnailFromPreview`,
called from `app/builder/[resumeId]/edit/page.tsx`). The instant the SVG preview
becomes a themed iframe, **PDF export and thumbnail silently break** unless both
are re-pointed to a server-side themed render in the SAME change. Preview swap +
download/thumbnail rewire must ship together — never preview-only.

## Phases (sequenced so the build never breaks)
0. **Metadata/mapping (additive):** new client-safe `lib/resumeThemesMeta.ts` —
   `RESUME_THEMES_META` (id, label, free/pro), `RENDERER_TO_THEME` (old SVG id →
   theme: professional→even, circular→kendall, iconic→stackoverflow,
   elegant→elegant, classic→flat, modern→kendall, minimal→onepage, creative→
   kards, compact→short, executive→elegant, chrono→even, horizontal→macchiato,
   casual→caffeine), `resolveTheme(id)`. No DB migration (renderer is free text;
   renderResumeHtml already falls back to 'even').
1. **Theme thumbnails (additive):** server route renders `renderResumeHtml(
   DEMO_RESUME_DATA, theme)` with a PREVIEW_READY signal; `scripts/
   capture-theme-previews.mjs` (model on existing capture script) → 12 PNGs in
   public/template-previews/theme/. Pickers use static <img>, not live iframes.
2. **Builder preview → debounced themed iframe (HIGH RISK):** new
   `ThemedPreview` client component: debounce ~350ms on [data,theme], POST
   /api/resume/preview-html, srcDoc the HTML in the A4-scaled wrapper
   (AbortController to avoid races). Replace both `<A4Preview>` usages in
   BuilderEditor.tsx (~3647 desktop, ~3809 mobile). Font/size/color toolbar
   options no longer affect themed output → hide those menus (honest preview).
3. **Download + thumbnail off the SVG/DOM path (ship WITH phase 2):** add
   `/api/resumes/[id]/pdf` (auth+ownership+sub gate → renderResumeThemedPdf) +
   a `data`-body variant for unsaved/local resumes; handleDownload fetches the
   blob. Server-render the thumbnail from themed HTML (or no-op the SVG capture).
4. **Picker → 12 themes:** BottomToolbar is already generic; pass THEME_TEMPLATES
   from RESUME_THEMES_META, swap renderTemplatePreview for static thumb <img>,
   preserve PRO gating (isFree from meta), map initialTplId via resolveTheme.
5. **Public /templates page:** replace the hardcoded SVG array with the 12 themes
   + theme thumbnails.
6. **Greenhouse auto-apply:** switch app/api/jobs/greenhouse/submit/route.ts from
   renderResumePdfFromId (SVG print) to renderResumeThemedPdf.
7. **Retirement (last, re-grep + next build between each):** delete the 13
   *Template dirs, template-registry.tsx, A4Preview/, exportSvgPdf.ts,
   downloadVector.ts, cvwizard-adapter.ts, lib/resumePdf.ts + print route +
   PrintClient + printToken (after greenhouse switch), old SVG preview PNGs.

## Critical files
- app/builder/[resumeId]/edit/runtime/BuilderEditor.tsx (~3800 lines — surgical edits at the 2 preview sites only)
- app/builder/[resumeId]/edit/page.tsx (download + thumbnail wiring)
- app/builder/components/BottomToolbar/index.tsx (picker)
- app/(site)/templates/page.tsx (public page)
- app/api/jobs/greenhouse/submit/route.ts (auto-apply PDF)
- lib/resumeThemes.ts + new lib/resumeThemesMeta.ts
