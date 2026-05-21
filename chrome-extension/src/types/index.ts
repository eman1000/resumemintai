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
  | { type: "GET_CHROME_IDENTITY" }
  | { type: "FILL_FORM"; mode?: "fill" | "fill_submit" }
  | { type: "OPEN_SIDE_PANEL" }
  | { type: "AI_FILL_FIELDS"; fields: AiField[] }
  | { type: "LOG_APPLY"; ats: string; jobUrl: string; jobSnapshot?: any }
  // Agent loop messages (side panel ↔ content script)
  | { type: "AGENT_SNAPSHOT" }
  | { type: "AGENT_EXECUTE"; action: AgentAction }
  | { type: "AGENT_CLICK_GOOGLE_SIGNIN" }
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

// ---- Agent loop -----------------------------------------------------------

/** Form field scraped from the current page. */
export type AgentField = {
  id: string;
  label: string;
  type: string; // text/email/tel/select/radio/checkbox/file/textarea/...
  required?: boolean;
  options?: string[]; // for select/radio
  placeholder?: string;
  currentValue?: string;
};

/** Slimmed page snapshot the side panel sends to /api/extension/agent. */
export type AgentSnapshot = {
  url: string;
  title: string;
  /** "application_form" | "login" | "post_submit" | "unknown" — content-script's best guess. */
  pageType: string;
  fields: AgentField[];
  /** Visible button labels (subset; helps the LLM choose which to click). */
  buttons: Array<{ id: string; text: string }>;
  /** First ~2000 chars of relevant page text. */
  bodyText: string;
  /** "Sign in with Google"-style provider buttons the agent can request a click on. */
  ssoProviders?: Array<"google" | "linkedin" | "github" | "apple" | "microsoft">;
};

/** Job context the user attaches to this agent run. */
export type AgentJobContext = {
  title?: string;
  company?: string;
  description?: string;
  sourceUrl?: string;
};

/** Single agent decision. Side panel iterates this loop. */
export type AgentAction =
  | { type: "fill"; fields: Record<string, string>; reasoning?: string }
  | { type: "select_resume"; resumeId: string; reason?: string }
  | { type: "tailor"; baseResumeId: string; jobText: string }
  | { type: "needs_login"; providers: string[]; message?: string }
  | { type: "use_google_signin"; email?: string }
  | { type: "click"; selector: string; reason?: string }
  | {
      type: "ask_user";
      questions: Array<{
        fieldId: string;
        label: string;
        type: string;
        options?: string[];
        required?: boolean;
      }>;
    }
  | { type: "submit"; confidence: number }
  | { type: "done"; message?: string };

/** What the side panel POSTs to /api/extension/agent each turn. */
export type AgentRequest = {
  snapshot: AgentSnapshot;
  jobContext?: AgentJobContext;
  /** Previous actions + their results, oldest first. */
  history: Array<{
    action: AgentAction;
    result?: "success" | "failed" | "skipped";
    note?: string;
  }>;
  /** Answers the user has given to previous ask_user prompts. */
  userAnswers?: Record<string, string>;
};

/** Response from /api/extension/agent. */
export type AgentResponse = {
  action: AgentAction;
  confidence: number; // 0..1
  reasoning?: string;
  /** Which resume the agent thinks should be used (for the side panel to display). */
  selectedResumeId?: string;
};

/** Stored agent run — kept in chrome.storage.local during a single application. */
export type AgentRunState = {
  startedAt: number;
  jobContext?: AgentJobContext;
  history: AgentRequest["history"];
  userAnswers: Record<string, string>;
  selectedResumeId?: string;
};
