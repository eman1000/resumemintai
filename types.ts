export type Seniority = "junior" | "mid" | "senior";
export type Tone = "professional" | "friendly" | "impactful" | "concise";

export interface ResumeInput {
  resumeText: string;
  jobDescription?: string;
  role?: string;
  seniority?: Seniority;
  tone?: Tone;
}

export interface ExperienceItem {
  role: string;
  company?: string;
  bullets: string[];
}

export type Reference = {
  name: string;
  title?: string;
  company?: string;
  phone?: string;
  email?: string;
};

export interface ResumeOutput {
  education(education: any): unknown;
  summary: string;
  skills: {
    core: string[];
    tools: string[];
    soft: string[];
  };
  experience: ExperienceItem[];
  achievements?: string[];
  keywords: string[];
  ats_notes: string[];
    languages?: string[];              // e.g., ["English (Fluent)", "French (Fluent)"]
  references?: Reference[];          // optional references
  // Optional theming for templates like this one:
  theme?: {
    sidebar?: string;                // hex like "#1f3140"
    accent?: string;                 // hex like "#2f6f95"
  };
}
