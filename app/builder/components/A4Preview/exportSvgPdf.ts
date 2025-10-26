// exportSvgPdf.ts
import jsPDF from "jspdf";

/** Convert an <svg> to a high-res canvas, then to a PNG dataURL */
async function svgToPngDataUrl(svg: SVGSVGElement, scale = 2): Promise<string> {
  const xml = new XMLSerializer().serializeToString(svg);
  const svg64 = typeof window.btoa === "function" ? window.btoa(unescape(encodeURIComponent(xml))) : "";
  const src = "data:image/svg+xml;base64," + svg64;

  // size from the element (must be explicit width/height on <svg>)
  const w = Number(svg.getAttribute("width")) || svg.viewBox.baseVal.width || 595.28;
  const h = Number(svg.getAttribute("height")) || svg.viewBox.baseVal.height || 841.89;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");

  ctx.imageSmoothingEnabled = true;

  const img = new Image();
  img.decoding = "sync";
  // Important for inline external images inside SVGs
  img.crossOrigin = "anonymous";
  img.src = src;

  await new Promise<void>((res, rej) => {
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      res();
    };
    img.onerror = (e) => rej(new Error("Failed to load SVG image"));
  });

  return canvas.toDataURL("image/png"); // lossless enough for vector-raster
}

/**
 * Export all <svg[data-page]> (or any <svg> inside a container) to a multi-page PDF.
 * Assumes each SVG is sized to A4: 595.28 x 841.89 pt (your current values).
 */
export async function exportSvgContainerToPdf(
  container: HTMLElement,
  {
    filename = "resume.pdf",
    selector = 'svg[data-page]', // falls back to all <svg> if none found
    scale = 2,                   // canvas raster scale for sharper PDF
  }: { filename?: string; selector?: string; scale?: number } = {}
) {
  const found = Array.from(container.querySelectorAll<SVGSVGElement>(selector));
  const svgs = found.length ? found : Array.from(container.querySelectorAll<SVGSVGElement>("svg"));
  if (!svgs.length) throw new Error("No SVG pages found.");

  // jsPDF uses points (pt) by default at 72 DPI. A4 ≈ 595.28 x 841.89 pt
  const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4", compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  for (let i = 0; i < svgs.length; i++) {
    const png = await svgToPngDataUrl(svgs[i], scale);
    if (i > 0) doc.addPage(); // add a page for subsequent images
    doc.addImage(png, "PNG", 0, 0, pageW, pageH, undefined, "FAST");
  }

  doc.save(filename);
}
