import { defineManifest } from "@crxjs/vite-plugin";

// ResumeMint Chrome extension — Manifest V3.
// Auto-fill job application forms from the user's saved ResumeMint resume.
// Auth handoff from https://www.resumemintai.com/extension/connect via
// `externally_connectable` (no copy/paste tokens needed).
export default defineManifest({
  manifest_version: 3,
  name: "ResumeMint Apply",
  version: "0.2.2",
  description: "Auto-fill job application forms using your ResumeMint resume.",
  icons: { 16: "icons/16.png", 48: "icons/48.png", 128: "icons/128.png" },
  // Clicking the toolbar icon opens the side panel — no popup.
  action: { default_title: "ResumeMint Apply" },
  side_panel: { default_path: "src/sidepanel/index.html" },
  background: { service_worker: "src/background/service-worker.ts", type: "module" },
  permissions: ["storage", "activeTab", "scripting", "sidePanel", "tabs", "identity", "identity.email"],
  host_permissions: [
    "https://www.resumemintai.com/*",
    "https://*.greenhouse.io/*",
    "https://boards.greenhouse.io/*",
    "https://*.lever.co/*",
    "https://jobs.ashbyhq.com/*",
    "https://*.workable.com/*",
    "https://www.linkedin.com/*",
    "https://*.indeed.com/*",
  ],
  content_scripts: [
    {
      matches: [
        "https://*.greenhouse.io/*",
        "https://boards.greenhouse.io/*",
        "https://*.lever.co/*",
        "https://jobs.ashbyhq.com/*",
        "https://*.workable.com/*",
        "https://www.linkedin.com/jobs/*",
        "https://*.indeed.com/*",
        "https://*.myworkdayjobs.com/*",
      ],
      js: ["src/content/content-script.ts"],
      run_at: "document_idle",
    },
  ],
  externally_connectable: {
    matches: ["https://www.resumemintai.com/*", "http://localhost:3000/*"],
  },
  web_accessible_resources: [
    {
      resources: ["src/content/inject.css"],
      matches: ["<all_urls>"],
    },
  ],
});
