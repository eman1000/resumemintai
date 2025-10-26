import React from "react";
import { renderTemplate } from "./engine";
import { SvgBackend } from "./svgBackend";

type RendererProps = {
  // The full CVWizard template object you showed me (has .template and .defaultOptions)
  template: any;          // e.g., { id, name, template:{content:[...]}, defaultOptions:{...} }
  document: any;          // your data, includes sections etc.
  width?: number;
  height?: number;
};

const Renderer: React.FC<RendererProps> = ({ template, document, width = 595.28, height = 841.89 }) => {
  const defaultOptions = template?.defaultOptions ?? {};
  const backend = new SvgBackend();

  // prime the page frame (simple single-page demo; add pagination as you do now)
  backend.popFrame?.(); // our SvgBackend starts with one frame; pop to reset if you want
  backend.pushFrame({ x: 25, y: 25, w: width - 50, h: height - 50 });

  // IMPORTANT: pass the *same* object that has either .content or .template.content
  // Here we pass the full template; engine will pick template.template.content internally.
  void renderTemplate(template, defaultOptions, document, backend);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} xmlns="http://www.w3.org/2000/svg">
      <rect x={0} y={0} width={width} height={height} fill={defaultOptions?.colors?.backgroundColor || "white"} />
      {backend.nodes}
    </svg>
  );
};

export default Renderer;
