// Capture an HTML element (e.g. the cover-letter preview) as a PNG Blob using
// html-to-image. Used by the cover-letter editor; resumes use the SVG-based
// captureThumbnail because their templates are <svg>.
import { toPng } from 'html-to-image';

export async function captureHtmlThumbnailFromPreview(
  el: HTMLElement,
  { scale = 2, background = '#ffffff' } = {},
): Promise<Blob | null> {
  // Let any layout settle.
  await new Promise(requestAnimationFrame);

  try {
    const dataUrl = await toPng(el, {
      pixelRatio: scale,
      backgroundColor: background,
      cacheBust: true,
      // Skip remote images we can't reach (avoids CORS-fail entire capture)
      // — the cover-letter templates don't currently include user photos, so
      // this is just defence in depth.
      filter: (node) => {
        const n = node as HTMLElement;
        if (n.tagName === 'IFRAME') return false;
        return true;
      },
    });
    const res = await fetch(dataUrl);
    return await res.blob();
  } catch (e) {
    console.warn('[capture-html-thumbnail] failed:', (e as any)?.message || e);
    return null;
  }
}

export async function uploadCoverLetterThumbnail(
  coverLetterId: string,
  blob: Blob,
  withAuth: (init?: RequestInit) => Promise<RequestInit>,
) {
  const init = await withAuth({
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: blob,
  });
  const res = await fetch(`/api/cover-letters/${coverLetterId}/thumbnail`, init);
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.detail || j?.error || `thumbnail_upload_failed (HTTP ${res.status})`);
  }
  return res.json() as Promise<{ url: string }>;
}
