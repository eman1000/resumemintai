"use client";
import { breakLongToken, T } from "@/lib/render-utils";
import * as React from "react";

/* =================== Types =================== */
export type RecordItem = {
  header?: string;
  subheader?: string;
  period?: string;
  value?: string;
  richtextValue?: string;
  bullets?: string[];
  bulletsHtml?: string[];
  listType?: "ol" | "ul";
  level?: string;
  pdKey?: string;
};
export type Section = { key: string; title?: string; records?: RecordItem[] };

export type ProfessionalProps = {
  width?: number;
  height?: number;

  firstName: string;
  lastName: string;
  locationText?: string;
  photoUrl?: string;

  railSections: Section[];
  mainSections: Section[];

  colors?: {
    primary?: string;
    text?: string;
    header?: string;
    divider?: string;
    railDivider?: string;
  };
  fontFamily?: string;
  sizes?: {
    body?: number;
    line?: number;
    section?: number;
    name?: number;
  };
};

/* =================== Helpers =================== */
const approx = (s: string, px: number) => (s?.length || 0) * px * 0.55;
const stripHtml = (s?: string) =>
  String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function wrapLines(s: string, maxW: number, size: number) {
  const words = String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  const lines: string[] = [];
  let cur = "";
  const flush = () => { if (cur) { lines.push(cur); cur = ""; } };

  for (const w of words) {
    const candidate = cur ? cur + " " + w : w;
    if (approx(candidate, size) <= maxW) { cur = candidate; continue; }

    flush();
    const chunks = breakLongToken(w, maxW, size);
    for (let i = 0; i < chunks.length - 1; i++) lines.push(chunks[i]);
    cur = chunks[chunks.length - 1];
  }
  flush();
  return lines;
}

function ellipsizeToWidth(s: string, size: number, maxW: number) {
  if (!s) return s;
  if (approx(s, size) <= maxW) return s;
  let out = s;
  const words = out.split(" ");
  while (words.length > 1 && approx(words.join(" ") + "…", size) > maxW) words.pop();
  out = words.join(" ");
  while (out.length && approx(out + "…", size) > maxW) out = out.slice(0, -1);
  return out ? out + "…" : "…";
}

function splitNameToTwoLines(full: string, size: number, maxW: number): [string, string?] {
  const t = full.trim().replace(/\s+/g, " ");
  if (!t) return [""];
  if (approx(t, size) <= maxW) return [t];
  let bestIdx = -1;
  for (let i = 0; i < t.length; i++) {
    if (t[i] === " " && approx(t.slice(0, i), size) <= maxW) bestIdx = i;
  }
  if (bestIdx > 0) return [t.slice(0, bestIdx), t.slice(bestIdx + 1)];
  const cut = Math.max(1, Math.floor(maxW / (size * 0.55)));
  return [t.slice(0, cut), t.slice(cut)];
}

function fitName(full: string, base: number, maxW: number) {
  let size = Math.min(Math.max(base, 20), 36);
  let l1 = "", l2: string | undefined = undefined;
  for (; size >= 16; size--) {
    [l1, l2] = splitNameToTwoLines(full, size, maxW);
    const tooWide = approx(l1, size) > maxW || (l2 ? approx(l2, size) > maxW : false);
    if (!tooWide) break;
  }
  l1 = ellipsizeToWidth(l1, size, maxW);
  if (l2) l2 = ellipsizeToWidth(l2, size, maxW);
  return { size, l1, l2 };
}



const R: React.FC<{ x: number; y: number; w: number; h: number; fill: string; rx?: number }> =
  ({ x, y, w, h, fill, rx }) => <rect x={x} y={y} width={w} height={h} fill={fill} rx={rx} />;

/* =================== Paged pourer =================== */
type Box = { x: number; y: number; w: number; h: number };
const titleCase = (s: string) =>
  String(s || "").replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

