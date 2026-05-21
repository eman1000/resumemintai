#!/usr/bin/env node
// Builds the Chrome extension and zips it into public/extension/ for download
// from /extension/install. Re-run whenever the extension source changes.
//
// Usage:
//   node scripts/build-extension-zip.mjs

import { execSync } from "node:child_process";
import { readFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const EXT_DIR = join(ROOT, "chrome-extension");
const DIST_DIR = join(EXT_DIR, "dist");
const PUBLIC_DIR = join(ROOT, "public", "extension");

function run(cmd, opts = {}) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: "inherit", ...opts });
}

if (!existsSync(EXT_DIR)) {
  console.error(`Extension folder not found: ${EXT_DIR}`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(join(EXT_DIR, "package.json"), "utf8"));
const version = pkg.version || "0.0.0";
const zipName = `resumemint-apply-v${version}.zip`;

if (!existsSync(join(EXT_DIR, "node_modules"))) {
  run("yarn install", { cwd: EXT_DIR });
}

if (existsSync(DIST_DIR)) rmSync(DIST_DIR, { recursive: true, force: true });
run("yarn build", { cwd: EXT_DIR });

mkdirSync(PUBLIC_DIR, { recursive: true });
const outZip = join(PUBLIC_DIR, zipName);
if (existsSync(outZip)) rmSync(outZip);
run(`zip -rq "${outZip}" .`, { cwd: DIST_DIR });

const latestLink = join(PUBLIC_DIR, "resumemint-apply-latest.zip");
if (existsSync(latestLink)) rmSync(latestLink);
run(`cp "${outZip}" "${latestLink}"`);

console.log(`\n✓ ${zipName} built and copied to public/extension/`);
console.log(`  Latest alias: public/extension/resumemint-apply-latest.zip`);
