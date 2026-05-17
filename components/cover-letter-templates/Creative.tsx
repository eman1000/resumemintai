// Creative cover letter template (PRO).
// Bold full-width header band with the candidate's name in oversized type and
// contact details laid out as inline chips. Body uses a generous left margin
// with a vertical accent line. Designed for design-forward roles where the
// letter itself is a portfolio piece.

import React from "react";
import type { CoverLetterTemplateProps } from "./types";

function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return 0.1;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
  return 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255);
}

function tint(hex: string, factor: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
  const mix = (c: number) => Math.round(c + (255 - c) * factor);
  return `#${[mix(r), mix(g), mix(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export default function Creative({
  data,
  primary = "#5b21b6",
  fontFamily = '"Inter", system-ui, -apple-system, sans-serif',
}: CoverLetterTemplateProps) {
  const headerIsDark = luminance(primary) < 0.5;
  const headerText = headerIsDark ? "#ffffff" : "#0f172a";
  const headerSubtle = headerIsDark ? "rgba(255,255,255,0.78)" : "rgba(15,23,42,0.65)";
  const chipBg = tint(primary, headerIsDark ? 0.18 : 0.85);
  const chipText = headerIsDark ? "#ffffff" : primary;

  const chips: { label: string; value: string }[] = [];
  if (data.sender.email) chips.push({ label: "✉", value: data.sender.email });
  if (data.sender.phone) chips.push({ label: "☎", value: data.sender.phone });
  if (data.sender.city) chips.push({ label: "◎", value: data.sender.city });
  if (data.sender.linkedIn) chips.push({ label: "in", value: data.sender.linkedIn });

  return (
    <div
      style={{ fontFamily, color: "#1a1a1a", fontSize: 11.5, lineHeight: 1.65 }}
      className="h-full w-full bg-white flex flex-col"
    >
      {/* HEADER BAND */}
      <header
        className="px-12 py-10"
        style={{ backgroundColor: primary, color: headerText }}
      >
        <div
          className="uppercase tracking-[0.3em]"
          style={{ color: headerSubtle, fontSize: 9.5 }}
        >
          {data.recipient.company ? `Application — ${data.recipient.company}` : "Application Letter"}
        </div>
        <h1
          className="mt-3 leading-[0.95] font-extrabold"
          style={{ fontSize: 44, letterSpacing: -1.2 }}
        >
          {data.sender.fullName || "Your Name"}
        </h1>

        {chips.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {chips.map((c, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
                style={{ backgroundColor: chipBg, color: chipText, fontSize: 10, fontWeight: 500 }}
              >
                <span aria-hidden="true" style={{ opacity: 0.85 }}>{c.label}</span>
                <span>{c.value}</span>
              </span>
            ))}
          </div>
        )}
      </header>

      {/* BODY */}
      <main className="flex-1 px-12 py-10">
        <section className="grid grid-cols-[1fr_auto] gap-6 items-start text-[#52525a]">
          <div>
            {data.recipient.name && <div className="text-[#1a1a1a] font-medium">{data.recipient.name}</div>}
            {data.recipient.title && <div>{data.recipient.title}</div>}
            {data.recipient.company && <div className="text-[#1a1a1a] font-medium">{data.recipient.company}</div>}
            {data.recipient.address && <div>{data.recipient.address}</div>}
            {data.recipient.city && <div>{data.recipient.city}</div>}
          </div>
          {data.date && <div className="text-right">{data.date}</div>}
        </section>

        {/* Subject + accent */}
        {data.subject && (
          <section className="mt-8 pl-4" style={{ borderLeft: `3px solid ${primary}` }}>
            <h2
              style={{
                color: primary,
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: -0.3,
                lineHeight: 1.25,
              }}
            >
              {data.subject}
            </h2>
          </section>
        )}

        {data.salutation && <p className="mt-7">{data.salutation}</p>}

        <div className="mt-2 space-y-3">
          {data.paragraphs.map((p, i) => (
            <p key={i} style={{ textAlign: "justify" }}>
              {p || <span className="italic text-[#cbd5e1]">Empty paragraph</span>}
            </p>
          ))}
        </div>

        <div className="mt-8">
          {data.closing && <p>{data.closing}</p>}
          {data.signatureName && (
            <p
              className="mt-6 font-bold"
              style={{ color: primary, fontSize: 16, letterSpacing: -0.2 }}
            >
              {data.signatureName}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
