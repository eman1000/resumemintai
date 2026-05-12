import React from "react";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faEnvelope, faPhone, faGlobe, faMapMarkerAlt, faCalendarDays,
  faIdCard, faHeart, faUser, faLocationDot, faCaretRight
} from "@fortawesome/free-solid-svg-icons";
import { faLinkedin } from "@fortawesome/free-brands-svg-icons";
import {
  Box, R, T, wrapLines, pourSectionsPaged, approx,
  Section, RecordItem,
} from "@/lib/render-utils";

/* ------------------------------------------------------------------ */
/*  Re-export types for adapter compatibility                          */
/* ------------------------------------------------------------------ */

export type { RecordItem, Section } from "@/lib/render-utils";

export type MinimalProps = {
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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const titleCase = (s: string) =>
  String(s || "").replace(/[-_]/g, " ").replace(/\b\w/g, m => m.toUpperCase());

const fitTo = (text: string, base: number, maxW: number) => {
  let s = base;
  while (s > 10 && approx(text, s) > maxW) s -= 1;
  return s;
};

/* ------------------------------------------------------------------ */
/*  Minimal Template Component                                         */
/*  Maximum whitespace, very clean, left name / right contact          */
/* ------------------------------------------------------------------ */

export const MinimalTemplate: React.FC<MinimalProps> = (props) => {
  const {
    width = 595.28,
    height = 841.89,
    firstName, lastName, headline, photoUrl,
    railSections, mainSections,
    colors, fontFamily = "LiberationSans, Arial, sans-serif", sizes,
  } = props;

  const primary   = colors?.primary ?? "#395a86";
  const text      = colors?.text    ?? "#333333";
  const headerC   = colors?.header  ?? "#222222";
  const dividerC  = colors?.divider ?? "#e0e0e0";

  const bodySize       = sizes?.body ?? 10;
  const lineH          = sizes?.line ?? 18;
  const sectionSize    = sizes?.section ?? 13;
  const nameSize       = sizes?.heading ?? 20;
  const paraGap        = sizes?.paraGap ?? 8;
  const headerGap      = sizes?.headerGap ?? 4;
  const titleGap       = sizes?.titleGap ?? 10;
  const sectionGap     = sizes?.sectionGap ?? 16;
  const recordGap      = sizes?.recordGap ?? 6;
  const beforeTitlePad = sizes?.beforeTitlePad ?? 6;

  const MARGIN = 50;

  /* ---------- personal-details extraction ---------- */

  const pdSection = railSections.find(s => s.key === "personal details");
  const pdRecords = pdSection?.records ?? [];

  /* ---------- header ---------- */

  const fullName = `${firstName} ${lastName}`.trim();
  const fittedName = fitTo(fullName, nameSize, width / 2 - MARGIN);

  // Contact lines right-aligned in the header
  const contactLines = pdRecords.filter(r => r.header).map(r => r.header || "");

  const headerH = Math.max(70, 30 + contactLines.length * (bodySize + 4));

  /* ---------- content boxes ---------- */

  const contentY = headerH + 12;
  const contentBox: Box = { x: MARGIN, y: contentY, w: width - MARGIN * 2, h: height - contentY - 30 };
  const followBox: Box  = { x: MARGIN, y: 40, w: width - MARGIN * 2, h: height - 70 };

  /* ---------- merge all sections: single column ---------- */

  const allSections: Section[] = [];
  const profIdx = mainSections.findIndex(s => s.key === "profile");
  if (profIdx >= 0) allSections.push(mainSections[profIdx]);
  for (let i = 0; i < mainSections.length; i++) {
    if (i !== profIdx) allSections.push(mainSections[i]);
  }
  for (const s of railSections) {
    if (s.key !== "personal details") allSections.push(s);
  }

  const style = {
    family: fontFamily, body: bodySize, line: lineH, section: sectionSize,
    primary, text, header: headerC, divider: dividerC,
  };

  const gaps = {
    para: paraGap, header: headerGap, title: titleGap,
    section: sectionGap, record: recordGap, beforeTitlePad,
  };

  const mainPages = pourSectionsPaged(contentBox, followBox, allSections, style, {
    bulletsForKeys: [],
    gaps,
  });

  /* ---------- render ---------- */

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
            <R x={0} y={0} w={width} h={height} fill="white" />

            {isFirst ? (
              <>
                {/* ---- Name left-aligned ---- */}
                <T
                  x={MARGIN} y={38}
                  size={fittedName} color={headerC} family={fontFamily}
                  weight={700}
                >
                  {fullName}
                </T>

                {/* ---- Headline below name ---- */}
                {headline ? (
                  <T
                    x={MARGIN} y={54}
                    size={bodySize + 1} color={primary} family={fontFamily}
                  >
                    {headline}
                  </T>
                ) : null}

                {/* ---- Contact info right-aligned ---- */}
                {contactLines.map((cl, idx) => (
                  <T
                    key={`ci-${idx}`}
                    x={width - MARGIN} y={30 + idx * (bodySize + 5)}
                    size={bodySize * 0.9} color={text} family={fontFamily}
                    anchor="end"
                  >
                    {cl}
                  </T>
                ))}

                {/* ---- Thin gray divider ---- */}
                <R x={MARGIN} y={headerH} w={width - MARGIN * 2} h={0.75} fill={dividerC} />
              </>
            ) : null}

            {/* ---- Main content ---- */}
            <g>{content}</g>
          </svg>
        );
      })}
    </>
  );
};