function pourSectionsPaged(
  firstBox: Box,
  followBox: Box,
  sections: Section[],
  style: {
    family: string;
    body: number;
    line: number;
    section: number;
    text: string;
    header: string;
    divider: string;
  },
  opts?: {
    bullet?: {
      indent?: number;   // text indent from left edge (dot + gap)
      r?: number;        // dot radius
      baselineK?: number; // if set: cy = cursor - body * baselineK; else legacy cy
    };
  }
) {
  // ✅ read bullet options once
  const bulletOpts     = opts?.bullet ?? {};
  const BULLET_INDENT  = bulletOpts.indent ?? 12;
  const DOT_R          = bulletOpts.r ?? 2;
  const BASELINE_K     = bulletOpts.baselineK; // undefined => keep legacy

  const g = { para: 8, header: 4, title: 12, section: 18, record: 8, beforeTitlePad: 6 };

  let box = { ...firstBox };
  let pageElements: React.ReactNode[] = [];
  const pages: React.ReactNode[][] = [pageElements];
  let cursor = box.y + g.beforeTitlePad;

  const within = (px: number) => cursor + px <= box.y + box.h;
  const push = (n: React.ReactNode) => pageElements.push(n);
  const newPage = () => {
    pageElements = [];
    pages.push(pageElements);
    box = { ...followBox };
    cursor = box.y + g.beforeTitlePad;
  };
  const need = (px: number) => { if (within(px)) return true; newPage(); return within(px); };

  const divider = () =>
    push(
      <path
        key={`div-${pages.length}-${pageElements.length}`}
        d={`M ${box.x} ${cursor - style.line + 8} L ${box.x + box.w} ${cursor - style.line + 8}`}
        stroke={style.divider}
        strokeWidth="0.75"
        fill="none"
      />
    );

  for (const sec of sections) {
    const secTitle = sec.title ?? titleCase(sec.key);
    if (!need(style.line * 2)) break;

    push(
      <T
        key={`t-${pages.length}-${pageElements.length}`}
        x={box.x}
        y={cursor}
        size={style.section}
        color={style.header}
        family={style.family}
        weight={700}
      >
        {secTitle}
      </T>
    );
    cursor += style.line;
    divider();
    cursor += g.title;

    for (let r = 0; r < (sec.records?.length || 0); r++) {
      const rec = sec.records![r];

      const period = rec.period ? stripHtml(rec.period) : "";
      const headerText = stripHtml(rec.header);

      const periodW = period ? approx(period, style.body) + 8 : 0;
      const headerMaxW = Math.max(24, box.w - periodW - 6);

      if (!need(style.line)) break;

      const baselineY = cursor;

      if (period) {
        push(
          <T
            key={`per-${pages.length}-${pageElements.length}`}
            x={box.x + box.w}
            y={baselineY}
            size={style.body}
            color={style.header}
            family={style.family}
            weight={700}
            anchor="end"
          >
            {period}
          </T>
        );
      }

      const headerLines = headerText ? wrapLines(headerText, headerMaxW, style.body) : [];
      for (const ln of headerLines.length ? headerLines : [""]) {
        if (!need(style.line)) break;
        push(
          <T
            key={`h-${pages.length}-${pageElements.length}`}
            x={box.x}
            y={cursor}
            size={style.body}
            color={style.header}
            family={style.family}
            weight={700}
          >
            {ln}
          </T>
        );
        cursor += style.line;
      }

      if (rec.subheader) {
        const sub = wrapLines(stripHtml(rec.subheader), box.w, style.body);
        for (const ln of sub) {
          if (!need(style.line)) break;
          push(
            <T
              key={`sub-${pages.length}-${pageElements.length}`}
              x={box.x}
              y={cursor}
              size={style.body}
              color={style.text}
              family={style.family}
            >
              {ln}
            </T>
          );
          cursor += style.line;
        }
      }

      const para = rec.value || rec.richtextValue || "";
      if (para) {
        const lines = wrapLines(stripHtml(para), box.w, style.body);
        for (const ln of lines) {
          if (!need(style.line)) break;
          push(
            <T
              key={`p-${pages.length}-${pageElements.length}`}
              x={box.x}
              y={cursor}
              size={style.body}
              color={style.text}
              family={style.family}
            >
              {ln}
            </T>
          );
          cursor += style.line;
        }
        cursor += g.para;
      }

      // ✅ BULLETS — now honoring opts.bullet
      const bullets = (rec.bulletsHtml?.length ? rec.bulletsHtml : rec.bullets) || [];
      if (bullets.length) {
        for (let i = 0; i < bullets.length; i++) {
          if (!need(style.line)) break;

          const lineText = stripHtml(bullets[i]);

          // dot position (legacy vs baseline-aligned)
          const dotCx = box.x + DOT_R + 1; // small left pad so it doesn't hug the edge
          const dotCy =
            BASELINE_K == null
              ? (cursor - 3 + style.body)                // legacy behavior (keeps Circular identical)
              : (cursor - style.body * BASELINE_K);      // baseline aligned (Professional)

          push(
            <circle
              key={`dot-${pages.length}-${pageElements.length}`}
              cx={dotCx}
              cy={dotCy}
              r={DOT_R}
              fill={style.text}
            />
          );

          // bullet text with configurable indent
          const lines = wrapLines(lineText, box.w - BULLET_INDENT, style.body);
          for (let k = 0; k < lines.length; k++) {
            if (!need(style.line)) break;
            push(
              <T
                key={`bl-${pages.length}-${pageElements.length}`}
                x={box.x + BULLET_INDENT}
                y={cursor}
                size={style.body}
                color={style.text}
                family={style.family}
              >
                {lines[k]}
              </T>
            );
            cursor += style.line;
          }
        }
        cursor += g.para;
      }

      if (r < (sec.records!.length - 1)) cursor += g.record;
    }

    cursor += g.section;
  }

  return pages;
}


