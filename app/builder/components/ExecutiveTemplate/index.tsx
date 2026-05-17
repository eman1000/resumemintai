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

export type ExecutiveProps = {
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
const levelToLabel = (v: any, which: "skills" | "languages"): string => {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return "";
  const n = parseInt(s, 10);
  if (!Number.isNaN(n)) {
    if (which === "languages") {
      const lMap: Record<number, string> = { 1: "Elementary", 2: "Basic", 3: "Conversational", 4: "Fluent", 5: "Native" };
      return lMap[Math.max(1, Math.min(5, n))] || "";
    }
    const sMap: Record<number, string> = { 1: "Beginner", 2: "Moderate", 3: "Intermediate", 4: "Advanced", 5: "Expert" };
    return sMap[Math.max(1, Math.min(5, n))] || "";
  }
  // Already a text label: capitalize first letter
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/* =================== Paged pourer (Executive style) =================== */
function pourExecutivePaged(
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
    onNewPage();
    return within(px);
  };

  const line = (s: string, size: number, color: string, weight: 400 | 700 = 400, anchor: "start" | "middle" | "end" = "start", x = box.x) => {
    if (!s) return false;
    if (!need(style.line)) return false;
    push(<T key={`pg${pageIdx}-t${pageElements.length}`} x={x} y={cursor} size={size} color={color} family={style.family} weight={weight} anchor={anchor}>{s}</T>);
    cursor += style.line;
    return true;
  };

  const linesWrapped = (s: string, maxW: number, size: number, color: string, weight: 400 | 700 = 400, x = box.x) => {
    if (!s) return false;
    const parts = wrapLines(s, maxW, size);
    for (const ln of parts) {
      if (!need(style.line)) return false;
      push(<T key={`pg${pageIdx}-tw${pageElements.length}`} x={x} y={cursor} size={size} color={color} family={style.family} weight={weight}>{ln}</T>);
      cursor += style.line;
    }
    return true;
  };

  const divider = () => {
    push(
      <path key={`pg${pageIdx}-div${pageElements.length}`} d={`M ${box.x} ${cursor - style.line + 8} L ${box.x + box.w} ${cursor - style.line + 8}`} fill="none" stroke={style.divider} strokeWidth="1" />
    );
  };

  const paragraph = (s?: string, indent = 0) => {
    if (!s) return true;
    const maxW = box.w - indent;
    const lines = wrapLines(s, maxW, style.body);
    for (const ln of lines) {
      if (!need(style.line)) return false;
      push(<T key={`pg${pageIdx}-p${pageElements.length}`} x={box.x + indent} y={cursor} size={style.body} color={style.text} family={style.family}>{ln}</T>);
      cursor += style.line;
    }
    cursor += g.para;
    return true;
  };

  for (const sec of sections) {
    const key = (sec.key || "").toLowerCase();
    const defaultBullets = bulletKeys.has(key);

    if (!need(style.line * 2)) {
      if (opts.rail) break;
    }

    // Section title in uppercase (formal executive style)
    const title = (sec.title ?? titleCase(sec.key)).toUpperCase();
    if (!line(title, style.section, style.primary, 700)) break;
    divider();
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

        const period = rec.period ?? "";
        const periodW = period ? approx(period, style.body) + 10 : 0;
        const headerMaxW = box.w - periodW - 4;

        if (!within(style.line)) onNewPage();
        const headerStartY = cursor;

        if (period) {
          push(<T key={`pg${pageIdx}-per${pageElements.length}`} x={box.x + box.w} y={headerStartY} size={style.body} color={style.header} family={style.family} anchor="end" weight={700}>{period}</T>);
        }

        if (rec.header) {
          linesWrapped(rec.header, Math.max(30, headerMaxW), style.body, style.header, 700);
        }
        if (rec.subheader) {
          linesWrapped(rec.subheader, box.w, style.body, "#555555", 400);
        }

        // Skills/languages: show text level label
        if ((key === "skills" || key === "languages") && rec.level) {
          const label = levelToLabel(rec.level, key as "skills" | "languages");
          if (label) {
            push(
              <T key={`pg${pageIdx}-lvl${pageElements.length}`} x={box.x + box.w} y={headerStartY} size={style.body - 1} color="#666666" family={style.family} anchor="end">
                {label}
              </T>
            );
          }
        }

        cursor += g.header;

        if ((rec.bulletsHtml && rec.bulletsHtml.length) || (rec.bullets && rec.bullets.length)) {
          const items = (rec.bulletsHtml && rec.bulletsHtml.length) ? rec.bulletsHtml : rec.bullets!;
          const BULLET_INDENT = 16;
          const BULLET_RADIUS = 2.2;
          items.forEach((item, idx) => {
            if (!need(style.line)) { if (opts.rail) return; }
            const baseline = cursor - (style.line - style.body) / 7;
            const cy = baseline - style.body * 0.22;
            const gutterX = box.x + BULLET_INDENT - 6;
            if (rec.listType === "ol") {
              push(<T key={`pg${pageIdx}-num${pageElements.length}`} x={box.x} y={baseline} size={style.body} color={style.text} family={style.family}>{`${idx + 1}.`}</T>);
            } else {
              push(<circle key={`pg${pageIdx}-dot${pageElements.length}`} cx={gutterX} cy={cy} r={BULLET_RADIUS} fill={style.text} />);
            }
            const cursorRef = { y: cursor };
            const ok = paragraphRich(item, box.w, { x: box.x + BULLET_INDENT, body: style.body, text: style.text, family: style.family, linkColor: style.primary }, push, need, style.line, cursorRef, g.para);
            cursor = cursorRef.y;
            if (!ok) { if (opts.rail) return; }
          });
        } else {
          const txt = rec.value ?? rec.richtextValue;
          if (txt) {
            if (defaultBullets) {
              if (!need(style.line)) { if (opts.rail) break; }
              push(<circle key={`pg${pageIdx}-b${pageElements.length}`} cx={box.x + 3} cy={cursor - 3 + style.body} r={2} fill={style.text} />);
              if (!paragraph(txt, 12)) { if (opts.rail) break; }
            } else {
              const cursorRef = { y: cursor };
              const ok = paragraphRich(txt, box.w, { x: box.x, body: style.body, text: style.text, family: style.family, linkColor: style.primary }, push, need, style.line, cursorRef, g.para);
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

/* =================== Main component =================== */
export const ExecutiveTemplate: React.FC<ExecutiveProps> = (props) => {
  const {
    width = 595.28,
    height = 841.89,
    firstName,
    lastName,
    headline,
    railSections,
    mainSections,
    colors,
    fontFamily = "Georgia, serif",
    sizes,
  } = props;

  const text = colors?.text ?? "#222222";
  const header = colors?.header ?? "#333333";
  const divider = colors?.divider ?? "#999999";
  const primary = colors?.primary ?? "#333333"; // executive: no color accent

  const bodySize = sizes?.body ?? 10;
  const lineH = sizes?.line ?? 18;
  const sectionSize = sizes?.section ?? 12;
  const nameSize = sizes?.heading ?? 22;

  const paraGap = sizes?.paraGap ?? 6;
  const headerGap = sizes?.headerGap ?? 4;
  const titleGap = sizes?.titleGap ?? 10;
  const sectionGap = sizes?.sectionGap ?? 16;
  const recordGap = sizes?.recordGap ?? 6;
  const beforeTitlePad = sizes?.beforeTitlePad ?? 6;

  const marginX = 50;
  const contentW = width - marginX * 2;
  const fullName = `${firstName} ${lastName}`.trim();

  // Header area: name centered, horizontal rule
  const nameY = 55;
  const headlineY = nameY + 20;
  const hrY1 = headline ? headlineY + 14 : nameY + 18;

  // Personal details: horizontal line below header
  const pdSection = railSections.find(s => s.key === "personal details");
  let pdY = hrY1 + 14;
  const pdItems: string[] = [];
  if (pdSection?.records) {
    for (const rec of pdSection.records) {
      if (rec.header) pdItems.push(rec.header);
    }
  }
  const pdText = pdItems.join("  |  ");
  const pdEndY = pdY + (pdText ? lineH : 0);
  const hrY2 = pdEndY + 6;

  // Content starts after personal details
  const contentStartY = hrY2 + 10;

  // Merge all rail sections (except PD) into main for full-width rendering
  const allSections: Section[] = [];
  // Profile first
  const profIdx = mainSections.findIndex(s => s.key === "profile");
  if (profIdx >= 0) {
    allSections.push(mainSections[profIdx]);
  }
  // Then other main sections
  for (let i = 0; i < mainSections.length; i++) {
    if (i !== profIdx) allSections.push(mainSections[i]);
  }
  // Then rail sections (skills, languages, hobbies, etc.) — skip PD
  for (const s of railSections) {
    if (s.key !== "personal details") allSections.push(s);
  }

  const firstBox: Box = { x: marginX, y: contentStartY, w: contentW, h: height - contentStartY - 40 };
  const followBox: Box = { x: marginX, y: 50, w: contentW, h: height - 90 };

  const style = { family: fontFamily, body: bodySize, line: lineH, section: sectionSize, primary, text, header, divider };

  const contentPages = pourExecutivePaged(firstBox, followBox, allSections, style, {
    bulletsForKeys: [],
    gaps: { para: paraGap, header: headerGap, title: titleGap, section: sectionGap, record: recordGap, beforeTitlePad },
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
                {/* Centered name — large serif */}
                <T x={width / 2} y={nameY} size={nameSize} color={header} family={fontFamily} weight={700} anchor="middle">
                  {fullName.toUpperCase()}
                </T>

                {/* Headline below name */}
                {headline ? (
                  <T x={width / 2} y={headlineY} size={bodySize + 1} color="#555555" family={fontFamily} anchor="middle">
                    {headline}
                  </T>
                ) : null}

                {/* Horizontal rule below name/headline (theme primary). */}
                <line x1={marginX} y1={hrY1} x2={width - marginX} y2={hrY1} stroke={primary} strokeWidth="1.5" />

                {/* Personal details in a single line */}
                {pdText ? (
                  <T x={width / 2} y={pdY} size={bodySize} color={text} family={fontFamily} anchor="middle">
                    {pdText}
                  </T>
                ) : null}

                {/* Second horizontal rule (theme divider, thinner). */}
                <line x1={marginX} y1={hrY2} x2={width - marginX} y2={hrY2} stroke={divider} strokeWidth="0.75" />
              </>
            ) : null}

            <g>{content}</g>
          </svg>
        );
      })}
    </>
  );
};
