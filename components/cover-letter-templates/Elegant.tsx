// Elegant cover letter template (PRO).
// Two-column layout: a slim sidebar carries name + contact info on a tinted
// background, while the main column owns the letter body. The sidebar accent
// follows the theme primary; sidebar text auto-flips for contrast. Designed
// to read as a premium upgrade over the free templates.

import React from "react";
import type { CoverLetterTemplateProps } from "./types";

function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return 0.1;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
  return 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255);
}

export default function Elegant({
  data,
  primary = "#1f3a5f",
  fontFamily = '"Poppins", "Inter", system-ui, sans-serif',
}: CoverLetterTemplateProps) {
  const sidebarIsDark = luminance(primary) < 0.5;
  const sidebarText = sidebarIsDark ? "#ffffff" : "#0f172a";
  const sidebarSubtle = sidebarIsDark ? "rgba(255,255,255,0.78)" : "rgba(15,23,42,0.65)";
  const sidebarRule = sidebarIsDark ? "rgba(255,255,255,0.22)" : "rgba(15,23,42,0.14)";

  const sender = data.sender;
  const fullName = sender.fullName || "Your Name";

  return (
    <div
      style={{ fontFamily, color: "#1a1a1a" }}
      className="h-full w-full bg-white grid grid-cols-[34%_1fr] overflow-hidden"
    >
      {/* SIDEBAR */}
      <aside
        className="flex flex-col p-8"
        style={{ backgroundColor: primary, color: sidebarText, lineHeight: 1.5, fontSize: 11 }}
      >
        <div>
          <div className="uppercase tracking-[0.22em]" style={{ color: sidebarSubtle, fontSize: 10 }}>
            Application
          </div>
          <h1
            className="mt-3 leading-tight font-semibold"
            style={{ fontSize: 26, color: sidebarText, letterSpacing: -0.2 }}
          >
            {fullName}
          </h1>
        </div>

        <div className="mt-8 space-y-3 text-[10.5px]">
          {sender.email && <Item label="Email" value={sender.email} color={sidebarSubtle} text={sidebarText} />}
          {sender.phone && <Item label="Phone" value={sender.phone} color={sidebarSubtle} text={sidebarText} />}
          {(sender.city || sender.address) && (
            <Item
              label="Location"
              value={[sender.city, sender.address].filter(Boolean).join(", ")}
              color={sidebarSubtle}
              text={sidebarText}
            />
          )}
          {sender.linkedIn && <Item label="LinkedIn" value={sender.linkedIn} color={sidebarSubtle} text={sidebarText} />}
        </div>

        <div className="mt-auto pt-8" style={{ borderTop: `1px solid ${sidebarRule}` }}>
          {data.date && (
            <div style={{ color: sidebarSubtle, fontSize: 10, letterSpacing: 0.5 }}>
              {data.date}
            </div>
          )}
          {data.signatureName && (
            <div className="mt-3 font-semibold italic" style={{ fontSize: 13 }}>
              {data.signatureName}
            </div>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <main className="p-10" style={{ fontSize: 11.5, lineHeight: 1.65 }}>
        {/* Recipient */}
        <section className="text-[#52525a]">
          {data.recipient.name && <div className="font-medium text-[#1a1a1a]">{data.recipient.name}</div>}
          {data.recipient.title && <div>{data.recipient.title}</div>}
          {data.recipient.company && <div className="font-medium text-[#1a1a1a]">{data.recipient.company}</div>}
          {data.recipient.address && <div>{data.recipient.address}</div>}
          {data.recipient.city && <div>{data.recipient.city}</div>}
        </section>

        {/* Subject */}
        {data.subject && (
          <h2
            className="mt-6"
            style={{ color: primary, fontSize: 16, fontWeight: 600, letterSpacing: -0.1 }}
          >
            {data.subject}
          </h2>
        )}

        {/* Salutation */}
        {data.salutation && <p className="mt-5">{data.salutation}</p>}

        {/* Body */}
        <div className="mt-2 space-y-3">
          {data.paragraphs.map((p, i) => (
            <p key={i} style={{ textAlign: "justify" }}>
              {p || <span className="italic text-[#cbd5e1]">Empty paragraph</span>}
            </p>
          ))}
        </div>

        {/* Closing */}
        <div className="mt-8">
          {data.closing && <p>{data.closing}</p>}
          {data.signatureName && (
            <p className="mt-6 font-semibold" style={{ color: primary }}>
              {data.signatureName}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

function Item({ label, value, color, text }: { label: string; value: string; color: string; text: string }) {
  return (
    <div>
      <div className="uppercase tracking-wider" style={{ color, fontSize: 9 }}>
        {label}
      </div>
      <div className="mt-0.5 break-words" style={{ color: text }}>{value}</div>
    </div>
  );
}
