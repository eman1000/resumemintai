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
  // Inline external CDN stylesheets (Bootstrap/Font Awesome that themes like
  // kendall link) IN PLACE — replacing each <link> with a <style> at the same
  // position. This (a) makes the HTML self-contained so the serverless PDF
  // render doesn't depend on the CDN <link> loading (which it doesn't on
  // Vercel → layout collapsed to one column), and (b) preserves source order
  // so a theme's own later inline rules still win (kendall's navy body bg).
  html = await inlineExternalCss(html);
  // Color-scheme handling. Themes with @media (prefers-color-scheme: dark)
  // otherwise vary by the viewer's browser (preview black in dark mode, PDF
  // light) — a mismatch. Make it deterministic per theme:
  //  - even/stackoverflow: their dark design IS the intended look → UNWRAP the
  //    dark block so it applies always (dark everywhere, preview == PDF).
  //  - all others: STRIP the dark block so they're always light.
  const DARK_THEMES = new Set(["even", "stackoverflow"]);
  html = DARK_THEMES.has(resolveTheme(themeId))
    ? unwrapDarkModeCss(html)
    : stripDarkModeCss(html);
  // Enforce A4 print sizing + color fidelity regardless of the theme.
  html = injectPrintCss(html);
  // User font/accent customization (stored on data.styleOptions; persists +
  // flows to both preview and PDF since both send `data`).
  html = injectStyleOverrides(html, data?.styleOptions);
  return { html, jr, hasContent };
}

// Fonts we allow (validated → safe to drop into CSS). Maps id → CSS stack.
export const RESUME_FONTS: Record<string, string> = {
  Roboto: "Roboto, system-ui, Arial, sans-serif",
  "Open Sans": "'Open Sans', system-ui, Arial, sans-serif",
  Lato: "Lato, system-ui, Arial, sans-serif",
  Montserrat: "Montserrat, system-ui, Arial, sans-serif",
  Inter: "Inter, system-ui, Arial, sans-serif",
  Poppins: "Poppins, system-ui, Arial, sans-serif",
  Georgia: "Georgia, 'Times New Roman', serif",
  Garamond: "Garamond, Georgia, serif",
  "Times New Roman": "'Times New Roman', Times, serif",
  Arial: "Arial, Helvetica, sans-serif",
};

/** Inject font-family + accent-color overrides (sanitized). Font is applied to
 * text but NOT icon elements (Font Awesome). Accent overrides common CSS
 * variables (clean on variable-based themes; best-effort elsewhere). */
