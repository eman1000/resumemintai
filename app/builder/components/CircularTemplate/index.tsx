import React from "react";
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faEnvelope, faPhone, faGlobe, faMapMarkerAlt, faCalendarDays,
  faIdCard, faHeart, faUser, faLocationDot, faCaretRight
} from '@fortawesome/free-solid-svg-icons';
import { faLinkedin } from '@fortawesome/free-brands-svg-icons';
import { Box, breakLongToken, parseInlineHtml, R, renderFAIcon, Run, T, wrapRichLines } from "@/lib/render-utils";

const ICONS: Record<string, IconDefinition> = {
  email: faEnvelope,
  phone: faPhone,
  globe: faGlobe,
  linkedin: faLinkedin,
  address: faLocationDot, // or faMapMarkerAlt
  city: faMapMarkerAlt,
  postal: faIdCard,
  dob: faCalendarDays,
  gender: faUser,
  nationality: faIdCard,
  license: faIdCard,
  marital: faHeart,
  link: faGlobe,
  generic: faCaretRight,
};


// app/builder/components/CircularTemplate/index.tsx
export type RecordItem = {
  header?: string;
  subheader?: string;
  period?: string;
  value?: string;
  richtextValue?: string;
  bullets?: string[];
  bulletsHtml?: string[];
  pdKey?: string;
  iconHref?: string;
  listType?: 'ol'|'ul';
  level?: string;           // 👈 NEW
};



export type Section = { key: string; title?: string; records?: RecordItem[] };

export type CircularProps = {
  /** page size (A4 @ 72dpi by default) */
  width?: number;
  height?: number;

  /** header */
  firstName: string;
  lastName: string;
  headline?: string;
  photoUrl?: string;

  /** content */
  railSections: Section[];
  mainSections: Section[];

  /** theme */
  colors?: {
    primary?: string;
    railBg?: string;
    text?: string;
    header?: string;
    divider?: string;
  };
  fontFamily?: string;
  sizes?: {
    body?: number;
    heading?: number;
    section?: number;
    line?: number;
    paraGap?: number;
    headerGap?: number;
    titleGap?: number;
    sectionGap?: number;
    recordGap?: number;
    beforeTitlePad?: number;
  };
};

/** ========= helpers ========= */

const titleCase = (s: string) =>
  String(s || "").replace(/[-_]/g, " ").replace(/\b\w/g, m => m.toUpperCase());

const approx = (s: string, px: number) => s.length * px * 0.55;

// Break inside a single long token (URLs, long_emails, etc.)

function wrapLines(s: string, maxW: number, size: number) {
  const words = String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  const lines: string[] = [];
  let cur = "";

  for (const w of words) {
    const t = cur ? cur + " " + w : w;

    if (approx(t, size) <= maxW) {
      cur = t;
      continue;
    }

    // push the current line if any
    if (cur) lines.push(cur);

    // break the overlong token into wrapped chunks
    const chunks = breakLongToken(w, maxW, size);
    // all full chunks become full lines except the last (which becomes the new cur)
    for (let i = 0; i < chunks.length - 1; i++) lines.push(chunks[i]);
    cur = chunks[chunks.length - 1];
  }

  if (cur) lines.push(cur);
  return lines;
}


