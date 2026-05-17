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

export type CasualProps = {
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
/** Mix a hex color toward white by factor 0..1 (0 = unchanged, 1 = white). */
function tintHex(hex: string, factor: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
  const t = Math.max(0, Math.min(1, factor));
  const mix = (c: number) => Math.round(c + (255 - c) * t);
  return `#${[mix(r), mix(g), mix(b)].map(v => v.toString(16).padStart(2, "0")).join("")}`;
}

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
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/* =================== Casual Card Pourer =================== */
function pourCasualPaged(
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
  const CARD_PAD = 12;
  const CARD_RX = 8;
  const CARD_STROKE = "#e2e8f0";
  const CARD_SHADOW = "#f1f5f9";
  const PILL_H = 18;
  const PILL_RX = 9;
  const PILL_GAP = 6;
  const PILL_PAD_X = 10;

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
    const isSkillLike = key === "skills" || key === "languages";

    if (!need(style.line * 3 + CARD_PAD * 2)) {
      if (opts.rail) break;
    }

    // Estimate card height (rough: title + records * lineH * 2)
    const cardStartY = cursor;

    // Card shadow (offset slightly)
    push(<rect key={`pg${pageIdx}-shadow-${pageElements.length}`} x={box.x + 2} y={cardStartY - style.line + 2} width={box.w} height={20} fill={CARD_SHADOW} rx={CARD_RX} opacity="0.6" />);

    // Card border
    push(<rect key={`pg${pageIdx}-card-${pageElements.length}`} x={box.x} y={cardStartY - style.line} width={box.w} height={20} fill="white" stroke={CARD_STROKE} strokeWidth="1" rx={CARD_RX} />);

    // We'll track the card content and update height later
    const cardBorderIdx = pageElements.length - 1;
    const cardShadowIdx = pageElements.length - 2;

    // Section title inside card
    cursor += CARD_PAD - style.line + 4;
    const title = sec.title ?? titleCase(sec.key);
    if (!line(title, style.section, style.primary, 700)) break;

    // Thin colored line under title
    push(<R key={`pg${pageIdx}-tline-${pageElements.length}`} x={box.x + CARD_PAD} y={cursor - style.line + 6} w={50} h={2} fill={style.primary} />);
    cursor += g.title;

    // Inner content area
    const innerX = box.x + CARD_PAD;
    const innerW = box.w - CARD_PAD * 2;

    if (isSkillLike && sec.records?.length) {
      // Render skills/languages as pills
      let pillX = innerX;
      let pillY = cursor;
      // Skills pill uses the theme primary; languages pill uses a tinted
      // variant of the same primary so they're visually related but
      // distinguishable across themes (no more hardcoded indigo).
      const pillBg = key === "skills" ? style.primary : tintHex(style.primary, 0.35);

      for (const rec of sec.records) {
        if (!rec.header) continue;
        const label = rec.header + (rec.level ? ` - ${levelToLabel(rec.level, key as "skills" | "languages")}` : "");
        const pillW = approx(label, style.body - 1) + PILL_PAD_X * 2;

        // Wrap to next row if overflows
        if (pillX + pillW > box.x + box.w - CARD_PAD) {
          pillX = innerX;
          pillY += PILL_H + PILL_GAP;
          if (!need(PILL_H + PILL_GAP)) break;
        }

        // Pill background
        push(<rect key={`pg${pageIdx}-pill-${pageElements.length}`} x={pillX} y={pillY - PILL_H + 4} width={pillW} height={PILL_H} rx={PILL_RX} fill={pillBg} opacity="0.15" />);
        // Pill text
        push(<T key={`pg${pageIdx}-pillt-${pageElements.length}`} x={pillX + PILL_PAD_X} y={pillY} size={style.body - 1} color={pillBg} family={style.family} weight={700}>{label}</T>);

        pillX += pillW + PILL_GAP;
      }
      cursor = pillY + PILL_H + 4;
    } else if (sec.records?.length) {
      // Standard record rendering
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
        const headerMaxW = innerW - periodW - 4;

        if (!within(style.line)) onNewPage();
        const headerStartY = cursor;

        if (period) {
          push(<T key={`pg${pageIdx}-per${pageElements.length}`} x={box.x + box.w - CARD_PAD} y={headerStartY} size={style.body} color={style.header} family={style.family} anchor="end" weight={700}>{period}</T>);
        }

        if (rec.header) {
          linesWrapped(rec.header, Math.max(30, headerMaxW), style.body, style.header, 700, innerX);
        }
        if (rec.subheader) {
          linesWrapped(rec.subheader, innerW, style.body, style.primary, 400, innerX);
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
            const gutterX = innerX + BULLET_INDENT - 6;
            if (rec.listType === "ol") {
              push(<T key={`pg${pageIdx}-num${pageElements.length}`} x={innerX} y={baseline} size={style.body} color={style.text} family={style.family}>{`${idx + 1}.`}</T>);
            } else {
              push(<circle key={`pg${pageIdx}-dot${pageElements.length}`} cx={gutterX} cy={cy} r={BULLET_RADIUS} fill={style.text} />);
            }
            const cursorRef = { y: cursor };
            const ok = paragraphRich(item, innerW, { x: innerX + BULLET_INDENT, body: style.body, text: style.text, family: style.family, linkColor: style.primary }, push, need, style.line, cursorRef, g.para);
            cursor = cursorRef.y;
            if (!ok) { if (opts.rail) return; }
          });
        } else {
          const txt = rec.value ?? rec.richtextValue;
          if (txt) {
            if (defaultBullets) {
              if (!need(style.line)) { if (opts.rail) break; }
              push(<circle key={`pg${pageIdx}-b${pageElements.length}`} cx={innerX + 3} cy={cursor - 3 + style.body} r={2} fill={style.text} />);
              const maxW = innerW - 12;
              const lines = wrapLines(txt, maxW, style.body);
              for (const ln of lines) {
                if (!need(style.line)) break;
                push(<T key={`pg${pageIdx}-p${pageElements.length}`} x={innerX + 12} y={cursor} size={style.body} color={style.text} family={style.family}>{ln}</T>);
                cursor += style.line;
              }
              cursor += g.para;
            } else {
              const cursorRef = { y: cursor };
              const ok = paragraphRich(txt, innerW, { x: innerX, body: style.body, text: style.text, family: style.family, linkColor: style.primary }, push, need, style.line, cursorRef, g.para);
              cursor = cursorRef.y;
              if (!ok) { if (opts.rail) break; }
            }
          }
        }

        if (rIdx < sec.records.length - 1) cursor += g.record;
      }
    }

    // Update card height now that we know the content extent
    const cardH = cursor - (cardStartY - style.line) + CARD_PAD;
    const cardEl = pageElements[cardBorderIdx] as React.ReactElement;
    const shadowEl = pageElements[cardShadowIdx] as React.ReactElement;
    if (cardEl) {
      pageElements[cardBorderIdx] = React.cloneElement(cardEl, { height: cardH });
    }
    if (shadowEl) {
      pageElements[cardShadowIdx] = React.cloneElement(shadowEl, { height: cardH });
    }

    cursor += g.section + CARD_PAD;
  }

  return pages;
}

