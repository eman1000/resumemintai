"use client";
import * as React from "react";
import { Box, pourSectionsPaged, R } from "@/lib/render-utils";


/* ========= minimal types (align with your other templates) ========= */
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

export type ClassicProps = {
  width?: number;
  height?: number;

  firstName: string;
  lastName: string;
  headline?: string;
  photoUrl?: string;

  railSections?: Section[];
  mainSections?: Section[];

  colors?: {
    primary?: string;  // (not used for bar; kept for parity)
    text?: string;
    header?: string;   // section bar & border color (classic gray)
    divider?: string;  // general thin dividers (inside records)
  };
  fontFamily?: string;
  sizes?: {
    body?: number;
    line?: number;
    section?: number;  // label font on the bar
    heading?: number;  // top title "Curriculum vitae"
    paraGap?: number;
    headerGap?: number;
    titleGap?: number;
    sectionGap?: number;
    recordGap?: number;
    beforeTitlePad?: number;
  };
};

// crude width estimate: characters × fontSize × 0.55
const approx = (s: string, px: number) => (s?.length || 0) * px * 0.55;

function splitNameToTwoLines(full: string, size: number, maxW: number): [string, string?] {
  const t = full.trim().replace(/\s+/g, " ");
  if (!t) return [""];
  if (approx(t, size) <= maxW) return [t];

  // try last-space split that keeps line 1 within maxW
  let best = -1;
  for (let i = 0; i < t.length; i++) {
    if (t[i] === " " && approx(t.slice(0, i), size) <= maxW) best = i;
  }
  if (best > 0) {
    const l1 = t.slice(0, best);
    const l2 = t.slice(best + 1);
    // if line 2 still too wide, hard-cut it
    if (approx(l2, size) <= maxW) return [l1, l2];
    const cut = Math.max(1, Math.floor(maxW / (size * 0.55)));
    return [l1, l2.slice(0, cut)];
  }

  // no spaces or very long first token: hard-cut line 1
  const cut = Math.max(1, Math.floor(maxW / (size * 0.55)));
  return [t.slice(0, cut), t.slice(cut)];
}