function paragraphRich(
  html: string | undefined,
  maxW: number,
  styleObj: { x: number; body: number; text: string; family: string; linkColor?: string; },
  push: (node: React.ReactNode) => void,
  need: (px: number) => boolean,
  lineH: number,
  cursorRef: { y: number },
  paraGap: number
) {
  if (!html) return true;

  const BULLET_INDENT = 16;  // text start
  const BULLET_GAP    = 6;   // bullet->text gap
  const BULLET_R      = 2;   // bullet radius

  const hasList = /<(ul|ol)\b/i.test(html);

  if (hasList) {
    // Render each LI
    const liRe = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
    let m: RegExpExecArray | null;
    while ((m = liRe.exec(html))) {
      const liHtml = m[1] || "";

      // bullet glyph
      if (!need(lineH)) return false;
      push(
        <circle
          key={`li-b-${cursorRef.y}`}
          cx={styleObj.x + BULLET_INDENT - BULLET_GAP}
          cy={cursorRef.y - 3 + styleObj.body}
          r={BULLET_R}
          fill={styleObj.text}
        />
      );

      // list item text (with inline styles)
      const liRuns = parseInlineHtml(liHtml);
      const liWrapped = wrapRichLines(liRuns, maxW - BULLET_INDENT, styleObj.body);

      for (const runLine of liWrapped) {
        if (!need(lineH)) return false;
        push(
          <text
            key={`li-t-${cursorRef.y}-${Math.random().toString(36).slice(2,8)}`}
            x={styleObj.x + BULLET_INDENT}
            y={cursorRef.y}
            fontFamily={styleObj.family}
            fontSize={`${styleObj.body}px`}
            fill={styleObj.text}
          >
            {runLine.map((r, i) => (
              <tspan
                key={i}
                style={{
                  fontWeight: r.bold ? 700 : 400,
                  fontStyle: r.italic ? "italic" : "normal",
                  textDecoration: `${r.underline ? "underline " : ""}${r.strike ? "line-through" : ""}`.trim() || "none",
                }}
                fill={r.link ? (styleObj.linkColor || styleObj.text) : styleObj.text}
              >
                {r.text}
              </tspan>
            ))}
          </text>
        );
        cursorRef.y += lineH;
      }
    }
    // gap after the list
    cursorRef.y += paraGap;
    return true;
  }

  // No list → treat as paragraphs with inline styles
  const normalized = String(html)
    .replace(/\r/g, "")
    .replace(/<\/(p|div|h[1-6])>/gi, "\n\n")
    .replace(/<\s*br\s*\/?\s*>/gi, "\n");

  const blocks = normalized.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);

  for (const block of blocks) {
    const runs = parseInlineHtml(block);
    const wrapped = wrapRichLines(runs, maxW, styleObj.body);
    for (const runLine of wrapped) {
      if (!need(lineH)) return false;
      push(
        <text
          key={`p-${cursorRef.y}-${Math.random().toString(36).slice(2,8)}`}
          x={styleObj.x}
          y={cursorRef.y}
          fontFamily={styleObj.family}
          fontSize={`${styleObj.body}px`}
          fill={styleObj.text}
        >
          {runLine.map((r, i) => (
            <tspan
              key={i}
              style={{
                fontWeight: r.bold ? 700 : 400,
                fontStyle: r.italic ? "italic" : "normal",
                textDecoration: `${r.underline ? "underline " : ""}${r.strike ? "line-through" : ""}`.trim() || "none",
              }}
              fill={r.link ? (styleObj.linkColor || styleObj.text) : styleObj.text}
            >
              {r.text}
            </tspan>
          ))}
        </text>
      );
      cursorRef.y += lineH;
    }
    cursorRef.y += paraGap;
  }
  return true;
}



