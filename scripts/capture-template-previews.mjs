#!/usr/bin/env node
/**
 * Capture marketing thumbnails for every resume + cover-letter template by
 * hitting the public /render/preview/* routes with Puppeteer.
 *
 * Usage:
 *   1. yarn dev   (in another terminal)
 *   2. node scripts/capture-template-previews.mjs
 *
 * Outputs:
 *   public/template-previews/resume/{renderer}.png       (A4 full)
 *   public/template-previews/resume/{renderer}.thumb.png (640px wide, top crop)
 *   public/template-previews/cover-letter/{renderer}.png
 *   public/template-previews/cover-letter/{renderer}.thumb.png
 */

import puppeteer from 'puppeteer';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(REPO_ROOT, 'public', 'template-previews');

const BASE = process.env.PREVIEW_BASE_URL || 'http://localhost:3000';

const RESUME_RENDERERS = [
  'circular', 'professional', 'elegant', 'classic', 'modern', 'minimal',
  'creative', 'compact', 'executive', 'chrono', 'horizontal', 'casual',
];

const COVER_LETTER_RENDERERS = ['professional', 'classic', 'elegant', 'creative'];

// A4 at 96dpi = 794 x 1123 px. Use deviceScaleFactor 2 for retina-quality output.
const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

async function capture(browser, url, fullPath, thumbPath) {
  const page = await browser.newPage();
  await page.setViewport({ width: A4_WIDTH, height: A4_HEIGHT * 2, deviceScaleFactor: 2 });
  console.log(`  → ${url}`);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => document.title === 'PREVIEW_READY', { timeout: 15000 }).catch(() => {
    console.warn('  ⚠ PREVIEW_READY signal not received; capturing anyway');
  });
  // Settle fonts + images
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    const imgs = Array.from(document.images || []);
    await Promise.all(imgs.map((img) =>
      new Promise((resolve) => {
        if (img.complete) return resolve();
        img.onload = () => resolve();
        img.onerror = () => resolve();
      }),
    ));
  });

  // Measure the actual content bottom by scanning the rendered first-page SVG
  // for its last drawn element. SVGs declare A4 dimensions even when their
  // content stops short — so we walk children and find the deepest one.
  const contentHeight = await page.evaluate((maxH) => {
    const root = document.querySelector('[data-preview-root="1"]');
    if (!root) return maxH;
    const firstSvg = root.querySelector('svg');
    if (!firstSvg) return Math.min(maxH, Math.ceil(root.getBoundingClientRect().height));
    const svgRect = firstSvg.getBoundingClientRect();
    let maxBottom = svgRect.top + 50; // safety floor
    const els = Array.from(firstSvg.querySelectorAll('*'));
    for (const el of els) {
      // Skip definitions / backgrounds that span the full page.
      const tag = el.tagName.toLowerCase();
      if (tag === 'defs' || tag === 'clippath' || tag === 'lineargradient' || tag === 'stop' || tag === 'pattern') continue;
      try {
        const r = el.getBoundingClientRect();
        // Filter the page-background rect (full SVG height + width).
        if (r.width >= svgRect.width - 1 && r.height >= svgRect.height - 1) continue;
        if (r.bottom > maxBottom) maxBottom = r.bottom;
      } catch {}
    }
    // Translate to "from top of viewport" with a 16px breathing room.
    return Math.min(maxH, Math.ceil(maxBottom - root.getBoundingClientRect().top + 16));
  }, A4_HEIGHT);

  await page.screenshot({
    path: fullPath,
    type: 'png',
    clip: { x: 0, y: 0, width: A4_WIDTH, height: contentHeight },
    omitBackground: false,
  });

  // Thumbnail at half size with same content-clip.
  const thumbScale = 480 / A4_WIDTH;
  await page.setViewport({ width: 480, height: Math.ceil(A4_HEIGHT * 2 * thumbScale), deviceScaleFactor: 2 });
  await page.screenshot({
    path: thumbPath,
    type: 'png',
    clip: { x: 0, y: 0, width: 480, height: Math.ceil(contentHeight * thumbScale) },
  });
  await page.close();
}

async function main() {
  await fs.mkdir(path.join(OUT_DIR, 'resume'), { recursive: true });
  await fs.mkdir(path.join(OUT_DIR, 'cover-letter'), { recursive: true });

  console.log(`Capturing previews from ${BASE} …`);
  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    console.log('Resume templates:');
    for (const r of RESUME_RENDERERS) {
      const url = `${BASE}/render/preview/resume/${r}`;
      const full = path.join(OUT_DIR, 'resume', `${r}.png`);
      const thumb = path.join(OUT_DIR, 'resume', `${r}.thumb.png`);
      try {
        await capture(browser, url, full, thumb);
        console.log(`  ✓ ${r}`);
      } catch (e) {
        console.error(`  ✗ ${r}: ${e.message}`);
      }
    }
    console.log('Cover letter templates:');
    for (const r of COVER_LETTER_RENDERERS) {
      const url = `${BASE}/render/preview/cover-letter/${r}`;
      const full = path.join(OUT_DIR, 'cover-letter', `${r}.png`);
      const thumb = path.join(OUT_DIR, 'cover-letter', `${r}.thumb.png`);
      try {
        await capture(browser, url, full, thumb);
        console.log(`  ✓ ${r}`);
      } catch (e) {
        console.error(`  ✗ ${r}: ${e.message}`);
      }
    }
  } finally {
    await browser.close();
  }
  console.log(`Done. Output: ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
