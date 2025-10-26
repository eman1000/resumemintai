"use client";
import * as React from "react";
import { Box, T, R, pourSectionsPaged, approx, Section } from "@/lib/render-utils";

/* ============ Props ============ */
export type ElegantProps = {
  width?: number;
  height?: number;

  firstName: string;
  lastName: string;
  locationText?: string;
  linkedinText?: string;
  photoUrl?: string;

  railSections: Section[];
  mainSections: Section[];

  colors?: {
  primary?: string;
  accent?: string;
  text?: string;
  header?: string;
  divider?: string;
  sidebar?: string; // ⬅️ Add this property
};
  fontFamily?: string;
  sizes?: {
    body?: number;
    line?: number;
    section?: number;
    name?: number;      // base for name fitter
  };
};

/* ============ helpers ============ */

function tint(hex: string, amt = 0.55) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const to = (n: number) => {
    const v = Math.round(255 * (1 - amt) + parseInt(h.slice(n, n + 2), 16) * amt);
    return v.toString(16).padStart(2, "0");
  };
  return `#${to(0)}${to(2)}${to(4)}`;
}

function fitTwoLines(full: string, base: number, maxW: number) {
  let size = Math.min(Math.max(base, 18), 36);
  let l1 = "", l2: string | undefined = undefined;

  const split = (t: string, sz: number) => {
    if (approx(t, sz) <= maxW) return [t];
    // last space split
    let best = -1;
    for (let i = 0; i < t.length; i++) if (t[i] === " " && approx(t.slice(0, i), sz) <= maxW) best = i;
    if (best > 0) return [t.slice(0, best), t.slice(best + 1)];
    const cut = Math.max(1, Math.floor(maxW / (sz * 0.55)));
    return [t.slice(0, cut), t.slice(cut)];
  };

  const text = full.trim().replace(/\s+/g, " ");
  if (!text) return { size, l1: "", l2: undefined };

  for (; size >= 16; size--) {
    const parts = split(text, size);
    const tooWide =
      approx(parts[0], size) > maxW ||
      (parts[1] ? approx(parts[1], size) > maxW : false);
    if (!tooWide) { l1 = parts[0]; l2 = parts[1]; break; }
  }
  return { size, l1, l2 };
}

/* ============ Component ============ */