/** ========= CLASSIC (single column, titled bars + bordered sections) ========= */
export const ClassicTemplate: React.FC<ClassicProps> = (props) => {
  const {
    width = 595.28,
    height = 841.89,
    firstName,
    lastName,
    headline,
    photoUrl,
    railSections = [],
    mainSections = [],
    colors,
    fontFamily = "LiberationSans, Arial, sans-serif",
    sizes,
  } = props;

  // theme
  const primary = colors?.primary ?? "#395a86";
  const text    = colors?.text    ?? "black";
  const header  = "#000"; // bar + border color (classic gray)
  const divider = colors?.divider ?? "#e2e2e2";

  // sizes
  const bodySize    = sizes?.body ?? 11;
  const line        = sizes?.line ?? 18;
  const sectionSize = sizes?.section ?? 16.5; // section title on the gray bar
  const titleSize   = sizes?.heading ?? 25;   // big "Curriculum vitae"

  const paraGap     = sizes?.paraGap ?? 8;
  const headerGap   = sizes?.headerGap ?? 4;
  const titleGap    = sizes?.titleGap ?? 12;
  const sectionGap  = sizes?.sectionGap ?? 18;
  const recordGap   = sizes?.recordGap ?? 8;
  const beforeTitlePad = sizes?.beforeTitlePad ?? 6;

  // flow area (single column)

  const margin = 40;
  const firstY = 84.375; // matches your SVG positioning
  
  const hasPhoto = Boolean(photoUrl);

    // photo box
    const PHOTO_X = width - margin - 110;
    const PHOTO_Y = firstY + 10;
    const PHOTO_W = 100;
    const PHOTO_H = 100;

    // name + headline
    const NAME_X  = margin;
    const NAME_Y  = firstY + 40;
    const NAME_FS = 22;
    const HL_FS   = 12;

    // max width for name (left edge to left of photo, or to right margin if no photo)
    const NAME_MAX_RIGHT = hasPhoto ? (PHOTO_X - 12) : (width - margin);
    const NAME_MAX_W     = NAME_MAX_RIGHT - NAME_X;

    const fullName = `${firstName ?? ""} ${lastName ?? ""}`.trim();
    const [nameL1, nameL2] = splitNameToTwoLines(fullName, NAME_FS, NAME_MAX_W);

    
    const nameBottom     = NAME_Y + NAME_FS;
// vertical stacking
const nameLineGap = Math.max(6, Math.round(NAME_FS * 0.25));
const nameBlockBottom = nameL2
  ? (NAME_Y + NAME_FS + nameLineGap + NAME_FS)   // 2 lines
  : (NAME_Y + NAME_FS);                           // 1 line
const headlineBottom = headline ? (nameBlockBottom + 6 + HL_FS) : nameBlockBottom;
const photoBottom    = hasPhoto ? (PHOTO_Y + PHOTO_H) : 0;

    // start content below whichever is lower (name/headline/photo), plus a small gap
    const flowTop = Math.max(firstY, headlineBottom, photoBottom) + 12;


// flow boxes (make sure these replace any earlier firstY-based ones)
const flowBoxFirst: Box  = { x: margin, y: flowTop, w: width - margin * 2, h: height - flowTop - margin };
const flowBoxFollow: Box = { x: margin, y: margin,  w: width - margin * 2, h: height - margin - margin };
  // style passed into pourer
const style = {
  family: fontFamily,
  body: bodySize,
  line,
  section: sectionSize,
  primary,    // now safe for meta text
  text,       // body text stays stable
  header,     // bars/frames
  divider,    // thin rules
};

  // Merge rail + main; force Skills/Languages to the end (as in your sample)
  const norm = (s?: string) => (s || "").trim().toLowerCase();
  const merged = [...railSections, ...mainSections];
  const skills    = merged.filter(s => norm(s.key) === "skills");
  const languages = merged.filter(s => norm(s.key) === "languages");
  const rest      = merged.filter(s => !["skills", "languages"].includes(norm(s.key)));
  const allSections = [...rest, ...skills, ...languages];

  // Paged pour with classic bars + bordered sections
  // (These options are supported by your render-utils "classic" pourer.)
  const pages = pourSectionsPaged(
    flowBoxFirst,
    flowBoxFollow,
    allSections,
    style,
    {
      gaps: {
        para: paraGap,
        header: headerGap,
        title: titleGap,
        section: sectionGap,
        record: recordGap,
        beforeTitlePad,
      },
      // Draw the gray title bar for each section
      titleLabel: { bg: header, text: "#ffffff", padX: 5, padY: 3, rx: 0 },
      // Draw a subtle border around each section’s content block
      sectionFrame: { stroke: header, strokeWidth: 1 },
      // Classic is single-column; no per-record icons etc.
      mode: "classic",
    }
  );

  // Header title position
  const titleY = 55;

  // ===== Important: visible pagination gaps (wrapper + neutral background) =====
  return (
    <div style={{ background: "#eee", padding: 12, borderRadius: 8 }}>
      {pages.map((content, i) => {
        const isFirst = i === 0;

        return (
          <div
            key={`classic-wrap-${i}`}
            style={{
              margin: "0 auto 18px",
              maxWidth: width,
              filter: "drop-shadow(0 2px 6px rgba(0,0,0,.08))",
              borderRadius: 8,
              background: "#fff",
            }}
          >
            <svg
              viewBox={`0 0 ${width} ${height}`}
              width={width}
              height={height}
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: "block", borderRadius: 8, background: "#ffffff" }}
            >
              {/* page bg */}
              <R x={0} y={0} w={width} h={height} fill="#ffffff" />

              {/* header ONLY on first page */}
              {isFirst && (
                <>
                  {/* <path d={`M ${margin} ${flowTop - 8} H ${width - margin}`} stroke={divider} strokeWidth="1" /> */}

                  <text
                    x={width / 2}
                    y={titleY}
                    fontFamily={fontFamily}
                    fontSize={titleSize}
                    fill={text}
                    fontWeight={700}
                    textAnchor="middle"
                  >
                    Curriculum vitae
                  </text>

                  {/* name + optional headline */}
            {/* name */}
            <text x={NAME_X} y={NAME_Y}
              fontFamily={fontFamily} fontSize={NAME_FS} fill={text} fontWeight={700}>
              {nameL1}
            </text>

            { nameL2 && (
              <text x={NAME_X} y={NAME_Y + NAME_FS + nameLineGap}
                fontFamily={fontFamily} fontSize={NAME_FS} fill={text} fontWeight={700}>
                {nameL2}
              </text>
            )}
{/* headline */}
{ headline && (
  <text x={NAME_X}
    y={(nameL2 ? (NAME_Y + NAME_FS + nameLineGap + NAME_FS) : (NAME_Y + NAME_FS)) + 6}
    fontFamily={fontFamily} fontSize={HL_FS} fill={text}>
    {headline}
  </text>
)}

                  {/* optional photo at top-right (100 × 100) */}
                  {props.photoUrl ? (
                    <>
                    <clipPath id="classicPhotoClip">
  <rect x={PHOTO_X} y={PHOTO_Y} width={PHOTO_W} height={PHOTO_H} rx={6} />
</clipPath>
<R x={PHOTO_X} y={PHOTO_Y} w={PHOTO_W} h={PHOTO_H} fill="#FFFFFF" rx={6} stroke={divider} />
<image href={photoUrl} x={PHOTO_X} y={PHOTO_Y} width={PHOTO_W} height={PHOTO_H}
       preserveAspectRatio="xMidYMid slice" clipPath="url(#classicPhotoClip)" />

                    </>
                  ) : null}
                </>
              )}

              {/* flowed, paginated content with classic bars + borders */}
              <g>{content}</g>
            </svg>
          </div>
        );
      })}
    </div>
  );
};

export default ClassicTemplate;
