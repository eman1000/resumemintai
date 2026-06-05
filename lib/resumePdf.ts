// lib/resumePdf.ts
//
// Renders a saved resume to PDF by pointing Puppeteer at our internal
// /render/resume/[id]/print route. The print page waits one paint after
// mounting and sets document.title = 'PRINT_READY'; we wait for that
// signal before snapping the PDF.

async function launchBrowser() {
  try {
    // @sparticuz/chromium ships a LINUX binary — correct on Vercel, but on a
    // local mac/windows dev machine it extracts an unrunnable Chromium and
    // the render hangs until timeout. Only use it on Linux.
    if (process.platform !== 'linux') throw new Error('local dev: use full puppeteer');
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
  } catch {
    /* fall through to local puppeteer */
  }
  const puppeteer = await import('puppeteer');
  return await puppeteer.launch({
    // @ts-ignore
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

export async function renderResumePdfFromId({
  resumeId,
  token,
  origin,
}: {
  resumeId: string;
  token: string;
  origin: string;
}): Promise<Buffer> {
  const url = `${origin.replace(/\/$/, '')}/render/resume/${resumeId}/print?t=${encodeURIComponent(token)}`;

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30_000 });

    // Print client sets document.title to PRINT_READY once the resume has
    // had one paint to settle. 30s, not 10s: x64-Node-under-Rosetta dev
    // machines render Chrome through translation and routinely take >10s.
    await page.waitForFunction(() => document.title === 'PRINT_READY', { timeout: 30_000 });

    // Fonts + images settle.
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
            }),
        ),
      );
    });

    await page.addStyleTag({
      content: `
        @page { size: A4; margin: 0; }
        html, body { margin: 0; padding: 0; background: white; }
        html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `,
    });

    const pdf = await page.pdf({
      printBackground: true,
      width: '210mm',
      height: '297mm',
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      preferCSSPageSize: false,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close().catch(() => {});
  }
}
