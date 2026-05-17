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
    const id = window.requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.title = "PREVIEW_READY";
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  const Template = getCoverLetterTemplate(renderer);

  return (
    <div
      style={{
        margin: 0,
        padding: 0,
        background: "white",
      }}
      data-preview-root="1"
    >
      {/* Constrain to A4 width for consistent capture. */}
      <div style={{ width: "210mm", margin: "0 auto" }}>
        <Template data={data} />
      </div>
    </div>
  );
}
