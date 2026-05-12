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

export type HorizontalProps = {
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
const levelToFraction = (v: any, which: "skills" | "languages"): number => {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return 0;
  const n = parseInt(s, 10);
  if (!Number.isNaN(n)) return Math.max(0, Math.min(5, n)) / 5;
  if (which === "languages") {
    if (s.startsWith("basic") || s.startsWith("elementary")) return 0.4;
    if (s.startsWith("conv") || s.startsWith("working")) return 0.6;
    if (s.startsWith("fluent") || s.startsWith("prof")) return 0.8;
    if (s.startsWith("native") || s.startsWith("biling")) return 1.0;
    return 0;
  }
  if (s.startsWith("beg")) return 0.2;
  if (s.startsWith("mod")) return 0.4;
  if (s.startsWith("int") || s.startsWith("good")) return 0.6;
  if (s.startsWith("very") || s.startsWith("adv")) return 0.8;
  if (s.startsWith("exc") || s.startsWith("exp")) return 1.0;
  return 0;
};

/* =================== Horizontal Pourer =================== */
function pourHorizontalPaged(
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

    // Skip skills/languages — they are rendered in the two-column bottom area
    if (key === "skills" || key === "languages") continue;

    if (!need(style.line * 2)) {
      if (opts.rail) break;
    }

    const title = (sec.title ?? titleCase(sec.key)).toUpperCase();

    // Bold colored bar as section divider
    push(<R key={`pg${pageIdx}-bar${pageElements.length}`} x={box.x} y={cursor - style.line + 4} w={box.w} h={4} fill={style.primary} />);
    cursor += 6;

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
          linesWrapped(rec.subheader, box.w, style.body, style.primary, 400);
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

  return { pages, finalCursor: cursor, finalPageIdx: pageIdx };
}

/* =================== Main component =================== */
export const HorizontalTemplate: React.FC<HorizontalProps> = (props) => {
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

  const primary = colors?.primary ?? "#2563EB";
  const text = colors?.text ?? "#222222";
  const header = colors?.header ?? "#333333";
  const divider = colors?.divider ?? "#d8d8d8";

  const bodySize = sizes?.body ?? 10;
  const lineH = sizes?.line ?? 18;
  const sectionSize = sizes?.section ?? 12;
  const nameSize = sizes?.heading ?? 24;

  const paraGap = sizes?.paraGap ?? 6;
  const headerGap = sizes?.headerGap ?? 4;
  const titleGap = sizes?.titleGap ?? 10;
  const sectionGap = sizes?.sectionGap ?? 16;
  const recordGap = sizes?.recordGap ?? 6;
  const beforeTitlePad = sizes?.beforeTitlePad ?? 6;

  const marginX = 40;
  const contentW = width - marginX * 2;
  const fullName = `${firstName} ${lastName}`.trim();

  // Header area
  const nameY = 45;
  const underlineY = nameY + 6;
  const headlineY = underlineY + 18;

  // Personal details
  const pdSection = railSections.find(s => s.key === "personal details");
  const pdItems: string[] = [];
  if (pdSection?.records) {
    for (const rec of pdSection.records) {
      if (rec.header) pdItems.push(rec.header);
    }
  }
  const pdY = headline ? headlineY + 16 : underlineY + 22;
  const pdText = pdItems.join("  |  ");
  const contentStartY = pdY + (pdText ? lineH + 10 : 10);

  // All non-skill/language sections for main flow
  const allSections: Section[] = [];
  const profIdx = mainSections.findIndex(s => s.key === "profile");
  if (profIdx >= 0) allSections.push(mainSections[profIdx]);
  for (let i = 0; i < mainSections.length; i++) {
    if (i !== profIdx) allSections.push(mainSections[i]);
  }
  // Add rail sections that are not PD, skills, or languages
  for (const s of railSections) {
    if (s.key !== "personal details" && s.key !== "skills" && s.key !== "languages") {
      allSections.push(s);
    }
  }

  const firstBox: Box = { x: marginX, y: contentStartY, w: contentW, h: height - contentStartY - 40 };
  const followBox: Box = { x: marginX, y: 40, w: contentW, h: height - 80 };

  const style = { family: fontFamily, body: bodySize, line: lineH, section: sectionSize, primary, text, header, divider };

  const { pages: contentPages, finalCursor, finalPageIdx } = pourHorizontalPaged(firstBox, followBox, allSections, style, {
    bulletsForKeys: [],
    gaps: { para: paraGap, header: headerGap, title: titleGap, section: sectionGap, record: recordGap, beforeTitlePad },
  });

  // Skills and languages sections for two-column bottom area
  const skillsSection = [...railSections, ...mainSections].find(s => s.key === "skills");
  const langSection = [...railSections, ...mainSections].find(s => s.key === "languages");

  // Render skills/languages as horizontal bars in two columns
  const renderTwoColumnBottom = (startY: number, pageNodes: React.ReactNode[], pgIdx: number) => {
    let y = startY;
    const colW = (contentW - 20) / 2; // 20px gap between columns
    const leftX = marginX;
    const rightX = marginX + colW + 20;
    const BAR_H = 6;
    const BAR_BG = "#e5e7eb";
    const ROW_H = lineH + BAR_H + 6;

    // Skills (left column)
    if (skillsSection?.records?.length) {
      const title = (skillsSection.title ?? "Skills").toUpperCase();
      pageNodes.push(<R key={`pg${pgIdx}-sk-bar`} x={leftX} y={y - lineH + 4} w={colW} h={4} fill={primary} />);
      y += 6;
      pageNodes.push(<T key={`pg${pgIdx}-sk-title`} x={leftX} y={y} size={sectionSize} color={primary} family={fontFamily} weight={700}>{title}</T>);
      y += lineH + 4;

      for (const rec of skillsSection.records) {
        if (!rec.header) continue;
        if (y + ROW_H > height - 30) break;
        pageNodes.push(<T key={`pg${pgIdx}-sk-${y}`} x={leftX} y={y} size={bodySize} color={text} family={fontFamily} weight={700}>{rec.header}</T>);
        y += lineH - 2;
        const frac = rec.level ? levelToFraction(rec.level, "skills") : 0.5;
        // Background bar
        pageNodes.push(<R key={`pg${pgIdx}-sk-bg-${y}`} x={leftX} y={y} w={colW} h={BAR_H} fill={BAR_BG} rx={3} />);
        // Filled bar
        pageNodes.push(<R key={`pg${pgIdx}-sk-fill-${y}`} x={leftX} y={y} w={colW * frac} h={BAR_H} fill={primary} rx={3} />);
        y += BAR_H + 8;
      }
    }

    // Languages (right column)
    let yRight = startY;
    if (langSection?.records?.length) {
      const title = (langSection.title ?? "Languages").toUpperCase();
      pageNodes.push(<R key={`pg${pgIdx}-ln-bar`} x={rightX} y={yRight - lineH + 4} w={colW} h={4} fill={primary} />);
      yRight += 6;
      pageNodes.push(<T key={`pg${pgIdx}-ln-title`} x={rightX} y={yRight} size={sectionSize} color={primary} family={fontFamily} weight={700}>{title}</T>);
      yRight += lineH + 4;

      for (const rec of langSection.records) {
        if (!rec.header) continue;
        if (yRight + ROW_H > height - 30) break;
        pageNodes.push(<T key={`pg${pgIdx}-ln-${yRight}`} x={rightX} y={yRight} size={bodySize} color={text} family={fontFamily} weight={700}>{rec.header}</T>);
        yRight += lineH - 2;
        const frac = rec.level ? levelToFraction(rec.level, "languages") : 0.5;
        pageNodes.push(<R key={`pg${pgIdx}-ln-bg-${yRight}`} x={rightX} y={yRight} w={colW} h={BAR_H} fill={BAR_BG} rx={3} />);
        pageNodes.push(<R key={`pg${pgIdx}-ln-fill-${yRight}`} x={rightX} y={yRight} w={colW * frac} h={BAR_H} fill={primary} rx={3} />);
        yRight += BAR_H + 8;
      }
    }
  };

  // Add two-column bottom to the last content page (or create a new one if needed)
  const lastPageIdx = contentPages.length - 1;
  const twoColStartY = finalCursor + 10;
  const needsNewPage = twoColStartY + lineH * 3 > height - 40;

  if ((skillsSection?.records?.length || langSection?.records?.length)) {
    if (needsNewPage) {
      const newPageNodes: React.ReactNode[] = [];
      renderTwoColumnBottom(50, newPageNodes, contentPages.length);
      contentPages.push(newPageNodes);
    } else {
      renderTwoColumnBottom(twoColStartY, contentPages[lastPageIdx], lastPageIdx);
    }
  }

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
                {/* Name with colored underline */}
                <T x={marginX} y={nameY} size={nameSize} color={header} family={fontFamily} weight={700}>
                  {fullName}
                </T>
                <R x={marginX} y={underlineY} w={contentW} h={3} fill={primary} />

                {/* Headline */}
                {headline ? (
                  <T x={marginX} y={headlineY} size={bodySize + 1} color="#555555" family={fontFamily}>
                    {headline}
                  </T>
                ) : null}

                {/* Personal details line */}
                {pdText ? (
                  <T x={marginX} y={pdY} size={bodySize} color={text} family={fontFamily}>
                    {pdText}
                  </T>
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
