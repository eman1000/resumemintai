// Professional cover letter template.
// Clean serif headline + sans body. Top contact block, single column. A
// subtle accent rule sits under the name and under the subject line so the
// page never feels like a wall of text. Optimized for ATS-friendly print.

import React from "react";
import type { CoverLetterTemplateProps } from "./types";

export default function Professional({
  data,
  primary = "#1f2937",
  fontFamily = '"Inter", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
}: CoverLetterTemplateProps) {
  const fullName = data.sender.fullName || "Your Name";
  const contactLine = [
    data.sender.email,
    data.sender.phone,
    [data.sender.city, data.sender.address].filter(Boolean).join(", "),
    data.sender.linkedIn,
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <div
      style={{ fontFamily, color: "#111827", lineHeight: 1.55, fontSize: 11.5 }}
      className="h-full w-full bg-white p-12"
    >
      {/* Header */}
      <header className="pb-5" style={{ borderBottom: `2px solid ${primary}` }}>
        <h1
          style={{
            fontFamily: '"Source Serif Pro", "Georgia", serif',
            color: primary,
            fontSize: 28,
            letterSpacing: 0.2,
            fontWeight: 600,
            margin: 0,
          }}
        >
          {fullName}
        </h1>
        {contactLine && (
          <div className="mt-2 text-[10.5px] tracking-wide" style={{ color: "#52525a" }}>
            {contactLine}
          </div>
        )}
      </header>

      {/* Recipient + date */}
      <section className="mt-7 grid grid-cols-[1fr_auto] gap-6 items-start">
        <div className="space-y-0.5">
          {data.recipient.name && <div className="font-medium">{data.recipient.name}</div>}
          {data.recipient.title && <div style={{ color: "#52525a" }}>{data.recipient.title}</div>}
          {data.recipient.company && <div className="font-medium">{data.recipient.company}</div>}
          {data.recipient.address && <div style={{ color: "#52525a" }}>{data.recipient.address}</div>}
          {data.recipient.city && <div style={{ color: "#52525a" }}>{data.recipient.city}</div>}
        </div>
        {data.date && (
          <div className="text-right" style={{ color: "#52525a" }}>
            {data.date}
          </div>
        )}
      </section>

      {/* Subject */}
      {data.subject && (
        <section className="mt-7">
          <h2
            style={{
              fontFamily: '"Source Serif Pro", "Georgia", serif',
              color: primary,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {data.subject}
          </h2>
          <div style={{ height: 2, width: 36, backgroundColor: primary, marginTop: 6 }} />
        </section>
      )}

      {/* Salutation */}
      {data.salutation && (
        <p className="mt-6">{data.salutation}</p>
      )}

      {/* Body */}
      <div className="mt-3 space-y-3">
        {data.paragraphs.map((p, i) => (
          <p key={i} style={{ textAlign: "justify" }}>
            {p || <span className="italic" style={{ color: "#cbd5e1" }}>Empty paragraph</span>}
          </p>
        ))}
      </div>

      {/* Closing */}
      <div className="mt-8">
        {data.closing && <p>{data.closing}</p>}
        {data.signatureName && (
          <p className="mt-6 font-medium" style={{ color: primary }}>
            {data.signatureName}
          </p>
        )}
      </div>
    </div>
  );
}
