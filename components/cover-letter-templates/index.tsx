// Cover letter template registry. Keys mirror the renderer field stored in
// public.cover_letters.renderer and the API's ALLOWED_RENDERERS whitelist.

import React from "react";
import type { CoverLetterTemplateProps, TemplateMeta } from "./types";

import Professional from "./Professional";
import Classic from "./Classic";
import Elegant from "./Elegant";
import Creative from "./Creative";

export const COVER_LETTER_TEMPLATES: TemplateMeta[] = [
  { id: "professional", name: "Professional", description: "Clean serif name, accent rules. ATS-safe.", isFree: true },
  { id: "classic",      name: "Classic",      description: "Traditional business letter format.",     isFree: true },
  { id: "elegant",      name: "Elegant",      description: "Two-column sidebar with contact strip.",   isFree: false },
  { id: "creative",     name: "Creative",     description: "Bold colour header and tag chips.",        isFree: false },
];

export const COVER_LETTER_RENDERERS: Record<string, React.FC<CoverLetterTemplateProps>> = {
  professional: Professional,
  classic: Classic,
  elegant: Elegant,
  creative: Creative,
};

export function getCoverLetterTemplate(id: string): React.FC<CoverLetterTemplateProps> {
  return COVER_LETTER_RENDERERS[id] ?? Professional;
}

export type { CoverLetterTemplateProps, TemplateMeta };
