import React from "react";
import {
  Box,
  breakLongToken,
  parseInlineHtml,
  R,
  T,
  wrapRichLines,
  pourSectionsPaged,
} from "@/lib/render-utils";

/* =================== Types =================== */
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
  listType?: "ol" | "ul";
  level?: string;
};

export type Section = { key: string; title?: string; records?: RecordItem[] };

export type ChronoProps = {
  width?: number;
  height?: number;
  firstName: string;
  lastName: string;
  headline?: string;
  photoUrl?: string;
  railSections: Section[];
  mainSections: Section[];
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

/* =================== Helpers =================== */
const titleCase = (s: string) =>
  String(s || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const approx = (s: string, px: number) => s.length * px * 0.55;

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
    if (approx(t, size) <= maxW) { cur = t; continue; }
    if (cur) lines.push(cur);
    const chunks = breakLongToken(w, maxW, size);
    for (let i = 0; i < chunks.length - 1; i++) lines.push(chunks[i]);
    cur = chunks[chunks.length - 1];
  }
  if (cur) lines.push(cur);
  return lines;
}

function paragraphRich(
  html: string | undefined,
  maxW: number,
  styleObj: { x: number; body: number; text: string; family: string; linkColor?: string },
  push: (node: React.ReactNode) => void,
  need: (px: number) => boolean,
  lineH: number,
  cursorRef: { y: number },
  paraGap: number
) {
  if (!html) return true;
  const BULLET_INDENT = 16;
  const BULLET_GAP = 6;
  const BULLET_R = 2;
  const hasList = /<(ul|ol)\b/i.test(html);
  if (hasList) {
    const liRe = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
    let m: RegExpExecArray | null;
    while ((m = liRe.exec(html))) {
      const liHtml = m[1] || "";
      if (!need(lineH)) return false;
      push(<circle key={`li-b-${cursorRef.y}`} cx={styleObj.x + BULLET_INDENT - BULLET_GAP} cy={cursorRef.y - 3 + styleObj.body} r={BULLET_R} fill={styleObj.text} />);
      const liRuns = parseInlineHtml(liHtml);
      const liWrapped = wrapRichLines(liRuns, maxW - BULLET_INDENT, styleObj.body);
      for (const runLine of liWrapped) {
        if (!need(lineH)) return false;
        push(
          <text key={`li-t-${cursorRef.y}-${Math.random().toString(36).slice(2, 8)}`} x={styleObj.x + BULLET_INDENT} y={cursorRef.y} fontFamily={styleObj.family} fontSize={`${styleObj.body}px`} fill={styleObj.text}>
            {runLine.map((r, i) => (
              <tspan key={i} style={{ fontWeight: r.bold ? 700 : 400, fontStyle: r.italic ? "italic" : "normal", textDecoration: `${r.underline ? "underline " : ""}${r.strike ? "line-through" : ""}`.trim() || "none" }} fill={r.link ? (styleObj.linkColor || styleObj.text) : styleObj.text}>{r.text}</tspan>
            ))}
          </text>
        );
        cursorRef.y += lineH;
      }
    }
    cursorRef.y += paraGap;
    return true;
  }
  const normalized = String(html).replace(/\r/g, "").replace(/<\/(p|div|h[1-6])>/gi, "\n\n").replace(/<\s*br\s*\/?\s*>/gi, "\n");
  const blocks = normalized.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
  for (const block of blocks) {
    const runs = parseInlineHtml(block);
    const wrapped = wrapRichLines(runs, maxW, styleObj.body);
    for (const runLine of wrapped) {
      if (!need(lineH)) return false;
      push(
        <text key={`p-${cursorRef.y}-${Math.random().toString(36).slice(2, 8)}`} x={styleObj.x} y={cursorRef.y} fontFamily={styleObj.family} fontSize={`${styleObj.body}px`} fill={styleObj.text}>
          {runLine.map((r, i) => (
            <tspan key={i} style={{ fontWeight: r.bold ? 700 : 400, fontStyle: r.italic ? "italic" : "normal", textDecoration: `${r.underline ? "underline " : ""}${r.strike ? "line-through" : ""}`.trim() || "none" }} fill={r.link ? (styleObj.linkColor || styleObj.text) : styleObj.text}>{r.text}</tspan>
          ))}
        </text>
      );
      cursorRef.y += lineH;
    }
    cursorRef.y += paraGap;
  }
  return true;
}

