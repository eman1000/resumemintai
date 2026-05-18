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

  // Always emit at exact A4 dimensions so /templates can lock every card
  // to aspect-[210/297] with no per-template variance.
  await page.screenshot({
    path: fullPath,
    type: 'png',
    clip: { x: 0, y: 0, width: A4_WIDTH, height: A4_HEIGHT },
    omitBackground: false,
  });

  const thumbScale = 480 / A4_WIDTH;
  await page.setViewport({ width: 480, height: Math.ceil(A4_HEIGHT * thumbScale), deviceScaleFactor: 2 });
  await page.screenshot({
    path: thumbPath,
    type: 'png',
    clip: { x: 0, y: 0, width: 480, height: Math.ceil(A4_HEIGHT * thumbScale) },
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
