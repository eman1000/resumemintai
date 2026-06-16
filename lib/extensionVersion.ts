// lib/extensionVersion.ts
//
// The latest published ResumeMint Apply extension version. Bump this whenever a
// new extension build is shipped (in lockstep with chrome-extension manifest +
// the install-page version). Installed extensions older than this are blocked
// (the agent protocol / endpoints evolve, so stale builds must be reinstalled).
export const EXTENSION_LATEST_VERSION = "0.7.0";
