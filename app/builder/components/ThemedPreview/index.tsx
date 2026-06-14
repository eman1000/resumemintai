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
const PAGE_HEIGHT = 1123; // A4 @96dpi

/** Live builder preview rendered by the SAME JSON Resume theme pipeline the PDF
 * uses (server-rendered HTML in an iframe), so the styling matches the download.
 *
 * We render CONTINUOUSLY (no in-iframe paginator): a client-side paginator
 * (paged.js) silently dropped or mangled content on several themes, so the
 * single most important guarantee — that ALL your content is visible — wins.
 * Page breaks are shown as light guide lines at A4 intervals; the DOWNLOAD is
 * the source of truth for exact pagination + margins. Debounced so typing
 * doesn't hammer the render endpoint. */
export const ThemedPreview: React.FC<Props> = ({ data, theme, wrapRef }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = React.useState(1);
  const [html, setHtml] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [iframeH, setIframeH] = React.useState(PAGE_HEIGHT);

  // Responsive scale to fit the panel width.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const compute = () => {
      const available = el.clientWidth - 24;
      setScale(Math.min(1, Math.max(0.32, available / BASE_PAGE_WIDTH)));
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
      if (doc) setIframeH(Math.max(PAGE_HEIGHT, doc.documentElement.scrollHeight));
    } catch {
      /* ignore */
    }
  };

  // Page-break guide lines at A4 intervals (purely visual; content is continuous).
  const pageCount = Math.max(1, Math.ceil(iframeH / PAGE_HEIGHT));
  const guides = Array.from({ length: pageCount - 1 }, (_, i) => (i + 1) * PAGE_HEIGHT);

  return (
    <div
      ref={scrollRef}
      className="max-h-[calc(100vh-2rem)] overflow-auto rounded border bg-gray-100 p-3"
      style={{ WebkitOverflowScrolling: "touch", position: "relative" }}
    >
      {loading && (
        <div style={{ position: "absolute", top: 8, right: 12, fontSize: 11, color: "#6b7280", zIndex: 2 }}>
          Updating…
        </div>
      )}
      <div style={{ width: BASE_PAGE_WIDTH * scale, height: iframeH * scale, margin: "0 auto" }}>
        <div
          ref={wrapRef}
          style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: BASE_PAGE_WIDTH, height: iframeH, position: "relative" }}
        >
          {html ? (
            <>
              <iframe
                ref={iframeRef}
                title="Resume preview"
                srcDoc={html}
                onLoad={onLoad}
                style={{ width: BASE_PAGE_WIDTH, height: iframeH, border: "0", background: "#fff", boxShadow: "0 1px 8px rgba(0,0,0,.12)" }}
              />
              {/* page-break guides */}
              {guides.map((top) => (
                <div
                  key={top}
                  style={{ position: "absolute", left: 0, right: 0, top, borderTop: "2px dashed #cbd5e1", pointerEvents: "none" }}
                >
                  <span style={{ position: "absolute", right: 4, top: 2, fontSize: 11, color: "#94a3b8", background: "#f3f4f6", padding: "0 4px" }}>
                    page break
                  </span>
                </div>
              ))}
            </>
          ) : (
            <div style={{ width: BASE_PAGE_WIDTH, height: PAGE_HEIGHT, background: "#fff" }} />
          )}
        </div>
      </div>
    </div>
  );
};