export default function ElegantTemplate(props: ElegantProps) {
  const {
    width = 595.28,
    height = 841.89,

    firstName,
    lastName,
    locationText,
    linkedinText,
    photoUrl,

    railSections,
    mainSections,

    colors,
    fontFamily = "Poppins, Arial, sans-serif",
    sizes,
  } = props;

  // Theme
  const primary     = colors?.primary ?? "#395a86";          // user-picked “primary”
  const accent      = colors?.accent  ?? tint(primary, 0.55);
  const text        = colors?.text    ?? "#101418";
  const headerColor = colors?.header  ?? primary;
  const divider     = colors?.divider ?? "#e5e7eb";

  // Sizes
  const bodySize    = sizes?.body    ?? 10;
  const line        = sizes?.line    ?? 18;
  const sectionSize = sizes?.section ?? 16;
  const nameBase    = sizes?.name    ?? 24;

  // Layout
  const RAIL_W     = 200;
  const PAGE_PAD   = 30;

  // Frame/Banner
  const FRAME_X    = PAGE_PAD;
  const FRAME_Y    = PAGE_PAD;
  const FRAME_W    = width - PAGE_PAD * 2;
  const FRAME_H    = 160;

  const BANNER_X   = FRAME_X + 10;
  const BANNER_Y   = FRAME_Y + 10;
  const BANNER_W   = FRAME_W - 20;
  const BANNER_H   = FRAME_H - 20;

  // Photo
  const hasPhoto = Boolean(photoUrl);

  const PHOTO_X    = BANNER_X + 30;
  const PHOTO_Y    = BANNER_Y + 20;
  const PHOTO_S    = 100;

  // Name/Info
  const TEXT_INNER_LEFT = BANNER_X + 30;                          // padding when no photo
  const TEXT_X          = hasPhoto ? (PHOTO_X + PHOTO_S + 20) : TEXT_INNER_LEFT;
  const TEXT_W          = (BANNER_X + BANNER_W - 20) - TEXT_X;    // recompute width
  const NAME_Y          = BANNER_Y + 44;
  const INFO_Y1         = NAME_Y + 28;
  const INFO_Y2         = INFO_Y1 + 14;

  // Body top
  const BODY_TOP   = FRAME_Y + FRAME_H + 20;

  // Boxes
  const mainFirst : Box = { x: RAIL_W + 20, y: BODY_TOP, w: width - (RAIL_W + 20) - PAGE_PAD, h: height - BODY_TOP - PAGE_PAD };
  const mainFollow: Box = { x: RAIL_W + 20, y: PAGE_PAD,  w: width - (RAIL_W + 20) - PAGE_PAD, h: height - PAGE_PAD - PAGE_PAD };

  const railFirst : Box = { x: 40, y: BODY_TOP, w: RAIL_W - 80, h: height - BODY_TOP - PAGE_PAD };
  const railFollow: Box = { x: 40, y: PAGE_PAD,  w: RAIL_W - 80, h: height - PAGE_PAD - PAGE_PAD };

  // Shared style for pourer
  const styleMain = { family: fontFamily, body: bodySize, line, section: sectionSize, primary, text, header: headerColor, divider };
  const styleRail = { ...styleMain, text: "#ffffff", header: "#e6e6e6", divider: "rgba(255,255,255,.22)" };

  const gaps = { para: 8, header: 4, title: 12, section: 18, record: 8, beforeTitlePad: 6 };
const sidebar    = colors?.sidebar ?? "#000000";   // <-- rail bg, default black

  // Pour
  const mainPourOptions: any = {
    gaps,
    titleLabel: { bg: primary, text: "#ffffff", padX: 8, padY: 3, rx: 3 },
  };
  const railPourOptions: any = {
    gaps,
    titleLabel: { bg: primary, text: "#ffffff", padX: 8, padY: 3, rx: 3 },
  };

  const mainPages = pourSectionsPaged(
    mainFirst, mainFollow, mainSections, styleMain,
    mainPourOptions
  );
  const railPages = pourSectionsPaged(
    railFirst, railFollow, railSections, styleRail,
    railPourOptions
  );

  const total = Math.max(mainPages.length, railPages.length);

  // Name fitting
  const fullName = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  const { size: nameSize, l1: nameL1, l2: nameL2 } = fitTwoLines(fullName, nameBase, TEXT_W);

  return (
    <>
      {Array.from({ length: total }).map((_, i) => {
        const isFirst = i === 0;

        return (
          <svg
            key={`elegant-${i}`}
            viewBox={`0 0 ${width} ${height}`}
            width={width}
            height={height}
            xmlns="http://www.w3.org/2000/svg"
            style={{ background: "#fff", display: "block", marginBottom: 18 }}
          >
            {/* page background */}
            <R x={0} y={0} w={width} h={height} fill="#ffffff" />

            {/* left rail is **black** on all pages */}
            <R x={0} y={0} w={RAIL_W} h={height} fill="#000000" />

            {/* framed banner on page 1 */}
            {isFirst && (
              <>
                <R x={FRAME_X} y={FRAME_Y} w={FRAME_W} h={FRAME_H} fill="#ffffff" />
                <R x={BANNER_X} y={BANNER_Y} w={BANNER_W} h={BANNER_H} fill={accent} />

                {/* photo */}
                {photoUrl && (
                  <>
                    <clipPath id="elegantPhoto">
                      <path d={`M ${PHOTO_X + PHOTO_S/2},${PHOTO_Y}
                               C ${PHOTO_X + PHOTO_S*0.85},${PHOTO_Y} ${PHOTO_X + PHOTO_S},${PHOTO_Y + PHOTO_S*0.45} ${PHOTO_X + PHOTO_S},${PHOTO_Y + PHOTO_S/2}
                               C ${PHOTO_X + PHOTO_S},${PHOTO_Y + PHOTO_S*0.85} ${PHOTO_X + PHOTO_S*0.85},${PHOTO_Y + PHOTO_S} ${PHOTO_X + PHOTO_S/2},${PHOTO_Y + PHOTO_S}
                               C ${PHOTO_X + PHOTO_S*0.15},${PHOTO_Y + PHOTO_S} ${PHOTO_X},${PHOTO_Y + PHOTO_S*0.85} ${PHOTO_X},${PHOTO_Y + PHOTO_S/2}
                               C ${PHOTO_X},${PHOTO_Y + PHOTO_S*0.15} ${PHOTO_X + PHOTO_S*0.15},${PHOTO_Y} ${PHOTO_X + PHOTO_S/2},${PHOTO_Y} Z`} />
                    </clipPath>
                    <R x={PHOTO_X - 2} y={PHOTO_Y - 2} w={PHOTO_S + 4} h={PHOTO_S + 4} fill="#ffffff" rx={PHOTO_S/2 + 2} />
                    <image
                      href={photoUrl}
                      x={PHOTO_X}
                      y={PHOTO_Y}
                      width={PHOTO_S}
                      height={PHOTO_S}
                      preserveAspectRatio="xMidYMid slice"
                      clipPath="url(#elegantPhoto)"
                    />
                  </>
                )}

                {/* name & contact info */}
                <T x={TEXT_X} y={NAME_Y} size={nameSize} color="#ffffff" family={fontFamily} weight={700}>
                  {nameL1}
                </T>
                {nameL2 && (
                  <T x={TEXT_X} y={NAME_Y + nameSize + Math.max(6, Math.round(nameSize * 0.25))} size={nameSize} color="#ffffff" family={fontFamily} weight={700}>
                    {nameL2}
                  </T>
                )}
                {locationText && <T x={TEXT_X} y={INFO_Y1} size={9} color="#ffffff" family={fontFamily}>{locationText}</T>}
                {linkedinText && <T x={TEXT_X} y={INFO_Y2} size={9} color="#ffffff" family={fontFamily}>{linkedinText}</T>}
              </>
            )}

           

            {/* rail + main content */}
            <g>{railPages[i]}</g>
            <g>{mainPages[i]}</g>
          </svg>
        );
      })}
    </>
  );
}
