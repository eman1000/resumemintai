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
  | {
      type: "AGENT_EXECUTE";
      action: AgentAction;
      /** Rendered resume PDF for upload_resume actions. */
      filePayload?: { base64: string; filename: string };
    }
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
  /** Send a screenshot of the page to the planner. Default true — required
   * for vision planning; privacy-sensitive users can turn it off (G12). */
  sendScreenshot?: boolean;
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
  /** For checkbox/radio: current checked state. */
  checked?: boolean;
  /** True when this is a custom (non-native) control — combobox/listbox/etc.
   * Tells the planner select_option may need the click-driven path. */
  custom?: boolean;
  /** Viewport rect (x,y,w,h) — lets the planner aim gated click_at actions
   * and reason about what the screenshot shows. */
  rect?: { x: number; y: number; w: number; h: number };
  /** Which frame this field lives in ("top" or the frame's rm token). */
  frameId?: number;
};

/** File-upload input discovered on the page (kept separate from `fields`
 * so the click-allowlist and fill logic never touch them). */
export type AgentFileField = {
  id: string;
  label: string;
  /** The input's accept attribute, e.g. ".pdf,.doc,.docx". */
  accept?: string;
  required?: boolean;
  /** Name of the file already attached, if any. */
  currentFile?: string;
  frameId?: number;
};

/** Slimmed page snapshot the side panel sends to /api/extension/agent. */
export type AgentSnapshot = {
  url: string;
  title: string;
  /** "application_form" | "login" | "post_submit" | "unknown" — content-script's best guess. */
  pageType: string;
  fields: AgentField[];
  /** File-upload inputs (resume attach etc.) — separate from fields. */
  fileFields?: AgentFileField[];
  /** Visible button labels (subset; helps the LLM choose which to click). */
  buttons: Array<{ id: string; text: string; frameId?: number }>;
  /** First ~2000 chars of relevant page text. */
  bodyText: string;
  /** "Sign in with Google"-style provider buttons the agent can request a click on. */
  ssoProviders?: Array<"google" | "linkedin" | "github" | "apple" | "microsoft">;
  /** Detected ATS ("greenhouse" | "lever" | …) — stable hint for the planner. */
  ats?: string | null;
  /** Scroll state so the planner knows whether content exists below the fold. */
  scroll?: { y: number; max: number; viewportH: number };
};

/** Job context the user attaches to this agent run. */
export type AgentJobContext = {
  title?: string;
  company?: string;
  description?: string;
  sourceUrl?: string;
};

/** Captured at "Apply with AI" click — the agent must not drift off this. */
export type AgentGoal = {
  /** URL the user was on when they clicked Apply with AI. */
  originalUrl: string;
  /** Page title at start. */
  originalTitle: string;
  /** Parsed identifying signals (used to detect drift mid-loop). */
  pinned: {
    host: string;
    /** Job ID extracted from the URL (LinkedIn: currentJobId, Greenhouse: gh_jid, etc.). */
    jobId?: string;
  };
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
  | { type: "done"; message?: string }
  // ---- v0.4+ vocabulary ----------------------------------------------------
  /** Attach the user's resume PDF to a file input. The side panel fetches the
   * rendered PDF from the server and hands the bytes to the executor. */
  | { type: "upload_resume"; fieldId: string; resumeId?: string }
  /** Tick/untick a checkbox (consent boxes etc.). */
  | { type: "set_checkbox"; fieldId: string; checked: boolean }
  /** Choose an option in a native OR custom dropdown / radio group. */
  | { type: "select_option"; fieldId: string; value: string }
  /** Scroll the page (or to a specific field) so below-fold content becomes
   * visible to the next screenshot. NEVER navigates. */
  | { type: "scroll"; direction?: "down" | "up"; toFieldId?: string }
  /** GATED escape hatch: click at viewport coordinates. Only honoured when
   * the point falls inside a rect the snapshot reported for a known field
   * (custom widgets the DOM executor can't drive). */
  | { type: "click_at"; x: number; y: number; fieldId: string; reason?: string }
  /** Type literal text into the currently-focused element (after click_at
   * opened a custom combobox, for example). */
  | { type: "type_text"; text: string }
  /** Press a single key (Enter, Escape, ArrowDown, Tab). */
  | { type: "press_key"; key: "Enter" | "Escape" | "ArrowDown" | "ArrowUp" | "Tab" };

/** Ordered multi-action plan — server may return this instead of a single
 * action to cut round-trips (fill 6 fields + tick consent in one turn). */
export type AgentActionBatch = AgentAction[];

/** What the side panel POSTs to /api/extension/agent each turn. */
export type AgentRequest = {
  snapshot: AgentSnapshot;
  jobContext?: AgentJobContext;
  /** Captured at agent-loop start; passed every turn so the LLM stays on-task. */
  goal?: AgentGoal;
  /** Set when the active tab's URL has drifted off the goal. */
  drift?: { from: string; to: string };
  /** Previous actions + their results, oldest first. */
  history: Array<{
    action: AgentAction;
    result?: "success" | "failed" | "skipped";
    note?: string;
  }>;
  /** Answers the user has given to previous ask_user prompts. */
  userAnswers?: Record<string, string>;
  /** Optional PNG screenshot (base64, no data URL prefix) for vision-aware planners. */
  screenshot?: string;
};

/** Response from /api/extension/agent. */
export type AgentResponse = {
  action: AgentAction;
  /** Optional ordered follow-up actions executed client-side after `action`
   * (same turn, settle+verify between each). Server batching (v0.5). */
  actions?: AgentAction[];
  confidence: number; // 0..1
  reasoning?: string;
  /** Which resume the agent thinks should be used (for the side panel to display). */
  selectedResumeId?: string;
  /** Which model planned this turn (e.g. "claude-sonnet-4-6" or "gpt-4o"). */
  modelUsed?: string;
};

/** Stored agent run — kept in chrome.storage.local during a single application. */
export type AgentRunState = {
  startedAt: number;
  jobContext?: AgentJobContext;
  history: AgentRequest["history"];
  userAnswers: Record<string, string>;
  selectedResumeId?: string;
};
