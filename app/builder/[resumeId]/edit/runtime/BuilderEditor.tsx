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
import toast from "react-hot-toast";
import FullscreenLoader from "@/app/builder/components/FullscreenLoader";
import ConfirmDialog from "@/components/ConfirmDialog";
import { MobilePreviewOverlay } from "@/app/builder/components/MobilePreviewOverlay";
import BottomToolbar from "@/app/builder/components/BottomToolbar";
import { RENDERERS as RESUME_RENDERERS } from "@/app/builder/components/A4Preview";


type AISuggestProfile = { kind: "profile"; headline?: string; summaryHtml?: string };
type AISuggestEmploymentBullets = { kind: "employment_bullets"; recordKey?: string; bullets: string[] };
type AISuggestSkills = { kind: "skills"; items: Array<{ name: string; level?: string }> };
type AISuggestLanguages = { kind: "languages"; items: Array<{ name: string; level?: string }> };
type AISuggestHobbies = { kind: "hobbies"; items: string[] };
type AISuggestGeneric = { kind: "generic_text"; html: string };

type AISuggestResponse =
  | AISuggestProfile
  | AISuggestEmploymentBullets
  | AISuggestSkills
  | AISuggestLanguages
  | AISuggestHobbies
  | AISuggestGeneric;

function fallbackSuggestionFor(section: CVSection): AISuggestResponse {
  switch (section.key) {
    case "profile":
      return { kind: "profile", headline: "Results-driven [Role]", summaryHtml: "<p>Add a concise summary highlighting 2–3 achievements and 3–5 keywords from the JD.</p>" };
    case "employment":
      return { kind: "employment_bullets", bullets: [
        "Delivered X by doing Y, resulting in Z.",
        "Improved A by B% via C.",
        "Collaborated with D to ship E ahead of schedule."
      ]};
    case "skills":
      return { kind: "skills", items: [{ name: "Stakeholder Management" }, { name: "SQL" }, { name: "React" }] };
    case "languages":
      return { kind: "languages", items: [{ name: "English", level: "Fluent" }] };
    case "hobbies":
      return { kind: "hobbies", items: ["Photography", "Trail running"] };
    default:
      return { kind: "generic_text", html: "<p>Suggested content for this section.</p>" };
  }
}
  
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


