// lib/schema.ts

export type Reference = {
  name: string;
  title?: string;
  company?: string;
  phone?: string;
  email?: string;
};

export type Theme = {
  sidebar?: string;  // e.g. "#1f3140"
  accent?: string;   // e.g. "#2a5b78"
};

export type ResumeData = {
  name?: string;
  contact?: { email?: string; phone?: string; website?: string; location?: string };
  summary?: string;
  skills: { core: string[]; tools: string[]; soft: string[] };
  experience: Array<{ role?: string; company?: string; location?: string; start?: string; end?: string; bullets: string[] }>;
  education: Array<{ degree?: string; school?: string; location?: string; dates?: string; notes: string[] }>;
  achievements: string[];
  schemaVersion: 1;

    // NEW optional
  languages?: string[];
  references?: Reference[];
  theme?: Theme;

};

export const EMPTY: ResumeData = {
  schemaVersion: 1,
  skills: { core: [], tools: [], soft: [] },
  experience: [],
  education: [],
  achievements: [],
  languages: [],
  references: [],
  theme: { sidebar: '#1f3140', accent: '#2a5b78' },
};
