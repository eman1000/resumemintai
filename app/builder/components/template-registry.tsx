// template-registry.tsx
import React from "react";
import { CircularTemplate } from "./CircularTemplate";
import { toCircularProps } from "./cvwizard-adapter";

type RenderArgs = { doc: any; options?: any };

export const TEMPLATE_REGISTRY: Record<
  string,
  (args: RenderArgs) => JSX.Element
> = {
  circular: ({ doc, options }) => (
    <CircularTemplate {...toCircularProps(doc, options)} />
  ),

  // future:
  // professional: ({ doc, options }) => (
  //   <ProfessionalTemplate {...toProfessionalProps(doc, options)} />
  // ),
};
