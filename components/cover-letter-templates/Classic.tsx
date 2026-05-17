// Classic cover letter template.
// Traditional business letter format: right-aligned sender block, recipient
// flush left, plain typography. Familiar to anyone who's ever written a formal
// letter. Maximum compatibility with ATS / printers / scanners.

import React from "react";
import type { CoverLetterTemplateProps } from "./types";

export default function Classic({
  data,
  primary = "#0f172a",
  fontFamily = '"Times New Roman", Times, "Georgia", serif',
}: CoverLetterTemplateProps) {
  return (
    <div
      style={{ fontFamily, color: "#1a1a1a", lineHeight: 1.6, fontSize: 11.5 }}
      className="h-full w-full bg-white p-12"
    >
      {/* Sender (right-aligned, traditional) */}
      <section className="text-right">
        {data.sender.fullName && (
          <div className="font-semibold" style={{ fontSize: 13 }}>
            {data.sender.fullName}
          </div>
        )}
        {data.sender.address && <div>{data.sender.address}</div>}
        {data.sender.city && <div>{data.sender.city}</div>}
        {data.sender.email && <div style={{ color: "#52525a" }}>{data.sender.email}</div>}
        {data.sender.phone && <div style={{ color: "#52525a" }}>{data.sender.phone}</div>}
      </section>

      {/* Date */}
      {data.date && <div className="mt-8">{data.date}</div>}

      {/* Recipient */}
      <section className="mt-6">
        {data.recipient.name && <div>{data.recipient.name}</div>}
        {data.recipient.title && <div>{data.recipient.title}</div>}
        {data.recipient.company && <div className="font-medium">{data.recipient.company}</div>}
        {data.recipient.address && <div>{data.recipient.address}</div>}
        {data.recipient.city && <div>{data.recipient.city}</div>}
      </section>

      {/* Subject */}
      {data.subject && (
        <div className="mt-8 font-semibold underline" style={{ textUnderlineOffset: 3 }}>
          Re: {data.subject}
        </div>
      )}

      {/* Salutation */}
      {data.salutation && <p className="mt-6">{data.salutation}</p>}

      {/* Body */}
      <div className="mt-2 space-y-3">
        {data.paragraphs.map((p, i) => (
          <p key={i} style={{ textAlign: "justify", textIndent: 0 }}>
            {p || <span className="italic" style={{ color: "#cbd5e1" }}>Empty paragraph</span>}
          </p>
        ))}
      </div>

      {/* Closing */}
      <div className="mt-8">
        {data.closing && <p>{data.closing}</p>}
        {data.signatureName && (
          <p className="mt-10 italic font-semibold" style={{ color: primary, fontSize: 13 }}>
            {data.signatureName}
          </p>
        )}
      </div>
    </div>
  );
}
