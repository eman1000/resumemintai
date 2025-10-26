// BuilderEditor.tsx
"use client";
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
// import TopBar from "./components/TopBar";
// import { exportSvgContainerToPdf } from "./components/A4Preview/exportSvgPdf";
import { toCircularProps } from "@/app/builder/components/cvwizard-adapter";
import { A4Preview } from "@/app/builder/components/A4Preview";
import Wysiwyg from "@/app/builder/components/Wysiwyg";
import LinkedInUrlModal from "@/app/builder/components/LinkedInUrlModal";
import TopBar from "@/app/builder/components/TopBar";
import { exportSvgContainerToPdf } from "@/app/builder/components/A4Preview/exportSvgPdf";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEllipsisVertical,
  faPen,
  faTag,
  faEye,
  faDownload,
  faTrash,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
import { LanguageCode, localizeDocTitles } from "@/lib/i18n";
import UploadSvg from "@/app/builder/components/UploadSvg";
import LinkedInIcon from "@/app/builder/components/LinkedInIcon";
/* =======================
   Field catalog (PD)
======================= */
type FieldType = "text" | "date" | "textarea";

type PDFieldDef = {
  key: string;
  label: string;
  type: FieldType;
  default?: boolean; // shown by default
};

const PD_FIELD_CATALOG: PDFieldDef[] = [
  { key: "givenName", label: "Given name", type: "text", default: true },
  { key: "familyName", label: "Family name", type: "text", default: true },
  {
    key: "desiredJobPosition",
    label: "Desired job position",
    type: "text",
    default: true,
  },
  { key: "email", label: "Email address", type: "text", default: true },
  { key: "phone", label: "Phone number", type: "text", default: true },
  { key: "address", label: "Address", type: "text", default: true },
  { key: "postalCode", label: "Post code", type: "text" },
  { key: "city", label: "City", type: "text" },
  { key: "dateOfBirth", label: "Date of birth", type: "date" },
  { key: "placeOfBirth", label: "Place of birth", type: "text" },
  { key: "driversLicense", label: "Driver's license", type: "text" },
  { key: "gender", label: "Gender", type: "text" },
  { key: "nationality", label: "Nationality", type: "text" },
  { key: "civilStatus", label: "Civil status", type: "text" },
  { key: "website", label: "Website", type: "text" },
  { key: "linkedin", label: "LinkedIn", type: "text" },
];

/* =======================
   Types (editor side)
======================= */
export type CVSectionKey =
  | "personalDetails"
  | "profile"
  | "employment"
  | "educations"
  | "skills"
  | "languages"
  | "hobbies"
  | "qualities"
  | "courses"
  | "certificates"
  | "internships"
  | "sideActivities"
  | "achievements"
  | "references"
  | "signature"
  | "footer";

export interface CVField {
  key: string;
  role: string;
  fieldType?: string;
}
export interface CVRecord {
  key: string;
  values: any[];
}
export interface CVSection {
  key: CVSectionKey;
  title: string;
  fields: CVField[];
  records: CVRecord[];
  collapsible?: boolean;
  description?: string;
}
export interface CVDocument {
  id: string;
  sections: CVSection[];
}

/* ==========================================================
   Templates
========================================================== */
export const SAMPLE_TEMPLATES = [
  {
    id: "33c3ab26-06bb-466f-82f9-1a72c6fed814",
    name: "circular",
    documentType: "resume",
    renderer: "circular",
    isNew: false,
    isFree: false,
    isATSFriendly: false,
    defaultOptions: {
      colors: {
        primary: "#395a86",
        textColor: "black",
        backgroundColor: "#f5f7f9",
      },
      fontName: "Arial",
      showName: "both",
      colorSets: [
        { primary: "#395a86", textColor: "black", backgroundColor: "white" },
        { primary: "#304636", textColor: "black", backgroundColor: "white" },
        { primary: "#e49125", textColor: "black", backgroundColor: "#efefef" },
        { primary: "#931e99", textColor: "#eaeaea", backgroundColor: "#310035" },
        { primary: "#828282", textColor: "black", backgroundColor: "#d4d4d4" },
        { primary: "#641346", textColor: "black", backgroundColor: "white" },
      ],
      fontSizes: { text: 10, footer: 8, headline: 11, sectionHeader: 18 },
      sectionsLeft: "personalDetails,skills,languages,hobbies,qualities",
      fontSizeFactor: "m",
      derivableColors: {
        secondary: {
          type: "mix",
          mixColor: "backgroundColor",
          intensity: 0.95,
          originColor: "primary",
        },
        titleColor: {
          type: "constrast",
          color: "highlightColor",
          defaultColor: "white",
          fallbackColor: "black",
          readabilityThreshold: 2.2,
        },
        colorOffMain: {
          type: "copyWithShade",
          color: "backgroundColor",
          shade: 30,
          fallbackColor: "#f2f2f2",
          readabilityThreshold: 1.1,
        },
        highlightColor: { type: "copy", color: "primary" },
        headerTextColor: {
          type: "mix",
          mixColor: "backgroundColor",
          intensity: 0.2,
          originColor: "textColor",
        },
        colorOffLeftColumn: {
          type: "copyWithShade",
          color: "secondary",
          shade: 20,
          readabilityThreshold: 1.1,
        },
        leftColumnTextColor: {
          type: "constrast",
          color: "leftColumnBackgroundColor",
          defaultColor: "black",
          fallbackColor: "white",
          readabilityThreshold: 2.2,
        },
        leftColumnBackgroundColor: { type: "copy", color: "secondary" },
      },
      lineHeightFactor: 1.25,
      pageMarginsFactor: "m",
      sectionSpacingFactor: "m",
    },
    createdAt: "2023-04-21T00:00:00.000Z",
  },
  {
    id: "6b4e13bd-4f63-452b-98b9-36f8ab6a0bff",
    name: "professional",
    documentType: "resume",
    renderer: "professional",
    isNew: true,
    isFree: false,
    isATSFriendly: false,
    defaultOptions: {
      colors: {
        primary: "#303846",
        secondary: "#777777",
        textColor: "black",
        backgroundColor: "white",
      },
      fontName: "Poppins",
      showName: "title",
      colorSets: [
        {
          primary: "#303846",
          secondary: "#777777",
          textColor: "black",
          backgroundColor: "white",
        },
        {
          primary: "#304636",
          secondary: "#a1bf6c",
          textColor: "black",
          backgroundColor: "white",
        },
        {
          primary: "#e49125",
          secondary: "#4d4d4d",
          textColor: "black",
          backgroundColor: "#f7f7f7",
        },
        {
          primary: "#116858",
          secondary: "#11ae71",
          textColor: "black",
          backgroundColor: "#f1f1f1",
        },
        {
          primary: "#931e99",
          secondary: "#830d70",
          textColor: "black",
          backgroundColor: "white",
        },
        {
          primary: "#641346",
          secondary: "#830d2c",
          textColor: "black",
          backgroundColor: "#f2f2f2",
        },
      ],
      fontSizes: { text: 10, footer: 8, sectionHeader: 15 },
      sectionsRight: "personalDetails,skills,languages,hobbies,qualities",
      fontSizeFactor: "m",
      derivableColors: {
        highlightColor: { type: "copy", color: "primary" },
        headerTextColor: {
          type: "constrast",
          color: "backgroundColor",
          defaultColor: "black",
          fallbackColor: "white",
          readabilityThreshold: 1.85,
        },
        subheaderTextColor: { type: "copy", color: "secondary" },
        highlightTitleColor: {
          type: "constrast",
          color: "highlightColor",
          defaultColor: "white",
          fallbackColor: "black",
          readabilityThreshold: 1.85,
        },
        highlightSmallTextColor: {
          type: "copyWithShade",
          color: "primary",
          shade: 50,
          readabilityThreshold: 1.5,
        },
      },
      lineHeightFactor: 1.25,
      pageMarginsFactor: "m",
      sectionSpacingFactor: "m",
      hideBasicPersonalDetails: true,
      useDesiredJobPositionAsHeadline: false,
    },
    createdAt: "2023-04-21T00:00:00.000Z",
  },
  {
    id: "ff08288a-5fa0-499d-ba9d-4133cdd9293b",
    name: "elegant",
    documentType: "resume",
    renderer: "elegant",
    isNew: true,
    isFree: false,
    isATSFriendly: false,
    defaultOptions: {
      colors: {
        primary: "#99c7c7",
        secondary: "#282831",
        textColor: "black",
        backgroundColor: "white",
      },
      fontName: "Poppins",
      showName: "title",
      colorSets: [
        {
          primary: "#99c7c7",
          secondary: "#282831",
          textColor: "black",
          backgroundColor: "white",
        },
        {
          primary: "#e49125",
          secondary: "#875d10",
          textColor: "black",
          backgroundColor: "white",
        },
        {
          primary: "#116858",
          secondary: "#1d403a",
          textColor: "black",
          backgroundColor: "#f2f2f2",
        },
        {
          primary: "#931e99",
          secondary: "#560f5b",
          textColor: "black",
          backgroundColor: "white",
        },
        {
          primary: "#828282",
          secondary: "#4c4c4c",
          textColor: "black",
          backgroundColor: "#efefef",
        },
        {
          primary: "#2c376e",
          secondary: "#090030",
          textColor: "black",
          backgroundColor: "white",
        },
      ],
      fontSizes: { text: 10, footer: 8, sectionHeader: 12 },
      sectionsLeft: "personalDetails,skills,languages,hobbies,qualities",
      fontSizeFactor: "m",
      derivableColors: {
        subheader: {
          type: "mix",
          mixColor: "backgroundColor",
          intensity: 0.4,
          originColor: "textColor",
        },
        highlightColor: {
          type: "constrast",
          color: "highlightBackgroundColor",
          defaultColor: "white",
          fallbackColor: "black",
          readabilityThreshold: 1.85,
        },
        leftColumnColor: {
          type: "constrast",
          color: "leftColumnBackgroundColor",
          defaultColor: "white",
          fallbackColor: "black",
          readabilityThreshold: 1.85,
        },
        leftColumnSubheader: {
          type: "mix",
          mixColor: "leftColumnBackgroundColor",
          intensity: 0.4,
          originColor: "leftColumnColor",
        },
        highlightBackgroundColor: { type: "copy", color: "primary" },
        leftColumnBackgroundColor: { type: "copy", color: "secondary" },
        leftColumnHeaderTextColor: {
          type: "constrast",
          color: "leftColumnBackgroundColor",
          defaultColor: "#999999",
          fallbackColor: "black",
          readabilityThreshold: 1.85,
        },
      },
      lineHeightFactor: 1.25,
      pageMarginsFactor: "m",
      sectionSpacingFactor: "m",
    },
    createdAt: "2023-04-21T00:00:00.000Z",
  },
  {
    id: "0f365b95-63eb-4cfb-89f0-d82b1e0fe44f",
    name: "classic",
    documentType: "resume",
    renderer: "classic",
    isNew: false,
    isFree: false,
    isATSFriendly: false,
    defaultOptions: {
      colors: {
        primary: "#828282",
        secondary: "black",
        textColor: "black",
        backgroundColor: "white",
      },
      fontName: "Arial",
      showName: "personalDetails",
      colorSets: [
        {
          primary: "#828282",
          secondary: "black",
          textColor: "black",
          backgroundColor: "white",
        },
        {
          primary: "#304636",
          secondary: "#304636",
          textColor: "black",
          backgroundColor: "#fafffb",
        },
        {
          primary: "#e49125",
          secondary: "#aa6712",
          textColor: "black",
          backgroundColor: "#fffcf8",
        },
        {
          primary: "#931e99",
          secondary: "#5e0d63",
          textColor: "black",
          backgroundColor: "#fffaff",
        },
        {
          primary: "#00a6f9",
          secondary: "#0081c2",
          textColor: "black",
          backgroundColor: "#f7fbff",
        },
        {
          primary: "#4c4c4c",
          secondary: "#232323",
          textColor: "black",
          backgroundColor: "#838383",
        },
      ],
      fontSizes: { text: 10, footer: 8, headline: 11, sectionHeader: 15 },
      fontSizeFactor: "m",
      derivableColors: {
        titleColor: { type: "copy", color: "secondary" },
        highlightColor: { type: "copy", color: "primary" },
        headerTextColor: {
          type: "constrast",
          color: "primary",
          defaultColor: "white",
          fallbackColor: "black",
          readabilityThreshold: 1.85,
        },
        subHeaderTextColor: { type: "copy", color: "secondary" },
      },
      lineHeightFactor: 1.25,
      pageMarginsFactor: "m",
      sectionSpacingFactor: "m",
    },
    createdAt: "2023-04-21T00:00:00.000Z",
  },
];

