import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find jobs — AI-matched to your resume",
  description:
    "Search live job postings, see how each role matches your resume, and apply with one click using ResumeMint's auto-apply tools.",
  alternates: { canonical: "/jobs" },
  openGraph: {
    url: "/jobs",
    title: "Find jobs — AI-matched to your resume | ResumeMint",
    description:
      "Live job listings ranked by how well they match your resume. Apply in seconds.",
    images: [
      {
        url: "/api/og?eyebrow=JOBS&title=Find+jobs+matched+to+your+resume&subtitle=Apply+in+seconds",
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
