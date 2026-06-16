import { defineManifest } from "@crxjs/vite-plugin";

// ResumeMint Chrome extension — Manifest V3.
// Auto-fill job application forms from the user's saved ResumeMint resume.
// Auth handoff from https://www.resumemintai.com/extension/connect via
// `externally_connectable` (no copy/paste tokens needed).
export default defineManifest({
  manifest_version: 3,
  name: "ResumeMint Apply",
  version: "0.7.0",
  description: "Apply to jobs on any site with an AI agent that controls the page like you would.",
  icons: { 16: "icons/16.png", 48: "icons/48.png", 128: "icons/128.png" },
  // Clicking the toolbar icon opens the side panel — no popup.
  action: { default_title: "ResumeMint Apply" },
  side_panel: { default_path: "src/sidepanel/index.html" },
  background: { service_worker: "src/background/service-worker.ts", type: "module" },
  // webNavigation: enumerate frames for the DOM agent.
  // debugger: CDP trusted-input for the computer-use agent (works on any
  //   site that ignores synthetic events — Workday, custom portals).
  // downloads: materialise the resume PDF on disk so native file choosers
  //   can be satisfied via DOM.setFileInputFiles.
  permissions: [
    "storage",
    "activeTab",
    "scripting",
    "sidePanel",
    "tabs",
    "identity",
    "identity.email",
    "webNavigation",
    "debugger",
    "downloads",
  ],
  // <all_urls>: external-apply flows (LinkedIn "Responses managed off
  // LinkedIn") redirect to arbitrary company career sites — the agent
  // follows the redirect and injects its content script there on demand.
  // Fine for self-hosted distribution; for a future Chrome Web Store
  // submission this needs justification or optional_host_permissions.
  host_permissions: ["<all_urls>"],
  content_scripts: [
    {
      matches: [
        "https://*.greenhouse.io/*",
        "https://boards.greenhouse.io/*",
        "https://job-boards.greenhouse.io/*",
        "https://*.lever.co/*",
        "https://jobs.ashbyhq.com/*",
        "https://*.workable.com/*",
        "https://www.linkedin.com/jobs/*",
        "https://*.indeed.com/*",
        "https://*.myworkdayjobs.com/*",
      ],
      js: ["src/content/content-script.ts"],
      run_at: "document_idle",
      // v0.4: ATS application forms (Greenhouse embeds, Workday, Lever) very
      // often live inside iframes — inject into every frame so the snapshot
      // and executor can reach them (G4).
      all_frames: true,
      match_about_blank: true,
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