/** ========= paged pourer ========= */
function pourSectionsPaged(
  firstBox: Box,
  followBox: Box,
  sections: Section[],
  style: {
    family: string;
    body: number;
    line: number;
    section: number;
    primary: string;
    text: string;
    header: string;
    divider: string;
  },
  opts: {
    bulletsForKeys?: string[]; // lowercase section keys that get bullets when no explicit bullets[]
    gaps: { para: number; header: number; title: number; section: number; record: number; beforeTitlePad: number };
    rail?: boolean;
   leadingIcon?: (sectionKey: string, rec: RecordItem, recIdx: number) => IconDefinition | undefined;

  }
) {
  const bulletKeys = new Set((opts.bulletsForKeys || []).map(k => k.toLowerCase()));
  const g = opts.gaps;

  let pageIdx = 0;
  let pageElements: React.ReactNode[] = [];
  const pages: React.ReactNode[][] = [pageElements];

  let box = { ...firstBox };
  let cursor = box.y + g.beforeTitlePad;

  const onNewPage = () => {
    pageIdx += 1;
    pageElements = [];
    pages.push(pageElements);
    box = { ...followBox };
    cursor = box.y;
  };

  const within = (px: number) => cursor + px <= box.y + box.h;
  const push = (node: React.ReactNode) => pageElements.push(node);

  const need = (px: number) => {
    if (within(px)) return true;
    // Rail previously refused to paginate → overflow got dropped.
    // Allow pagination so remaining records go to the next page(s).
    onNewPage();
    return within(px);
  };

  // write a single text line
  const line = (
    s: string,
    size: number,
    color: string,
    weight: 400 | 700 = 400,
    anchor: "start" | "middle" | "end" = "start",
    x = box.x
  ) => {
    if (!s) return false;
    if (!need(style.line)) return false;
    push(
      <T key={`pg${pageIdx}-t${pageElements.length}`} x={x} y={cursor} size={size} color={color} family={style.family} weight={weight} anchor={anchor}>
        {s}
      </T>
    );
    cursor += style.line;
    return true;
  };

  // write wrapped lines with custom max width & weight
  const linesWrapped = (
    s: string,
    maxW: number,
    size: number,
    color: string,
    weight: 400 | 700 = 400,
    x = box.x
  ) => {
    if (!s) return false;
    const parts = wrapLines(s, maxW, size);
    for (const ln of parts) {
      if (!need(style.line)) return false;
      push(
        <T key={`pg${pageIdx}-tw${pageElements.length}`} x={x} y={cursor} size={size} color={color} family={style.family} weight={weight}>
          {ln}
        </T>
      );
      cursor += style.line;
    }
    return true;
  };

  const divider = () => {
    push(
      <path
        key={`pg${pageIdx}-div${pageElements.length}`}
        d={`M ${box.x} ${cursor - style.line + 8} L ${box.x + box.w} ${cursor - style.line + 8}`}
        fill="none"
        stroke={style.divider}
        strokeWidth="0.75"
      />
    );
  };

  const paragraph = (s?: string, indent = 0) => {
    if (!s) return true;
    const maxW = box.w - indent;
    const lines = wrapLines(s, maxW, style.body);
    for (let i = 0; i < lines.length; i++) {
      if (!need(style.line)) return false;
      push(
        <T key={`pg${pageIdx}-p${pageElements.length}`} x={box.x + indent} y={cursor} size={style.body} color={style.text} family={style.family}>
          {lines[i]}
        </T>
      );
      cursor += style.line;
    }
    cursor += g.para;
    return true;
  };

  /** pour */
  for (const sec of sections) {
    const key = (sec.key || "").toLowerCase();
    const defaultBullets = bulletKeys.has(key);

    if (!need(style.line * 2)) {
      if (opts.rail) break;
    }
    const title = sec.title ?? titleCase(sec.key);
    if (!line(title, style.section, style.primary, 700)) break;
    divider();
    cursor += g.title;

    if (sec.records?.length) {
      for (let rIdx = 0; rIdx < sec.records.length; rIdx++) {
        const rec = sec.records[rIdx];
    
        const strip = (h?: string) => String(h || "").replace(/<[^>]+>/g, "").trim();
        const hasMain =
          !!(
            (rec.header && rec.header.trim()) ||
            (rec.subheader && rec.subheader.trim()) ||
            (rec.value && rec.value.trim()) ||
            strip(rec.richtextValue) ||
            (rec.bullets && rec.bullets.some(b => String(b).trim())) ||
            (rec.bulletsHtml && rec.bulletsHtml.some(b => strip(b)))
          );

        if (!hasMain) {
          // nothing meaningful to show on the left → do NOT render period either
          continue;
        }

        // ask for icon (if any)
        const iconDef = opts.leadingIcon?.(key, rec, rIdx);

        // icon metrics + gutter
        const ICON_W = 13.125;
        const ICON_H = 15;
        const ICON_LEFT_PAD = 6;   // slightly more left padding
        const ICON_GAP = 8;        // a bit more breathing room
        const ICON_BASELINE_ADJ = 0.40; // <-- controls vertical alignment vs. text baseline


        // icon box width (left gutter) if present
        const iconBox = iconDef ? (ICON_LEFT_PAD + ICON_W + ICON_GAP) : 0;


        // Compute room for right-aligned period (based on approx width)
        const period = rec.period ?? "";
        const periodW = period ? approx(period, style.body) + 10 : 0; // pad
        const headerMaxW = box.w - periodW - iconBox - 4;

        const headerText = iconDef
          ? String(rec.header || "").replace(/^\s*[^:]+:\s*/, "").trim()
          : rec.header || "";

          if (!within(style.line)) onNewPage();

        const headerStartY = cursor;

        // draw icon (aligned to first header line baseline)
            if (iconDef && need(style.line)) {
              // align to the first header line baseline, like before
              const ix = box.x + ICON_LEFT_PAD;
              const iy = headerStartY - ICON_H + style.body * ICON_BASELINE_ADJ;
              push(
                <g key={`pg${pageIdx}-ico${pageElements.length}`}>
                  {renderFAIcon(iconDef, ix, iy, ICON_W, ICON_H, style.primary)}
                </g>
              );
            }

    

        // draw period aligned to first header line
        if (period) {
          push(
            <T
              key={`pg${pageIdx}-per${pageElements.length}`}
              x={box.x + box.w}
              y={headerStartY}
              size={style.body}
              color={style.header}
              family={style.family}
              anchor="end"
              weight={700}
            >
              {period}
            </T>
          );
        }


        if (headerText) {
          linesWrapped(
              headerText,
              Math.max(30, headerMaxW),
              style.body,
              style.header,
              700,
              box.x + iconBox           // <-- shift text start
          );
        }
        // subheader (primary, wrapped full width)
        if (rec.subheader) {
          linesWrapped(
              rec.subheader,
              box.w - iconBox,
              style.body,
              style.primary,
              400,
              box.x + iconBox           // <-- shift text start
          );
        }
// inside pourSectionsPaged(), in the records loop (right after subheader block)

// helper once:
        const levelToSteps = (v: any, which: "skills" | "languages") => {
          const s = String(v ?? "").trim().toLowerCase();
          if (!s) return 0;
          const n = parseInt(s, 10);
          if (!Number.isNaN(n)) return Math.max(0, Math.min(5, n));

          // text labels → 1..5
          if (which === "languages") {
            if (s.startsWith("basic") || s.startsWith("elementary")) return 2;
            if (s.startsWith("conv") || s.startsWith("working"))     return 3;
            if (s.startsWith("fluent") || s.startsWith("prof"))      return 4;
            if (s.startsWith("native") || s.startsWith("biling"))    return 5;
            return 0;
          }
          // skills
          if (s.startsWith("beg")) return 1;
          if (s.startsWith("mod")) return 2;
          if (s.startsWith("int") || s.startsWith("good")) return 3;
          if (s.startsWith("very") || s.startsWith("adv")) return 4;
          if (s.startsWith("exc") || s.startsWith("exp"))  return 5;
          return 0;
        };

        // draw dots for both sections
        const renderLevelDots = (steps: number) => {
          const DOTS = 5, R = 3.75, GAP = 10;
          const totalW = (DOTS - 1) * GAP;
          const right = box.x + box.w;
          const startX = right - totalW - 12;
          const cy = headerStartY - (style.line - style.body) / 7;
          for (let d = 0; d < DOTS; d++) {
            push(
              <circle
                key={`pg${pageIdx}-lvldot-${pageElements.length}-${d}`}
                cx={startX + d * GAP}
                cy={cy}
                r={R}
                fill={d < steps ? style.primary : "#c4c5c7"}
              />
            );
          }
        };

        // BEFORE: if (key === "skills" && rec.level) { ... }
        // AFTER:
        if ((key === "skills" || key === "languages") && rec.level) {
          const steps = levelToSteps(rec.level, key as "skills" | "languages");
          if (steps > 0) renderLevelDots(steps);
        }




        cursor += g.header;

        

        // bullets (explicit) > fallback (section-level bullets) > paragraph
        // bullets (explicit) > fallback (section-level bullets) > paragraph
if ((rec.bulletsHtml && rec.bulletsHtml.length) || (rec.bullets && rec.bullets.length)) {
  const items = (rec.bulletsHtml && rec.bulletsHtml.length)
    ? rec.bulletsHtml          // HTML items → keep inline formatting
    : rec.bullets!;            // plain text (legacy)

  const BULLET_INDENT = 16;
      const BULLET_RADIUS = 2.2;

      items.forEach((item, idx) => {
        if (!need(style.line)) { if (opts.rail) return; }

        // marker (number or dot)
        const baseline = cursor - (style.line - style.body) / 7;
        const cy = baseline - style.body * 0.22;
        const gutterX = box.x + BULLET_INDENT - 6;

        if (rec.listType === "ol") {
          // "1." numbers
          push(
            <T
              key={`pg${pageIdx}-num${pageElements.length}`}
              x={box.x}
              y={baseline}
              size={style.body}
              color={style.text}
              family={style.family}
            >
              {`${idx + 1}.`}
            </T>
          );
    } else {
      // dot bullet
      push(
        <circle
          key={`pg${pageIdx}-dot${pageElements.length}`}
          cx={gutterX}
          cy={cy}
          r={BULLET_RADIUS}
          fill={style.text}
        />
      );
    }

    // item text → use paragraphRich to keep <b>/<i>/<u>/<a>
    const cursorRef = { y: cursor };
    const ok = paragraphRich(
      item,                             // HTML
      box.w,                            // max width
      { x: box.x + BULLET_INDENT, body: style.body, text: style.text, family: style.family, linkColor: style.primary },
      push, need, style.line, cursorRef,
      g.para
    );
    cursor = cursorRef.y;
    if (!ok) { if (opts.rail) return; }
  });
    } else {
      const txt = rec.value ?? rec.richtextValue;
      if (txt) {
        if (defaultBullets) {
          // legacy fallback
          if (!need(style.line)) { if (opts.rail) break; }
          push(<circle key={`pg${pageIdx}-b${pageElements.length}`} cx={box.x + 3} cy={cursor - 3 + style.body} r={2} fill={style.text} />);
          if (!paragraph(txt, 12)) { if (opts.rail) break; }
        } else {
          const cursorRef = { y: cursor };
          const ok = paragraphRich(
            txt,
            box.w,
            { x: box.x, body: style.body, text: style.text, family: style.family, linkColor: style.primary },
            push, need, style.line, cursorRef,
            g.para
          );
          cursor = cursorRef.y;
          if (!ok) { if (opts.rail) break; }
        }
      }
    }


        if (rIdx < sec.records.length - 1) cursor += g.record;
      }
    }

    cursor += g.section;
  }

  return pages;
}

