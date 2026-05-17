"use client";

import * as React from "react";
import { TEMPLATE_REGISTRY } from "@/app/builder/components/template-registry";

type Props = {
  renderer: string;
  data: any;
};

/**
 * Renders the resume in print-only mode. Puppeteer waits for
 * `document.title === 'PRINT_READY'` before snapping the PDF.
 */
export default function PrintClient({ renderer, data }: Props) {
  React.useEffect(() => {
    // Give the template one paint to settle (fonts, images), then signal.
    const id = window.requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.title = "PRINT_READY";
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  const renderFn = TEMPLATE_REGISTRY[renderer] || TEMPLATE_REGISTRY.professional;

  return (
    <div
      style={{
        margin: 0,
        padding: 0,
        background: "white",
        display: "flex",
        justifyContent: "center",
      }}
      data-print-root="1"
    >
      {renderFn({ doc: data })}
    </div>
  );
}
