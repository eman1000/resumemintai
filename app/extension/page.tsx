import type { Metadata } from "next";
import ExtensionLandingClient from "./ExtensionLandingClient";

export const metadata: Metadata = {
  title: "ResumeMint Apply — Chrome extension",
  description:
    "Install the ResumeMint Apply Chrome extension and let AI auto-fill job application forms from your saved resume.",
  alternates: { canonical: "/extension" },
  openGraph: {
    url: "/extension",
    title: "ResumeMint Apply — Chrome extension",
    description: "AI-powered job application autofill, anywhere.",
    images: [
      {
        url: "/api/og?eyebrow=PRO&title=ResumeMint+Apply+Extension&subtitle=Autofill+job+applications+with+AI",
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function Page() {
  return <ExtensionLandingClient />;
}
