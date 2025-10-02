// app/landing/[label]/landingData.ts
export type LandingVariant = {
  seo: { title: string; description: string; ogImage?: string };
  badge: string;
  hero: {
    titleLine1: string;
    titleAccent: string;
    subtitle: string;
    media: { src: string }; // /public path
    primary: { label: string; href: string };
    secondary: { label: string; href: string };
    trust: { kicker: string; body: string }[];
  };
  features: {
    blurb: string;
    items: { icon: string; title: string; text: string }[];
  };
  how: { title: string; text: string }[];
  testimonials: { quote: string; author: string; role: string }[];
  pricing: {
    name: string;
    price: string;
    per: string;
    features: string[];
    cta: { label: string; href: string };
    subtext?: string;
  }[];
  faq: { q: string; a: string }[];
};

export const LANDING_VARIANTS: Record<string, LandingVariant> = {
  /** Default marketing page — /landing/vtdft or /landing/anything-not-defined falls back here */
  vtdft: {
    seo: {
      title: "ResumeMint — AI-tailored resumes that pass ATS",
      description:
        "Paste your resume + job description. ResumeMint rewrites bullets, adds keywords, and exports pixel-perfect PDFs that pass ATS.",
      ogImage: "/og/resumemint.png",
    },
    badge: "AI Resume Builder",
    hero: {
      titleLine1: "Tailor your resume in",
      titleAccent: "seconds",
      subtitle:
        "Paste your work history and the job description. ResumeMint optimizes your bullets, adds relevant keywords, and lays it out in clean, professional templates.",
      media: { src: "/images/preview-resume.png" }, // add an image to /public
      primary: { label: "Launch ResumeMint", href: "/app" },
      secondary: { label: "See sample resume", href: "/samples/senior-fe" },
      trust: [
        { kicker: "20k+", body: "resumes optimized" },
        { kicker: "ATS-friendly", body: "templates & keywords" },
        { kicker: "PDF export", body: "high-fidelity" },
      ],
    },
    features: {
      blurb:
        "Everything you need to go from generic resume to role-targeted in minutes.",
      items: [
        { icon: "⚡️", title: "One-click tailoring", text: "We rewrite bullets to match the JD and highlight impact with metrics." },
        { icon: "🔍", title: "ATS keyword boost", text: "Extracts the right keywords and weaves them in naturally." },
        { icon: "🧱", title: "Beautiful templates", text: "Pick from ATS-safe, recruiter-approved designs. Export perfect PDFs." },
        { icon: "🧠", title: "Skills deduping", text: "Smart grouping of core/tools/soft skills — no repetition." },
        { icon: "🗂️", title: "Multi-version", text: "Create variants per role/seniority with a single click." },
        { icon: "🔒", title: "Private by default", text: "Your data stays in your account; delete anytime." },
      ],
    },
    how: [
      { title: "Paste your resume", text: "Drop your current resume or work history." },
      { title: "Add the job description", text: "We align bullets with the role and inject missing skills." },
      { title: "Export PDF", text: "Choose a template, tweak wording, and download." },
    ],
    testimonials: [
      { quote: "Got 3x more callbacks week one.", author: "Priya K.", role: "Senior Frontend Engineer" },
      { quote: "Tailoring took minutes instead of hours.", author: "Dan R.", role: "Product Designer" },
      { quote: "Recruiter said it was the clearest resume they’d seen.", author: "Maya L.", role: "Data Scientist" },
    ],
    pricing: [
      {
        name: "Starter",
        price: "Free",
        per: "forever",
        features: ["1 tailored resume", "Basic templates", "Keyword suggestions"],
        cta: { label: "Get started", href: "/app" },
        subtext: "No credit card required.",
      },
      {
        name: "Pro",
        price: "$7",
        per: "month",
        features: ["Unlimited tailoring", "All templates + PDF export", "Cover letter generator", "Priority updates"],
        cta: { label: "Upgrade to Pro", href: "/billing" },
        subtext: "Cancel anytime.",
      },
    ],
    faq: [
      { q: "Is this ATS compliant?", a: "Yes. Our default templates avoid tables, images in content, and unusual fonts that can confuse parsers." },
      { q: "Do you store my resume?", a: "We store it in your account so you can edit and export; you can delete it anytime." },
      { q: "Can I use my own template?", a: "Yes. Paste an HTML/Mustache template in the Template Admin and use it instantly." },
      { q: "Do you support cover letters?", a: "Yep—click ‘Generate Cover Letter’ in the builder." },
    ],
  },

  /** Example variant for A/B tests: /landing/swe */
  swe: {
    // You can override any copy/media for a different audience (e.g., engineers)
    // @ts-ignore
    ...this?.vtdft, // TS hint only; if you prefer, copy the object manually
  } as any,
};
