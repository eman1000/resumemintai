// lib/resumeThemes.ts
//
// Registry of vetted JSON Resume themes (pure HTML/CSS → ATS-readable) and the
// render pipeline used by BOTH the PDF endpoints and the builder preview, so
// what the user previews is exactly what the PDF produces.

import { spawn } from "node:child_process";
import { toJsonResume, jsonResumeHasContent, type JsonResume } from "@/lib/jsonResume";
import { resolveTheme } from "@/lib/resumeThemesMeta";

// The JSON Resume theme packages (and deps like @rbardini/html) are CommonJS
// and break under Next/webpack's bundler in every in-process form (dynamic
// import, createRequire, eval-require). So we render them in a CHILD NODE
// PROCESS — plain Node with full node_modules resolution from the project
// root, identical to the standalone path that passed vetting. The theme name
// + resume go in via stdin; HTML comes back on stdout.
const CHILD_CODE = `
const fs = require('fs');
const input = JSON.parse(fs.readFileSync(0, 'utf8'));
// Use dynamic import() (ESM) so themes whose deps only export ESM subpaths
// (e.g. @rbardini/html used by 'even') resolve — require() fails on those.
import(input.pkg)
  .then((t) => {
    const fn = t.render || (t.default && t.default.render) || t.default;
    return Promise.resolve(fn(input.resume));
  })
  .then((h) => { process.stdout.write(String(h || '')); })
  .catch((e) => { process.stderr.write(String((e && e.message) || e)); process.exit(1); });
`;

function renderThemeInChild(pkg: string, resume: JsonResume): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["-e", CHILD_CODE], { cwd: process.cwd() });
    let out = "";
    let err = "";
    const killer = setTimeout(() => child.kill("SIGKILL"), 20_000);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => { clearTimeout(killer); reject(e); });
    child.on("close", (code) => {
      clearTimeout(killer);
      if (code === 0 && out) resolve(out);
      else reject(new Error(err || `theme render exited ${code}`));
    });
    child.stdin.write(JSON.stringify({ pkg, resume }));
    child.stdin.end();
  });
}

// TRACING ONLY — never executed. These literal import() specifiers let Next's
// file tracer (nft) detect the theme packages + their full transitive dep
// trees and INCLUDE them in the serverless bundle, so the child process can
// resolve them at runtime on Vercel. (They're in serverComponentsExternalPackages
// so webpack won't bundle/execute them — these thunks just mark them for trace.)
export const __traceThemes = [
  () => import("jsonresume-theme-even"),
  () => import("jsonresume-theme-stackoverflow"),
  () => import("jsonresume-theme-kendall"),
  () => import("jsonresume-theme-elegant"),
  () => import("jsonresume-theme-flat"),
  () => import("jsonresume-theme-onepage"),
  () => import("jsonresume-theme-macchiato"),
  () => import("jsonresume-theme-paper"),
  () => import("jsonresume-theme-short"),
  () => import("jsonresume-theme-spartan"),
  () => import("jsonresume-theme-caffeine"),
];

export type ThemeMeta = { id: string; label: string; pkg: string };

/** Themes that passed vetting (render clean A4 + ATS-readable from real data).
 * id is what we store on resume.renderer / accept from the UI. */
export const RESUME_THEMES: ThemeMeta[] = [
  { id: "even", label: "Even", pkg: "jsonresume-theme-even" },
  { id: "stackoverflow", label: "Stack", pkg: "jsonresume-theme-stackoverflow" },
  { id: "kendall", label: "Kendall", pkg: "jsonresume-theme-kendall" },
  { id: "elegant", label: "Elegant", pkg: "jsonresume-theme-elegant" },
  { id: "flat", label: "Flat", pkg: "jsonresume-theme-flat" },
  { id: "onepage", label: "One Page", pkg: "jsonresume-theme-onepage" },
  { id: "macchiato", label: "Macchiato", pkg: "jsonresume-theme-macchiato" },
  { id: "paper", label: "Paper", pkg: "jsonresume-theme-paper" },
  { id: "short", label: "Short", pkg: "jsonresume-theme-short" },
  { id: "spartan", label: "Spartan", pkg: "jsonresume-theme-spartan" },
  { id: "caffeine", label: "Caffeine", pkg: "jsonresume-theme-caffeine" },
];

const DEFAULT_THEME = "even";

function themePkg(themeId: string | null | undefined): string {
  // Map legacy SVG-template ids (professional, circular, …) → a theme id too.
  const resolved = resolveTheme(themeId);
  const t = RESUME_THEMES.find((x) => x.id === resolved);
  return (t || RESUME_THEMES.find((x) => x.id === DEFAULT_THEME)!).pkg;
}

