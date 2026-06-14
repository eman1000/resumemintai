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

// Injected into the preview iframe so it PAGINATES into real A4 pages using the
// SAME @page rules the PDF download uses (size + margins) — so preview pages ==
// download pages. paged.js runs in the iframe (the user's browser, online); the
// `after` hook reports the rendered height back so we can size the iframe.
const PAGED_INJECT = `
<style id="rm-paged-chrome">
  html, body { background: #525659 !important; }
  .pagedjs_pages { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 16px 0; }
  .pagedjs_page { background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,.5); }
</style>
<script>
  window.PagedConfig = { auto: true, after: function () {
    requestAnimationFrame(function () {
      try { parent.postMessage({ __rmPaged: 1, height: document.documentElement.scrollHeight }, "*"); } catch (e) {}
    });
  }};
<\/script>
<script src="https://unpkg.com/pagedjs/dist/paged.polyfill.js"
        onerror="try{parent.postMessage({__rmPagedError:1},'*')}catch(e){}"><\/script>
`;

function withPaged(html: string): string {
  return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${PAGED_INJECT}</body>`) : html + PAGED_INJECT;
}

/** Live builder preview rendered by the SAME JSON Resume theme pipeline the PDF
 * uses AND paginated with paged.js, so the preview shows the same A4 pages,
 * margins, and page breaks as the download. Debounced so typing doesn't hammer
 * the render endpoint. */
export const ThemedPreview: React.FC<Props> = ({ data, theme, wrapRef }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = React.useState(1);
  const [rawHtml, setRawHtml] = React.useState<string>("");
  const [usePaged, setUsePaged] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [iframeH, setIframeH] = React.useState(1123);

  // Responsive scale to fit the panel width.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const compute = () => {
      const available = el.clientWidth - 8;
      setScale(Math.min(1, Math.max(0.3, available / BASE_PAGE_WIDTH)));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Receive the paginated height (and CDN-failure fallback) from the iframe.
  React.useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data || {};
      if (d.__rmPaged && typeof d.height === "number") {
        setIframeH(Math.max(1123, d.height));
        setLoading(false);
      } else if (d.__rmPagedError) {
        // paged.js couldn't load → render the plain (unpaginated) HTML so the
        // preview still works; it just won't show page breaks.
        setUsePaged(false);
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
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
        if (!cancelled) setRawHtml(json.html || "");
      } catch {
        /* keep prior HTML on error/abort to avoid flicker */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      ctrl.abort();
      clearTimeout(t);
    };
  }, [data, theme]);

  const srcDoc = rawHtml ? (usePaged ? withPaged(rawHtml) : rawHtml) : "";

  // Fallback height when not paginating (plain HTML): size to content on load.
  const onLoad = () => {
    if (usePaged) return; // paged path reports height via postMessage
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
      className="max-h-[calc(100vh-2rem)] overflow-auto rounded border bg-[#525659]"
      style={{ WebkitOverflowScrolling: "touch", position: "relative" }}
    >
      {loading && (
        <div style={{ position: "absolute", top: 8, right: 12, fontSize: 11, color: "#e5e7eb", zIndex: 2 }}>
          Updating…
        </div>
      )}
      <div style={{ width: BASE_PAGE_WIDTH * scale, height: iframeH * scale, margin: "0 auto" }}>
        <div
          ref={wrapRef}
          style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: BASE_PAGE_WIDTH, height: iframeH }}
        >
          {srcDoc ? (
            <iframe
              ref={iframeRef}
              title="Resume preview"
              srcDoc={srcDoc}
              onLoad={onLoad}
              style={{ width: BASE_PAGE_WIDTH, height: iframeH, border: "0", background: "#525659" }}
            />
          ) : (
            <div style={{ width: BASE_PAGE_WIDTH, height: 1123, background: "#fff" }} />
          )}
        </div>
      </div>
    </div>
  );
};