/* =========================================
   Default editor content
========================================= */
type PDValues = {
  givenName?: string;
  familyName?: string;
  desiredJobPosition?: string;
  email?: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  website?: string;
  linkedin?: string;
  [customKey: string]: any;
};

const DEFAULT_SECTIONS: CVSection[] = [
  {
    key: "personalDetails",
    title: "Personal details",
    fields: [],
    records: [{ key: "pd-1", values: {} }],
    collapsible: true,
    description: "",
  },
  {
    key: "profile",
    title: "Profile",
    fields: [
      { key: "h", role: "header" },
      { key: "v", role: "richtextValue" },
    ],
    records: [{ key: "p1", values: ["", ""] }],
    collapsible: true,
    description: "",
  },
  {
    key: "employment",
    title: "Employment",
    fields: [
      { key: "h", role: "header" },
      { key: "sub", role: "subheader" },
      { key: "city", role: "city" },
      { key: "per", role: "period" },
      { key: "rich", role: "richtextValue" },
    ],
    records: [],
    collapsible: true,
    description: "",
  },
  {
    key: "educations",
    title: "Education",
    fields: [
      { key: "h", role: "header" },
      { key: "sub", role: "subheader" },
      { key: "city", role: "city" },
      { key: "per", role: "period" },
    ],
    records: [],
    collapsible: true,
    description: "",
  },
  {
    key: "skills",
    title: "Skills",
    fields: [
      { key: "h", role: "header" },
      { key: "lvl", role: "level" },
    ],
    records: [],
    collapsible: true,
    description: "",
  },
  {
    key: "languages",
    title: "Languages",
    fields: [
      { key: "h", role: "header" },
      { key: "lvl", role: "level" },
    ],
    records: [],
    collapsible: true,
    description: "",
  },
  {
    key: "signature",
    title: "Signature",
    fields: [],
    records: [],
    collapsible: true,
    description: "",
  },
  {
    key: "footer",
    title: "Footer",
    fields: [],
    records: [],
    collapsible: true,
    description: "",
  },
];

/* =================================================
   Converter: editor doc -> template data payload
================================================= */
type TemplateData = any;

function periodObjToText(p?: any): string | undefined {
  if (!p) return undefined;
  if (Array.isArray(p)) {
    const [a, b] = [p[0], p[1]];
    const s =
      typeof a === "string" ? a : [a?.month, a?.year].filter(Boolean).join(" ");
    const e =
      b == null
        ? ""
        : typeof b === "string"
        ? b
        : b?.present
        ? "Present"
        : [b?.month, b?.year].filter(Boolean).join(" ");
    return [s, e].filter(Boolean).join(" – ");
  }
  if (typeof p === "object") {
    const s = [p?.start?.month, p?.start?.year].filter(Boolean).join(" ");
    const e = p?.end?.present
      ? "Present"
      : [p?.end?.month, p?.end?.year].filter(Boolean).join(" ");
    return [s, e].filter(Boolean).join(" – ");
  }
  return String(p);
}

function isMeaningful(v: any) {
  if (v == null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (Array.isArray(v)) return v.some(isMeaningful);
  if (typeof v === "object") return Object.values(v).some(isMeaningful);
  return true;
}
function isNonEmptyRecord(rec: CVRecord, fields: CVField[]) {
  return fields.some((_, idx) => isMeaningful(rec.values?.[idx]));
}

function cvDocToTemplateData(doc: CVDocument): any {
  const data: any = {};

  // Personal details
  const pd = doc.sections.find((s) => s.key === "personalDetails");
  const pdMap = (pd?.records?.[0]?.values || {}) as PDValues;
  data.personalDetails = pdMap;

  const first = (pdMap.givenName || "").trim();
  const last = (pdMap.familyName || "").trim();
    data.personalDetailsTitle = pd?.title || "Personal details";

  data.title = [first, last].filter(Boolean).join(" ").trim() || "Your Name";
  data.photoUrl =
    pdMap.photoUrl || (pdMap.photo && (pdMap.photo.url || pdMap.photo));

  // Profile headline
  const prof = doc.sections.find((s) => s.key === "profile");
  const prec = prof?.records?.[0];
  const profileHeadline =
    (prec &&
      (prec.values?.[
        (prof?.fields || []).findIndex((f) => (f.role || f.key) === "header")
      ] ??
        "")) ||
    "";

  data.headline = (
    profileHeadline ||
    pdMap.desiredJobPosition ||
    pdMap.headline ||
    ""
  ).trim();

  data.emailaddress = (pdMap.email || "").trim();
  data.phonenumber = (pdMap.phone || "").trim();
  data.address = [
    (pdMap.address || "").trim(),
    (pdMap.city || "").trim(),
    (pdMap.postalCode || "").trim(),
  ].filter(Boolean);

  const links: string[] = [];
  if (pdMap.website) links.push(String(pdMap.website));
  if (pdMap.linkedin) links.push(String(pdMap.linkedin));
  if (links.length) data["/footer"] = links.join(" · ");

  // Signature + footer passthrough
  const sig = doc.sections.find((s) => s.key === "signature");
  if (sig?.records?.[0]?.values?.[0]) {
    data.signature = true;
    data["/signature"] = { data: String(sig.records[0].values[0]) };
  }
  const footer = doc.sections.find((s) => s.key === "footer");
  if (footer?.description && !data["/footer"]) data["/footer"] = footer.description;

  // Other sections
  data.sections = doc.sections
    .filter((s) => !["personalDetails", "signature", "footer"].includes(s.key))
    .map((s) => {
      const fields = s.fields || [];
      const roleIndex: Record<string, number> = {};
      fields.forEach((f, idx) => (roleIndex[f.role || f.key] = idx));

      const mapRecord = (rec: CVRecord) => {
        const obj: any = { fields: {} as Record<string, any> };
        fields.forEach((f, idx) => {
          const role = f.role || f.key;
          let v = rec.values?.[idx];
          if (role === "period") v = periodObjToText(v);
          obj.fields[role] = v;
        });
        return obj;
      };

      const cleanedRecords = (s.records || [])
        .filter((r) => isNonEmptyRecord(r, fields))
        .map(mapRecord);

      return {
        key: s.key,
        title: s.title,
        placeholder: computeDescriptionFromRecords({
          ...s,
          records: s.records || [],
        }),
        records: cleanedRecords,
      };
    });

  return data;
}

/* =========================================
   Small helpers for API integration
========================================= */
async function uploadResumeToApi(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/import", { method: "POST", body: fd });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(err || "Upload failed");
  }
  return res.json() as Promise<{ sections: CVSection[] }>;
}

