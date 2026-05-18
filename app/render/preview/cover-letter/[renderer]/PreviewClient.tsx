"use client";

import * as React from "react";
import { getCoverLetterTemplate } from "@/components/cover-letter-templates";
import type { CoverLetterData } from "@/components/cover-letter-templates/types";

export default function PreviewClient({
  renderer,
  data,
}: {
  renderer: string;
  data: CoverLetterData;
}) {
  React.useEffect(() => {
    const css = document.createElement("style");
    css.textContent = `
      html, body { margin: 0; padding: 0; background: #fff; width: 210mm; }
      body > * { box-sizing: border-box; }
    `;
    document.head.appendChild(css);

    const id = window.requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.title = "PREVIEW_READY";
      });
    });
    return () => {
      window.cancelAnimationFrame(id);
      css.remove();
    };
  }, []);

  const Template = getCoverLetterTemplate(renderer);

  return (
    <div
      style={{ width: "210mm", height: "297mm", margin: 0, background: "#fff" }}
      data-preview-root="1"
    >
      <Template data={data} />
    </div>
  );
}
