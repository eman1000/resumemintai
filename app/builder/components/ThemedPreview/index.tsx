"use client";

import React from "react";
import { auth } from "@/app/firebase";

type Props = {
  /** Live editor resume data (section-based). */
  data: any;
  /** Selected JSON Resume theme id. */
  theme: string;
  /** Kept for API compatibility with the old A4Preview slot. */
  wrapRef?: React.RefObject<HTMLDivElement>;
};

const BASE_PAGE_WIDTH = 794; // A4 @96dpi

/** Live builder preview rendered by the SAME JSON Resume theme pipeline the
 * PDF uses (server-rendered HTML in an iframe), so preview == download.
 * Debounced so typing doesn't hammer the render endpoint. */
export const ThemedPreview: React.FC<Props> = ({ data, theme, wrapRef }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = React.useState(1);
  const [html, setHtml] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [iframeH, setIframeH] = React.useState(1123);

  // Responsive scale to fit the panel width (same math as the old preview).
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const compute = () => {
      const available = el.clientWidth - 24;
      setScale(Math.min(1, Math.max(0.35, available / BASE_PAGE_WIDTH)));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Debounced server render whenever data or theme changes.
  React.useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const token = await auth.currentUser?.getIdToken().catch(() => null);
        const res = await fetch("/api/resume/preview-html", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ data, theme }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const json = await res.json();
        if (!cancelled) setHtml(json.html || "");
      } catch {
        /* keep prior HTML on error/abort to avoid flicker */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      ctrl.abort();
      clearTimeout(t);
    };
  }, [data, theme]);

  // Size the iframe to its content (multi-page resumes) once HTML loads.
  const onLoad = () => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc) setIframeH(Math.max(1123, doc.documentElement.scrollHeight));
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      ref={scrollRef}
      className="max-h-[calc(100vh-2rem)] overflow-auto rounded border bg-white p-3"
      style={{ WebkitOverflowScrolling: "touch", position: "relative" }}
    >
      {loading && (
        <div style={{ position: "absolute", top: 8, right: 12, fontSize: 11, color: "#9ca3af" }}>
          Updating…
        </div>
      )}
      <div style={{ width: BASE_PAGE_WIDTH * scale }} className="mx-auto">
        <div
          ref={wrapRef}
          style={{ transform: `scale(${scale})`, transformOrigin: "top center", width: BASE_PAGE_WIDTH }}
        >
          {html ? (
            <iframe
              ref={iframeRef}
              title="Resume preview"
              srcDoc={html}
              onLoad={onLoad}
              style={{ width: BASE_PAGE_WIDTH, height: iframeH, border: "0", background: "#fff" }}
            />
          ) : (
            <div style={{ width: BASE_PAGE_WIDTH, height: 1123, background: "#fff" }} />
          )}
        </div>
      </div>
    </div>
  );
};