async function importLinkedInJsonToApi(json: any) {
  const res = await fetch("/api/import-linkedin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(err || "LinkedIn import failed");
  }
  return res.json() as Promise<{ sections: CVSection[] }>;
}

/* ------------ helpers: records → description ------------ */
function htmlToText(html: string) {
  if (!html) return "";
  const txt = html
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  return txt.replace(/\n{3,}/g, "\n\n").trim();
}
function periodToText(per: any): string {
  if (Array.isArray(per)) return per.filter(Boolean).join(" – ");
  return per || "";
}
function computeDescriptionFromRecords(s: CVSection): string {
  const recs = s.records || [];
  if (!recs.length) return s.description || "";

  const roleIdx: Record<string, number> = {};
  (s.fields || []).forEach((f, i) => {
    roleIdx[f.role || f.key] = i;
  });

  switch (s.key) {
    case "profile": {
      const idx = roleIdx["richtextValue"] ?? roleIdx["value"] ?? 0;
      const val = recs[0]?.values?.[idx];
      return htmlToText(String(val || s.description || ""));
    }
    case "skills":
    case "languages": {
      const idx = roleIdx["header"] ?? 0;
      const items = recs
        .map((r) => r.values?.[idx])
        .filter(Boolean)
        .map(String);
      return items.length ? items.join(" · ") : s.description || "";
    }
    case "employment": {
      const lines: string[] = [];
      for (const r of recs) {
        const h = r.values?.[roleIdx["header"]] || "";
        const sub = r.values?.[roleIdx["subheader"]] || "";
        const per = r.values?.[roleIdx["period"]] || "";
        const rich = r.values?.[roleIdx["richtextValue"]] || "";
        const head = [h, sub].filter(Boolean).join(" — ");
        const perTxt = periodToText(per);
        const bullets = htmlToText(String(rich || ""))
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((b) => `• ${b}`);
        lines.push([head, perTxt && `(${perTxt})`].filter(Boolean).join(" "));
        if (bullets.length) lines.push(...bullets);
        lines.push("");
      }
      return lines.join("\n").trim();
    }
    case "educations": {
      const lines: string[] = [];
      for (const r of recs) {
        const deg = r.values?.[roleIdx["header"]] || "";
        const sch = r.values?.[roleIdx["subheader"]] || "";
        const per = periodToText(r.values?.[roleIdx["period"]] || "");
        lines.push(
          [deg, sch && `— ${sch}`, per && `(${per})`].filter(Boolean).join(" ")
        );
      }
      return lines.join("\n");
    }
    default: {
      const idx =
        roleIdx["richtextValue"] ?? roleIdx["value"] ?? roleIdx["header"] ?? 0;
      const bits = recs
        .map((r) => r.values?.[idx])
        .filter(Boolean)
        .map((v: any) => htmlToText(String(v)));
      return bits.join("\n\n") || s.description || "";
    }
  }
}

/* ================ Section merging ================ */
function mergeSections(current: CVSection[], incoming: CVSection[]): CVSection[] {
  const map = new Map(current.map((s) => [s.key, s]));

  for (const inc of incoming) {
    const prev = map.get(inc.key);
    if (!prev) {
      map.set(inc.key, { ...inc });
      continue;
    }
    map.set(inc.key, {
      ...prev,
      fields: inc.fields?.length ? inc.fields : prev.fields,
      records: inc.records ?? prev.records,
      title: prev.title, // keep manual title
    });
  }
  return Array.from(map.values());
}

/* =========================================================
   Utilities shared by the record editors
========================================================= */
type DateValue = { month?: string; year?: string; present?: boolean };
type PeriodValue =
  | [DateValue | string, DateValue | string]
  | string
  | undefined;

const MONTHS = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const SKILL_LEVELS = [
  "Beginner",
  "Moderate",
  "Good",
  "Very Good",
  "Excellent",
] as const;

/** Make a reasonably unique key for new records */
const newKey = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

/** Read/Write helpers for a record by role */
function getByRole(s: CVSection, r: CVRecord, role: string, fallbackIdx = 0) {
  const idx = (s.fields || []).findIndex((f) => (f.role || f.key) === role);
  return idx >= 0 ? r.values?.[idx] : r.values?.[fallbackIdx];
}
function setByRole(
  s: CVSection,
  r: CVRecord,
  role: string,
  value: any,
  fallbackIdx = 0
): CVRecord {
  const idx = (s.fields || []).findIndex((f) => (f.role || f.key) === role);
  const at = idx >= 0 ? idx : fallbackIdx;
  const next = [...(r.values || [])];
  next[at] = value;
  return { ...r, values: next };
}

/** Write records back to a section in doc state */
function updateSectionRecords(
  s: CVSection,
  updater: (old: CVRecord[]) => CVRecord[],
  setDoc: React.Dispatch<React.SetStateAction<CVDocument>>
) {
  setDoc((prev) => ({
    ...prev,
    sections: prev.sections.map((x) =>
      x.key === s.key ? { ...x, records: updater(x.records || []) } : x
    ),
  }));
}