/** Render a stored resume's data with a JSON Resume theme → full HTML doc. */
export async function renderResumeHtml(
  data: any,
  themeId: string | null | undefined,
): Promise<{ html: string; jr: JsonResume; hasContent: boolean }> {
  const jr = toJsonResume(data);
  const hasContent = jsonResumeHasContent(jr);
  let html: string = await renderThemeInChild(themePkg(themeId), jr);
  // Resumes must always render LIGHT. Some themes have
  // @media (prefers-color-scheme: dark) rules → the builder iframe preview
  // goes black in a dark-mode browser while the PDF stays light (mismatch).
  // Strip those rules so preview == PDF == light everywhere.
  html = stripDarkModeCss(html);
  // Enforce A4 print sizing + color fidelity regardless of the theme.
  html = injectPrintCss(html);
  return { html, jr, hasContent };
}

/** Remove `@media (prefers-color-scheme: dark) { … }` blocks (balanced braces)
 * so the resume always renders in its light design. */
function stripDarkModeCss(html: string): string {
  const marker = /@media[^{]*prefers-color-scheme\s*:\s*dark[^{]*\{/gi;
  let out = html;
  let m: RegExpExecArray | null;
  // Repeatedly find a dark media block and remove from its @media to the
  // matching closing brace.
  while ((m = marker.exec(out))) {
    const start = m.index;
    let depth = 0;
    let i = start;
    for (; i < out.length; i++) {
      if (out[i] === "{") depth++;
      else if (out[i] === "}") {
        depth--;
        if (depth === 0) { i++; break; }
      }
    }
    out = out.slice(0, start) + out.slice(i);
    marker.lastIndex = 0; // string changed; restart scan
  }
  return out;
}

function injectPrintCss(html: string): string {
  const css = `
    <style id="rm-print">
      /* Equal page margins on all four sides (the @page margin is symmetric by
         definition). Themes keep their own internal layout/padding — forcing a
         uniform body padding breaks two-column themes. */
      @page { size: A4; margin: 12mm; }
      html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body { margin: 0 !important; }
      /* kendall: education uses float pull-left/right which overlaps when the
         institution name is long. Use a clean two-column flex layout. */
      #education li { display: flex !important; gap: 12px !important; align-items: flex-start !important; }
      #education li .year { float: none !important; flex: 0 0 56px !important; width: 56px !important; }
      #education li .description { float: none !important; flex: 1 1 auto !important; width: auto !important; min-width: 0 !important; }
      /* Hide broken avatar placeholders when the user has no photo (themes
         like caffeine emit <img src="" alt="profile-pic">). */
      img[src=""], img:not([src]), img[src="#"] { display: none !important; }
    </style>`;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${css}</head>`);
  if (/<body[^>]*>/i.test(html)) return html.replace(/<body[^>]*>/i, (m) => `${m}${css}`);
  return css + html;
}

async function launchBrowser() {
  try {
    if (process.platform !== "linux") throw new Error("local dev: use full puppeteer");
    const chromium = await import("@sparticuz/chromium");
    const puppeteerCore = await import("puppeteer-core");
    const executablePath = await chromium.default.executablePath();
    if (executablePath) {
      return await puppeteerCore.launch({
        args: [...chromium.default.args, "--no-sandbox", "--disable-setuid-sandbox"],
        // @ts-ignore
        defaultViewport: chromium.default.defaultViewport,
        executablePath,
        // @ts-ignore
        headless: chromium.default.headless,
      });
    }
  } catch {
    /* fall through */
  }
  const puppeteer = await import("puppeteer");
  // @ts-ignore
  return await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
}

/** Render a resume to a themed A4 PDF (ATS-readable HTML text). */
export async function renderResumeThemedPdf(
  data: any,
  themeId: string | null | undefined,
): Promise<Buffer> {
  const { html } = await renderResumeHtml(data, themeId);
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    // Render in SCREEN media so the PDF is identical to the builder's iframe
    // preview (which is screen media). Some themes' @media print rules inject
    // page breaks / large gaps that diverge from what the user previewed.
    await page.emulateMediaType("screen");
    // Load the page so external <link> CSS (e.g. Bootstrap/Font Awesome CDNs
    // some themes use) loads in its ORIGINAL order. Do NOT re-append the
    // external CSS via addStyleTag — that puts it AFTER the theme's inline
    // styles and lets Bootstrap's `body{background:#fff}` override a theme's
    // own body background (kendall's navy → white download). networkidle2
    // already waits for the linked CSS.
    await page.setContent(html, { waitUntil: "networkidle2", timeout: 30_000 });
    await page.evaluate(async () => {
      // @ts-ignore
      if (document.fonts?.ready) await document.fonts.ready;
    });
    const pdf = await page.pdf({
      printBackground: true,
      format: "A4",
      margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
      preferCSSPageSize: true,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close().catch(() => {});
  }
}