/* =================== Level helpers =================== */
const levelToSteps = (v: any, which: "skills" | "languages"): number => {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return 0;
  const n = parseInt(s, 10);
  if (!Number.isNaN(n)) return Math.max(0, Math.min(5, n));
  if (which === "languages") {
    if (s.startsWith("basic") || s.startsWith("elementary")) return 2;
    if (s.startsWith("conv") || s.startsWith("working")) return 3;
    if (s.startsWith("fluent") || s.startsWith("prof")) return 4;
    if (s.startsWith("native") || s.startsWith("biling")) return 5;
    return 0;
  }
  if (s.startsWith("beg")) return 1;
  if (s.startsWith("mod")) return 2;
  if (s.startsWith("int") || s.startsWith("good")) return 3;
  if (s.startsWith("very") || s.startsWith("adv")) return 4;
  if (s.startsWith("exc") || s.startsWith("exp")) return 5;
  return 0;
};

/* =================== Timeline Pourer =================== */
function pourChronoPaged(
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
    bulletsForKeys?: string[];
    gaps: { para: number; header: number; title: number; section: number; record: number; beforeTitlePad: number };
    rail?: boolean;
    timelineX: number;
  }
) {
  const bulletKeys = new Set((opts.bulletsForKeys || []).map(k => k.toLowerCase()));
  const g = opts.gaps;
  const TL_X = opts.timelineX; // timeline vertical line X position
  const CIRCLE_R = 4;
  const CONTENT_LEFT = TL_X + 20; // content starts after timeline

  let pageIdx = 0;
  let pageElements: React.ReactNode[] = [];
  const pages: React.ReactNode[][] = [pageElements];

  let box = { ...firstBox };
  let cursor = box.y + g.beforeTitlePad;
  let tlStartY = cursor; // track where the timeline line begins on this page

  const onNewPage = () => {
    // Draw timeline line for current page
    push(
      <line key={`pg${pageIdx}-tl-line`} x1={TL_X} y1={tlStartY} x2={TL_X} y2={cursor} stroke={style.primary} strokeWidth="2" />
    );
    pageIdx += 1;
    pageElements = [];
    pages.push(pageElements);
    box = { ...followBox };
    cursor = box.y;
    tlStartY = cursor;
  };

  const within = (px: number) => cursor + px <= box.y + box.h;
  const push = (node: React.ReactNode) => pageElements.push(node);

  const need = (px: number) => {
    if (within(px)) return true;
    onNewPage();
    return within(px);
  };

  const contentW = () => box.x + box.w - CONTENT_LEFT;

  const line = (s: string, size: number, color: string, weight: 400 | 700 = 400, anchor: "start" | "middle" | "end" = "start", x = CONTENT_LEFT) => {
    if (!s) return false;
    if (!need(style.line)) return false;
    push(<T key={`pg${pageIdx}-t${pageElements.length}`} x={x} y={cursor} size={size} color={color} family={style.family} weight={weight} anchor={anchor}>{s}</T>);
    cursor += style.line;
    return true;
  };

  const linesWrapped = (s: string, maxW: number, size: number, color: string, weight: 400 | 700 = 400, x = CONTENT_LEFT) => {
    if (!s) return false;
    const parts = wrapLines(s, maxW, size);
    for (const ln of parts) {
      if (!need(style.line)) return false;
      push(<T key={`pg${pageIdx}-tw${pageElements.length}`} x={x} y={cursor} size={size} color={color} family={style.family} weight={weight}>{ln}</T>);
      cursor += style.line;
    }
    return true;
  };

  for (const sec of sections) {
    const key = (sec.key || "").toLowerCase();
    const defaultBullets = bulletKeys.has(key);

    if (!need(style.line * 2)) {
      if (opts.rail) break;
    }

    // Section title with timeline marker
    const title = (sec.title ?? titleCase(sec.key)).toUpperCase();
    // Draw a larger circle for section title
    push(<circle key={`pg${pageIdx}-sec-circle-${pageElements.length}`} cx={TL_X} cy={cursor - 4} r={6} fill={style.primary} />);
    if (!line(title, style.section, style.primary, 700)) break;
    cursor += g.title;

    if (sec.records?.length) {
      for (let rIdx = 0; rIdx < sec.records.length; rIdx++) {
        const rec = sec.records[rIdx];
        const strip = (h?: string) => String(h || "").replace(/<[^>]+>/g, "").trim();
        const hasMain = !!(
          (rec.header && rec.header.trim()) ||
          (rec.subheader && rec.subheader.trim()) ||
          (rec.value && rec.value.trim()) ||
          strip(rec.richtextValue) ||
          (rec.bullets && rec.bullets.some(b => String(b).trim())) ||
          (rec.bulletsHtml && rec.bulletsHtml.some(b => strip(b)))
        );
        if (!hasMain) continue;

        if (!within(style.line)) onNewPage();
        const headerStartY = cursor;

        // Small circle on timeline for each record
        push(<circle key={`pg${pageIdx}-rec-circle-${pageElements.length}`} cx={TL_X} cy={headerStartY - 4} r={CIRCLE_R} fill="white" stroke={style.primary} strokeWidth="2" />);

        // Period text to the left of the timeline
        const period = rec.period ?? "";
        if (period) {
          push(
            <T key={`pg${pageIdx}-per${pageElements.length}`} x={TL_X - 12} y={headerStartY} size={style.body - 1} color={style.primary} family={style.family} anchor="end" weight={700}>
              {period}
            </T>
          );
        }

        if (rec.header) {
          linesWrapped(rec.header, contentW(), style.body, style.header, 700);
        }
        if (rec.subheader) {
          linesWrapped(rec.subheader, contentW(), style.body, style.primary, 400);
        }

        // Level dots for skills/languages
        if ((key === "skills" || key === "languages") && rec.level) {
          const steps = levelToSteps(rec.level, key as "skills" | "languages");
          if (steps > 0) {
            const DOTS = 5;
            const DOT_R = 3.5;
            const DOT_GAP = 10;
            const totalDW = (DOTS - 1) * DOT_GAP;
            const right = box.x + box.w;
            const startDX = right - totalDW - 12;
            const cy = headerStartY - (style.line - style.body) / 7;
            for (let d = 0; d < DOTS; d++) {
              push(
                <circle key={`pg${pageIdx}-lvldot-${pageElements.length}-${d}`} cx={startDX + d * DOT_GAP} cy={cy} r={DOT_R} fill={d < steps ? style.primary : "#ddd"} />
              );
            }
          }
        }

        cursor += g.header;

        // Bullets / content
        if ((rec.bulletsHtml && rec.bulletsHtml.length) || (rec.bullets && rec.bullets.length)) {
          const items = (rec.bulletsHtml && rec.bulletsHtml.length) ? rec.bulletsHtml : rec.bullets!;
          const BULLET_INDENT = 16;
          const BULLET_RADIUS = 2.2;
          items.forEach((item, idx) => {
            if (!need(style.line)) { if (opts.rail) return; }
            const baseline = cursor - (style.line - style.body) / 7;
            const cy = baseline - style.body * 0.22;
            const gutterX = CONTENT_LEFT + BULLET_INDENT - 6;
            if (rec.listType === "ol") {
              push(<T key={`pg${pageIdx}-num${pageElements.length}`} x={CONTENT_LEFT} y={baseline} size={style.body} color={style.text} family={style.family}>{`${idx + 1}.`}</T>);
            } else {
              push(<circle key={`pg${pageIdx}-dot${pageElements.length}`} cx={gutterX} cy={cy} r={BULLET_RADIUS} fill={style.text} />);
            }
            const cursorRef = { y: cursor };
            const ok = paragraphRich(item, contentW(), { x: CONTENT_LEFT + BULLET_INDENT, body: style.body, text: style.text, family: style.family, linkColor: style.primary }, push, need, style.line, cursorRef, g.para);
            cursor = cursorRef.y;
            if (!ok) { if (opts.rail) return; }
          });
        } else {
          const txt = rec.value ?? rec.richtextValue;
          if (txt) {
            if (defaultBullets) {
              if (!need(style.line)) { if (opts.rail) break; }
              push(<circle key={`pg${pageIdx}-b${pageElements.length}`} cx={CONTENT_LEFT + 3} cy={cursor - 3 + style.body} r={2} fill={style.text} />);
              const maxW = contentW() - 12;
              const lines = wrapLines(txt, maxW, style.body);
              for (const ln of lines) {
                if (!need(style.line)) break;
                push(<T key={`pg${pageIdx}-p${pageElements.length}`} x={CONTENT_LEFT + 12} y={cursor} size={style.body} color={style.text} family={style.family}>{ln}</T>);
                cursor += style.line;
              }
              cursor += g.para;
            } else {
              const cursorRef = { y: cursor };
              const ok = paragraphRich(txt, contentW(), { x: CONTENT_LEFT, body: style.body, text: style.text, family: style.family, linkColor: style.primary }, push, need, style.line, cursorRef, g.para);
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

  // Draw final timeline line for the last page
  push(
    <line key={`pg${pageIdx}-tl-line`} x1={TL_X} y1={tlStartY} x2={TL_X} y2={cursor - 10} stroke={style.primary} strokeWidth="2" />
  );

  return pages;
}

/* =================== Main component =================== */
export const ChronoTemplate: React.FC<ChronoProps> = (props) => {
  const {
    width = 595.28,
    height = 841.89,
    firstName,
    lastName,
    headline,
    railSections,
    mainSections,
    colors,
    fontFamily = "LiberationSans, Arial, sans-serif",
    sizes,
  } = props;

  const primary = colors?.primary ?? "#2563EB"; // brand blue
  const text = colors?.text ?? "#222222";
  // Contact bar: very light tint of primary so it harmonizes with the theme.
  const contactBarBg = (() => {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(primary));
    if (!m) return "#f0f4f8";
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
    const mix = (c: number) => Math.round(c + (255 - c) * 0.92);
    return `#${[mix(r), mix(g), mix(b)].map(v => v.toString(16).padStart(2, "0")).join("")}`;
  })();
  const header = colors?.header ?? "#333333";
  const divider = colors?.divider ?? "#d8d8d8";

  const bodySize = sizes?.body ?? 10;
  const lineH = sizes?.line ?? 18;
  const sectionSize = sizes?.section ?? 12;
  const nameSize = sizes?.heading ?? 20;

  const paraGap = sizes?.paraGap ?? 6;
  const headerGap = sizes?.headerGap ?? 4;
  const titleGap = sizes?.titleGap ?? 10;
  const sectionGap = sizes?.sectionGap ?? 16;
  const recordGap = sizes?.recordGap ?? 6;
  const beforeTitlePad = sizes?.beforeTitlePad ?? 6;

  const marginX = 30;
  const fullName = `${firstName} ${lastName}`.trim();

  // Header: colored bar at top with name and contact info
  const headerH = 65;
  const nameY = 30;
  const headlineY = nameY + 18;

  // Personal details: horizontal bar below name
  const pdSection = railSections.find(s => s.key === "personal details");
  const pdItems: string[] = [];
  if (pdSection?.records) {
    for (const rec of pdSection.records) {
      if (rec.header) pdItems.push(rec.header);
    }
  }
  const contactBarY = headerH;
  const contactBarH = pdItems.length > 0 ? 22 : 0;
  const pdText = pdItems.slice(0, 5).join("  |  "); // limit to 5 items for the bar

  // Timeline position
  const TL_X = marginX + 90; // timeline line X
  const contentStartY = contactBarY + contactBarH + 20;

  // Merge sections for single-column timeline layout
  const allSections: Section[] = [];
  const profIdx = mainSections.findIndex(s => s.key === "profile");
  if (profIdx >= 0) allSections.push(mainSections[profIdx]);
  for (let i = 0; i < mainSections.length; i++) {
    if (i !== profIdx) allSections.push(mainSections[i]);
  }
  for (const s of railSections) {
    if (s.key !== "personal details") allSections.push(s);
  }

  const firstBox: Box = { x: marginX, y: contentStartY, w: width - marginX * 2, h: height - contentStartY - 30 };
  const followBox: Box = { x: marginX, y: 40, w: width - marginX * 2, h: height - 70 };

  const style = { family: fontFamily, body: bodySize, line: lineH, section: sectionSize, primary, text, header, divider };

  const contentPages = pourChronoPaged(firstBox, followBox, allSections, style, {
    bulletsForKeys: [],
    gaps: { para: paraGap, header: headerGap, title: titleGap, section: sectionGap, record: recordGap, beforeTitlePad },
    timelineX: TL_X,
  });

  return (
    <>
      {contentPages.map((content, i) => {
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
            <R x={0} y={0} w={width} h={height} fill="white" />

            {isFirst ? (
              <>
                {/* Colored header bar */}
                <R x={0} y={0} w={width} h={headerH} fill={primary} />

                {/* Name */}
                <T x={marginX + 10} y={nameY} size={nameSize} color="white" family={fontFamily} weight={700}>
                  {fullName}
                </T>

                {/* Headline */}
                {headline ? (
                  <T x={marginX + 10} y={headlineY} size={bodySize + 1} color="rgba(255,255,255,0.85)" family={fontFamily}>
                    {headline}
                  </T>
                ) : null}

                {/* Contact info bar — tinted toward the theme primary so it
                    stays visually coherent across color choices. */}
                {pdItems.length > 0 ? (
                  <>
                    <R x={0} y={contactBarY} w={width} h={contactBarH} fill={contactBarBg} />
                    <T x={width / 2} y={contactBarY + 15} size={bodySize - 1} color={text} family={fontFamily} anchor="middle">
                      {pdText}
                    </T>
                  </>
                ) : null}
              </>
            ) : null}

            <g>{content}</g>
          </svg>
        );
      })}
    </>
  );
};
