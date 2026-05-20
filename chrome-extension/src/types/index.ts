// Shared types between popup, background, and content scripts.

export type FlatResume = {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  city: string;
  country: string;
  website: string;
  linkedIn: string;
  github: string;
  headline: string;
  summary: string;
  experience: Array<{
    role: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    bullets: string[];
  }>;
  education: Array<{
    degree: string;
    school: string;
    startDate: string;
    endDate: string;
  }>;
  skills: string[];
  languages: Array<{ name: string; level: string }>;
};

export type ExtensionMessage =
  | { type: "GET_AUTH" }
  | { type: "SIGN_OUT" }
  | { type: "GET_RESUME" }
  | { type: "FILL_FORM"; mode?: "fill" | "fill_submit" }
  | { type: "OPEN_SIDE_PANEL" }
  | { type: "AI_FILL_FIELDS"; fields: AiField[] }
  | { type: "LOG_APPLY"; ats: string; jobUrl: string; jobSnapshot?: any }
  // Sent from /extension/connect on resumemintai.com via externally_connectable
  | { type: "EXTENSION_TOKEN"; token: string; user: { email: string; uid: string } };

export type AiField = {
  id: string;
  label: string;
  placeholder?: string;
  type?: string; // input type or "select" / "textarea"
  options?: string[];
};

export type StoredAuth = {
  token: string;
  user: { email: string; uid: string };
  obtainedAt: number;
};

export const STORAGE_KEYS = {
  AUTH: "rm_auth",
  RESUME: "rm_resume",
  SETTINGS: "rm_settings",
} as const;

export type Settings = {
  autoSubmit: boolean; // default false
};
