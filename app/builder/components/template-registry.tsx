// template-registry.tsx
import React from "react";
import { CircularTemplate } from "./CircularTemplate";
import ProfessionalTemplate from "./ProfessionalTemplate";
import ElegantTemplate from "./ElegantTemplate";
import { ClassicTemplate } from "./ClassicTemplate";
import { ModernTemplate } from "./ModernTemplate";
import { MinimalTemplate } from "./MinimalTemplate";
import { CreativeTemplate } from "./CreativeTemplate";
import { CompactTemplate } from "./CompactTemplate";
import { ExecutiveTemplate } from "./ExecutiveTemplate";
import { ChronoTemplate } from "./ChronoTemplate";
import { HorizontalTemplate } from "./HorizontalTemplate";
import { CasualTemplate } from "./CasualTemplate";
import { toCircularProps } from "./cvwizard-adapter";

type RenderArgs = { doc: any; options?: any };

export const TEMPLATE_REGISTRY: Record<
  string,
  (args: RenderArgs) => JSX.Element
> = {
  circular: ({ doc, options }) => (
    <CircularTemplate {...toCircularProps(doc, options)} />
  ),
  professional: ({ doc, options }) => (
    <ProfessionalTemplate {...toCircularProps(doc, options)} />
  ),
  elegant: ({ doc, options }) => (
    <ElegantTemplate {...toCircularProps(doc, options)} />
  ),
  classic: ({ doc, options }) => (
    <ClassicTemplate {...toCircularProps(doc, options)} />
  ),
  modern: ({ doc, options }) => (
    <ModernTemplate {...toCircularProps(doc, options)} />
  ),
  minimal: ({ doc, options }) => (
    <MinimalTemplate {...toCircularProps(doc, options)} />
  ),
  creative: ({ doc, options }) => (
    <CreativeTemplate {...toCircularProps(doc, options)} />
  ),
  compact: ({ doc, options }) => (
    <CompactTemplate {...toCircularProps(doc, options)} />
  ),
  executive: ({ doc, options }) => (
    <ExecutiveTemplate {...toCircularProps(doc, options)} />
  ),
  chrono: ({ doc, options }) => (
    <ChronoTemplate {...toCircularProps(doc, options)} />
  ),
  horizontal: ({ doc, options }) => (
    <HorizontalTemplate {...toCircularProps(doc, options)} />
  ),
  casual: ({ doc, options }) => (
    <CasualTemplate {...toCircularProps(doc, options)} />
  ),
};
