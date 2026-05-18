"use client";

import * as React from "react";
import { TEMPLATE_REGISTRY } from "@/app/builder/components/template-registry";

export default function PreviewClient({
  renderer,
  data,
}: {
  renderer: string;
  data: any;
}) {
  React.useEffect(() => {
    // Lock the document to A4 size + remove default margins so a full-page
    // capture is exactly the resume with no whitespace borders.
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

  const renderFn = TEMPLATE_REGISTRY[renderer] || TEMPLATE_REGISTRY.professional;

  return (
    <div
      style={{ width: "210mm", margin: 0, background: "#fff" }}
      data-preview-root="1"
    >
      {renderFn({ doc: data })}
    </div>
  );
}