/* =================== Main component =================== */
export const CasualTemplate: React.FC<CasualProps> = (props) => {
  const {
    width = 595.28,
    height = 841.89,
    firstName,
    lastName,
    headline,
    photoUrl,
    railSections,
    mainSections,
    colors,
    fontFamily = "LiberationSans, Arial, sans-serif",
    sizes,
  } = props;

  const primary = colors?.primary ?? "#2563EB";
  const text = colors?.text ?? "#222222";
  const header = colors?.header ?? "#333333";
  const divider = colors?.divider ?? "#e2e8f0";

  const bodySize = sizes?.body ?? 10;
  const lineH = sizes?.line ?? 18;
  const sectionSize = sizes?.section ?? 13;
  const nameSize = sizes?.heading ?? 22;

  const paraGap = sizes?.paraGap ?? 6;
  const headerGap = sizes?.headerGap ?? 4;
  const titleGap = sizes?.titleGap ?? 10;
  const sectionGap = sizes?.sectionGap ?? 12;
  const recordGap = sizes?.recordGap ?? 6;
  const beforeTitlePad = sizes?.beforeTitlePad ?? 6;

  const marginX = 35;
  const contentW = width - marginX * 2;
  const fullName = `${firstName} ${lastName}`.trim();

  // Rounded header block
  const headerH = 80;
  const nameY = 38;
  const headlineY = nameY + 22;

  // Personal details below header
  const pdSection = railSections.find(s => s.key === "personal details");
  const pdItems: string[] = [];
  if (pdSection?.records) {
    for (const rec of pdSection.records) {
      if (rec.header) pdItems.push(rec.header);
    }
  }
  const pdY = headerH + 20;
  const pdText = pdItems.join("  |  ");
  const contentStartY = pdY + (pdText ? lineH + 10 : 10);

  // All sections merged (profile first, then main, then rail non-PD)
  const allSections: Section[] = [];
  const profIdx = mainSections.findIndex(s => s.key === "profile");
  if (profIdx >= 0) allSections.push(mainSections[profIdx]);
  for (let i = 0; i < mainSections.length; i++) {
    if (i !== profIdx) allSections.push(mainSections[i]);
  }
  for (const s of railSections) {
    if (s.key !== "personal details") allSections.push(s);
  }

  const firstBox: Box = { x: marginX, y: contentStartY, w: contentW, h: height - contentStartY - 30 };
  const followBox: Box = { x: marginX, y: 40, w: contentW, h: height - 70 };

  const style = { family: fontFamily, body: bodySize, line: lineH, section: sectionSize, primary, text, header, divider };

  const contentPages = pourCasualPaged(firstBox, followBox, allSections, style, {
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
                {/* Rounded colored header block with rounded bottom corners */}
                <defs>
                  <clipPath id="casualHeaderClip">
                    <rect x={0} y={0} width={width} height={headerH} rx={0} />
                  </clipPath>
                </defs>
                <rect x={0} y={0} width={width} height={headerH} fill={primary} rx={0} />
                {/* Rounded bottom edge */}
                <ellipse cx={width / 2} cy={headerH} rx={width / 1.8} ry={15} fill={primary} />

                {/* Photo circle in header (optional) */}
                {photoUrl ? (
                  <>
                    <circle cx={width - 60} cy={headerH / 2} r={25} fill="white" opacity="0.3" />
                    <clipPath id="casualPhotoClip">
                      <circle cx={width - 60} cy={headerH / 2} r={23} />
                    </clipPath>
                    <image preserveAspectRatio="xMidYMid slice" x={width - 83} y={headerH / 2 - 23} width={46} height={46} href={photoUrl} clipPath="url(#casualPhotoClip)" />
                  </>
                ) : null}

                {/* Name in header (white text) */}
                <T x={marginX + 10} y={nameY} size={nameSize} color="white" family={fontFamily} weight={700}>
                  {fullName}
                </T>

                {/* Headline in header */}
                {headline ? (
                  <T x={marginX + 10} y={headlineY} size={bodySize + 1} color="rgba(255,255,255,0.9)" family={fontFamily}>
                    {headline}
                  </T>
                ) : null}

                {/* Personal details below header */}
                {pdText ? (
                  <T x={width / 2} y={pdY} size={bodySize} color={text} family={fontFamily} anchor="middle">
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