export const SAMPLE_TEMPLATES = [
  {
    id: "a2c4f1d6-0001-4000-8000-00000000ic01",
    name: "iconic",
    documentType: "resume",
    renderer: "iconic",
    isNew: true,
    isFree: true,
    isATSFriendly: true,
    defaultOptions: {
      colors: {
        primary: "#1d1d20",
        textColor: "#1d1d20",
        backgroundColor: "white",
      },
      fontName: "Roboto",
      showName: "both",
      colorSets: [
        { primary: "#1d1d20", textColor: "#1d1d20", backgroundColor: "white" },
        { primary: "#0a2d50", textColor: "#1d1d20", backgroundColor: "white" },
        { primary: "#1a4d3f", textColor: "#1d1d20", backgroundColor: "white" },
      ],
      fontSizes: { text: 11, footer: 9, sectionHeader: 11 },
      fontSizeFactor: "m",
      derivableColors: {
        highlightColor: { type: "copy", color: "primary" },
      },
      lineHeightFactor: 1.45,
      pageMarginsFactor: "m",
      sectionSpacingFactor: "m",
    },
    createdAt: "2026-05-20T00:00:00.000Z",
  },
  {
    id: "33c3ab26-06bb-466f-82f9-1a72c6fed814",
    name: "circular",
    documentType: "resume",
    renderer: "circular",
    isNew: false,
    isFree: true,
    isATSFriendly: false,
    defaultOptions: {
      colors: {
        primary: "#395a86",
        textColor: "black",
        backgroundColor: "#f5f7f9",
      },
      fontName: "Roboto",
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
    isFree: true,
    isATSFriendly: false,
    defaultOptions: {
      colors: {
        primary: "#303846",
        secondary: "#777777",
        textColor: "black",
        backgroundColor: "white",
      },
      fontName: "Roboto",
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
      fontName: "Roboto",
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
      fontName: "Roboto",
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
  {
    id: "a1b2c3d4-1111-4000-8000-000000000005",
    name: "modern",
    documentType: "resume",
    renderer: "modern",
    isNew: true,
    isFree: false,
    isATSFriendly: false,
    defaultOptions: {
      colors: {
        primary: "#2a72d7",
        secondary: "#64748b",
        textColor: "black",
        backgroundColor: "white",
      },
      fontName: "Roboto",
      showName: "title",
      colorSets: [
        { primary: "#2a72d7", secondary: "#64748b", textColor: "black", backgroundColor: "white" },
        { primary: "#0d9488", secondary: "#475569", textColor: "black", backgroundColor: "white" },
        { primary: "#dc2626", secondary: "#6b7280", textColor: "black", backgroundColor: "#fafafa" },
        { primary: "#7c3aed", secondary: "#4b5563", textColor: "black", backgroundColor: "white" },
        { primary: "#ea580c", secondary: "#57534e", textColor: "black", backgroundColor: "white" },
        { primary: "#0284c7", secondary: "#334155", textColor: "black", backgroundColor: "#f8fafc" },
      ],
      fontSizes: { text: 10, footer: 8, sectionHeader: 14 },
      fontSizeFactor: "m",
      derivableColors: {
        highlightColor: { type: "copy", color: "primary" },
        headerTextColor: { type: "copy", color: "secondary" },
      },
      lineHeightFactor: 1.25,
      pageMarginsFactor: "m",
      sectionSpacingFactor: "m",
    },
    createdAt: "2024-01-15T00:00:00.000Z",
  },
  {
    id: "a1b2c3d4-2222-4000-8000-000000000006",
    name: "minimal",
    documentType: "resume",
    renderer: "minimal",
    isNew: true,
    isFree: false,
    isATSFriendly: true,
    defaultOptions: {
      colors: {
        primary: "#111827",
        textColor: "#1f2937",
        backgroundColor: "white",
      },
      fontName: "Roboto",
      showName: "title",
      colorSets: [
        { primary: "#111827", textColor: "#1f2937", backgroundColor: "white" },
        { primary: "#1e3a5f", textColor: "#1f2937", backgroundColor: "white" },
        { primary: "#374151", textColor: "#374151", backgroundColor: "#fafafa" },
        { primary: "#065f46", textColor: "#1f2937", backgroundColor: "white" },
        { primary: "#7c2d12", textColor: "#1f2937", backgroundColor: "white" },
        { primary: "#4c1d95", textColor: "#1f2937", backgroundColor: "white" },
      ],
      fontSizes: { text: 10, footer: 8, sectionHeader: 13 },
      fontSizeFactor: "m",
      derivableColors: {
        highlightColor: { type: "copy", color: "primary" },
      },
      lineHeightFactor: 1.3,
      pageMarginsFactor: "m",
      sectionSpacingFactor: "m",
    },
    createdAt: "2024-01-15T00:00:00.000Z",
  },
  {
    id: "a1b2c3d4-3333-4000-8000-000000000007",
    name: "creative",
    documentType: "resume",
    renderer: "creative",
    isNew: true,
    isFree: false,
    isATSFriendly: false,
    defaultOptions: {
      colors: {
        primary: "#6366f1",
        secondary: "#818cf8",
        textColor: "black",
        backgroundColor: "white",
      },
      fontName: "Roboto",
      showName: "both",
      colorSets: [
        { primary: "#6366f1", secondary: "#818cf8", textColor: "black", backgroundColor: "white" },
        { primary: "#f43f5e", secondary: "#fb7185", textColor: "black", backgroundColor: "white" },
        { primary: "#0891b2", secondary: "#22d3ee", textColor: "black", backgroundColor: "white" },
        { primary: "#d97706", secondary: "#fbbf24", textColor: "black", backgroundColor: "white" },
        { primary: "#059669", secondary: "#34d399", textColor: "black", backgroundColor: "white" },
        { primary: "#7c3aed", secondary: "#a78bfa", textColor: "black", backgroundColor: "#faf5ff" },
      ],
      fontSizes: { text: 10, footer: 8, sectionHeader: 15 },
      fontSizeFactor: "m",
      derivableColors: {
        highlightColor: { type: "copy", color: "primary" },
        headerTextColor: {
          type: "constrast",
          color: "primary",
          defaultColor: "white",
          fallbackColor: "black",
          readabilityThreshold: 2.2,
        },
      },
      lineHeightFactor: 1.25,
      pageMarginsFactor: "m",
      sectionSpacingFactor: "m",
    },
    createdAt: "2024-01-15T00:00:00.000Z",
  },
  {
    id: "a1b2c3d4-4444-4000-8000-000000000008",
    name: "compact",
    documentType: "resume",
    renderer: "compact",
    isNew: true,
    isFree: false,
    isATSFriendly: true,
    defaultOptions: {
      colors: {
        primary: "#1e40af",
        secondary: "#6b7280",
        textColor: "black",
        backgroundColor: "white",
      },
      fontName: "Roboto",
      showName: "title",
      colorSets: [
        { primary: "#1e40af", secondary: "#6b7280", textColor: "black", backgroundColor: "white" },
        { primary: "#15803d", secondary: "#6b7280", textColor: "black", backgroundColor: "white" },
        { primary: "#b91c1c", secondary: "#6b7280", textColor: "black", backgroundColor: "white" },
        { primary: "#6d28d9", secondary: "#6b7280", textColor: "black", backgroundColor: "white" },
        { primary: "#0e7490", secondary: "#6b7280", textColor: "black", backgroundColor: "#f9fafb" },
        { primary: "#374151", secondary: "#9ca3af", textColor: "black", backgroundColor: "white" },
      ],
      fontSizes: { text: 9, footer: 7, sectionHeader: 12 },
      fontSizeFactor: "s",
      derivableColors: {
        highlightColor: { type: "copy", color: "primary" },
        headerTextColor: { type: "copy", color: "secondary" },
      },
      lineHeightFactor: 1.2,
      pageMarginsFactor: "s",
      sectionSpacingFactor: "s",
    },
    createdAt: "2024-01-15T00:00:00.000Z",
  },
  {
    id: "a1b2c3d4-5555-4000-8000-000000000009",
    name: "executive",
    documentType: "resume",
    renderer: "executive",
    isNew: true,
    isFree: false,
    isATSFriendly: false,
    defaultOptions: {
      colors: {
        primary: "#1a1a2e",
        secondary: "#8b7355",
        textColor: "black",
        backgroundColor: "white",
      },
      fontName: "Roboto",
      showName: "title",
      colorSets: [
        { primary: "#1a1a2e", secondary: "#8b7355", textColor: "black", backgroundColor: "white" },
        { primary: "#1b3a4b", secondary: "#8b7355", textColor: "black", backgroundColor: "#fefdfb" },
        { primary: "#2d2d2d", secondary: "#b8860b", textColor: "black", backgroundColor: "white" },
        { primary: "#1a1a2e", secondary: "#4a6741", textColor: "black", backgroundColor: "white" },
        { primary: "#3d0c11", secondary: "#8b4513", textColor: "black", backgroundColor: "#fffef9" },
        { primary: "#1a1a2e", secondary: "#555555", textColor: "black", backgroundColor: "white" },
      ],
      fontSizes: { text: 10, footer: 8, sectionHeader: 14 },
      fontSizeFactor: "m",
      derivableColors: {
        highlightColor: { type: "copy", color: "primary" },
        accentColor: { type: "copy", color: "secondary" },
      },
      lineHeightFactor: 1.3,
      pageMarginsFactor: "l",
      sectionSpacingFactor: "m",
    },
    createdAt: "2024-01-15T00:00:00.000Z",
  },
  {
    id: "a1b2c3d4-6666-4000-8000-000000000010",
    name: "chrono",
    documentType: "resume",
    renderer: "chrono",
    isNew: true,
    isFree: false,
    isATSFriendly: false,
    defaultOptions: {
      colors: {
        primary: "#2563eb",
        secondary: "#94a3b8",
        textColor: "black",
        backgroundColor: "white",
      },
      fontName: "Roboto",
      showName: "title",
      colorSets: [
        { primary: "#2563eb", secondary: "#94a3b8", textColor: "black", backgroundColor: "white" },
        { primary: "#059669", secondary: "#94a3b8", textColor: "black", backgroundColor: "white" },
        { primary: "#dc2626", secondary: "#94a3b8", textColor: "black", backgroundColor: "white" },
        { primary: "#7c3aed", secondary: "#94a3b8", textColor: "black", backgroundColor: "#faf5ff" },
        { primary: "#0891b2", secondary: "#94a3b8", textColor: "black", backgroundColor: "white" },
        { primary: "#374151", secondary: "#d1d5db", textColor: "black", backgroundColor: "white" },
      ],
      fontSizes: { text: 10, footer: 8, sectionHeader: 13 },
      fontSizeFactor: "m",
      derivableColors: {
        highlightColor: { type: "copy", color: "primary" },
        timelineColor: { type: "copy", color: "secondary" },
      },
      lineHeightFactor: 1.25,
      pageMarginsFactor: "m",
      sectionSpacingFactor: "m",
    },
    createdAt: "2024-01-15T00:00:00.000Z",
  },
  {
    id: "a1b2c3d4-7777-4000-8000-000000000011",
    name: "horizontal",
    documentType: "resume",
    renderer: "horizontal",
    isNew: true,
    isFree: false,
    isATSFriendly: true,
    defaultOptions: {
      colors: {
        primary: "#334155",
        secondary: "#64748b",
        textColor: "black",
        backgroundColor: "white",
      },
      fontName: "Roboto",
      showName: "title",
      colorSets: [
        { primary: "#334155", secondary: "#64748b", textColor: "black", backgroundColor: "white" },
        { primary: "#1e3a5f", secondary: "#3b82f6", textColor: "black", backgroundColor: "white" },
        { primary: "#14532d", secondary: "#22c55e", textColor: "black", backgroundColor: "white" },
        { primary: "#581c87", secondary: "#a855f7", textColor: "black", backgroundColor: "white" },
        { primary: "#7c2d12", secondary: "#f97316", textColor: "black", backgroundColor: "white" },
        { primary: "#1e293b", secondary: "#475569", textColor: "black", backgroundColor: "#f8fafc" },
      ],
      fontSizes: { text: 10, footer: 8, sectionHeader: 13 },
      fontSizeFactor: "m",
      derivableColors: {
        highlightColor: { type: "copy", color: "primary" },
        barColor: { type: "copy", color: "secondary" },
      },
      lineHeightFactor: 1.25,
      pageMarginsFactor: "m",
      sectionSpacingFactor: "m",
    },
    createdAt: "2024-01-15T00:00:00.000Z",
  },
  {
    id: "a1b2c3d4-8888-4000-8000-000000000012",
    name: "casual",
    documentType: "resume",
    renderer: "casual",
    isNew: true,
    isFree: false,
    isATSFriendly: false,
    defaultOptions: {
      colors: {
        primary: "#10b981",
        secondary: "#6ee7b7",
        textColor: "#1f2937",
        backgroundColor: "white",
      },
      fontName: "Roboto",
      showName: "both",
      colorSets: [
        { primary: "#10b981", secondary: "#6ee7b7", textColor: "#1f2937", backgroundColor: "white" },
        { primary: "#3b82f6", secondary: "#93c5fd", textColor: "#1f2937", backgroundColor: "white" },
        { primary: "#f59e0b", secondary: "#fcd34d", textColor: "#1f2937", backgroundColor: "white" },
        { primary: "#ef4444", secondary: "#fca5a5", textColor: "#1f2937", backgroundColor: "white" },
        { primary: "#8b5cf6", secondary: "#c4b5fd", textColor: "#1f2937", backgroundColor: "white" },
        { primary: "#06b6d4", secondary: "#67e8f9", textColor: "#1f2937", backgroundColor: "white" },
      ],
      fontSizes: { text: 10, footer: 8, sectionHeader: 14 },
      fontSizeFactor: "m",
      derivableColors: {
        highlightColor: { type: "copy", color: "primary" },
        cardColor: { type: "copy", color: "secondary" },
      },
      lineHeightFactor: 1.3,
      pageMarginsFactor: "m",
      sectionSpacingFactor: "m",
    },
    createdAt: "2024-01-15T00:00:00.000Z",
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


type TemplateData = any;

function FloatingPreviewButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        lg:hidden
        fixed bottom-4 right-4 z-40
        rounded-full
        px-5 py-3
        shadow-lg
        bg-blue-600 text-white
        border border-blue-700
        active:scale-[0.98]
      "
      style={{
        paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
      }}
    >
      👀 Preview
    </button>
  );
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

function cvDocToTemplateData(doc: CVDocument,   opts: { dateFormat: "MMM YYYY" | "MM/YYYY"; months: string[]; presentLabel: string }
): any {
  const { dateFormat, months, presentLabel } = opts;

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
          if (role === "period") {
            v = periodObjToText(v, dateFormat, months, presentLabel);
          }
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
  if (!incoming || incoming.length === 0) return current; // ⬅️ keep existing if API returns empty
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
      title: prev.title,
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
      <div>
        <label className="block text-xs text-gray-500">{t("label.startDate")}</label>
        <div className="flex gap-2">
          <select
            className="rounded border px-2 py-2 w-full sm:w-28"
            value={start.month || ""}
            onChange={(e) => setStart({ month: e.target.value })}
          >
            {months.map((m, idx) => (
              <option key={`${m}-${idx}`} value={m}>{m || monthPh}</option>
            ))}
          </select>
          <input
            className="rounded border px-2 py-2 w-full sm:w-28"
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
            className="rounded border px-2 py-2 w-full sm:w-28"
            value={end.month || ""}
            onChange={(e) => setEnd({ month: e.target.value })}
          >
            {months.map((m, idx) => (
              <option key={`${m}-${idx}`} value={m}>{m || monthPh}</option>
            ))}
          </select>
          <input
            disabled={present}
            className="rounded border px-2 py-2 w-full sm:w-28"
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
  <div className="w-full p-3 border rounded-lg flex items-center justify-between bg-white gap-3">
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
      <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-4 items-start">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
            <div key={key} className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <label className="w-full sm:w-44 text-sm text-gray-700">{label}</label>
              <div className="flex w-full gap-2">
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
            <summary className="list-none cursor-pointer block">
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

            <div className="p-3 pt-2 space-y-3">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <details key={r.key} className="rounded-lg border open:shadow-sm" open={i === 0}>
            <summary className="list-none cursor-pointer block">
              <RecordHeaderLine title={degree || t("ui.untitled","(untitled)")} subtitle={subtitle} />
            </summary>

            <div className="p-3 pt-2 space-y-3">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                <div>
                  <label className="block text-xs text-gray-500">{t("label.city","City")}</label>

                  <input
                    className="w-full rounded border px-3 py-2"
                    value={city}
                    onChange={(e) => setRec(i, setByRole(section, r, "city", e.target.value, 2))}
                  />
                </div>
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
  skills: string[]; // localized levels (ordered)
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
            <summary className="list-none cursor-pointer block">
              <RecordHeaderLine title={name || untitledSkill} subtitle={level} />
            </summary>
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <summary className="list-none cursor-pointer block">
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
            <summary className="list-none cursor-pointer block">
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
            <summary className="list-none cursor-pointer block">
              <RecordHeaderLine title={title || untitledCourse} />
            </summary>
            <div className="p-3 pt-2 space-y-3">

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

const GenericSectionEditor: React.FC<{
  section: CVSection;
  setDoc: React.Dispatch<React.SetStateAction<CVDocument>>;
  t: (k: string, fb?: string) => string;
}> = ({ section, setDoc, t }) => {
  // Ensure the section has a richtext field and a first record aligned to it.
  React.useEffect(() => {
    setDoc((prev) => {
      const sections = prev.sections.map((s) => {
        if (s.key !== section.key) return s;

        const fields = [...(s.fields || [])];
        // ensure 'richtextValue' field exists
        let richIdx = fields.findIndex((f) => (f.role || f.key) === "richtextValue");
        if (richIdx < 0) {
          fields.push({ key: "rich", role: "richtextValue" });
          richIdx = fields.length - 1;
        }

        let records = [...(s.records || [])];

        // If there are no records yet, seed one, placing content at richIdx
        if (records.length === 0) {
          const values = new Array(fields.length).fill(undefined);
          const initial = s.description && s.description.trim() ? s.description : "";
          values[richIdx] = initial;
          records = [{ key: `gen-${Math.random().toString(36).slice(2, 8)}`, values }];
          // Optionally clear legacy description so it doesn't look out-of-sync
          return { ...s, fields, records, description: "" };
        } else {
          // Pad existing first record so values.length matches fields.length
          const r0 = records[0];
          const values = [...(r0.values || [])];
          if (values.length < fields.length) values.length = fields.length;
          records[0] = { ...r0, values };
          return { ...s, fields, records };
        }
      });
      return { ...prev, sections };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.key]);

  // Helpers to get/set the rich text at the correct index
  const getRich = React.useCallback(() => {
    const fields = section.fields || [];
    const richIdx = fields.findIndex((f) => (f.role || f.key) === "richtextValue");
    const r0 = section.records?.[0];
    if (richIdx < 0 || !r0) return "";
    return String(r0.values?.[richIdx] || "");
  }, [section.fields, section.records]);

  const setRich = (html: string) => {
    setDoc((prev) => {
      const sections = prev.sections.map((s) => {
        if (s.key !== section.key) return s;

        const fields = s.fields || [{ key: "rich", role: "richtextValue" }];
        let richIdx = fields.findIndex((f) => (f.role || f.key) === "richtextValue");
        if (richIdx < 0) {
          // If somehow missing, append and set index
          richIdx = fields.length;
          fields.push({ key: "rich", role: "richtextValue" });
        }

        const recs = s.records?.length
          ? [...s.records]
          : [{ key: `gen-${Math.random().toString(36).slice(2, 8)}`, values: new Array(fields.length).fill(undefined) }];

        const r0 = recs[0];
        const values = [...(r0.values || [])];
        if (values.length < fields.length) values.length = fields.length;
        values[richIdx] = html;
        recs[0] = { ...r0, values };

        return { ...s, fields, records: recs };
      });
      return { ...prev, sections };
    });
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs text-gray-500">
        {t("label.description", "Description (optional)")}
      </label>
      <Wysiwyg
        value={getRich()}
        onChange={setRich}
        placeholder={t("placeholder.startTyping", "Start typing here…")}
      />
    </div>
  );
};


const SectionBodyByKey: React.FC<{
  section: CVSection;
  setDoc: React.Dispatch<React.SetStateAction<CVDocument>>;
  onChangeDescription?: (text: string) => void;
  months: string[];
  t: (key: string, fb?: string) => string;
  skills: string[];
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
          skills={skills ?? []}/>;

    case "languages":
      return <LanguagesEditor section={section} setDoc={setDoc} t={t}/>;

    case "hobbies":
      return <HobbiesEditor section={section} setDoc={setDoc}  t={t} />;

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
      return <GenericSectionEditor section={section} setDoc={setDoc} t={t} />;

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
  onAISuggest?: (section: CVSection) => void;
  onRequestRemove?: (key: CVSectionKey) => void;

}> = ({ section, onChangeTitle, onChangeDescription, onChangePD, setDoc, months, t, skills, onAISuggest, onRequestRemove }) => {
  const [open, setOpen] = useState(true);

  const updatePD = (updater: (val: PDValues) => PDValues) => {
    onChangePD?.(updater);
  };


  return (
    <div data-testid={section.key} className="w-full border-b border-gray-200 collapsible-section px-3">
      <div className="flex items-start justify-between gap-2 w-full">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex-grow py-3 pe-6 text-start overflow-hidden rounded focus-visible:ring-4 ring-blue-200 ring-inset"
        >
          <h3 className={`text-xl truncate font-bold select-none ${open ? "text-gray-800" : "text-gray-400"}`}>
            {section.title}
          </h3>
        </button>
        <div className="py-3 flex flex-wrap items-start gap-2 flex-none">
          <button
            className="inline-flex shrink max-w-full border justify-center rounded relative overflow-hidden max-w-full focus-visible:ring-4 ring-blue-200 items-center bg-transparent text-gray-700 border-gray-400 hover:bg-blue-50 hover:border-blue-400 font-medium py-1 px-2 text-sm"
            type="button"
            onClick={() => onAISuggest?.(section)}
          >
            ✨ <span className="hidden sm:inline"> {t?.("action.aiSuggestions")} </span>
          </button>

           <button
            className="inline-flex shrink max-w-full border justify-center rounded focus-visible:ring-4 ring-red-200 items-center bg-transparent text-red-700 border-red-400 hover:bg-red-50 hover:border-red-500 font-medium py-1 px-2 text-sm"
            type="button"
            onClick={() => onRequestRemove?.(section.key)}
            title={t?.("action.removeSection")}
          >
            🗑 <span className="hidden sm:inline"> {t?.("action.removeSection")} </span>
          </button>
        </div>
      </div>

      {open && (
        <div className="pb-4 pt-1 space-y-4">
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
const ALL_SECTION_KEYS: CVSectionKey[] = [
  "personalDetails","profile","employment","educations","skills","languages",
  "hobbies","qualities","courses","certificates","internships","sideActivities",
  "achievements","references","signature","footer",
];

function defaultSectionForKey(key: CVSectionKey, t: (k:string, fb?:string)=>string): CVSection {
  const title = t?.(`section.${key}`, DEFAULT_TITLES[key] || key) ?? (DEFAULT_TITLES[key] || key);

  switch (key) {
    case "personalDetails":
      return { key, title, fields: [], records: [{ key: "pd-1", values: {} }], collapsible: true, description: "" };

    case "profile":
      return {
        key, title,
        fields: [{ key: "h", role: "header" }, { key: "v", role: "richtextValue" }],
        records: [{ key: "p1", values: ["", ""] }],
        collapsible: true, description: "",
      };

    case "employment":
    case "internships":
    case "sideActivities":
      return {
        key, title,
        fields: [
          { key: "h", role: "header" },
          { key: "sub", role: "subheader" },
          { key: "city", role: "city" },
          { key: "per", role: "period" },
          { key: "rich", role: "richtextValue" },
        ],
        records: [],
        collapsible: true, description: "",
      };

    case "educations":
      return {
        key, title,
        fields: [
          { key: "h", role: "header" },
          { key: "sub", role: "subheader" },
          { key: "city", role: "city" },
          { key: "per", role: "period" },
          { key: "rich", role: "richtextValue" },
        ],
        records: [],
        collapsible: true, description: "",
      };

    case "skills":
      return {
        key, title,
        fields: [{ key: "h", role: "header" }, { key: "lvl", role: "level" }],
        records: [],
        collapsible: true, description: "",
      };

    case "languages":
      return {
        key, title,
        fields: [{ key: "h", role: "header" }, { key: "lvl", role: "level" }],
        records: [],
        collapsible: true, description: "",
      };

    case "hobbies":
      return {
        key, title,
        fields: [{ key: "h", role: "header" }],
        records: [],
        collapsible: true, description: "",
      };

    case "qualities":
    case "courses":
    case "certificates":
    case "achievements":
    case "references":
    case "signature":
    case "footer":
    default:
      return {
        key, title,
        fields: [{ key: "rich", role: "richtextValue" }],
        records: [{ key: `gen-${Math.random().toString(36).slice(2, 8)}`, values: [""] }],
        collapsible: true, description: "",
      };
  }
}

export type I18nPack = {
  t: (k: string, fb?: string) => string;
  lang: string;
  months: string[];       // months[0] === "" placeholder
  skillLevels: string[];  // ordered labels
};
// keep this helper near your other utils
function formatMonthYear(
  d: { month?: string; year?: string } | undefined,
  fmt: "MMM YYYY" | "MM/YYYY",
  months: string[]
) {
  if (!d || (!d.month && !d.year)) return "";
  const year = d.year?.trim() || "";
  if (fmt === "MM/YYYY") {
    // months[0] === "" placeholder, real months start at index 1
    const idx = months.indexOf(d.month || "");
    const mm = idx > 0 ? String(idx).padStart(2, "0") : "";
    return [mm, year].filter(Boolean).join("/");
  }
  // "MMM YYYY"
  const mmm = d.month ? d.month.slice(0, 3) : "";
  return [mmm, year].filter(Boolean).join(" ");
}

// 🔁 unified function (replaces the old implementation)
function periodObjToText(
  p: any,
  fmt?: "MMM YYYY" | "MM/YYYY",
  months?: string[],
  presentLabel?: string
): string | undefined {
  if (!p) return undefined;

  // fallback to previous behavior if not provided
  const FMT = fmt ?? "MMM YYYY";
  const MONTHS = months ?? [
    "", "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];
  const PRESENT = presentLabel ?? "Present";

  const pair = (a?: any, b?: any) => {
    const s =
      typeof a === "string"
        ? a
        : formatMonthYear({ month: a?.month, year: a?.year }, FMT, MONTHS);

    const e =
      b == null
        ? ""
        : typeof b === "string"
        ? b
        : b?.present
        ? PRESENT
        : formatMonthYear({ month: b?.month, year: b?.year }, FMT, MONTHS);

    return [s, e].filter(Boolean).join(" – ");
  };

  if (Array.isArray(p)) return pair(p[0], p[1]);

  if (typeof p === "object") {
    const s = formatMonthYear(p?.start, FMT, MONTHS);
    const e = p?.end?.present
      ? PRESENT
      : formatMonthYear(p?.end, FMT, MONTHS);
    return [s, e].filter(Boolean).join(" – ");
  }

  return String(p);
}
const AddSectionChips: React.FC<{
  doc: CVDocument;
  setDoc: React.Dispatch<React.SetStateAction<CVDocument>>;
  t: (k: string, fb?: string) => string;
}> = ({ doc, setDoc, t }) => {
  const existing = new Set(doc.sections.map((s) => s.key));
  const palette = ALL_SECTION_KEYS.filter((k) => !existing.has(k));

  if (!palette.length) return null;

  return (
    <div className="mt-4">
      <div className="text-xs text-gray-500 mb-2">{t("ui.addSection", "Add a section")}</div>
      <div className="flex flex-wrap gap-2">
        {palette.map((k) => (
          <button
            key={k}
            type="button"
            className="px-3 py-1 rounded-full border hover:bg-gray-50 text-sm"
            onClick={() =>
              setDoc((prev) => ({
                ...prev,
                sections: [...prev.sections, defaultSectionForKey(k as CVSectionKey, t)],
              }))
            }
            title={t(`section.${k}`, DEFAULT_TITLES[k] || k)}
          >
            + {t(`section.${k}`, DEFAULT_TITLES[k] || k)}
          </button>
        ))}
      </div>
    </div>
  );
};

const JDModal: React.FC<{
  open: boolean;
  onClose: () => void;
  jdText: string;
  setJdText: (s: string) => void;
  onAnalyze: (text: string) => Promise<void>;
}> = ({ open, onClose, jdText, setJdText, onAnalyze }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9998] bg-black/20 grid place-items-center">
      <div className="w-[720px] max-w-[95vw] bg-white rounded-xl border p-4 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Paste Job Description</h3>
          <button className="text-sm px-2 py-1 border rounded" onClick={onClose}>Close</button>
        </div>
        <textarea
          className="w-full h-64 border rounded p-2"
          placeholder="Paste the full job post here…"
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button className="px-3 py-2 border rounded" onClick={onClose}>Cancel</button>
          <button
            className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
            disabled={!jdText.trim()}
            onClick={async () => { await onAnalyze(jdText); onClose(); }}
          >
            Analyze JD
          </button>
        </div>
      </div>
    </div>
  );
};

type OptimizeOut = {
  sections: CVSection[];
  tailoredBullets: Array<{ sectionKey: CVSectionKey; recordKey: string; bullets: string[] }>;
  coverage: {
    mustHaveCovered: string[]; mustHaveMissing: string[];
    niceToHaveCovered: string[]; niceToHaveMissing: string[];
    keywordsCovered: string[]; keywordsMissing: string[];
  };
  atsChecklist: string[];
};

function makeEmptySection(key: CVSectionKey, t: I18nPack["t"]): CVSection {
  const fromDefaults = DEFAULT_SECTIONS.find(s => s.key === key);
  if (fromDefaults) {
    // clone & localize title
    return {
      ...fromDefaults,
      title: t?.(`section.${fromDefaults.key}`, fromDefaults.title) ?? fromDefaults.title,
      records: [...(fromDefaults.records || [])],
    };
  }

  // fallback shapes for keys not in DEFAULT_SECTIONS
  const baseTitle = t?.(`section.${key}`, DEFAULT_TITLES[key] || String(key)) ?? (DEFAULT_TITLES[key] || String(key));
  switch (key) {
    case "qualities":
    case "achievements":
    case "references":
    case "certificates":
    case "courses":
    case "internships":
    case "sideActivities":
      return {
        key,
        title: baseTitle,
        collapsible: true,
        description: "",
        fields: [
          { key: "h", role: "header" },
          { key: "sub", role: "subheader" },
          { key: "city", role: "city" },
          { key: "per", role: "period" },
          { key: "rich", role: "richtextValue" },
        ],
        records: [],
      };
    default:
      return {
        key,
        title: baseTitle,
        collapsible: true,
        description: "",
        fields: [{ key: "v", role: "richtextValue" }],
        records: [{ key: newKey(key), values: [""] }],
      };
  }
}
function syncColumnsToDocOrder(
  doc: CVDocument,
  prevOptions: any
) {
  const leftList  = (prevOptions?.sectionsLeft  || "").split(",").map(s => s.trim()).filter(Boolean);
  const rightList = (prevOptions?.sectionsRight || "").split(",").map(s => s.trim()).filter(Boolean);

  const leftSet  = new Set(leftList);
  const rightSet = new Set(rightList);

  // Keep only sections that exist (and preserve new order from doc.sections)
  const orderedKeys = doc.sections.map(s => s.key);

  const orderedLeft  = orderedKeys.filter(k => leftSet.has(k));
  const orderedRight = orderedKeys.filter(k => rightSet.has(k));

  // Any sections not listed in either column default to left (optional)
  const unplaced = orderedKeys.filter(k => !leftSet.has(k) && !rightSet.has(k));
  const finalLeft = [...orderedLeft, ...unplaced];

  return {
    ...prevOptions,
    sectionsLeft: finalLeft.join(","),
    sectionsRight: orderedRight.join(","),
  };
}


export default function BuilderEditor({
  initialData,
  onChangeData,
  wrapRef,
  handleDownload,
  i18n,
  lang,
  renderer,
  onChangeRenderer,
  dateFormat,
  isSubscribed = false,
  onAuthGate,
  initialJdInput,

}: {
  initialData: any;
  onChangeData: (data: any) => void;
  wrapRef: React.RefObject<HTMLDivElement>;
  handleDownload: () => void;
  i18n: I18nPack;
  lang: LanguageCode;
  renderer?: string;
  dateFormat: "MMM YYYY" | "MM/YYYY";
  onChangeRenderer?: (r: string) => void;
  isSubscribed?: boolean;
  onAuthGate?: () => void;
  /** When set (e.g. handoff from /resume-checker), the Smart Tailor pane
   *  opens automatically with this JD pre-filled. */
  initialJdInput?: string;

}) {
  const [confirmRemoveKey, setConfirmRemoveKey] = useState<CVSectionKey | null>(null);

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

  const [doc, setDoc] = useState<CVDocument>(() => {
    const hasSections = Array.isArray(initialData?.sections) && initialData.sections.length > 0;
    return hasSections ? initialData : { id: "local", sections: makeDefaultSections() };
  });


  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState<string>("");
  const [linkedinOpen, setLinkedinOpen] = useState(false);

  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

// === ATS/JD state ===
const [jdOpen, setJdOpen] = useState(false);
const [jdText, setJdText] = useState("");
const [job, setJob] = useState<any>(null);

const [ats, setAts] = useState<OptimizeOut | null>(null);

const [smartOpen, setSmartOpen] = React.useState(false); // open by default (first-time)
const [jdInput, setJdInput] = React.useState("");

// Handoff from /resume-checker: open the Smart Tailor pane with the JD
// the user was scoring against, so they can one-click apply the tailoring.
const handoffJdAppliedRef = React.useRef(false);
React.useEffect(() => {
  if (!initialJdInput || handoffJdAppliedRef.current) return;
  handoffJdAppliedRef.current = true;
  setJdInput(initialJdInput);
  setSmartOpen(true);
}, [initialJdInput]);

useEffect(() => {
  // If sections ever become empty, repopulate with defaults so users can build from scratch.
  if (!doc.sections || doc.sections.length === 0) {
    setDoc({ id: doc.id || "local", sections: makeDefaultSections() });
  }
}, [doc.sections, makeDefaultSections]);
async function handleSmartTailor() {
  if (!jdInput.trim()) { toast.error("Paste the job description or URL"); return; }
  try {
    setBusy(true); setBusyLabel("Tailoring your resume…");
    // 1) analyze + set job
    const a = await fetch("/api/job/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        /^https?:\/\//i.test(jdInput) ? { url: jdInput.trim() } : { text: jdInput.trim() }
      ),
    });
    if (!a.ok) throw new Error(await a.text());
    const { job: analyzedJob } = await a.json();
    setJob(analyzedJob);

    // 2) tailor
    const t = await fetch("/api/ats/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sections: doc.sections, job: analyzedJob }),
    });
    if (!t.ok) throw new Error(await t.text());
    const out = await t.json(); // OptimizeOut
    setAts(out);
    setDoc((prev) => ({ ...prev, sections: mergeSections(prev.sections, out.sections) }));
    toast.success("Tailored to this job");
    setSmartOpen(false);
  } catch (e: any) {
    toast.error(String(e?.message || e));
  } finally { setBusy(false); setBusyLabel(""); }
}

// --- call /api/job/analyze ---
async function analyzeJD(text: string) {
  setBusy(true); setBusyLabel("Analyzing job description…");
  try {
    const r = await fetch("/api/job/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!r.ok) throw new Error(await r.text());
    const j = await r.json(); // { job }
    setJob(j.job);
    return j.job;
  } finally { setBusy(false); setBusyLabel(""); }
}




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
    const nextSections = [...prev.sections];
    const [moved] = nextSections.splice(src, 1);
    nextSections.splice(dst, 0, moved);
    const nextDoc = { ...prev, sections: nextSections };

    // IMPORTANT: also update template column order so preview matches
    setOptions((prevOpts: any) => syncColumnsToDocOrder(nextDoc, prevOpts));

    return nextDoc;
  });
}, []);

  const previewProps = useMemo(() => {
    const safeDoc = (doc?.sections?.length ?? 0) > 0
      ? doc
      : { id: "local", sections: makeDefaultSections() };

    const data = cvDocToTemplateData(safeDoc, {
      dateFormat,
      months,
      presentLabel: i18n.t("label.present", "Present"),
    });
    return toCircularProps(data, options);
  }, [doc, options, dateFormat, months, i18n, makeDefaultSections]);

const addSection = useCallback((key: CVSectionKey) => {
  setDoc(prev => {
    // avoid duplicates
    if (prev.sections.some(s => s.key === key)) return prev;
    const added = makeEmptySection(key, t);
    return { ...prev, sections: [...prev.sections, added] };
  });
}, [t]);

const requestRemoveSection = useCallback((key: CVSectionKey) => {
  setConfirmRemoveKey(key);
}, []);

const actuallyRemoveSection = useCallback(() => {
  if (!confirmRemoveKey) return;
  setDoc(prev => ({
    ...prev,
    sections: prev.sections.filter(s => s.key !== confirmRemoveKey),
  }));
  setConfirmRemoveKey(null);
}, [confirmRemoveKey]);

const cancelRemoveSection = useCallback(() => {
  setConfirmRemoveKey(null);
}, []);

// Compute available sections dynamically
const presentKeys = useMemo(() => new Set(doc.sections.map(s => s.key)), [doc.sections]);
const allKeys: CVSectionKey[] = [
  "personalDetails","profile","employment","educations","skills","languages","hobbies",
  "qualities","courses","certificates","internships","sideActivities","achievements",
  "references","signature","footer",
];
const addableKeys = allKeys.filter(k => !presentKeys.has(k));


  const submitLinkedInUrl = React.useCallback(
    async (text: string) => {
      const res = await fetch("/api/import-linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.detail || j?.error || `HTTP ${res.status}`);
      }
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
  setDoc((d) => localizeDocTitles(d, i18n.lang as LanguageCode));
  prevLangRef.current = lang as any;
}, []);


useEffect(() => {
  const prev = prevLangRef.current;
  const next = lang as LanguageCode;
  if (prev !== next) {
    setDoc((d) => localizeDocTitles(d, next));
    prevLangRef.current = next;
  }
}, [lang]);




// --- ATS score helper ---
type Coverage = OptimizeOut["coverage"];

function computeAtsScore(cov: Coverage) {
  const mustCovered = cov.mustHaveCovered?.length ?? 0;
  const mustTotal   = (cov.mustHaveCovered?.length ?? 0) + (cov.mustHaveMissing?.length ?? 0);

  const niceCovered = cov.niceToHaveCovered?.length ?? 0;
  const niceTotal   = (cov.niceToHaveCovered?.length ?? 0) + (cov.niceToHaveMissing?.length ?? 0);

  const kwCovered   = cov.keywordsCovered?.length ?? 0;
  const kwTotal     = (cov.keywordsCovered?.length ?? 0) + (cov.keywordsMissing?.length ?? 0);

  const pct = (n: number, d: number) => (d > 0 ? n / d : 1);

  // weights: must-haves (60%), nice-to-haves (20%), keywords (20%)
  const score =
    0.6 * pct(mustCovered, mustTotal) +
    0.2 * pct(niceCovered, niceTotal) +
    0.2 * pct(kwCovered, kwTotal);

  return Math.round(score * 100);
}

const atsScore = React.useMemo(
  () => (ats?.coverage ? computeAtsScore(ats.coverage) : null),
  [ats]
);


async function requestAISuggestion(section: CVSection): Promise<AISuggestResponse> {
  try {
    const res = await fetch("/api/assist/section-suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section, doc, job }),
    });
    if (!res.ok) throw new Error(await res.text());
    const json = await res.json();
    return (json?.suggestion as AISuggestResponse) || fallbackSuggestionFor(section);
  } catch {
    return fallbackSuggestionFor(section);
  }
}

// utilities used by applier
function ensureFields(sec: CVSection, wanted: Array<{ key: string; role: string }>): CVSection {
  const have = new Set((sec.fields || []).map(f => (f.role || f.key)));
  const nextFields = [...(sec.fields || [])];
  for (const w of wanted) {
    if (!have.has(w.role)) nextFields.push(w as any);
  }
  return { ...sec, fields: nextFields };
}
function roleIndex(sec: CVSection, role: string, fallbackIdx = 0) {
  const idx = (sec.fields || []).findIndex(f => (f.role || f.key) === role);
  return idx >= 0 ? idx : fallbackIdx;
}

function applyAISuggestion(sectionKey: CVSectionKey, suggestion: AISuggestResponse) {
  setDoc(prev => {
    const sections = prev.sections.map(sec => {
      if (sec.key !== sectionKey) return sec;

      switch (suggestion.kind) {
        // PROFILE: set headline + rich text summary
        case "profile": {
          const patched = ensureFields(sec, [
            { key: "h", role: "header" },
            { key: "v", role: "richtextValue" },
          ]);
          const idxH = roleIndex(patched, "header", 0);
          const idxV = roleIndex(patched, "richtextValue", 1);
          const rec = patched.records?.[0] || { key: "p1", values: [] as any[] };

          const values = [...(rec.values || [])];
          if (suggestion.headline) values[idxH] = suggestion.headline;
          if (suggestion.summaryHtml) values[idxV] = suggestion.summaryHtml;

          return { ...patched, records: [{ ...rec, values }] };
        }

        // EMPLOYMENT: add/replace bullets in the first (or targeted) record
        case "employment_bullets": {
          const patched = ensureFields(sec, [
            { key: "h", role: "header" },
            { key: "sub", role: "subheader" },
            { key: "city", role: "city" },
            { key: "per", role: "period" },
            { key: "rich", role: "richtextValue" },
          ]);
          const idxRich = roleIndex(patched, "richtextValue", 4);
          const html = `<ul>${suggestion.bullets.map(b => `<li>${b}</li>`).join("")}</ul>`;

          const pickIdx = (() => {
            if (suggestion.recordKey) {
              const i = (patched.records || []).findIndex(r => r.key === suggestion.recordKey);
              if (i >= 0) return i;
            }
            return 0; // fall back to first record
          })();

          const nextRecords = [...(patched.records?.length ? patched.records : [{ key: newKey("emp"), values: ["","","","", ""] }])];
          const rec = nextRecords[Math.min(pickIdx, nextRecords.length - 1)];
          const values = [...(rec.values || [])];
          values[idxRich] = html; // replace; change to append if you prefer
          nextRecords[Math.min(pickIdx, nextRecords.length - 1)] = { ...rec, values };
          return { ...patched, records: nextRecords };
        }

        // SKILLS: append items (avoid duplicates by name)
        case "skills": {
          const patched = ensureFields(sec, [
            { key: "h", role: "header" },
            { key: "lvl", role: "level" },
          ]);
          const existingNames = new Set(
            (patched.records || []).map(r => String(r.values?.[roleIndex(patched, "header", 0)] || "").toLowerCase().trim())
          );
          const toAdd = suggestion.items.filter(it => !existingNames.has(it.name.toLowerCase().trim()));
          const adds = toAdd.map(it => ({
            key: newKey("skill"),
            values: [it.name, it.level || ""],
          }));
          return { ...patched, records: [...(patched.records || []), ...adds] };
        }

        // LANGUAGES: append items (avoid duplicates)
        case "languages": {
          const patched = ensureFields(sec, [
            { key: "h", role: "header" },
            { key: "lvl", role: "level" },
          ]);
          const existingNames = new Set(
            (patched.records || []).map(r => String(r.values?.[roleIndex(patched, "header", 0)] || "").toLowerCase().trim())
          );
          const toAdd = suggestion.items.filter(it => !existingNames.has(it.name.toLowerCase().trim()));
          const adds = toAdd.map(it => ({
            key: newKey("lang"),
            values: [it.name, it.level || ""],
          }));
          return { ...patched, records: [...(patched.records || []), ...adds] };
        }

        // HOBBIES: append items (avoid duplicates)
        case "hobbies": {
          const patched = ensureFields(sec, [{ key: "h", role: "header" }]);
          const have = new Set(
            (patched.records || []).map(r => String(r.values?.[roleIndex(patched, "header", 0)] || "").toLowerCase().trim())
          );
          const adds = suggestion.items
            .filter(n => !have.has(n.toLowerCase().trim()))
            .map(n => ({ key: newKey("hobby"), values: [n] }));
          return { ...patched, records: [...(patched.records || []), ...adds] };
        }

        // Anything else: write into description (or a richtext field if present)
        default: {
          const html = suggestion.html || "<p>Suggested content.</p>";
          const rtIdx = roleIndex(sec, "richtextValue", -1);
          if (rtIdx >= 0 && (sec.records?.length ?? 0) > 0) {
            const next = [...(sec.records || [])];
            const r0 = next[0];
            const vals = [...(r0.values || [])];
            vals[rtIdx] = html;
            next[0] = { ...r0, values: vals };
            return { ...sec, records: next };
          }
          return { ...sec, description: html };
        }
      }
    });

    return { ...prev, sections };
  });
}

async function handleAISuggest(section: CVSection) {
  setBusy(true);
  setBusyLabel("Generating suggestion…");
  try {
    const suggestion = await requestAISuggestion(section);
    applyAISuggestion(section.key, suggestion);
    toast.success("Suggestion inserted");
  } catch (e: any) {
    toast.error(String(e?.message || "Couldn’t insert suggestion"));
  } finally {
    setBusy(false);
    setBusyLabel("");
  }
}

  return (
    <>


      <main className="min-h-screen bg-white text-gray-800">
        <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Controls + Sections */}
          <div className="pb-24 lg:pb-0">

            <div className="mb-4 flex flex-col sm:flex-row sm:flex-wrap gap-2 items-stretch sm:items-center">
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



            </div>

            <div className="w-full border rounded-lg p-3 bg-white">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Smart Match (ATS)</div>
                <button
                  className="text-sm text-blue-700"
                  onClick={() => setSmartOpen((v) => !v)}
                >
                  {smartOpen ? "Hide" : "Show"}
                </button>
              </div>

              {smartOpen && (
                <div className="mt-3 space-y-3">
                  <textarea
                    className="w-full h-28 border rounded p-2"
                    placeholder="Paste the job description or a job URL here…"
                    value={jdInput}
                    onChange={(e) => setJdInput(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
                      onClick={handleSmartTailor}
                      disabled={!jdInput.trim()}
                    >
                      ✨ Tailor to Job
                    </button>

                    <button
                      className="px-3 py-2 rounded border"
                      onClick={() => {
                        if (!navigator.clipboard) return;
                        navigator.clipboard.readText()
                          .then((txt) => setJdInput(txt || ""))
                          .catch(() => {});
                      }}
                    >
                      Paste from Clipboard
                    </button>

                  </div>

                  
                </div>
              )}
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
                            className={`flex w-full items-start bg-white rounded-lg mb-1 ${
                              snapshot.isDragging ? "ring-2 ring-blue-300" : ""
                            }`}
                          >
                            <div
                              {...dProvided.dragHandleProps}
                              className="p-3 cursor-grab select-none flex-none"
                              aria-label="Drag section"
                            >
                              ☰
                            </div>
                            <div className="flex-1 min-w-0 pr-3" style={{ paddingRight: "calc(0.75rem + env(safe-area-inset-right))" }}>
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
                                              } as CVRecord, // ⬅️ Explicit type assertion
                                            ],
                                          }
                                        : x
                                    ),
                                  }))
                                }
                                months={months}
                                t={t}
                                skills={skillLevels}
                                onAISuggest={handleAISuggest} 
                                onRequestRemove={requestRemoveSection}
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

            {/* chips palette to add back / add new */}
            <AddSectionChips doc={doc} setDoc={setDoc} t={t} />
          </div>

          {/* RIGHT: Sticky A4 Live Preview */}
          <div className="hidden lg:block lg:sticky lg:top-4 h-fit">
            <A4Preview
              // key={`preview-${dateFormat}`}
              props={previewProps}
              selectedTemplate={tpl}
              wrapRef={wrapRef}
              // @ts-ignore
              handleDownload={handleDownload}
            />
            <BottomToolbar
              templates={SAMPLE_TEMPLATES}
              activeTemplateId={activeTemplateId}
              onSelectTemplate={(id) => {
                const selected = SAMPLE_TEMPLATES.find((t) => t.id === id);
                if (!selected) return;
                if (!selected.isFree && !isSubscribed) {
                  onAuthGate?.();
                  return;
                }
                setActiveTemplateId(id);
                onChangeRenderer?.(selected.renderer);
                setOptions(selected.defaultOptions);
              }}
              renderTemplatePreview={(t) => {
                const Tpl = (RESUME_RENDERERS as Record<string, React.ComponentType<any>>)[t.renderer];
                if (!Tpl) return null;
                // Render with this template's own defaults so each tile looks
                // like its intended design — not whatever the user is currently editing.
                const tplProps = toCircularProps(
                  cvDocToTemplateData(doc, {
                    dateFormat, months, presentLabel: i18n.t("label.present", "Present"),
                  }),
                  (SAMPLE_TEMPLATES.find((s) => s.id === t.id)?.defaultOptions) || options,
                );
                return (
                  <div
                    aria-hidden="true"
                    style={{
                      width: 595, height: 842,
                      transformOrigin: "top left",
                      transform: "scale(0.22)",
                      pointerEvents: "none",
                      position: "absolute", top: 0, left: 0,
                    }}
                  >
                    <Tpl {...tplProps} />
                  </div>
                );
              }}
              isSubscribed={isSubscribed}
              onAuthGate={onAuthGate}
              fontName={(options as any)?.fontName || "Roboto"}
              onChangeFontName={(name) =>
                setOptions((prev: any) => ({ ...prev, fontName: name }))
              }
              fontSizeKey={((options as any)?.fontSizeFactor || "m") as "s" | "m" | "l"}
              onChangeFontSize={(k) => {
                const map = {
                  s: { text: 9, sectionHeader: 14, footer: 7 },
                  m: { text: 10, sectionHeader: 16, footer: 8 },
                  l: { text: 11, sectionHeader: 18, footer: 9 },
                } as const;
                setOptions((prev: any) => ({
                  ...prev,
                  fontSizeFactor: k,
                  fontSizes: { ...(prev?.fontSizes || {}), ...map[k] },
                }));
              }}
              lineHeight={(options as any)?.lineHeightFactor ?? 1.25}
              onChangeLineHeight={(v) =>
                setOptions((prev: any) => ({ ...prev, lineHeightFactor: v }))
              }
              primaryColor={(options as any)?.colors?.primary || "#303846"}
              onChangePrimaryColor={(hex) =>
                setOptions((prev: any) => ({
                  ...prev,
                  colors: { ...(prev?.colors || {}), primary: hex },
                }))
              }
            />
          </div>
        </div>

        {busy && <FullscreenLoader label={busyLabel} />}

        <LinkedInUrlModal
          open={linkedinOpen}
          onClose={() => setLinkedinOpen(false)}
          onSubmit={submitLinkedInUrl}
        />

        <JDModal
          open={jdOpen}
          onClose={() => setJdOpen(false)}
          jdText={jdText}
          setJdText={setJdText}
          onAnalyze={async (text) => { await analyzeJD(text); }}
        />

        {ats && (
          <div className="mt-4 border rounded-lg p-4 bg-green-50">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="font-semibold text-green-800">Tailoring complete</div>
                <div className="text-sm text-green-900">
                  We matched your resume to this job. Review highlights, insert suggested bullets, and export.
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-2 rounded border" onClick={() => setSmartOpen(true)}>
                  Retarget to another job
                </button>
                <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={handleDownload}>
                  Export PDF
                </button>
              </div>
            </div>

            {!!ats.atsChecklist?.length && (
              <div
                className="
                  fixed bottom-0 inset-x-0 z-30
                  bg-white/95 backdrop-blur
                  border-t shadow-[0_-4px_10px_rgba(0,0,0,0.06)]
                  px-4 py-3
                "
                style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">ATS checklist</div>
                  {atsScore != null && (
                    <div className="text-sm">
                      ATS score: <span className="font-semibold">{atsScore}</span>/100
                    </div>
                  )}
                </div>
                <ul className="list-disc ps-5">
                  {ats.atsChecklist.map((c, i) => <li key={"ac-"+i}>{c}</li>)}
                </ul>
              </div>
            )}

          </div>
        )}
        {/* Remove section confirm */}
        <ConfirmDialog
          open={!!confirmRemoveKey}
          title={t("confirm.removeSection.title", "Remove this section?")}
          description={t("confirm.removeSection.desc", "This section will be removed from the resume. You can add it back later via “Add section”.")}
          confirmText={t("action.remove", "Remove")}
          cancelText={t("action.cancel", "Cancel")}
          onCancel={cancelRemoveSection}
          onConfirm={actuallyRemoveSection}
        />

        {/* Mobile: floating button to open preview */}
        <FloatingPreviewButton onClick={() => setMobilePreviewOpen(true)} />

        {/* Mobile: full-screen preview overlay */}
        <MobilePreviewOverlay
          open={mobilePreviewOpen}
          onClose={() => setMobilePreviewOpen(false)}
        >
          <A4Preview
            props={previewProps}
            selectedTemplate={tpl}
            wrapRef={wrapRef}
            // @ts-ignore
            handleDownload={handleDownload}
          />
          <BottomToolbar
            templates={SAMPLE_TEMPLATES}
            activeTemplateId={activeTemplateId}
            onSelectTemplate={(id) => {
              const selected = SAMPLE_TEMPLATES.find((t) => t.id === id);
              if (!selected) return;
              if (!selected.isFree && !isSubscribed) {
                onAuthGate?.();
                return;
              }
              setActiveTemplateId(id);
              onChangeRenderer?.(selected.renderer);
              setOptions(selected.defaultOptions);
            }}
            renderTemplatePreview={(t) => {
              const Tpl = (RESUME_RENDERERS as Record<string, React.ComponentType<any>>)[t.renderer];
              if (!Tpl) return null;
              const tplProps = toCircularProps(
                cvDocToTemplateData(doc, {
                  dateFormat, months, presentLabel: i18n.t("label.present", "Present"),
                }),
                (SAMPLE_TEMPLATES.find((s) => s.id === t.id)?.defaultOptions) || options,
              );
              return (
                <div
                  aria-hidden="true"
                  style={{
                    width: 595, height: 842,
                    transformOrigin: "top left",
                    transform: "scale(0.22)",
                    pointerEvents: "none",
                    position: "absolute", top: 0, left: 0,
                  }}
                >
                  <Tpl {...tplProps} />
                </div>
              );
            }}
            isSubscribed={isSubscribed}
            onAuthGate={onAuthGate}
            fontName={(options as any)?.fontName || "Roboto"}
            onChangeFontName={(name) =>
              setOptions((prev: any) => ({ ...prev, fontName: name }))
            }
            fontSizeKey={((options as any)?.fontSizeFactor || "m") as "s" | "m" | "l"}
            onChangeFontSize={(k) => {
              const map = {
                s: { text: 9, sectionHeader: 14, footer: 7 },
                m: { text: 10, sectionHeader: 16, footer: 8 },
                l: { text: 11, sectionHeader: 18, footer: 9 },
              } as const;
              setOptions((prev: any) => ({
                ...prev,
                fontSizeFactor: k,
                fontSizes: { ...(prev?.fontSizes || {}), ...map[k] },
              }));
            }}
            lineHeight={(options as any)?.lineHeightFactor ?? 1.25}
            onChangeLineHeight={(v) =>
              setOptions((prev: any) => ({ ...prev, lineHeightFactor: v }))
            }
            primaryColor={(options as any)?.colors?.primary || "#303846"}
            onChangePrimaryColor={(hex) =>
              setOptions((prev: any) => ({
                ...prev,
                colors: { ...(prev?.colors || {}), primary: hex },
              }))
            }
          />
        </MobilePreviewOverlay>
      </main>
    </>
  );
};

