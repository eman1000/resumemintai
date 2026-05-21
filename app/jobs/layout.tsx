import type { Metadata } from "next";
import { faqPageLd, jsonLdScript, SITE } from "@/lib/seo-ld";

const jobsFaqs = [
  {
    q: "Do I need to sign up to see jobs?",
    a: "No — the first jobs are visible to everyone. To unlock the full list and personalised match scores against your resume, sign in and import your resume.",
  },
  {
    q: "Where do the job listings come from?",
    a: "ResumeMint aggregates live postings via JSearch (RapidAPI), which pulls jobs from LinkedIn, Indeed, Greenhouse, Lever, Ashby, Workable and other ATS providers.",
  },
  {
    q: "How is this different from LinkedIn Jobs?",
    a: "ResumeMint ranks every job by how well it matches your saved resume, so you skip postings you have no chance of getting and focus on the ones that actually fit your background.",
  },
  {
    q: "Can I apply directly from ResumeMint?",
    a: "Yes — install the ResumeMint Apply Chrome extension and we auto-fill Greenhouse, Lever, Ashby, Workable and other application forms using your saved resume. You always click Submit yourself.",
  },
];

const webPageLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${SITE.url}/jobs`,
  url: `${SITE.url}/jobs`,
  name: "Find jobs matched to your resume",
  description:
    "Search live job postings from Greenhouse, Lever, Ashby, Workable, LinkedIn and Indeed, ranked by how well each role matches your saved resume.",
  isPartOf: { "@id": `${SITE.url}/#website` },
  about: { "@id": `${SITE.url}/#org` },
};

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
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(webPageLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(faqPageLd(jobsFaqs))} />
      {children}
    </>
  );
}
