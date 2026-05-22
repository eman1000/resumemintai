import type { Metadata } from "next";
import BecomingClient from "./BecomingClient";

export const metadata: Metadata = {
  title: "Who are you trying to become? | ResumeMint",
  description:
    "A 3-minute identity check for job-seekers stuck between who they are and who they want to be — then a clear way out.",
  alternates: { canonical: "/landing/becoming" },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  openGraph: {
    url: "/landing/becoming",
    title: "Who are you trying to become?",
    description: "A 3-minute identity check for job-seekers in transition.",
    images: [
      {
        url: "/api/og?eyebrow=BECOMING&title=Who+are+you+trying+to+become%3F&subtitle=A+3-minute+question+for+the+next+30+days",
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function Page() {
  return <BecomingClient />;
}
