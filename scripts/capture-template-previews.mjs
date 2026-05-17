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

async function capture(browser, url, fullPath, thumbPath) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });
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

  // Try to capture just the resume/cover-letter container, fall back to viewport.
  let clip = null;
  try {
    const root = await page.$('[data-preview-root="1"]');
    if (root) {
      const box = await root.boundingBox();
      if (box && box.width > 0 && box.height > 0) {
        clip = {
          x: Math.max(0, box.x),
          y: Math.max(0, box.y),
          width: Math.min(box.width, 1240),
          // Cap at A4 height — some templates have long bottom whitespace.
          height: Math.min(box.height, 1754),
        };
      }
    }
  } catch {}

  await page.screenshot({
    path: fullPath,
    type: 'png',
    clip: clip ?? undefined,
    omitBackground: false,
  });

  // Generate a square-ish 640x800 thumbnail by re-screenshotting at smaller viewport.
  // Easier than node-side image processing.
  await page.setViewport({ width: 640, height: 800, deviceScaleFactor: 2 });
  await page.screenshot({ path: thumbPath, type: 'png' });
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
