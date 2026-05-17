import React from "react";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faEnvelope, faPhone, faGlobe, faMapMarkerAlt, faCalendarDays,
  faIdCard, faHeart, faUser, faLocationDot, faCaretRight
} from "@fortawesome/free-solid-svg-icons";
import { faLinkedin } from "@fortawesome/free-brands-svg-icons";
import {
  Box, R, T, renderFAIcon, wrapLines, pourSectionsPaged, approx,
  Section, RecordItem,
} from "@/lib/render-utils";

/* ------------------------------------------------------------------ */
/*  Re-export types for adapter compatibility                          */
/* ------------------------------------------------------------------ */

export type { RecordItem, Section } from "@/lib/render-utils";

export type CompactProps = {
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
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

const ICONS: Record<string, IconDefinition> = {
  email: faEnvelope, phone: faPhone, globe: faGlobe, linkedin: faLinkedin,
  address: faLocationDot, city: faMapMarkerAlt, postal: faIdCard,
  dob: faCalendarDays, gender: faUser, nationality: faIdCard,
  license: faIdCard, marital: faHeart, link: faGlobe, generic: faCaretRight,
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

const pdIcon = (rec: RecordItem): IconDefinition | undefined => {
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
};

/* ------------------------------------------------------------------ */
/*  Compact Template Component                                         */
/*  Dense single-column, smaller fonts, two-column header, tags        */
/* ------------------------------------------------------------------ */

export const CompactTemplate: React.FC<CompactProps> = (props) => {
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
  const dividerC  = colors?.divider ?? "#d0d0d0";

  /* Compact: tighter defaults but respect the user's size choice — no caps. */
  const bodySize       = sizes?.body    ?? 9;
  const lineH          = sizes?.line    ?? 14;
  const sectionSize    = sizes?.section ?? 12;
  const nameSize       = sizes?.heading ?? 18;
  const paraGap        = 4;
  const headerGap      = 2;
  const titleGap       = 6;
  const sectionGap     = 10;
  const recordGap      = 3;
  const beforeTitlePad = 4;

  const MARGIN = 30;
  const COL_GAP = 20; // gap between left and right contact columns

  /* ---------- personal-details extraction ---------- */

  const pdSection = railSections.find(s => s.key === "personal details");
  const pdRecords = pdSection?.records ?? [];
  const contactItems = pdRecords.filter(r => r.header);

  /* ---------- header ---------- */

  const fullName = `${firstName} ${lastName}`.trim();
  const fittedName = fitTo(fullName, nameSize, width - MARGIN * 2);

  // Two-column contact layout
  const halfIdx = Math.ceil(contactItems.length / 2);
  const leftContact = contactItems.slice(0, halfIdx);
  const rightContact = contactItems.slice(halfIdx);
  const contactColW = (width - MARGIN * 2 - COL_GAP) / 2;

  const nameY = 28;
  const headlineY = headline ? 42 : 28;
  const contactStartY = (headline ? 52 : 42);
  const contactRows = Math.max(leftContact.length, rightContact.length);
  const contactH = contactRows * (bodySize + 4);
  const headerH = contactStartY + contactH + 8;

  /* ---------- content boxes ---------- */

  const contentY = headerH + 6;
  const contentBox: Box = { x: MARGIN, y: contentY, w: width - MARGIN * 2, h: height - contentY - 20 };
  const followBox: Box  = { x: MARGIN, y: 30, w: width - MARGIN * 2, h: height - 50 };

  /* ---------- merge all sections ---------- */

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
                {/* ---- Thin top accent line ---- */}
                <R x={0} y={0} w={width} h={2.5} fill={primary} />

                {/* ---- Name ---- */}
                <T
                  x={MARGIN} y={nameY}
                  size={fittedName} color={headerC} family={fontFamily}
                  weight={700}
                >
                  {fullName}
                </T>

                {/* ---- Headline ---- */}
                {headline ? (
                  <T
                    x={MARGIN} y={headlineY}
                    size={bodySize} color={primary} family={fontFamily}
                  >
                    {headline}
                  </T>
                ) : null}

                {/* ---- Two-column contact info ---- */}
                {leftContact.map((rec, idx) => {
                  const icon = pdIcon(rec);
                  const yPos = contactStartY + idx * (bodySize + 4);
                  return (
                    <g key={`lci-${idx}`}>
                      {icon && renderFAIcon(icon, MARGIN, yPos - 8, 8, 8, primary)}
                      <T
                        x={MARGIN + 12} y={yPos}
                        size={bodySize * 0.9} color={text} family={fontFamily}
                      >
                        {rec.header || ""}
                      </T>
                    </g>
                  );
                })}
                {rightContact.map((rec, idx) => {
                  const icon = pdIcon(rec);
                  const yPos = contactStartY + idx * (bodySize + 4);
                  const xStart = MARGIN + contactColW + COL_GAP;
                  return (
                    <g key={`rci-${idx}`}>
                      {icon && renderFAIcon(icon, xStart, yPos - 8, 8, 8, primary)}
                      <T
                        x={xStart + 12} y={yPos}
                        size={bodySize * 0.9} color={text} family={fontFamily}
                      >
                        {rec.header || ""}
                      </T>
                    </g>
                  );
                })}

                {/* ---- Divider below header ---- */}
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
