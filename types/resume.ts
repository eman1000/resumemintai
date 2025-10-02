export interface JobItem {
  role: string;
  company?: string;
  location?: string;
  start?: string; // "Jan 2022"
  end?: string;   // "Present" or "Dec 2023"
  bullets: string[]; // 3–6 quantified bullets
}

export interface EducationItem {
  degree: string;
  school: string;
  dates?: string;     // "2014 – 2018"
  notes?: string[];   // honors, GPA, coursework
}

export interface Resume {
  name: string;
  contact: {
    email?: string;
    phone?: string;
    website?: string;
    location?: string;
  };
  summary: string;
  skills: {
    core: string[];   // primary stack/competencies
    tools: string[];  // frameworks, libs, cloud
    soft: string[];   // teamwork, leadership, etc.
  };
  experience: JobItem[];
  education: EducationItem[];
  achievements?: string[];
  keywords?: string[];   // extracted from JD
  ats_notes?: string[];  // warnings, suggestions
}