/* =================== Component =================== */
export default function ProfessionalTemplate(props: ProfessionalProps) {
  const {
    width = 595.28,
    height = 841.89,

    firstName,
    lastName,
    locationText,
    photoUrl,

    railSections,
    mainSections,

    colors,
    fontFamily = "Poppins, Arial, sans-serif",
    sizes,
  } = props;

const primary     = colors?.primary    ?? "#2f3742";
const text        = colors?.text       ?? "#303846";
const headerColor = primary;          // <- follow primary by default
const divider     = colors?.divider    ?? "#e2e2e2";
const railDiv     = colors?.railDivider?? "#e2e2e2";

  const bodySize = sizes?.body ?? 10;
  const line = sizes?.line ?? 18;
  const sectionSize = sizes?.section ?? 18;
  const nameBase = sizes?.name ?? 28;

  /* Layout */
  const MARGIN   = 25;
  const BANNER_H = 130;
  const DIV_X    = 395.28;

  // full-bleed banner
  const BANNER_X = 0;
  const BANNER_Y = 0;
  const BANNER_W = width;

  // photo + text area inside banner
  const hasPhoto = Boolean(photoUrl);

  const PHOTO_W         = 260;
  const CONTENT_LEFT_X  = hasPhoto ? PHOTO_W + 20 : 20;         // <-- shift left when no photo
  const CONTENT_RIGHT_X = BANNER_W - 20;       // 20px right padding
  const NAME_AREA_W     = CONTENT_RIGHT_X - CONTENT_LEFT_X;

  // columns start below the banner
  const BODY_TOP = BANNER_Y + BANNER_H + 20;

  // column boxes
  const mainFirstBox: Box = { x: MARGIN,      y: BODY_TOP, w: DIV_X - MARGIN - 12,          h: height - BODY_TOP - MARGIN };
  const mainFollowBox: Box = { x: MARGIN,     y: MARGIN,   w: DIV_X - MARGIN - 12,          h: height - MARGIN - MARGIN };
  const railFirstBox: Box = { x: DIV_X + 24,  y: BODY_TOP, w: width - (DIV_X + 24) - MARGIN, h: height - BODY_TOP - MARGIN };
  const railFollowBox: Box = { x: DIV_X + 24, y: MARGIN,   w: width - (DIV_X + 24) - MARGIN, h: height - MARGIN - MARGIN };

const style = {
  family: fontFamily,
  body: bodySize,
  line,
  section: sectionSize,
  text,
  header: headerColor, // titles & record headers use this
  divider,
};
  const mainPages = pourSectionsPaged(mainFirstBox, mainFollowBox, mainSections, style,
  {
    bullet: {
      indent: 12,       // space for dot + gap
      r: 2,
      baselineK: 0.32,  // ~32% of body size above baseline looks centered in Poppins
    },
  });
  const railPages = pourSectionsPaged(railFirstBox, railFollowBox, railSections, style,
  {
    bullet: {
      indent: 12,
      r: 2,
      baselineK: 0.32,
    },
  });
  const totalPages = Math.max(mainPages.length, railPages.length);

  // name fit (max two lines)
  const fullName = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  const { size: nameSize, l1: nameL1, l2: nameL2 } = fitName(fullName, nameBase, NAME_AREA_W);
  const clippedLocation = ellipsizeToWidth(stripHtml(locationText || ""), 12, NAME_AREA_W);

  return (
    <div style={{ background: "#f3f4f6", padding: 12, borderRadius: 8 }}>
      {Array.from({ length: totalPages }).map((_, i) => {
        const isFirst = i === 0;
        const pageTop = isFirst ? BODY_TOP : MARGIN;

        return (
          <div
            key={`prof-wrap-${i}`}
            style={{
              margin: "0 auto 18px",
              maxWidth: width,
              filter: "drop-shadow(0 2px 6px rgba(0,0,0,.08))",
              borderRadius: 8,
            }}
          >
            <svg
              viewBox={`0 0 ${width} ${height}`}
              width={width}
              height={height}
              xmlns="http://www.w3.org/2000/svg"
              style={{ background: "#fff", display: "block" }}
            >
              {/* page bg */}
              <R x={0} y={0} w={width} h={height} fill="#ffffff" rx={8} />

              {/* ===== Banner (page 1 only) ===== */}
              {isFirst && (
                <>
                  <R x={BANNER_X} y={BANNER_Y} w={BANNER_W} h={BANNER_H} fill={primary} rx={0} />

                  {/* photo strip */}
                  {photoUrl ? (
                    <>
                      <clipPath id="profPhotoClip">
                        <rect x={BANNER_X} y={BANNER_Y} width={PHOTO_W} height={BANNER_H} rx={0} />
                      </clipPath>
                      <image
                        href={photoUrl}
                        x={BANNER_X}
                        y={BANNER_Y}
                        width={PHOTO_W}
                        height={BANNER_H}
                        preserveAspectRatio="xMidYMid slice"
                        clipPath="url(#profPhotoClip)"
                      />
                    </>
                  ) : (
                    <R x={BANNER_X} y={BANNER_Y} w={PHOTO_W} h={BANNER_H} fill={primary} rx={0} />
                  )}

                  {/* clip area for banner text (prevents any bleed) */}
                  <clipPath id="bannerTextClip">
                    <rect
                      x={CONTENT_LEFT_X}
                      y={BANNER_Y + 8}
                      width={NAME_AREA_W}
                      height={BANNER_H - 16}
                      rx={0}
                    />
                  </clipPath>

                  <g clipPath="url(#bannerTextClip)">
                    {/* name (line 1 + optional line 2) */}
                    <T
                      x={CONTENT_LEFT_X}
                      y={BANNER_Y + 58}
                      size={nameSize}
                      color="#ffffff"
                      family={fontFamily}
                      weight={700}
                    >
                      {nameL1}
                    </T>
                    {Boolean(nameL2) && (
                      <T
                        x={CONTENT_LEFT_X}
                        y={BANNER_Y + 58 + nameSize + Math.max(8, Math.round(nameSize * 0.25))}
                        size={nameSize}
                        color="#ffffff"
                        family={fontFamily}
                        weight={700}
                      >
                        {nameL2}
                      </T>
                    )}

                    {/* location (ellipsized to fit) */}
                    {clippedLocation && (
                      <T
                        x={CONTENT_LEFT_X}
                        y={BANNER_Y + BANNER_H - 20}
                        size={12}
                        color="#cfd6de"
                        family={fontFamily}
                      >
                        {clippedLocation}
                      </T>
                    )}
                  </g>
                </>
              )}

              {/* vertical divider between columns */}
              <path
                d={`M ${DIV_X},${pageTop} L ${DIV_X},${height - MARGIN}`}
                stroke={railDiv}
                strokeWidth="1"
              />

              {/* columns */}
              <g>{mainPages[i]}</g>
              <g>{railPages[i]}</g>
            </svg>
          </div>
        );
      })}
    </div>
  );
}