/** Small date range widget used by many sections */
const DateRangeInputs: React.FC<{
  start?: DateValue;
  end?: DateValue;
  months: string[];
  onChange: (start: DateValue, end: DateValue) => void;
  t: (k: string, fb?: string) => string;
}> = ({ start = {}, end = {}, onChange, t, months }) => {
  const [present, setPresent] = React.useState<boolean>(!!end?.present);

  const setStart = (patch: Partial<DateValue>) =>
    onChange({ ...start, ...patch }, present ? { present: true } : end);
  const setEnd = (patch: Partial<DateValue>) =>
    onChange(start, present ? { present: true } : { ...end, ...patch });

  const monthPh = t("ui.monthPlaceholder", "Month");
  const yearPh = t("label.year", "Year");

  return (
    <div className="grid grid-cols-2 gap-3 items-end">
      <div>
        <label className="block text-xs text-gray-500">{t("label.startDate")}</label>
        <div className="flex gap-2">
          <select
            className="rounded border px-2 py-2 w-28"
            value={start.month || ""}
            onChange={(e) => setStart({ month: e.target.value })}
          >
            {months.map((m, idx) => (
              <option key={`${m}-${idx}`} value={m}>{m || monthPh}</option>
            ))}
          </select>
          <input
            className="rounded border px-2 py-2 w-24"
            placeholder={yearPh}
            value={start.year || ""}
            onChange={(e) => setStart({ year: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500">{t("label.endDate")}</label>
        <div className="flex gap-2 items-center">
          <select
            disabled={present}
            className="rounded border px-2 py-2 w-28"
            value={end.month || ""}
            onChange={(e) => setEnd({ month: e.target.value })}
          >
            {months.map((m, idx) => (
              <option key={`${m}-${idx}`} value={m}>{m || monthPh}</option>
            ))}
          </select>
          <input
            disabled={present}
            className="rounded border px-2 py-2 w-24"
            placeholder={yearPh}
            value={end.year || ""}
            onChange={(e) => setEnd({ year: e.target.value })}
          />
          <label className="ms-2 text-sm flex items-center gap-2 select-none">
            <input
              type="checkbox"
              checked={present}
              onChange={(e) => {
                const p = e.target.checked;
                setPresent(p);
                onChange(start, p ? { present: true } : end);
              }}
            />
            {t("label.present")}
          </label>
        </div>
      </div>
    </div>
  );
};


/** Display header for a record “chip” (collapsed card) */
const RecordHeaderLine: React.FC<{ title?: string; subtitle?: string }> = ({
  title,
  subtitle,
}) => (
  <div className="w-full p-3 border rounded-lg flex items-center justify-between bg-white">
    <div className="min-w-0">
      <div className="font-semibold truncate">{title || "—"}</div>
      {subtitle ? (
        <div className="text-sm text-gray-600 truncate">{subtitle}</div>
      ) : null}
    </div>
    <span className="text-gray-400">✎</span>
  </div>
);

/* =========================================================
   Per-section Editors
========================================================= */
const closeParentDetails = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
  e.stopPropagation();
  const d = e.currentTarget.closest("details") as HTMLDetailsElement | null;
  if (d) d.open = false;
};

const PersonalDetailsEditor: React.FC<{
  section: CVSection;
  onChange: (updater: (val: PDValues) => PDValues) => void;
  t: (k: string, fb?: string) => string;   // ⟵ add this
}> = ({ section, onChange, t }) => {
  const values = (section.records?.[0]?.values || {}) as PDValues;

  const TOP_ROW_KEYS = ["givenName", "familyName", "desiredJobPosition"] as const;

  const photoUrl = (values.photoUrl ||
    (values.photo && (values.photo.url || values.photo))) as string | undefined;
  const fileRef = React.useRef<HTMLInputElement>(null);

  const setPD = (key: string, v: any) =>
    onChange((prev) => ({ ...prev, [key]: v }));

  const handlePickPhoto = () => fileRef.current?.click();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setPD("photoUrl", dataUrl);
    };
    reader.readAsDataURL(f);
    e.currentTarget.value = "";
  };

  const clearPhoto = () => {
    onChange((prev) => {
      const next = { ...prev };
      delete next.photoUrl;
      if (typeof next.photo === "object") delete next.photo;
      else if (next.photo) delete next.photo;
      return next;
    });
  };

  const activeKeys = useMemo<string[]>(() => {
    const defaults = PD_FIELD_CATALOG.filter((f) => f.default).map((f) => f.key);
    const presentNonDefaults = Object.keys(values).filter(
      (k) => !defaults.includes(k) && k !== "photo" && k !== "photoUrl"
    );
    return [...defaults, ...presentNonDefaults];
  }, [values]);

  const remainingKeys = useMemo(
    () => activeKeys.filter((k) => !(TOP_ROW_KEYS as readonly string[]).includes(k)),
    [activeKeys]
  );

  const removeField = (key: string) => {
    onChange((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const addField = (key: string) => {
    if (values[key] !== undefined) return;
    onChange((prev) => ({ ...prev, [key]: "" }));
  };

  const addCustom = () => {
    const label = window.prompt(t("pd.custom", "Custom…") + " " + t("pd.addField", "Add a field"));
    if (!label) return;
    const key = label.trim().toLowerCase().replace(/\s+/g, "_");
    onChange((prev) => ({ ...prev, [key]: "" }));
  };

  const palette = PD_FIELD_CATALOG
    .filter((f) => !activeKeys.includes(f.key))
    .filter((f) => !(TOP_ROW_KEYS as readonly string[]).includes(f.key));

  const set = (key: string, v: string) => setPD(key, v);

  // Helper to translate PD catalog labels by key if present
  const tl = (pdKey: string, fallback: string) => t(`pd.${pdKey}`, fallback);

  return (
    <div className="space-y-4">
      {/* Photo row */}
      <div className="grid grid-cols-[120px_1fr] gap-4 items-start">
        <div className="flex flex-col items-start">
          <label className="block text-sm text-gray-700 mb-1">{t("pd.photo")}</label>

          <div
            className="w-[110px] h-[110px] rounded-md border border-blue-200 bg-white overflow-hidden flex items-center justify-center cursor-pointer relative"
            onClick={handlePickPhoto}
            title={photoUrl ? t("pd.changePhoto") : t("pd.upload")}
          >
            {photoUrl ? (
              <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-gray-500">{t("pd.upload")}</span>
            )}
            {photoUrl && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearPhoto();
                }}
                className="absolute top-1 right-1 bg-white/90 border rounded px-1 text-xs"
                title={t("pd.remove")}
              >
                ✕
              </button>
            )}
          </div>

          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
        </div>

        {/* First row fields */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm text-gray-700">{t("pd.givenName")}</label>
            <input
              className="w-full rounded border px-3 py-2"
              value={values.givenName || ""}
              onChange={(e) => set("givenName", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700">{t("pd.familyName")}</label>
            <input
              className="w-full rounded border px-3 py-2"
              value={values.familyName || ""}
              onChange={(e) => set("familyName", e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-gray-700">{t("pd.desiredJobPosition")}</label>
            <input
              className="w-full rounded border px-3 py-2"
              value={values.desiredJobPosition || ""}
              onChange={(e) => set("desiredJobPosition", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Remaining PD fields */}
      <div className="space-y-3">
        {remainingKeys.map((key) => {
          const def = PD_FIELD_CATALOG.find((d) => d.key === key) || {
            key,
            label: key,
            type: "text" as FieldType,
          };
          const val = values[key] ?? "";
          const label = tl(def.key, def.label);
          return (
            <div key={key} className="flex gap-2 items-center">
              <label className="w-44 text-sm text-gray-700">{label}</label>
              {def.type === "date" ? (
                <input
                  type="date"
                  className="flex-1 rounded border px-3 py-2"
                  value={val || ""}
                  onChange={(e) => set(key, e.target.value)}
                />
              ) : def.type === "textarea" ? (
                <textarea
                  className="flex-1 rounded border px-3 py-2"
                  value={val || ""}
                  onChange={(e) => set(key, e.target.value)}
                />
              ) : (
                <input
                  className="flex-1 rounded border px-3 py-2"
                  value={val || ""}
                  onChange={(e) => set(key, e.target.value)}
                />
              )}
              <button
                type="button"
                className="px-2 py-1 text-red-600 hover:bg-red-50 rounded border border-red-200"
                onClick={() => removeField(key)}
                title={t("pd.removeField")}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {/* PD palette */}
      <div className="pt-2">
        <div className="text-xs text-gray-500 mb-2">{t("pd.addField")}</div>
        <div className="flex flex-wrap gap-2">
          {palette.map((f) => (
            <button
              key={f.key}
              type="button"
              className="text-sm px-2 py-1 border rounded hover:bg-gray-50"
              onClick={() => addField(f.key)}
            >
              + {tl(f.key, f.label)}
            </button>
          ))}
          <button
            type="button"
            className="text-sm px-2 py-1 border rounded hover:bg-gray-50"
            onClick={addCustom}
          >
            + {t("pd.custom", "Custom…")}
          </button>
        </div>
      </div>
    </div>
  );
};


// EmploymentLikeEditor (i18n-ready)
const EmploymentLikeEditor: React.FC<{
  section: CVSection;
  setDoc: React.Dispatch<React.SetStateAction<CVDocument>>;
  labelPosition?: string;
  labelEmployer?: string;
  months: string[];
  skills: string[];
  t: (k: string, fb?: string) => string;
}> = ({
  section,
  setDoc,
  labelPosition = "Position",
  labelEmployer = "Employer",
  months,
  skills,
  t,
}) => {
  const fieldsReady = section.fields?.length
    ? section.fields
    : [
        { key: "h", role: "header" },
        { key: "sub", role: "subheader" },
        { key: "city", role: "city" },
        { key: "per", role: "period" },
        { key: "rich", role: "richtextValue" },
      ];

  React.useEffect(() => {
    setDoc((prev) => ({
      ...prev,
      sections: prev.sections.map((x) =>
        x.key === section.key ? { ...x, fields: fieldsReady } : x
      ),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s = React.useMemo(
    () => ({ ...section, fields: fieldsReady }),
    [section, fieldsReady]
  );

  const add = () =>
    updateSectionRecords(
      s,
      (old) => [...old, { key: newKey(s.key), values: ["", "", "", "", ""] }],
      setDoc
    );

  const setRec = (idx: number, rec: CVRecord) =>
    updateSectionRecords(
      s,
      (old) => old.map((r, i) => (i === idx ? rec : r)),
      setDoc
    );

  const remove = (idx: number) =>
    updateSectionRecords(s, (old) => old.filter((_, i) => i !== idx), setDoc);

  const closeDetails = (e: React.MouseEvent<HTMLButtonElement>) => {
    const details = e.currentTarget.closest("details") as HTMLDetailsElement | null;
    if (details) details.open = false;
  };

  // Localized labels with fallbacks to the provided props
  const posLabel = t("label.position", labelPosition);
  const empLabel = t("label.employer", labelEmployer);
  const cityLabel = t("label.city", "City");
  const descLabel = t("label.description", "Description");
  const deleteLabel = t("action.delete", "Delete");
  const doneLabel = t("action.done", "Done");
  const presentLabel = t("label.present", "Present");
  const untitledLabel = t("label.untitled", "(untitled)");

  const addBtnLabel =
    s.key === "employment"
      ? t("action.addEmployment", "+ Add employment")
      : s.key === "internships"
      ? t("action.addInternship", "+ Add internship")
      : t("action.addItem", "+ Add item");

  return (
    <div className="space-y-3">
      {(s.records || []).map((r, i) => {
        const header = String(getByRole(s, r, "header") || "");
        const sub = String(getByRole(s, r, "subheader") || "");
        const city = String(getByRole(s, r, "city") || "");
        const per = getByRole(s, r, "period") as PeriodValue;
        const start =
          Array.isArray(per) && typeof per[0] === "object" ? (per[0] as DateValue) : {};
        const end =
          Array.isArray(per) && typeof per[1] === "object" ? (per[1] as DateValue) : {};
        const rich = String(getByRole(s, r, "richtextValue") || "");

        return (
          <details key={r.key} className="rounded-lg border open:shadow-sm">
            <summary className="list-none cursor-pointer">
              <RecordHeaderLine
                title={header || t("ui.untitled", "(untitled)")}
                subtitle={[
                  [sub, city].filter(Boolean).join(", "),
                  (start?.month || start?.year) && "·",
                  start?.month,
                  start?.year,
                  "–",
                  end?.present ? t("label.present", "Present")
                              : [end?.month, end?.year].filter(Boolean).join(" "),
                ].filter(Boolean).join(" ")}
              />
            </summary>

            <div className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500">{posLabel}</label>
                  <input
                    className="w-full rounded border px-3 py-2"
                    value={header}
                    onChange={(e) => setRec(i, setByRole(s, r, "header", e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">{empLabel}</label>
                  <input
                    className="w-full rounded border px-3 py-2"
                    value={sub}
                    onChange={(e) => setRec(i, setByRole(s, r, "subheader", e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500">{t("label.city","City")}</label>
                <input
                  className="w-full rounded border px-3 py-2"
                  value={city}
                  onChange={(e) => setRec(i, setByRole(s, r, "city", e.target.value))}
                />
              </div>

              <DateRangeInputs
                start={start}
                end={end}
                onChange={(sDate, eDate) =>
                  setRec(i, setByRole(s, r, "period", [{ ...sDate }, { ...eDate }] as any))
                }
                months={months}
                t={t}
              />

              <div>
                <label className="block text-xs text-gray-500 mb-1">{t("label.description","Description")}</label>
                <Wysiwyg
                  value={rich}
                  onChange={(html) => setRec(i, setByRole(s, r, "richtextValue", html))}
                  placeholder={t("placeholder.startTyping","Start typing here…")}
                />
              </div>

              <div className="flex justify-between">
                <button
                  className="text-red-600 border border-red-200 px-3 py-1 rounded"
                  onClick={() => remove(i)}
                >
                  <FontAwesomeIcon icon={faTrash} fontSize={12} /> {deleteLabel}
                </button>
                <button type="button" className="border px-3 py-1 rounded" onClick={closeDetails}>
                  <FontAwesomeIcon icon={faCheck} fontSize={12} /> {doneLabel}
                </button>
              </div>
            </div>
          </details>
        );
      })}

      <button type="button" className="border rounded px-3 py-2" onClick={add}>
        {addBtnLabel}
      </button>
    </div>
  );
};


const FullscreenLoader: React.FC<{ label?: string }> = ({ label = "Working…" }) => (
  <div className="fixed inset-0 z-[9999] grid place-items-center bg-white/70 backdrop-blur-sm">
    <div className="flex flex-col items-center gap-3">
      <div className="h-10 w-10 rounded-full border-4 border-gray-300 border-t-transparent animate-spin" />
      <div className="text-sm text-gray-700">{label}</div>
    </div>
  </div>
);

// EducationEditor (i18n-ready)
const EducationEditor: React.FC<{
  section: CVSection;
  setDoc: React.Dispatch<React.SetStateAction<CVDocument>>;
  t: (key: string, fb?: string) => string;
  months: string[];
  skills: string[];
}> = ({ section, setDoc, t, months, skills }) => {
  useEffect(() => {
    const desired = [
      { key: "h", role: "header" },
      { key: "sub", role: "subheader" },
      { key: "city", role: "city" },
      { key: "per", role: "period" },
      { key: "rich", role: "richtextValue" },
    ];
    const have = section.fields || [];
    const haveRoles = new Set(have.map((f) => f.role || f.key));
    const needsPatch = desired.some((f) => !haveRoles.has(f.role));

    if (needsPatch || have.length !== desired.length) {
      setDoc((prev) => ({
        ...prev,
        sections: prev.sections.map((s) =>
          s.key === section.key ? { ...s, fields: desired } : s
        ),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const add = () =>
    updateSectionRecords(
      section,
      (old) => [...old, { key: newKey("edu"), values: ["", "", "", "", ""] }],
      setDoc
    );

  const setRec = (idx: number, rec: CVRecord) =>
    updateSectionRecords(
      section,
      (old) => old.map((r, i) => (i === idx ? rec : r)),
      setDoc
    );

  const remove = (idx: number) =>
    updateSectionRecords(section, (old) => old.filter((_, i) => i !== idx), setDoc);

  const collapseDetails = (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open");
  };

  const educationLabel = t("label.education", "Education");
  const schoolLabel = t("label.school", "School");
  const cityLabel = t("label.city", "City");
  const descLabel = t("label.description", "Description");
  const deleteLabel = t("action.delete", "Delete");
  const doneLabel = t("action.done", "Done");
  const presentLabel = t("label.present", "Present");
  const addEduLabel = t("action.addEducation", "+ Add education");
  const untitledLabel = t("label.untitled", "(untitled)");

  return (
    <div className="space-y-3">
      {(section.records || []).map((r, i) => {
        const degree = String(getByRole(section, r, "header", 0) || "");
        const school = String(getByRole(section, r, "subheader", 1) || "");
        const city = String(getByRole(section, r, "city", 2) || "");
        const per = getByRole(section, r, "period", 3) as PeriodValue;
        const start =
          Array.isArray(per) && typeof per[0] === "object" ? (per[0] as DateValue) : {};
        const end =
          Array.isArray(per) && typeof per[1] === "object" ? (per[1] as DateValue) : {};
        const rich = String(getByRole(section, r, "richtextValue", 4) || "");

        const subtitle = [school, city].filter(Boolean).join(", ");

        return (
          <details key={r.key} className="rounded-lg border open:shadow-sm" open>
            <summary className="list-none cursor-pointer">
              <RecordHeaderLine title={degree || t("ui.untitled","(untitled)")} subtitle={subtitle} />
            </summary>

            <div className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500">{t("label.education","Education")}</label>

                  <input
                    className="w-full rounded border px-3 py-2"
                    value={degree}
                    onChange={(e) =>
                      setRec(i, setByRole(section, r, "header", e.target.value, 0))
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">{t("label.school","School")}</label>

                  <input
                    className="w-full rounded border px-3 py-2"
                    value={school}
                    onChange={(e) =>
                      setRec(i, setByRole(section, r, "subheader", e.target.value, 1))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500">{t("label.city","City")}</label>

                  <input
                    className="w-full rounded border px-3 py-2"
                    value={city}
                    onChange={(e) => setRec(i, setByRole(section, r, "city", e.target.value, 2))}
                  />
                </div>
                <div />
              </div>

              <DateRangeInputs
                start={start}
                end={end}
                onChange={(s, e) =>
                  setRec(i, setByRole(section, r, "period", [{ ...s }, { ...e }] as any, 3))
                }
                months={months}
                t={(k, fb) => {
                  // Make sure "Present" is localized in the summary above via presentLabel,
                  // DateRangeInputs already uses label.startDate / label.endDate / label.present
                  return t(k, fb);
                }}
              />

              <div>
                <label className="block text-xs text-gray-500 mb-1">{t("label.description","Description")}</label>

                <Wysiwyg
                  value={rich}
                  onChange={(html) =>
                    setRec(i, setByRole(section, r, "richtextValue", html, 4))
                  }
                  placeholder={t("placeholder.startTyping","Start typing here…")}
                />
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  className="text-red-600 border border-red-200 px-3 py-1 rounded"
                  onClick={() => remove(i)}
                >
                  <FontAwesomeIcon icon={faTrash} fontSize={12} /> {t("action.delete","Delete")}
                </button>
                <button type="button" className="border px-3 py-1 rounded" onClick={collapseDetails}>
                  <FontAwesomeIcon icon={faCheck} fontSize={12} /> {t("action.done","Done")}
                </button>
              </div>
            </div>
          </details>
        );
      })}

      <button type="button" className="border rounded px-3 py-2" onClick={add}>
        {addEduLabel}
      </button>
    </div>
  );
};

// SkillsEditor (i18n-ready)
const SkillsEditor: React.FC<{
  section: CVSection;
  setDoc: React.Dispatch<React.SetStateAction<CVDocument>>;
  t: (k: string, fb?: string) => string;
  skills?: string[]; // localized levels (ordered)
}> = ({ section, setDoc, t, skills = ["Beginner","Moderate","Good","Very Good","Excellent"] }) => {
  const ensureFields = () =>
    section.fields?.length ? section.fields : [{ key: "h", role: "header" }, { key: "lvl", role: "level" }];

  React.useEffect(() => {
    const f = ensureFields();
    setDoc((prev) => ({
      ...prev,
      sections: prev.sections.map((x) => (x.key === section.key ? { ...x, fields: f } : x)),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s = React.useMemo(() => ({ ...section, fields: ensureFields() }), [section]);

  const add = () =>
    updateSectionRecords(s, (old) => [...old, { key: newKey("skill"), values: ["", ""] }], setDoc);

  const setRec = (idx: number, rec: CVRecord) =>
    updateSectionRecords(s, (old) => old.map((r, i) => (i === idx ? rec : r)), setDoc);

  const remove = (idx: number) => updateSectionRecords(s, (old) => old.filter((_, i) => i !== idx), setDoc);

  const skillLabel = t("label.skill", "Skill");
  const levelLabel = t("label.level", "Level");
  const makeChoice = t("ui.makeChoice", "Make a choice");
  const deleteLabel = t("action.delete", "Delete");
  const doneLabel = t("action.done", "Done");
  const addSkill = t("action.addSkill", "+ Add skill");
  const untitledSkill = t("label.skillUntitled", "(skill)");

  return (
    <div className="space-y-3">
      {(s.records || []).map((r, i) => {
        const name = String(getByRole(s, r, "header", 0) || "");
        const level = String(getByRole(s, r, "level", 1) || "");
        return (
          <details key={r.key} className="rounded-lg border open:shadow-sm">
            <summary className="list-none cursor-pointer">
              <RecordHeaderLine title={name || untitledSkill} subtitle={level} />
            </summary>
            <div className="p-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500">{skillLabel}</label>
                <input
                  className="w-full rounded border px-3 py-2"
                  value={name}
                  onChange={(e) => setRec(i, setByRole(s, r, "header", e.target.value, 0))}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">{levelLabel}</label>
                <select
                  className="w-full rounded border px-3 py-2"
                  value={level}
                  onChange={(e) => setRec(i, setByRole(s, r, "level", e.target.value, 1))}
                >
                  <option value="">{makeChoice}</option>
                  {skills.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2 flex justify-between">
                <button className="text-red-600 border border-red-200 px-3 py-1 rounded" onClick={() => remove(i)}>
                  <FontAwesomeIcon icon={faTrash} fontSize={12} /> {t("action.delete","Delete")}
                </button>
                <button type="button" className="border px-3 py-1 rounded" onClick={closeParentDetails}>
                  <FontAwesomeIcon icon={faCheck} fontSize={12} /> {t("action.done","Done")}
                </button>
              </div>
            </div>
          </details>
        );
      })}
      <button type="button" className="border rounded px-3 py-2" onClick={add}>
        {addSkill}
      </button>
    </div>
  );
};


// LanguagesEditor (i18n-ready)
const LANG_CHIPS = ["English", "Dutch", "German", "French", "Spanish", "Italian", "Portuguese"];
const LanguagesEditor: React.FC<{
  section: CVSection;
  setDoc: React.Dispatch<React.SetStateAction<CVDocument>>;
  t: (k: string, fb?: string) => string;
}> = ({ section, setDoc, t }) => {
  const ensureFields = () =>
    section.fields?.length ? section.fields : [{ key: "h", role: "header" }, { key: "lvl", role: "level" }];

  React.useEffect(() => {
    const f = ensureFields();
    setDoc((prev) => ({
      ...prev,
      sections: prev.sections.map((x) => (x.key === section.key ? { ...x, fields: f } : x)),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const add = (name = "") =>
    updateSectionRecords(section, (old) => [...old, { key: newKey("lang"), values: [name, ""] }], setDoc);

  const setRec = (idx: number, rec: CVRecord) =>
    updateSectionRecords(section, (old) => old.map((r, i) => (i === idx ? rec : r)), setDoc);

  const remove = (idx: number) => updateSectionRecords(section, (old) => old.filter((_, i) => i !== idx), setDoc);

  const languageLabel = t("label.language", "Language");
  const levelLabel = t("label.level", "Level");
  const makeChoice = t("ui.makeChoice", "Make a choice");
  const deleteLabel = t("action.delete", "Delete");
  const doneLabel = t("action.done", "Done");
  const quickAdd = t("chips.quickAdd", "Quick add");
  const addLanguage = t("action.addLanguage", "+ Add language");
  const untitledLanguage = t("label.languageUntitled", "(language)");

  const levelOptions = [
    t("level.basic", "Basic"),
    t("level.conversational", "Conversational"),
    t("level.fluent", "Fluent"),
    t("level.native", "Native"),
  ];

  // Localize chip names if you want later; leaving base list as-is for now.

  return (
    <div className="space-y-3">
      {(section.records || []).map((r, i) => {
        const name = String(getByRole(section, r, "header") || "");
        const level = String(getByRole(section, r, "level") || "");
        return (
          <details key={r.key} className="rounded-lg border open:shadow-sm">
            <summary className="list-none cursor-pointer">
              <RecordHeaderLine title={name || untitledLanguage} subtitle={level} />
            </summary>
            <div className="p-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500">{languageLabel}</label>
                <input
                  className="w-full rounded border px-3 py-2"
                  value={name}
                  onChange={(e) => setRec(i, setByRole(section, r, "header", e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">{levelLabel}</label>
                <select
                  className="w-full rounded border px-3 py-2"
                  value={level}
                  onChange={(e) => setRec(i, setByRole(section, r, "level", e.target.value))}
                >
                  <option value="">{makeChoice}</option>
                  {levelOptions.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2 flex justify-between">
                <button className="text-red-600 border border-red-200 px-3 py-1 rounded" onClick={() => remove(i)}>
                  <FontAwesomeIcon icon={faTrash} fontSize={12} /> {t("action.delete","Delete")}
                </button>
                <button type="button" className="border px-3 py-1 rounded" onClick={closeParentDetails}>
                  <FontAwesomeIcon icon={faCheck} fontSize={12} /> {t("action.done","Done")}
                </button>
              </div>
            </div>
          </details>
        );
      })}

      <div className="pt-2">
        <div className="text-xs text-gray-500 mb-2">{quickAdd}</div>
        <div className="flex flex-wrap gap-2">
          {LANG_CHIPS.map((n) => (
            <button key={n} type="button" className="px-3 py-1 rounded-full border" onClick={() => add(n)}>
              + {n}
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="border rounded px-3 py-2 mt-2" onClick={() => add("")}>
        {addLanguage}
      </button>
    </div>
  );
};


// HobbiesEditor (i18n-ready)
const HOBBY_CHIPS = ["Coding", "Traveling", "Photography", "Reading", "Hiking"];
const HobbiesEditor: React.FC<{
  section: CVSection;
  setDoc: React.Dispatch<React.SetStateAction<CVDocument>>;
  t: (k: string, fb?: string) => string;
}> = ({ section, setDoc, t }) => {
  const ensureFields = () => (section.fields?.length ? section.fields : [{ key: "h", role: "header" }]);

  React.useEffect(() => {
    const f = ensureFields();
    setDoc((prev) => ({
      ...prev,
      sections: prev.sections.map((x) => (x.key === section.key ? { ...x, fields: f } : x)),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const add = (name = "") =>
    updateSectionRecords(section, (old) => [...old, { key: newKey("hobby"), values: [name] }], setDoc);

  const setRec = (idx: number, rec: CVRecord) =>
    updateSectionRecords(section, (old) => old.map((r, i) => (i === idx ? rec : r)), setDoc);

  const remove = (idx: number) => updateSectionRecords(section, (old) => old.filter((_, i) => i !== idx), setDoc);

  const hobbyLabel = t("label.hobby", "Hobby");
  const deleteLabel = t("action.delete", "Delete");
  const doneLabel = t("action.done", "Done");
  const suggestions = t("chips.suggestions", "Suggestions");
  const addHobby = t("action.addHobby", "+ Add hobby");
  const untitledHobby = t("label.hobbyUntitled", "(hobby)");

  return (
    <div className="space-y-3">
      {(section.records || []).map((r, i) => {
        const name = String(getByRole(section, r, "header") || "");
        return (
          <details key={r.key} className="rounded-lg border open:shadow-sm">
            <summary className="list-none cursor-pointer">
              <RecordHeaderLine title={name || untitledHobby} />
            </summary>
            <div className="p-3 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-gray-500">{hobbyLabel}</label>
                <input
                  className="w-full rounded border px-3 py-2"
                  value={name}
                  onChange={(e) => setRec(i, setByRole(section, r, "header", e.target.value))}
                />
              </div>
              <div className="col-span-2 flex justify-between">
                <button className="text-red-600 border border-red-200 px-3 py-1 rounded" onClick={() => remove(i)}>
                  <FontAwesomeIcon icon={faTrash} fontSize={12} /> {t("action.delete","Delete")}
                </button>
                <button type="button" className="border px-3 py-1 rounded" onClick={closeParentDetails}>
                  <FontAwesomeIcon icon={faCheck} fontSize={12} /> {t("action.done","Done")}
                </button>
              </div>
            </div>
          </details>
        );
      })}
      <div className="pt-2">
        <div className="text-xs text-gray-500 mb-2">{suggestions}</div>
        <div className="flex flex-wrap gap-2">
          {HOBBY_CHIPS.map((n) => (
            <button key={n} type="button" className="px-3 py-1 rounded-full border" onClick={() => add(n)}>
              + {n}
            </button>
          ))}
        </div>
      </div>
      <button type="button" className="border rounded px-3 py-2 mt-2" onClick={() => add("")}>
        {addHobby}
      </button>
    </div>
  );
};


// CoursesEditor (i18n-ready)
const CoursesEditor: React.FC<{
  section: CVSection;
  setDoc: React.Dispatch<React.SetStateAction<CVDocument>>;
  months: string[];
  t: (k: string, fb?: string) => string;
}> = ({ section, setDoc, months, t }) => {
  const ensureFields = () =>
    section.fields?.length ? section.fields : [{ key: "h", role: "header" }, { key: "per", role: "period" }, { key: "rich", role: "richtextValue" }];

  React.useEffect(() => {
    const f = ensureFields();
    setDoc((prev) => ({
      ...prev,
      sections: prev.sections.map((x) => (x.key === section.key ? { ...x, fields: f } : x)),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const add = () =>
    updateSectionRecords(section, (old) => [...old, { key: newKey("course"), values: ["", "", ""] }], setDoc);

  const setRec = (idx: number, rec: CVRecord) =>
    updateSectionRecords(section, (old) => old.map((r, i) => (i === idx ? rec : r)), setDoc);

  const remove = (idx: number) => updateSectionRecords(section, (old) => old.filter((_, i) => i !== idx), setDoc);

  const courseLabel = t("label.course", "Course");
  const periodLabel = t("label.period", "Period");
  const descLabel = t("label.description", "Description");
  const deleteLabel = t("action.delete", "Delete");
  const doneLabel = t("action.done", "Done");
  const addCourse = t("action.addCourse", "+ Add course");
  const untitledCourse = t("label.courseUntitled", "(course)");

  return (
    <div className="space-y-3">
      {(section.records || []).map((r, i) => {
        const title = String(getByRole(section, r, "header") || "");
        const per = getByRole(section, r, "period") as PeriodValue;
        const start = Array.isArray(per) && typeof per[0] === "object" ? (per[0] as DateValue) : {};
        const end = Array.isArray(per) && typeof per[1] === "object" ? (per[1] as DateValue) : {};
        const rich = String(getByRole(section, r, "richtextValue") || "");

        return (
          <details key={r.key} className="rounded-lg border open:shadow-sm">
            <summary className="list-none cursor-pointer">
              <RecordHeaderLine title={title || untitledCourse} />
            </summary>
            <div className="p-3 space-y-3">
              <div>
                <label className="block text-xs text-gray-500">{courseLabel}</label>
                <input
                  className="w-full rounded border px-3 py-2"
                  value={title}
                  onChange={(e) => setRec(i, setByRole(section, r, "header", e.target.value))}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500">{periodLabel}</label>
                <DateRangeInputs
                  start={start}
                  end={end}
                  onChange={(s, e) => setRec(i, setByRole(section, r, "period", [{ ...s }, { ...e }] as any))}
                  months={months}
                  t={t}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">{descLabel}</label>
                <Wysiwyg
                  value={rich}
                  onChange={(html) => setRec(i, setByRole(section, r, "richtextValue", html))}
                  placeholder={t("placeholder.startTyping","Start typing here…")}
                />
              </div>

              <div className="flex justify-between">
                <button className="text-red-600 border border-red-200 px-3 py-1 rounded" onClick={() => remove(i)}>
                  🗑️ {deleteLabel}
                </button>
                <button type="button" className="border px-3 py-1 rounded" onClick={closeParentDetails}>
                  ✔︎ {doneLabel}
                </button>
              </div>
            </div>
          </details>
        );
      })}
      <button type="button" className="border rounded px-3 py-2" onClick={add}>
        {addCourse}
      </button>
    </div>
  );
};


const ProfileEditor: React.FC<{
  section: CVSection;
  setDoc: React.Dispatch<React.SetStateAction<CVDocument>>;
  t: (key: string, fb?: string) => string;
}> = ({ section, setDoc, t }) => {
  useEffect(() => {
    if (!section.fields?.length) {
      setDoc((prev) => ({
        ...prev,
        sections: prev.sections.map((x) =>
          x.key === section.key
            ? { ...x, fields: [{ key: "h", role: "header" }, { key: "v", role: "richtextValue" }] }
            : x
        ),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rec = section.records?.[0] || { key: "p1", values: ["", ""] };
  const header = String(getByRole(section, rec, "header") || "");
  const rich = String(getByRole(section, rec, "richtextValue") || "");

  const setRec = (next: CVRecord) =>
    updateSectionRecords(
      section,
      (old) => {
        const list = old?.length ? [...old] : [{ ...rec }];
        list[0] = next;
        return list;
      },
      setDoc
    );

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-500">
          {t("label.headlineOptional", "Headline (optional)")}
        </label>
        <input
          className="w-full rounded border px-3 py-2"
          placeholder={t("placeholder.profileHeadline", "Headline")}
          value={header}
          onChange={(e) => setRec(setByRole(section, rec, "header", e.target.value))}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">
          {t("label.description", "Description")}
        </label>
        <Wysiwyg
          value={rich}
          onChange={(html) => setRec(setByRole(section, rec, "richtextValue", html))}
          placeholder={t("placeholder.startTyping", "Start typing here…")}
        />
      </div>
    </div>
  );
};


const SectionBodyByKey: React.FC<{
  section: CVSection;
  setDoc: React.Dispatch<React.SetStateAction<CVDocument>>;
  onChangeDescription?: (text: string) => void;
  months?: string[];
  t?: (key: string, fb?: string) => string;
  skills?: string[];
}> = ({ section, setDoc, onChangeDescription, months, t, skills }) => {
  switch (section.key) {
    case "profile":
      return <ProfileEditor section={section} setDoc={setDoc} t={t} />;

    case "employment":
      return (
        <EmploymentLikeEditor
          section={section}
          setDoc={setDoc}
          labelPosition="Position"
          labelEmployer="Employer"
          months={months}
          t={t}
          skills={skills}
        />
      );

    case "internships":
      return (
        <EmploymentLikeEditor
          section={section}
          setDoc={setDoc}
          labelPosition="Position"
          labelEmployer="Employer"
          months={months}
          t={t}
          skills={skills}
        />
      );

    case "sideActivities":
      return (
        <EmploymentLikeEditor
          section={{ ...section, title: "Extracurricular activities" }}
          setDoc={setDoc}
          labelPosition="Position"
          labelEmployer="Employer"
          months={months}
          t={t}
          skills={skills}
        />
      );

    case "educations":
      return (
        <EducationEditor
          section={section}
          setDoc={setDoc}
          t={t}
          months={months}
          skills={skills ?? []}
        />
      );

    case "skills":
      return <SkillsEditor section={section} setDoc={setDoc} t={t}
          months={months}
          skills={skills ?? []}/>;

    case "languages":
      return <LanguagesEditor section={section} setDoc={setDoc} t={t}
          months={months}
          skills={skills ?? []}/>;

    case "hobbies":
      return <HobbiesEditor section={section} setDoc={setDoc}  t={t}
          months={months}
          skills={skills ?? []} />;

    case "courses":
      return (
        <CoursesEditor
          section={section}
          setDoc={setDoc}
          t={t}
          months={months}
        />
      );

    default:
      return (
        <>
          <label className="block text-xs text-gray-500">
            {t?.("label.description", "Description (optional)")}
          </label>
        </>
      );
  }
};


const SectionCardPatched: React.FC<{
  section: CVSection;
  onChangeTitle?: (title: string) => void;
  onChangeDescription?: (text: string) => void;
  onChangePD?: (updater: (val: PDValues) => PDValues) => void;
  setDoc: React.Dispatch<React.SetStateAction<CVDocument>>;
  months?: string[];
  t?: (key: string) => string;
  skills?: string[];
}> = ({ section, onChangeTitle, onChangeDescription, onChangePD, setDoc, months, t, skills }) => {
  const [open, setOpen] = useState(true);

  const updatePD = (updater: (val: PDValues) => PDValues) => {
    onChangePD?.(updater);
  };

  return (
    <div data-testid={section.key} className="w-full border-b border-gray-200 collapsible-section">
      <div className="flex items-stretch w-full">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex-grow py-3 pe-6 text-start overflow-hidden rounded focus-visible:ring-4 ring-blue-200 ring-inset"
        >
          <h3 className={`text-xl truncate font-bold select-none ${open ? "text-gray-800" : "text-gray-400"}`}>
            {section.title}
          </h3>
        </button>
        <div className="py-3 flex whitespace-nowrap items-start gap-2">
          <button
            className="inline-flex border justify-center rounded relative overflow-hidden max-w-full focus-visible:ring-4 ring-blue-200 items-center bg-transparent text-gray-700 border-gray-400 hover:bg-blue-50 hover:border-blue-400 font-medium py-1 px-2"
            type="button"
            onClick={() => alert(`AI suggestion for ${section.key}`)}
          >
            ✨  {t?.("action.aiSuggestions")}
          </button>
        </div>
      </div>

      {open && (
        <div className="pb-4 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t?.("label.sectionTitle")}</label>
            <input
              className="w-full rounded border px-3 py-2"
              value={section.title}
              onChange={(e) => onChangeTitle?.(e.target.value)}
            />
          </div>

          {section.key === "personalDetails" ? (
            <PersonalDetailsEditor section={section} onChange={updatePD} t={t} />
          ) : (
            <SectionBodyByKey section={section} setDoc={setDoc as any} onChangeDescription={onChangeDescription} months={months} t={t} skills={skills} />
          )}
        </div>
      )}
    </div>
  );
};

/* =========================================
   MAIN COMPONENT
========================================= */
const DEFAULT_TITLES: Partial<Record<CVSectionKey, string>> = {
  personalDetails: "Personal details",
  profile: "Profile",
  employment: "Employment",
  educations: "Education",
  skills: "Skills",
  languages: "Languages",
  hobbies: "Hobbies",
  qualities: "Qualities",
  courses: "Courses",
  certificates: "Certificates",
  internships: "Internships",
  sideActivities: "Side activities",
  achievements: "Achievements",
  references: "References",
  signature: "Signature",
  footer: "Footer",
};

export type I18nPack = {
  t: (k: string, fb?: string) => string;
  lang: string;
  months: string[];       // months[0] === "" placeholder
  skillLevels: string[];  // ordered labels
};

export default function BuilderEditor({
  initialData,
  onChangeData,
  wrapRef,
  handleDownload,
  i18n,
  lang,
  renderer,
  onChangeRenderer,  
}: {
  initialData: any;
  onChangeData: (data: any) => void;
  wrapRef: React.RefObject<HTMLDivElement>;
  handleDownload: () => void;
  i18n: I18nPack;
  lang: LanguageCode;
  renderer?: string;
  onChangeRenderer?: (r: string) => void;

}) {
    const { t, months, skillLevels } = i18n;
const initialTplId = React.useMemo(
  () => SAMPLE_TEMPLATES.find(t => t.renderer === renderer)?.id ?? SAMPLE_TEMPLATES[0].id,
  [renderer]
);
const makeDefaultSections = React.useCallback(
  () =>
    DEFAULT_SECTIONS.map((s) => ({
      ...s,
      // use the i18n key as primary, fall back to the hardcoded English
      title: t?.(`section.${s.key}`, s.title) ?? s.title,
    })),
  [t]
);

const [doc, setDoc] = useState<CVDocument>(
  initialData && initialData.sections
    ? initialData
    : { id: "local", sections: makeDefaultSections() }
);


  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState<string>("");
  const [linkedinOpen, setLinkedinOpen] = useState(false);
  const [dateFormat, setDateFormat] = React.useState<"MMM YYYY" | "MM/YYYY">("MMM YYYY");
  const [language, setLanguage] = React.useState<"en-UK" | any>("en-UK");



const [activeTemplateId, setActiveTemplateId] = React.useState<string>(initialTplId);
  const tpl = useMemo(() => SAMPLE_TEMPLATES.find((t) => t.id === activeTemplateId)!, [activeTemplateId]);

  // Local editable options (so color pickers etc. don’t mutate constants)
  const [options, setOptions] = useState(tpl.defaultOptions);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState<boolean>(false);
  const prevLangRef = React.useRef<LanguageCode>(i18n.lang as any);

  const handleUploadClick = () => fileInputRef.current?.click();
React.useEffect(() => setActiveTemplateId(initialTplId), [initialTplId]);

  const withBusy = useCallback(async <T,>(label: string, work: () => Promise<T>) => {
    setBusyLabel(label);
    setBusy(true);
    try {
      return await work();
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  }, []);

  // // keep prevLangRef logic as-is for future language switches, but also:
  // React.useEffect(() => {
  //   setDoc((d) => localizeDocTitles(d, lang, "en"));
  //   prevLangRef.current = lang;
  // }, []); // only once


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await withBusy("Importing resume…", async () => {
      const payload = await uploadResumeToApi(file);
      setDoc((prev) => ({ ...prev, sections: mergeSections(prev.sections, payload.sections) }));
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const src = result.source.index;
    const dst = result.destination.index;
    setDoc((prev) => {
      const next = [...prev.sections];
      const [moved] = next.splice(src, 1);
      next.splice(dst, 0, moved);
      return { ...prev, sections: next };
    });
  }, []);

  useEffect(() => {
    setOptions(tpl.defaultOptions);
  }, [tpl]);

  const previewProps = useMemo(() => {
    const data = cvDocToTemplateData(doc);
    return toCircularProps(data, options);
  }, [doc, options]);

  const submitLinkedInUrl = React.useCallback(
    async (url: string) => {
      const res = await fetch("/api/import-linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error(await res.text());
      const payload = await res.json(); // { sections }
      setDoc((prev) => ({ ...prev, sections: mergeSections(prev.sections, payload.sections) }));
    },
    [setDoc]
  );



    useEffect(() => {
    onChangeData(doc);
  }, [doc, onChangeData]);

React.useEffect(() => {
  // If the doc was seeded in English, translate titles once on mount.
  setDoc((d) => localizeDocTitles(d, i18n.lang as LanguageCode, "en"));
  prevLangRef.current = lang as any;
}, []);


useEffect(() => {
  const prev = prevLangRef.current;
  const next = lang as LanguageCode;
  if (prev !== next) {
    setDoc((d) => localizeDocTitles(d, next, prev));
    prevLangRef.current = next;
  }
}, [lang]);

  return (
    <>


      <main className="min-h-screen bg-white text-gray-800">
        <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Controls + Sections */}
          <div>
            <div className="mb-4 flex gap-2 flex-wrap items-center">
              <button
                className="border rounded px-3 py-2 disabled:opacity-60"
                onClick={handleUploadClick}
                disabled={importing}
              >
                <UploadSvg /> Upload resume{importing ? "…" : ""}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept=".pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileUpload}
              />

              <button
                className="border rounded px-3 py-2 disabled:opacity-60"
                onClick={() => setLinkedinOpen(true)}
                disabled={importing}
              >
                <LinkedInIcon /> Import from LinkedIn
              </button>

              <div className="ms-auto flex gap-3 items-center">
                <label className="flex items-center gap-2 text-sm">
                  Primary color
                  <input
                    type="color"
                    value={(options as any)?.colors?.primary || "#303846"}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOptions((prev: any) => ({
                        ...prev,
                        colors: {
                          ...(prev?.colors || {}),
                          primary: val,
                        },
                      }));
                    }}
                  />
                </label>

                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={activeTemplateId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setActiveTemplateId(id);
                    const tpl = SAMPLE_TEMPLATES.find(t => t.id === id)!;
                    onChangeRenderer?.(tpl.renderer);  // ⬅️ this updates EditPageInner.renderer
                  }}
                >
                  {SAMPLE_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {(t.documentType?.toUpperCase?.() || "TEMPLATE") + " – " + t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="sections">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}>
                    {doc.sections.map((s, idx) => (
                      <Draggable key={s.key} draggableId={s.key} index={idx}>
                        {(dProvided, snapshot) => (
                          <div
                            ref={dProvided.innerRef}
                            {...dProvided.draggableProps}
                            className={`flex w-full items-center relative bg-white rounded-lg mb-1 draggable-section ${
                              snapshot.isDragging ? "ring-2 ring-blue-300" : ""
                            }`}
                          >
                            <div
                              {...dProvided.dragHandleProps}
                              className="p-3 cursor-grab select-none"
                              aria-label="Drag section"
                            >
                              ☰
                            </div>
                            <div className="w-full flex relative flex-col">
                              <SectionCardPatched
                                section={s}
                                setDoc={setDoc}
                                onChangeTitle={(title) =>
                                  setDoc((prev) => ({
                                    ...prev,
                                    sections: prev.sections.map((x) =>
                                      x.key === s.key ? { ...x, title } : x
                                    ),
                                  }))
                                }
                                onChangeDescription={(text) =>
                                  setDoc((prev) => ({
                                    ...prev,
                                    sections: prev.sections.map((x) =>
                                      x.key === s.key ? { ...x, description: text } : x
                                    ),
                                  }))
                                }
                                onChangePD={(updater) =>
                                  setDoc((prev) => ({
                                    ...prev,
                                    sections: prev.sections.map((x) =>
                                      x.key === "personalDetails"
                                        ? {
                                            ...x,
                                            records: [
                                              {
                                                key: x.records?.[0]?.key || "pd-1",
                                                values: updater((x.records?.[0]?.values || {}) as PDValues),
                                              },
                                            ],
                                          }
                                        : x
                                    ),
                                  }))
                                }
                                months={months}
                                t={t}
                                skills={skillLevels}
                              />
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>

          {/* RIGHT: Sticky A4 Live Preview */}
          <div className="lg:sticky lg:top-4 h-fit">
            <A4Preview
              props={previewProps}
              selectedTemplate={tpl}
              wrapRef={wrapRef}
              handleDownload={handleDownload}
            />
          </div>
        </div>

        {busy && <FullscreenLoader label={busyLabel} />}

        <LinkedInUrlModal
          open={linkedinOpen}
          onClose={() => setLinkedinOpen(false)}
          onSubmit={submitLinkedInUrl}
        />
      </main>
    </>
  );
};

