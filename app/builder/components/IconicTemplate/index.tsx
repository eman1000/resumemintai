"use client";

import * as React from "react";

// Same Section/RecordItem shape as the SVG templates (Classic, Elegant, etc.)
// so toCircularProps in cvwizard-adapter feeds it without changes.
type RecordItem = {
  header?: string;
  subheader?: string;
  period?: string;
  value?: string;
  richtextValue?: string;
  bullets?: string[];
  bulletsHtml?: string[];
  pdKey?: string;
  level?: string;
};
type Section = { key: string; title?: string; records?: RecordItem[] };

export type IconicProps = {
  width?: number;
  height?: number;
  firstName: string;
  lastName: string;
  headline?: string;
  locationText?: string;
  photoUrl?: string;
  railSections: Section[];
  mainSections: Section[];
  colors?: {
    primary?: string;
    text?: string;
  };
  fontFamily?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Template inspired by the Apple-Pages "Iconic" CV: left rail with caps section
// labels, right column with all the content, large right-aligned name header.
// Renders as HTML inside an A4-sized stage so client-side capture (img scale)
// and html-to-pdf (via /api/export/pdf) both work.
// ─────────────────────────────────────────────────────────────────────────────

export default function IconicTemplate(props: IconicProps) {
  const {
    firstName,
    lastName,
    headline,
    locationText,
    railSections = [],
    mainSections = [],
    colors,
    fontFamily = '"Helvetica Neue", Helvetica, Arial, sans-serif',
  } = props;

  const text = colors?.text ?? "#1d1d20";
  const labelColor = "#1d1d20";
  const meta = "#52525a";

  // Merge rail + main into a single ordered list of sections. The "rail"
  // sections in the editor (Personal details, Skills, Languages) become
  // labelled rows in the same flow — this template doesn't have a true rail.
  const sections: Section[] = pickRailFirst(railSections, mainSections);

  const fullName = `${firstName ?? ""} ${lastName ?? ""}`.trim();

  return (
    <div
      data-page
      style={{
        width: "210mm",
        minHeight: "297mm",
        background: "#ffffff",
        color: text,
        fontFamily,
        fontSize: 11,
        lineHeight: 1.45,
        padding: "18mm 16mm 16mm 16mm",
        boxSizing: "border-box",
      }}
    >
      {/* Header — right-aligned name + tagline + location */}
      <header style={{ textAlign: "right", marginBottom: 20 }}>
        <h1
          style={{
            margin: 0,
            fontWeight: 400,
            fontSize: 30,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            lineHeight: 1.1,
          }}
        >
          {fullName || "YOUR NAME"}
        </h1>
        {headline ? (
          <p style={{ margin: "6px 0 0", fontSize: 12, color: meta }}>{headline}</p>
        ) : null}
        {locationText ? (
          <p style={{ margin: "4px 0 0", fontSize: 11, color: meta }}>🌍 {locationText}</p>
        ) : null}
      </header>

      {/* Body — left rail with labels, right column with content */}
      {sections.map((s) => (
        <SectionRow key={s.key} section={s} labelColor={labelColor} meta={meta} text={text} />
      ))}
    </div>
  );
}

// Move "personal details / skills / languages / hobbies / qualities" to the
// top so the contact info shows up just after the header, like the PDF.
function pickRailFirst(rail: Section[], main: Section[]): Section[] {
  const order = ["personalDetails", "personal details", "skills", "languages", "hobbies", "qualities"];
  const isRailKey = (k: string) => order.includes(k.toLowerCase());
  const flat = [...rail, ...main];
  const rails = flat.filter((s) => isRailKey(String(s.key)));
  const others = flat.filter((s) => !isRailKey(String(s.key)));
  return [...rails, ...others];
}

function SectionRow({
  section,
  labelColor,
  meta,
  text,
}: {
  section: Section;
  labelColor: string;
  meta: string;
  text: string;
}) {
  const records = section.records || [];
  if (records.length === 0) return null;
  const title = (section.title || section.key).toUpperCase();

  return (
    <section style={{ display: "grid", gridTemplateColumns: "110px 1fr", columnGap: 20, marginTop: 18 }}>
      <div style={{ paddingTop: 2 }}>
        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: 0.5, color: labelColor }}>{title}</div>
      </div>
      <div>
        {records.map((rec, i) => (
          <Record key={i} sectionKey={String(section.key).toLowerCase()} rec={rec} meta={meta} text={text} />
        ))}
      </div>
    </section>
  );
}

function Record({
  sectionKey,
  rec,
  meta,
  text,
}: {
  sectionKey: string;
  rec: RecordItem;
  meta: string;
  text: string;
}) {
  // "personal details" → flat list of name/value or single-line entries.
  if (sectionKey === "personaldetails" || sectionKey === "personal details") {
    if (!rec.header) return null;
    return <div style={{ fontSize: 11, color: text, marginBottom: 2 }}>{rec.header}</div>;
  }

  if (sectionKey === "skills" || sectionKey === "languages") {
    if (!rec.header) return null;
    return (
      <div style={{ fontSize: 11, color: text, marginBottom: 2 }}>
        {rec.header}
        {rec.level ? <span style={{ color: meta }}> · {rec.level}</span> : null}
      </div>
    );
  }

  // Standard entry block — square marker, bold header, italic subhead, bullets.
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 8, lineHeight: 1, color: text }} aria-hidden>
          ■
        </span>
        <div style={{ flex: 1 }}>
          {rec.header ? (
            <div style={{ fontWeight: 700, fontSize: 11.5, color: text }}>{rec.header}</div>
          ) : null}
          {rec.subheader ? (
            <div style={{ fontStyle: "italic", fontSize: 11, color: meta, marginTop: 2 }}>{rec.subheader}</div>
          ) : null}
          {rec.period ? (
            <div style={{ fontStyle: "italic", fontSize: 10.5, color: meta, marginTop: 2 }}>{rec.period}</div>
          ) : null}
        </div>
      </div>

      <RichBody rec={rec} text={text} meta={meta} />
    </div>
  );
}

function RichBody({ rec, text, meta }: { rec: RecordItem; text: string; meta: string }) {
  // Bullets first (explicit array beats the rich-text fallback).
  if (rec.bullets && rec.bullets.length) {
    return (
      <ul style={{ margin: "6px 0 0 4px", paddingLeft: 18, color: text, fontSize: 11 }}>
        {rec.bullets.map((b, i) => (
          <li key={i} style={{ marginBottom: 3 }}>
            {b}
          </li>
        ))}
      </ul>
    );
  }
  if (rec.bulletsHtml && rec.bulletsHtml.length) {
    return (
      <ul style={{ margin: "6px 0 0 4px", paddingLeft: 18, color: text, fontSize: 11 }}>
        {rec.bulletsHtml.map((b, i) => (
          <li key={i} style={{ marginBottom: 3 }} dangerouslySetInnerHTML={{ __html: b }} />
        ))}
      </ul>
    );
  }
  if (rec.richtextValue) {
    return (
      <div
        style={{ marginTop: 6, color: text, fontSize: 11 }}
        dangerouslySetInnerHTML={{ __html: rec.richtextValue }}
      />
    );
  }
  if (rec.value) {
    return <div style={{ marginTop: 6, color: text, fontSize: 11 }}>{rec.value}</div>;
  }
  return null;
}
