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
    const id = window.requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.title = "PREVIEW_READY";
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
      data-preview-root="1"
    >
      {renderFn({ doc: data })}
    </div>
  );
}
