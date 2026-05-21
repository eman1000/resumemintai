import type { Metadata } from "next";
import InstallClient from "./InstallClient";

export const metadata: Metadata = {
  title: "Install the ResumeMint Apply extension",
  description:
    "Download the ResumeMint Apply Chrome extension and follow the step-by-step instructions to load it into Chrome.",
  alternates: { canonical: "/extension/install" },
  robots: { index: true, follow: true },
  openGraph: {
    url: "/extension/install",
    title: "Install the ResumeMint Apply extension",
    description: "Download + 4-step install guide for Chrome.",
    images: [
      {
        url: "/api/og?eyebrow=INSTALL&title=ResumeMint+Apply+Extension&subtitle=4+steps+to+auto-fill+job+forms",
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function Page() {
  return <InstallClient />;
}