function injectStyleOverrides(html: string, opts: any): string {
  if (!opts || typeof opts !== "object") return html;
  const rules: string[] = [];

  const fontStack = typeof opts.font === "string" ? RESUME_FONTS[opts.font] : undefined;
  if (fontStack) {
    rules.push(
      `body, body *:not(i):not([class*="fa-"]):not([class^="fa"]):not([class*="icon"]):not([class*="material"]) { font-family: ${fontStack} !important; }`,
    );
  }

  const accent = typeof opts.accent === "string" && /^#[0-9a-fA-F]{3,8}$/.test(opts.accent.trim())
    ? opts.accent.trim()
    : undefined;
  if (accent) {
    // 1) Override common accent CSS variables (covers variable-based themes like
    //    even/stackoverflow, including their light/dark variants).
    const vars = [
      "--color-accent", "--color-accent-light", "--color-accent-dark",
      "--accent",
      "--color-primary", "--color-primary-light", "--color-primary-dark",
      "--primary",
      "--color-link", "--link", "--color-heading", "--theme-color",
    ].map((v) => `${v}: ${accent} !important;`).join(" ");
    rules.push(`:root { ${vars} }`);
    // 2) Bootstrap-based themes (kendall/elegant/flat/onepage) hard-code their
    //    accent as the link color (#337ab7 / #428bca) with no variables — recolor
    //    links + .text-primary so the accent is at least visibly applied.
    rules.push(`a, a:visited, a:hover, a:focus, .text-primary { color: ${accent} !important; }`);
  }

  if (!rules.length) return html;
  const style = `<style id="rm-style-overrides">${rules.join("\n")}</style>`;
  return /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${style}</head>`) : html + style;
}

// Cache fetched CDN stylesheets across renders (preview is debounced + the
// same CSS is reused by every render).
const cssCache = new Map<string, string>();

/** Replace each external <link rel=stylesheet> with an inline <style> holding
 * the fetched CSS, AT THE SAME POSITION (preserves cascade order). Keeps the
 * resume self-contained so the serverless PDF render needs no CDN. */
async function inlineExternalCss(html: string): Promise<string> {
  const links = html.match(/<link\b[^>]*>/gi) || [];
  for (const link of links) {
    if (!/rel=["']?stylesheet/i.test(link)) continue;
    const href = (link.match(/href=["']([^"']+)["']/i) || [])[1];
    if (!href || !/^https?:\/\//i.test(href)) continue;
    try {
      let css = cssCache.get(href);
      if (css == null) {
        const res = await fetch(href);
        if (!res.ok) continue;
        css = await res.text();
        // Resolve @import / url() relative refs to absolute against the CDN.
        const base = href.replace(/[^/]*$/, "");
        css = css.replace(/url\((['"]?)(?!data:|https?:|\/\/)([^'")]+)\1\)/gi, (_m, q, u) => `url(${q}${base}${u}${q})`);
        cssCache.set(href, css);
      }
      html = html.replace(link, `<style data-href="${href}">${css}</style>`);
    } catch {
      /* leave the <link> as-is */
    }
  }
  return html;
}

/** UNWRAP `@media (prefers-color-scheme: dark) { RULES }` → RULES, so the dark
 * design applies unconditionally (for themes whose dark look is intended). */
function unwrapDarkModeCss(html: string): string {
  const marker = /@media[^{]*prefers-color-scheme\s*:\s*dark[^{]*\{/gi;
  let out = html;
  let m: RegExpExecArray | null;
  while ((m = marker.exec(out))) {
    const start = m.index;
    const innerStart = start + m[0].length;
    let depth = 1;
    let i = innerStart;
    for (; i < out.length; i++) {
      if (out[i] === "{") depth++;
      else if (out[i] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    // Replace `@media ... { inner }` with just `inner`.
    const inner = out.slice(innerStart, i);
    out = out.slice(0, start) + inner + out.slice(i + 1);
    marker.lastIndex = 0;
  }
  return out;
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
      /* Full-bleed: no page margin so theme header bands/backgrounds reach the
         paper edge. Themes inset their own content via their container padding. */
      @page { size: A4; margin: 0; }
      html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body { margin: 0 !important; }
      /* Bootstrap grid: force col-sm-* widths at ANY width. The serverless PDF
         render lays out below the 768px sm breakpoint, so two-column themes
         (kendall: col-sm-7/col-sm-5) collapsed to stacked col-xs-12. Applying
         the sm widths unconditionally keeps them side-by-side everywhere. */
      [class*="col-sm-"] { float: left; position: relative; min-height: 1px; }
      .col-sm-1{width:8.3333%}.col-sm-2{width:16.6667%}.col-sm-3{width:25%}
      .col-sm-4{width:33.3333%}.col-sm-5{width:41.6667%}.col-sm-6{width:50%}
      .col-sm-7{width:58.3333%}.col-sm-8{width:66.6667%}.col-sm-9{width:75%}
      .col-sm-10{width:83.3333%}.col-sm-11{width:91.6667%}.col-sm-12{width:100%}
      .col-sm-offset-1{margin-left:8.3333%}.col-sm-offset-0{margin-left:0}
      /* Bootstrap .container width is also breakpoint-based → full-width below
         768px, which removed the navy side-frame (white card filled the page).
         Center it at a fixed max-width so the theme's body background shows as
         a frame again. */
      .container{max-width:720px!important;width:auto!important;margin-left:auto!important;margin-right:auto!important}
      /* kendall: education uses float pull-left/right which overlaps when the
         institution name is long. Use a clean two-column flex layout. */
      #education li { display: flex !important; gap: 12px !important; align-items: flex-start !important; }
      #education li .year { float: none !important; flex: 0 0 56px !important; width: 56px !important; }
      #education li .description { float: none !important; flex: 1 1 auto !important; width: auto !important; min-width: 0 !important; }
      /* Hide broken avatar placeholders when the user has no photo (themes
         like caffeine emit <img src="" alt="profile-pic">). */
      img[src=""], img:not([src]), img[src="#"] { display: none !important; }
      /* Contact email/phone links must match the surrounding contact text so
         they stay readable: some themes render them white (built for a dark
         sidebar) and they vanish on a light layout, and a user-chosen accent
         could otherwise wash them out. Attribute selectors out-rank a plain
         a-element color rule, so this wins regardless of the accent override. */
      a[href^="mailto:"], a[href^="tel:"] { color: inherit !important; }
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
/** Inline remote <img> and font url() refs as data URIs so the serverless
 * PDF render needs ZERO network (it doesn't load external resources). */
async function makeSelfContained(html: string): Promise<string> {
  // Images (avatar etc.)
  const imgs = Array.from(html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi));
  for (const m of imgs) {
    const tag = m[0];
    const raw = m[1]; // may be HTML-entity-encoded (e.g. kendall gravatar)
    if (raw.startsWith("data:")) continue;
    // Decode entities (&#x2F;=/, &amp;=&, &#x3D;==) and normalize
    // protocol-relative (//host) URLs to https.
    let url = raw
      .replace(/&#x2[fF];/g, "/")
      .replace(/&#x3[dD];/g, "=")
      .replace(/&amp;/g, "&");
    if (url.startsWith("//")) url = "https:" + url;
    if (!/^https?:\/\//i.test(url)) {
      html = html.replace(tag, ""); // unfetchable → drop (no broken box)
      continue;
    }
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const ct = res.headers.get("content-type") || "image/jpeg";
      if (!/^image\//i.test(ct)) throw new Error("not an image");
      const buf = Buffer.from(await res.arrayBuffer());
      html = html.replace(raw, `data:${ct};base64,${buf.toString("base64")}`);
    } catch {
      html = html.replace(tag, "");
    }
  }
  // Fonts referenced by url() inside <style> (Font Awesome icon glyphs etc.)
  const fontUrls = new Set(
    Array.from(html.matchAll(/url\((['"]?)(https?:\/\/[^'")]+\.(?:woff2?|ttf|otf|eot)[^'")]*)\1\)/gi)).map((m) => m[2]),
  );
  for (const url of fontUrls) {
    try {
      let dataUri = cssCache.get("font:" + url);
      if (dataUri == null) {
        const res = await fetch(url);
        if (!res.ok) continue;
        const ext = (url.match(/\.(woff2|woff|ttf|otf|eot)/i) || [])[1]?.toLowerCase();
        const mime = ext === "woff2" ? "font/woff2" : ext === "woff" ? "font/woff" : ext === "ttf" ? "font/ttf" : "application/octet-stream";
        const buf = Buffer.from(await res.arrayBuffer());
        dataUri = `data:${mime};base64,${buf.toString("base64")}`;
        cssCache.set("font:" + url, dataUri);
      }
      html = html.split(url).join(dataUri);
    } catch {
      /* leave as-is */
    }
  }
  return html;
}

export async function renderResumeThemedPdf(
  data: any,
  themeId: string | null | undefined,
): Promise<Buffer> {
  let { html } = await renderResumeHtml(data, themeId);
  html = await makeSelfContained(html);
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    // Explicit viewport at A4 CSS width so responsive theme grids (Bootstrap
    // col-sm/col-md) lay out the same as the preview — the serverless default
    // viewport is narrow and collapses two-column themes to one column.
    await page.setViewport({ width: 820, height: 1130, deviceScaleFactor: 2 });
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
