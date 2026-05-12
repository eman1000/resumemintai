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

export type CreativeProps = {
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

/* ------------------------------------------------------------------ */
/*  Creative Template Component                                        */
/*  Bold header, two-column asymmetric (65/35), colored sidebar        */
/* ------------------------------------------------------------------ */

export const CreativeTemplate: React.FC<CreativeProps> = (props) => {
  const {
    width = 595.28,
    height = 841.89,
    firstName, lastName, headline, photoUrl,
    railSections, mainSections,
    colors, fontFamily = "LiberationSans, Arial, sans-serif", sizes,
  } = props;

  const primary   = colors?.primary ?? "#395a86";
  const railBg    = colors?.railBg  ?? "#f0f4f8";
  const text      = colors?.text    ?? "#333333";
  const headerC   = colors?.header  ?? "#222222";
  const dividerC  = colors?.divider ?? "#d8d8d8";

  const bodySize       = sizes?.body ?? 10;
  const lineH          = sizes?.line ?? 18;
  const sectionSize    = sizes?.section ?? 13;
  const nameSize       = sizes?.heading ?? 22;
  const paraGap        = sizes?.paraGap ?? 8;
  const headerGap      = sizes?.headerGap ?? 4;
  const titleGap       = sizes?.titleGap ?? 10;
  const sectionGap     = sizes?.sectionGap ?? 16;
  const recordGap      = sizes?.recordGap ?? 6;
  const beforeTitlePad = sizes?.beforeTitlePad ?? 6;

  /* ---------- layout dimensions ---------- */

  const HEADER_H = 100;
  const SIDEBAR_W = Math.round(width * 0.35); // 35%
  const MAIN_W = width - SIDEBAR_W;
  const MARGIN_M = 20; // main margin
  const MARGIN_S = 15; // sidebar margin
  const PHOTO_R = 32;  // photo radius

  /* ---------- personal-details extraction ---------- */

  const pdSection = railSections.find(s => s.key === "personal details");
  const pdRecords = pdSection?.records ?? [];
  const contactItems = pdRecords.filter(r => r.header);

  /* ---------- header ---------- */

  const fullName = `${firstName} ${lastName}`.trim();
  const fittedName = fitTo(fullName, nameSize, MAIN_W - 80);

  /* ---------- sidebar sections (skills, languages, hobbies, personal details) ---------- */

  const sidebarSections: Section[] = [];
  for (const s of railSections) {
    if (s.key !== "personal details") sidebarSections.push(s);
  }

  /* ---------- main sections (profile, employment, education, etc.) ---------- */

  const mainContentSections: Section[] = [];
  const profIdx = mainSections.findIndex(s => s.key === "profile");
  if (profIdx >= 0) mainContentSections.push(mainSections[profIdx]);
  for (let i = 0; i < mainSections.length; i++) {
    if (i !== profIdx) mainContentSections.push(mainSections[i]);
  }

  /* ---------- pour main content ---------- */

  const mainFirstBox: Box = { x: MARGIN_M, y: HEADER_H + 16, w: MAIN_W - MARGIN_M * 2, h: height - HEADER_H - 46 };
  const mainFollowBox: Box = { x: MARGIN_M, y: 40, w: MAIN_W - MARGIN_M * 2, h: height - 70 };

  const mainStyle = {
    family: fontFamily, body: bodySize, line: lineH, section: sectionSize,
    primary, text, header: headerC, divider: dividerC,
  };

  const gaps = {
    para: paraGap, header: headerGap, title: titleGap,
    section: sectionGap, record: recordGap, beforeTitlePad,
  };

  const mainPages = pourSectionsPaged(mainFirstBox, mainFollowBox, mainContentSections, mainStyle, {
    bulletsForKeys: [],
    gaps,
  });

  /* ---------- pour sidebar content ---------- */

  const sideFirstBox: Box = {
    x: MAIN_W + MARGIN_S,
    y: HEADER_H + 16,
    w: SIDEBAR_W - MARGIN_S * 2,
    h: height - HEADER_H - 46,
  };
  const sideFollowBox: Box = {
    x: MAIN_W + MARGIN_S,
    y: 40,
    w: SIDEBAR_W - MARGIN_S * 2,
    h: height - 70,
  };

  const sideStyle = {
    ...mainStyle,
    section: sectionSize - 1,
  };

  const sidePages = pourSectionsPaged(sideFirstBox, sideFollowBox, sidebarSections, sideStyle, {
    rail: true,
    bulletsForKeys: [],
    gaps,
  });

  /* ---------- total pages ---------- */

  const totalPages = Math.max(mainPages.length, sidePages.length);

  /* ---------- render ---------- */

  return (
    <>
      {Array.from({ length: totalPages }, (_, i) => {
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

            {/* ---- Sidebar background (all pages) ---- */}
            <R x={MAIN_W} y={0} w={SIDEBAR_W} h={height} fill={railBg} />

            {isFirst ? (
              <>
                {/* ---- Bold header block ---- */}
                <R x={0} y={0} w={MAIN_W} h={HEADER_H} fill={primary} />
                {/* Extend header color into sidebar area as well */}
                <R x={MAIN_W} y={0} w={SIDEBAR_W} h={HEADER_H} fill={primary} />

                {/* ---- Photo circle (if available) ---- */}
                {photoUrl ? (
                  <>
                    <circle cx={MAIN_W - PHOTO_R - 20} cy={HEADER_H / 2} r={PHOTO_R + 2} fill="white" />
                    <clipPath id="creativePhotoClip">
                      <circle cx={MAIN_W - PHOTO_R - 20} cy={HEADER_H / 2} r={PHOTO_R} />
                    </clipPath>
                    <image
                      preserveAspectRatio="xMidYMid slice"
                      x={MAIN_W - PHOTO_R * 2 - 20}
                      y={HEADER_H / 2 - PHOTO_R}
                      width={PHOTO_R * 2}
                      height={PHOTO_R * 2}
                      href={photoUrl}
                      clipPath="url(#creativePhotoClip)"
                    />
                  </>
                ) : null}

                {/* ---- Name (white on primary) ---- */}
                <T
                  x={MARGIN_M} y={HEADER_H / 2 - 8}
                  size={fittedName} color="#ffffff" family={fontFamily}
                  weight={700}
                >
                  {fullName}
                </T>

                {/* ---- Headline ---- */}
                {headline ? (
                  <T
                    x={MARGIN_M} y={HEADER_H / 2 + 14}
                    size={bodySize + 1} color="rgba(255,255,255,0.85)" family={fontFamily}
                  >
                    {headline}
                  </T>
                ) : null}

                {/* ---- Contact details in the header right side / sidebar area ---- */}
                {contactItems.map((rec, idx) => {
                  const icon = pdIcon(rec);
                  const yPos = 28 + idx * (bodySize + 6);
                  return (
                    <g key={`hci-${idx}`}>
                      {icon && renderFAIcon(icon, MAIN_W + MARGIN_S, yPos - 9, 10, 10, "rgba(255,255,255,0.8)")}
                      <T
                        x={MAIN_W + MARGIN_S + 14} y={yPos}
                        size={bodySize * 0.85} color="rgba(255,255,255,0.9)" family={fontFamily}
                      >
                        {rec.header || ""}
                      </T>
                    </g>
                  );
                })}
              </>
            ) : null}

            {/* ---- Main content ---- */}
            <g>{mainPages[i]}</g>

            {/* ---- Sidebar content ---- */}
            <g>{sidePages[i]}</g>
          </svg>
        );
      })}
    </>
  );
};
