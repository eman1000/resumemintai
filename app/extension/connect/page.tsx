// app/extension/connect/page.tsx
//
// Pairing page opened by the Chrome extension popup. Asks the user to sign in
// via Firebase (existing flow), exchanges their ID token for a long-lived
// ExtensionToken, then ships it to the extension via
// chrome.runtime.sendMessage(extensionId, …) — allowed because the
// resumemintai.com origin is in the extension's `externally_connectable`.

import type { Metadata } from "next";
import ConnectClient from "./ConnectClient";

export const metadata: Metadata = {
  title: "Connect ResumeMint Apply",
  description: "Pair the ResumeMint Apply Chrome extension to your account.",
  robots: { index: false, follow: false },
};

export default function ConnectPage({ searchParams }: { searchParams: { ext?: string } }) {
  return <ConnectClient extensionId={searchParams.ext || ""} />;
}
