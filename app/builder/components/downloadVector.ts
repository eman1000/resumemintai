// app/builder/components/downloadVector.ts
// SSR-safe: no top-level browser imports.

export async function downloadCircularAsPDF(
  container: HTMLElement,
  filename = "resume.pdf"
) {
  // Load browser-only libs at runtime:
  const [{ jsPDF }, svg2pdfMod] = await Promise.all([
    import("jspdf"),
    import("svg2pdf.js"),
  ]);

  // Handle both export shapes
  // @ts-ignore
  const svg2pdf = svg2pdfMod?.svg2pdf ?? svg2pdfMod?.default;
  if (!svg2pdf) throw new Error("svg2pdf not available (bad import)");

  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "p" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  // Each page must be wrapped like: <div class="resume-page"><svg>...</svg></div>
  const svgs = container.querySelectorAll<SVGSVGElement>(".resume-page svg");
  if (!svgs.length) throw new Error("No pages found (.resume-page svg)");

  svgs.forEach((svg, i) => {
    if (i > 0) pdf.addPage();
    svg2pdf(svg, pdf, { x: 0, y: 0, width: pageW, height: pageH });
  });

  pdf.save(filename);
}
