// Shared types + a registry shape for cover-letter templates.

export type CoverLetterData = {
  sender: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    linkedIn?: string;
  };
  recipient: {
    name: string;
    title: string;
    company: string;
    address: string;
    city: string;
  };
  date: string;
  subject: string;
  salutation: string;
  paragraphs: string[];
  closing: string;
  signatureName: string;
};

export type CoverLetterTemplateProps = {
  data: CoverLetterData;
  /** Optional theme primary colour. Each template uses it differently. */
  primary?: string;
  /** Font family override for the body. Defaults vary per template. */
  fontFamily?: string;
  /** Whether this is a preview (e.g. inside a picker) — templates can simplify. */
  preview?: boolean;
};

export type TemplateMeta = {
  id: string;          // route renderer key (e.g. "professional")
  name: string;        // display name
  description: string; // 1-liner shown under thumbnail
  isFree: boolean;
};
