// app/builder/_client/captureThumbnail.ts

export async function captureThumbnailFromPreview(
  wrapEl: HTMLElement,
  { scale = 2, background = '#ffffff', selector = 'svg[data-page]' } = {}
): Promise<Blob | null> {
  // Let React paint the latest preview
  await new Promise(requestAnimationFrame);

  const svg = wrapEl.querySelector<SVGSVGElement>(selector) || wrapEl.querySelector('svg');
  if (!svg) return null;

  const dataUrl = await svgToPngDataUrl(svg, scale, background);
  const res = await fetch(dataUrl);
  return await res.blob();
}

function inlineSvg(svg: SVGSVGElement, background?: string) {
  const clone = svg.cloneNode(true) as SVGSVGElement;

  // Optional white background
  if (background) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '0'); rect.setAttribute('y', '0');
    rect.setAttribute('width', '100%'); rect.setAttribute('height', '100%');
    rect.setAttribute('fill', background);
    clone.insertBefore(rect, clone.firstChild);
  }

  // Ensure width/height are explicit (A4 defaults)
  const vb = clone.viewBox?.baseVal;
  const w = Number(clone.getAttribute('width')) || vb?.width || 595.28;
  const h = Number(clone.getAttribute('height')) || vb?.height || 841.89;
  clone.setAttribute('width', String(w));
  clone.setAttribute('height', String(h));

  return { clone, w, h };
}

// app/builder/_client/svgExport.ts
export async function svgToPngDataUrl(
  svg: SVGSVGElement,
  scale = 2,
  background = '#ffffff'
): Promise<string> {
  // Wait for fonts so text doesn’t vanish
  if ((document as any).fonts?.ready) {
    try { await (document as any).fonts.ready; } catch {}
  }

  // Clone to avoid mutating live DOM
  const clone = svg.cloneNode(true) as SVGSVGElement;

  // Ensure explicit size
  const vb = clone.viewBox?.baseVal;
  const w = Number(clone.getAttribute('width')) || vb?.width || 595.28;
  const h = Number(clone.getAttribute('height')) || vb?.height || 841.89;
  clone.setAttribute('width', String(w));
  clone.setAttribute('height', String(h));

  // Optional white background (helps with transparent canvases)
  if (background) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
    rect.setAttribute('x','0'); rect.setAttribute('y','0');
    rect.setAttribute('width','100%'); rect.setAttribute('height','100%');
    rect.setAttribute('fill', background);
    clone.insertBefore(rect, clone.firstChild);
  }

  // Serialize
  const xml = new XMLSerializer().serializeToString(clone);
  const svg64 = typeof window.btoa === 'function'
    ? window.btoa(unescape(encodeURIComponent(xml)))
    : '';
  const src = `data:image/svg+xml;base64,${svg64}`;

  // Rasterize
  const canvas = document.createElement('canvas');
  canvas.width  = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  const img = new Image();
  img.decoding = 'sync';
  img.crossOrigin = 'anonymous';
  img.src = src;

  await new Promise<void>((res, rej) => {
    img.onload = () => { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); res(); };
    img.onerror = () => rej(new Error('Failed to rasterize SVG'));
  });

  return canvas.toDataURL('image/png');
}


export async function uploadThumbnail(
  resumeId: string,
  blob: Blob,
  withAuth: (init?: RequestInit) => Promise<RequestInit>,
) {
  const init = await withAuth({
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: blob,
  });
  const res = await fetch(`/api/resumes/${resumeId}/thumbnail`, init);
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || 'thumbnail_upload_failed');
  }
  return res.json() as Promise<{ url: string }>;
}
