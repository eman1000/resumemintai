// /app/api/export/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 20;

async function launchBrowser() {
  try {
    const chromium = await import('@sparticuz/chromium');
    const puppeteerCore = await import('puppeteer-core');
    const executablePath = await chromium.default.executablePath();
    if (executablePath) {
      return await puppeteerCore.launch({
        args: [...chromium.default.args, '--no-sandbox', '--disable-setuid-sandbox'],
        // @ts-ignore
        defaultViewport: chromium.default.defaultViewport,
        executablePath,
        // @ts-ignore
        headless: chromium.default.headless,
      });
    }
  } catch {}
  const puppeteer = await import('puppeteer');
  return await puppeteer.launch({
    // @ts-ignore
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

function extractStylesheetHrefs(html: string): string[] {
  const relSheets = [
    ...html.matchAll(/<link[^>]+rel=["']?stylesheet["']?[^>]*href=["']([^"']+)["'][^>]*>/gi),
  ].map((m) => m[1]);
  const gfonts = [
    ...html.matchAll(/<link[^>]+href=["']([^"']*fonts\.googleapis[^"']*)["'][^>]*>/gi),
  ].map((m) => m[1]);
  return Array.from(new Set([...relSheets, ...gfonts]));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const htmlInput = typeof body?.html === 'string' ? body.html : null;
    const urlInput  = typeof body?.url  === 'string' ? body.url  : null;
    // Optional override: "media": "print" | "screen"
    let requestedMedia: 'print' | 'screen' | undefined = body?.media;

    if (!htmlInput && !urlInput) {
      return NextResponse.json({ error: 'No HTML or URL provided.' }, { status: 400 });
    }

    // Default media: preserve backgrounds for custom HTML, use print for URL
    const media: 'print' | 'screen' =
      requestedMedia ?? (htmlInput ? 'screen' : 'print');

    const browser = await launchBrowser();
    const page = await browser.newPage();

    // Set the media type
    await page.emulateMediaType(media);

    if (urlInput) {
      await page.goto(urlInput, { waitUntil: 'networkidle2' });
    } else if (htmlInput) {
      await page.setContent(htmlInput, { waitUntil: 'domcontentloaded' });

      // Inline ALL external stylesheets so styles are guaranteed present
      const hrefs = extractStylesheetHrefs(htmlInput);
      for (const href of hrefs) {
        try {
          const res = await fetch(href);
          if (!res.ok) continue;
          const css = await res.text();
          await page.addStyleTag({ content: css });
        } catch {}
      }
    }

    // Normalize PDF sizing and color fidelity
    await page.addStyleTag({
      content: `
        @page { size: A4; margin: 0; }
        html, body { width: 210mm; height: 297mm; margin: 0; }
        html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `,
    });

    // If we’re in print mode but you STILL want body backgrounds,
    // uncomment the following stronger override:
    // await page.addStyleTag({
    //   content: `@media print {
    //     html, body, .resume {
    //       -webkit-print-color-adjust: exact !important;
    //       print-color-adjust: exact !important;
    //       background-color: inherit !important;
    //       background-image: inherit !important;
    //     }
    //   }`,
    // });

    // Wait for fonts & images to finish
    await page.evaluate(async () => {
      // @ts-ignore
      if (document.fonts && document.fonts.ready) {
        // @ts-ignore
        await document.fonts.ready;
      }
      const imgs = Array.from(document.images || []);
      await Promise.all(
        imgs.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) return resolve();
              img.onload = () => resolve();
              img.onerror = () => resolve();
            })
        )
      );
    });

    // Small settle
    await page.waitForNetworkIdle({ idleTime: 100, timeout: 2000 }).catch(() => {});

    // Exact A4; put padding/margins inside your template (e.g., .resume { padding: 16mm; })
    const pdf = await page.pdf({
      printBackground: true,
      width: '210mm',
      height: '297mm',
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      preferCSSPageSize: false,
    });

    await browser.close();
// @ts-ignore
    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="resume.pdf"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('EXPORT ERROR:', err);
    return NextResponse.json({ error: err?.message || 'failed to render pdf' }, { status: 500 });
  }
}
