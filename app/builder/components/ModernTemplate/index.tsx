import React from "react";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faEnvelope, faPhone, faGlobe, faMapMarkerAlt, faCalendarDays,
  faIdCard, faHeart, faUser, faLocationDot, faCaretRight
} from "@fortawesome/free-solid-svg-icons";
import { faLinkedin } from "@fortawesome/free-brands-svg-icons";
import {
  Box, breakLongToken, parseInlineHtml, R, renderFAIcon, Run, T,
  wrapLines, wrapRichLines, pourSectionsPaged, approx,
  Section, RecordItem,
} from "@/lib/render-utils";

/* ------------------------------------------------------------------ */
/*  Re-export types identical to CircularTemplate so the adapter works */
/* ------------------------------------------------------------------ */

export type { RecordItem, Section } from "@/lib/render-utils";

export type ModernProps = {
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
/*  Modern Template Component                                          */
/*  Clean design, centered header, timeline employment, progress bars  */
/* ------------------------------------------------------------------ */

export const ModernTemplate: React.FC<ModernProps> = (props) => {
  const {
    width = 595.28,
    height = 841.89,
    firstName, lastName, headline, photoUrl,
    railSections, mainSections,
    colors, fontFamily = "LiberationSans, Arial, sans-serif", sizes,
  } = props;

  const primary   = colors?.primary ?? "#395a86";
  const railBg    = colors?.railBg  ?? "#f5f7f9";
  const text      = colors?.text    ?? "#333333";
  const headerC   = colors?.header  ?? "#222222";
  const dividerC  = colors?.divider ?? "#d8d8d8";

  const bodySize       = sizes?.body ?? 10;
  const lineH          = sizes?.line ?? 18;
  const sectionSize    = sizes?.section ?? 14;
  const nameSize       = sizes?.heading ?? 22;
  const paraGap        = sizes?.paraGap ?? 8;
  const headerGap      = sizes?.headerGap ?? 4;
  const titleGap       = sizes?.titleGap ?? 10;
  const sectionGap     = sizes?.sectionGap ?? 16;
  const recordGap      = sizes?.recordGap ?? 6;
  const beforeTitlePad = sizes?.beforeTitlePad ?? 6;

  /* ---------- personal-details extraction ---------- */

  const pdSection = railSections.find(s => s.key === "personal details");
  const pdRecords = pdSection?.records ?? [];

  /* ---------- header geometry ---------- */

  const MARGIN = 40;
  const headerH = 90;
  const fullName = `${firstName} ${lastName}`.trim();
  const fittedName = fitTo(fullName, nameSize, width - MARGIN * 2);

  /* ---------- contact info row (icons + text, centered) ---------- */

  const contactItems = pdRecords.filter(r => r.header);
  const ICON_S = 10;
  const contactRowY = 68;

  // approximate total width for centering
  const itemWidths = contactItems.map(r => {
    const textW = approx(r.header || "", bodySize * 0.9);
    return ICON_S + 4 + textW + 16; // icon + gap + text + separator
  });
  const totalContactW = itemWidths.reduce((a, b) => a + b, 0) - 16; // no trailing separator
  const contactStartX = Math.max(MARGIN, (width - totalContactW) / 2);

  /* ---------- content boxes ---------- */

  const contentY = headerH + 16;
  const contentBox: Box = { x: MARGIN, y: contentY, w: width - MARGIN * 2, h: height - contentY - 30 };
  const followBox: Box  = { x: MARGIN, y: 40, w: width - MARGIN * 2, h: height - 70 };

  /* ---------- merge all sections for single-column layout ---------- */

  const allSections: Section[] = [];
  // profile first from mainSections
  const profIdx = mainSections.findIndex(s => s.key === "profile");
  if (profIdx >= 0) allSections.push(mainSections[profIdx]);
  // employment, education, etc. from main
  for (let i = 0; i < mainSections.length; i++) {
    if (i !== profIdx) allSections.push(mainSections[i]);
  }
  // then rail sections (skip personal details)
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
                {/* ---- Thin accent bar at very top ---- */}
                <R x={0} y={0} w={width} h={4} fill={primary} />

                {/* ---- Name centered ---- */}
                <T
                  x={width / 2} y={32}
                  size={fittedName} color={headerC} family={fontFamily}
                  weight={700} anchor="middle"
                >
                  {fullName}
                </T>

                {/* ---- Headline ---- */}
                {headline ? (
                  <T
                    x={width / 2} y={48}
                    size={bodySize + 1} color={primary} family={fontFamily}
                    weight={400} anchor="middle"
                  >
                    {headline}
                  </T>
                ) : null}

                {/* ---- Contact info row with icons ---- */}
                <g>
                  {(() => {
                    let cx = contactStartX;
                    return contactItems.map((rec, idx) => {
                      const icon = pdIcon(rec);
                      const txt = rec.header || "";
                      const textW = approx(txt, bodySize * 0.9);
                      const itemX = cx;
                      cx += ICON_S + 4 + textW + 16;
                      return (
                        <g key={`ci-${idx}`}>
                          {icon && renderFAIcon(icon, itemX, contactRowY - ICON_S + 1, ICON_S, ICON_S, primary)}
                          <T
                            x={itemX + ICON_S + 4} y={contactRowY}
                            size={bodySize * 0.9} color={text} family={fontFamily}
                          >
                            {txt}
                          </T>
                          {idx < contactItems.length - 1 ? (
                            <T
                              x={itemX + ICON_S + 4 + textW + 6} y={contactRowY}
                              size={bodySize * 0.9} color={dividerC} family={fontFamily}
                            >
                              |
                            </T>
                          ) : null}
                        </g>
                      );
                    });
                  })()}
                </g>

                {/* ---- Thin colored line below header ---- */}
                <R x={MARGIN} y={headerH} w={width - MARGIN * 2} h={1} fill={primary} />
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