/** ========= main component ========= */
export const CircularTemplate: React.FC<CircularProps> = (props) => {
  const {
    width = 595.28,
    height = 841.89,
    firstName, lastName, headline, photoUrl,
    railSections, mainSections,
    colors, fontFamily = "LiberationSans, Arial, sans-serif", sizes
  } = props;

  const primary = colors?.primary ?? "#395a86";
  const railBg  = colors?.railBg  ?? "#f5f7f9";
  const text    = colors?.text    ?? "black";
  const header  = colors?.header  ?? "#333333";
  const divider = colors?.divider ?? "#d8d8d8";

  const bodySize    = sizes?.body ?? 10;
  const line        = sizes?.line ?? 18;
  const sectionSize = sizes?.section ?? 18;
  const nameSize    = sizes?.heading ?? 15;

  const paraGap     = sizes?.paraGap ?? 8;
  const headerGap   = sizes?.headerGap ?? 4;
  const titleGap    = sizes?.titleGap ?? 12;
  const sectionGap  = sizes?.sectionGap ?? 18;
  const recordGap   = sizes?.recordGap ?? 6;
  const beforeTitlePad = sizes?.beforeTitlePad ?? 6;

  // SAME layout on every page (you asked for: “layout should still be the same on other pages”)
const railBoxFirst: Box   = { x: 15, y: 265.5, w: 170, h: 520 };

// FOLLOWUP pages rail box (start near the top of the page)
const railBoxFollow: Box  = { x: 15, y: 74.25, w: 170, h: 720 };
  const mainBox: Box      = { x: 215, y: 74.25, w: width - 215 - 15, h: 720 };

  const style = { family: fontFamily, body: bodySize, line, section: sectionSize, primary, text, header, divider };

  const mainPages = pourSectionsPaged(
    mainBox,            // first page box
    mainBox,            // follow pages use the same box
    mainSections,
    style,
    {
      bulletsForKeys: [], // fallback bullets when no explicit bullets[]
      gaps: { para: paraGap, header: headerGap, title: titleGap, section: sectionGap, record: recordGap, beforeTitlePad },
    }
  );

  // Sidebar only actually poured once (clamped) and shown on page 1
  const railPages = pourSectionsPaged(
    railBoxFirst,            // first page
    railBoxFollow,           // all next pages
    railSections,
    style,
    {
    rail: true,
    bulletsForKeys: [],
    gaps: { para: paraGap, header: headerGap, title: titleGap, section: sectionGap, record: recordGap, beforeTitlePad },
    leadingIcon: (sectionKey, rec) => {
      if (sectionKey !== "personal details") return;
      const k = (rec.pdKey || "").toLowerCase();
      if (k) {
        if (k.includes("email")) return ICONS.email;
        if (k.includes("phone")) return ICONS.phone;
        if (k === "address") return ICONS.address;
        if (k === "city") return ICONS.city;
        if (k === "postalcode") return ICONS.postal;
        if (k === "dateofbirth") return ICONS.dob;
        if (k === "gender") return ICONS.gender;
        if (k === "nationality") return ICONS.nationality;
        if (k.includes("license")) return ICONS.license;
        if (k.includes("civil") || k.includes("marital")) return ICONS.marital;
        if (k.includes("linkedin")) return ICONS.linkedin;
        if (k.includes("website")) return ICONS.globe;
        if (k.includes("link")) return ICONS.link;
      }
      const h = (rec.header || "").toLowerCase();
      if (h.includes("@")) return ICONS.email;
      if (/^\+?\d[\d\s().-]+$/.test(h)) return ICONS.phone;
      if (h.startsWith("http") || h.startsWith("www.")) return ICONS.link;
      if (h.includes("linkedin")) return ICONS.linkedin;
      return ICONS.generic;
    }

  }
  );
  // const railHasMore = railPages.length > 1;
  // const railContent = railPages[0];
  const railHasMore = railPages.length > 1; // (optional: can keep/remove)

// === add near top of CircularTemplate ===
const fitTo = (text: string, base: number, maxW: number) => {
  let s = base;
  while (s > 10 && approx(text, s) > maxW) s -= 1; // simple, fast fitter
  return s;
};

const railW = 200;
const cx = railW / 2;

// space available vertically in the solid header (0..~74px)
const headerTop = 0;
const headerBottom = 74.25;
const headerMidY = (headerTop + headerBottom) / 2; // ~37.1

// fit fonts if names are long
const nameMaxW = railW - 32;             // padding from edges
const firstSize = fitTo(firstName, nameSize, nameMaxW);
const lastSize  = fitTo(lastName,  nameSize, nameMaxW);

// line gap between first and last (relative to first line size)
const lineGap = Math.round(firstSize * 0.25);

// Place the whole two-line block vertically centered
// We’ll position the first line so that the block’s visual middle sits at headerMidY
const totalBlockH = firstSize + lineGap + lastSize;
const firstBaselineY = Math.round(headerMidY - totalBlockH / 2 + firstSize); // baseline of first line



  return (
    <>
      {mainPages.map((content, i) => {
        const isFirst = i === 0;
        return (
          <svg
            key={`page-${i}`}
            data-page={i + 1} 
            viewBox={`0 0 ${width} ${height}`}
            width={width}
            height={height}
            xmlns="http://www.w3.org/2000/svg"
            style={{ background: "#fff", display: "block", marginBottom: 18 }}
          >
            {/* page bg + rail (rail shown on all pages for identical layout) */}
             x={0} y={0} w={width} h={height} fill="white" />
            <R x={0} y={0} w={200} h={height} fill={railBg} />

            {isFirst ? (
              <>
                {/* header chrome ONLY on page 1 */}
                <R x={0} y={0} w={200} h={76.25} fill={primary} />
                <path d="M 0,74.25 L 200,74.25 L 200,114.25 C 140,142.25,60,142.25,0,114.25 Z" fill={primary} />
                {photoUrl ? (
                  <>
                    <R x={35} y={81.25} w={130} h={130} fill="#FFFFFF" rx={65} />
                    <clipPath id="photoClip">
                      <path d="M 100,86.25 C 133.12,86.25,160,113.13,160,146.25 C 160,179.37,133.12,206.25,100,206.25 C 66.88,206.25,40,179.37,40,146.25 C 40,113.13,66.88,86.25,100,86.25 Z" />
                    </clipPath>
                    <image preserveAspectRatio="xMidYMid slice" x="40" y="86.25" width="120" height="120" href={photoUrl} clipPath="url(#photoClip)" />
                  </>
                ) : null}
                <text
                  x={cx}
                  y={firstBaselineY}
                  textAnchor="middle"
                  fontFamily={fontFamily}
                  fontWeight={700}
                  fill="#fff"
                >
                  <tspan fontSize={firstSize}>{firstName}</tspan>
                  {/* second line: same x, advance by firstSize + gap */}
                  <tspan x={cx} dy={firstSize + lineGap} fontSize={lastSize}>
                    {lastName}
                  </tspan>
                </text>
                {headline ? (
                  <T x={mainBox.x} y={50} size={bodySize} color={header} family={fontFamily}>{headline}</T>
                ) : null}

              </>
            ) : null}
            {/* rail content (now per-page) */}
            <g>{railPages[i]}</g>
            {/* main column */}
            <g>{content}</g>
          </svg>
        );
      })}
    </>
  );
};
