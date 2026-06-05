# ResumeMint Extension Agent Upgrade Plan

Goal: upgrade the extension agent to "Claude for Chrome"-level intelligence while
keeping the existing safety rails (auto-submit gating, PRO quota metering, PII
stripping). Produced 2026-06-05 against v0.3.0 (commit 6a8f1f4).

## Gap validation against the actual code

| # | Claimed gap | Verdict | Evidence |
|---|---|---|---|
| 1 | One action per round-trip, no batching | **CONFIRMED** | `route.ts` returns a single `action`; `agentLoop.ts` executes one then re-snapshots. Server `max_tokens: 1024`. |
| 2 | Narrow action vocab (no coords, scroll, dropdown, file, keyboard) | **CONFIRMED + worse than stated** | `AgentAction` union in `types/index.ts` has only fill/select_resume/tailor/needs_login/use_google_signin/click/ask_user/submit/done. `executor.ts` `setValue` handles native `<select>` by option-text match, but **custom comboboxes/listboxes (role=combobox) cannot be actioned at all** — snapshot reads them, executor's `findField`/`setValue` only touch input/textarea/select. Radiogroups are read but not fillable. No scroll, no coordinates, no keyboard, no file. |
| 3 | Limited self-correction / re-verify | **PARTIALLY CONFIRMED** | It DOES re-screenshot + re-snapshot every turn (`agentLoop.ts` loop), and has `waitForSettled` (MutationObserver, 600ms quiet / 4s max). But there is **no post-action verification** — `fill` reports `ok` if any field was set in the DOM, never confirms the value stuck (React rejections, masked/validated inputs). No retry-with-different-strategy. No-progress detection exists (`MAX_NO_PROGRESS_TURNS=3`) but just bails. |
| 4 | iframe / shadow DOM coverage | **CONFIRMED — high severity** | Content script manifest has **no `all_frames: true`**; `match_about_blank` absent. `buildSnapshot` uses bare `document.querySelectorAll` — no shadow-DOM traversal, no iframe descent. Greenhouse `job-boards.greenhouse.io` embeds, Lever embeds, and Workday's nested iframes are **completely invisible**. `captureVisibleTab` screenshot does see them visually, but the agent has no field IDs to act on, and the executor can't reach into a frame. |
| 5 | Long pages / no scrolling | **CONFIRMED** | System prompt forbids scrolling; no scroll action; snapshot caps `bodyText` at 2000 chars and fields at 80. Below-fold fields ARE in the DOM snapshot (querySelectorAll is not viewport-bound, only 0-size filtered) — but the **screenshot only shows the visible region**, so vision reasoning is blind below the fold, and the agent can't bring a field into view to click custom widgets. |
| 6 | File upload (resume PDF attach) | **CONFIRMED — the #1 gap** | No `file` action type. `generic.ts` and `utils.ts` explicitly skip `type=file`. System prompt: "File uploads: skip. Return done." Greenhouse/Lever/Workday/most ATS **require** a resume PDF, so the agent literally cannot finish a real application today. |

### Additional gaps found in code review

- **G7 — Checkboxes/consent never handled.** Snapshot's `FIELD_SELECTOR` excludes `input[type=checkbox]` and `input[type=radio]` entirely (only `role=radiogroup` is picked up). Consent checkboxes ("I agree to privacy policy") block submission on nearly every ATS and the agent can't see or tick them.
- **G8 — Custom dropdowns are read-only to the executor.** Snapshot maps `role=combobox/listbox` to type `select`, but `executor.setValue` only handles native `<select>`/input/textarea. The LLM will emit a `fill` for a Workday/Greenhouse react-select and it will silently no-op.
- **G9 — Click allowlist is duplicated and drift-prone.** The allowed-button regex lives in BOTH the server system prompt and `executor.ts` — and they already disagree. New ATS step buttons (Lever "Submit application", Workday "Save and Continue", "Next: Personal Information") get refused.
- **G10 — `pos:` field IDs are unstable across turns.** `fieldKey` falls back to positional index over a live querySelectorAll; after a fill that triggers re-render, `pos:N` points at a different element. Combined with no post-fill verification → wrong-field fills.
- **G11 — No application logging on agent completion.** `logApply` exists in `api.ts` and `/api/extension/log-apply` exists, but `agentLoop.ts` never calls it. Submitted applications aren't tracked.
- **G12 — PII stripping is thinner than claimed.** Password/hidden fields stripped and text capped, but `bodyText` (2000 chars) + full screenshot go to the model every turn; non-target-form data on the page is not isolated.

## Architectural decision: bespoke action union vs. computer-use (`computer_20250124`)

**Keep the bespoke DOM action union as the primary path; add a coordinate-based fallback. Do NOT switch wholesale to computer-use.**

- DOM actions are deterministic, cheap, auditable. The safety rails (click allowlist, drift anchor, auto-submit gating) are expressed over semantic DOM targets — coordinate clicks make the allowlist near-impossible to enforce.
- DOM gives stable IDs and current values, enabling skip-already-filled and verify-after-fill; coordinates can't.
- Cost/latency: computer-use needs full-res screenshots every step; the bespoke path can run DOM-only on the OpenAI fallback.

Where coordinates DO earn their place: custom widgets the DOM executor can't drive (react-select, Workday pseudo-controls) and below-fold interaction once scrolling exists. Adopt the computer-use *action grammar* (click_at, scroll, key, type) as a gated escape hatch validated by `executor.ts` — constrained to snapshot-vetted field rects — rather than handing the raw browser to the `computer` tool.

## Phased plan (ranked by impact-per-effort)

### Phase 1 — Resume PDF upload (v0.4.0). Effort: M. Impact: highest single item.
Without this the agent cannot complete the core use case. Server already has `renderResumePdfFromId` (`lib/resumePdf.ts`); the Greenhouse submit route proves the render→buffer→attach pipeline.

- New action type: `{ type: "upload_resume"; fieldId: string; resumeId?: string }` in `types/index.ts` (mirror in server union + `isAllowedAction`).
- Snapshot: add `input[type=file]` to a new `fileFields[]` in `buildSnapshot` (accept attr, label). Keep out of regular `fields` so click-allowlist logic is untouched.
- Executor: new `upload_resume` case. Side panel fetches the rendered PDF (new endpoint `GET /api/extension/resume-pdf?resumeId=` returning the `renderResumePdfFromId` buffer, extension-token auth + new `extension-resume-pdf` AiUsage feature with tight cap), passes bytes to content script, executor builds `File` + `DataTransfer`, assigns to `<input type=file>.files`, dispatches `input`/`change`. (Message payload caps: transfer base64, or content script fetches a signed one-time blob URL.)
- Safety: PDF render quota-metered; only the user's own resume; auto-submit gating unchanged.
- Risk: Workday file inputs are inside iframes (needs Phase 2); LinkedIn Easy Apply uses its own resume picker (special-case); sandboxed/hidden file inputs may need click-to-trigger + programmatic assignment.

### Phase 2 — iframe + shadow-DOM coverage (v0.4.0). Effort: M. Impact: high.
- Manifest: `"all_frames": true`, `"match_about_blank": true`; add `https://job-boards.greenhouse.io/*` and embed hosts to host_permissions + matches.
- Snapshot/executor become frame-aware: per-frame snapshots aggregated by the side panel (field ids tagged with a frame token), via `chrome.scripting.executeScript({ target:{ tabId, allFrames:true }})` or fan-out messaging. Actions execute in the originating frame.
- Shared shadow-DOM-piercing query helper (recursive through `shadowRoot`) for `snapshot.ts` + `executor.ts`.
- Risk: cross-origin iframes need injection from a privileged context (background/side panel) with host permission; field-id namespacing must be stable (ties into G10).

### Phase 3 — Action vocabulary + executor robustness (v0.5.0). Effort: M/L. Impact: high.
Closes G7, G8, G2, G10, plus verify-after-act (G3).
- New actions: `set_checkbox {fieldId, checked}`, `select_option {fieldId, value}` (native AND custom comboboxes — open, type-to-filter, click matching option), `scroll {direction, toFieldId?}`, gated `click_at {x,y}` / `type {text}` / `key {key}` escape hatch.
- Snapshot: checkboxes/radios as first-class fields (with `checked`); enrich custom-control reading (aria-activedescendant, selected option text).
- Executor: post-action verification — re-read value after `fill`/`select_option`, return `ok:false` + note so the planner can retry via the coordinate path. Replace `pos:` IDs with a stable `data-rm-snap-id` stamp (fixes G10).
- Allowlist: consolidate to ONE shared module imported by both server and executor; broaden labels for Lever/Workday step buttons (G9).

### Phase 4 — Multi-step planning + scrolling discipline (v0.5.0/v0.6.0). Effort: L. Impact: medium.
- Server may return an ordered `actions[]` batch per step (e.g. fill 6 fields + tick consent), executed sequentially client-side with settle+verify between each; re-plan on failure or step advance. Cuts round-trips and AiUsage burn (cap math in `aiUsage.ts` assumes 3–8 turns/app).
- Relax "never scroll" to "scroll only within the goal page to reach a known field; never navigate." Pair scroll with re-screenshot (fixes G5). Drift anchor + `urlHasDrifted` remain the hard navigation rail.
- Confirm current Anthropic model id; enable prompt caching on the large static SYSTEM prompt (use the claude-api skill before shipping).

### Phase 5 — Site-specific reliability + tracking (v0.6.0). Effort: M. Impact: medium, retention.
- Per-ATS adapters following the existing `fillers/` registry pattern: Lever, Workday, LinkedIn Easy Apply, Ashby, Workable — stable field maps + known step-button labels.
- Wire `logApply` into `agentLoop.ts` on successful submit/done (G11).
- Tighten PII rail (G12): redact obvious other-person data from `bodyText`; gate screenshot upload behind a privacy setting.

## Version roadmap

- **v0.4.0 — "Can actually finish an application":** Phase 1 + Phase 2. Minimum to complete a real Greenhouse/Lever application end-to-end.
- **v0.5.0 — "Handles the hard widgets":** Phase 3 + batched actions from Phase 4.
- **v0.6.0 — "Reliable per site, tracked":** rest of Phase 4 + Phase 5.

## Safety rails — preserved per phase
- **Auto-submit gating:** untouched; `submit` still requires `autoSubmit && confidence ≥ 0.95` in `agentLoop.ts`. New actions never auto-submit; coordinate clicks excluded as a submit path.
- **PRO quota metering:** every new server call (resume-PDF render, agent turns) goes through `checkAiUsage`/`recordAiUsage` with its own feature key; batching keeps per-application turns near today's 3–8 assumption.
- **PII stripping:** preserved and extended (Phase 5); file upload only ever sends the user's own rendered resume.
- **Drift anchor / no-navigation:** goal pin + `urlHasDrifted` stay the hard rail even with scrolling; click allowlist remains (consolidated).

## Single highest-impact recommendation
**Ship resume-PDF file upload first (Phase 1, v0.4.0).** It's the difference between "fills some fields then gives up" and "completes the application." The server already has the hard part (`renderResumePdfFromId`, proven by the Greenhouse submit route) — the work is a metered `GET /api/extension/resume-pdf` endpoint, an `upload_resume` action, and `DataTransfer` file assignment in the executor. Pair immediately with iframe coverage (Phase 2), because on Greenhouse-embed and Workday the file input lives in an iframe the agent currently cannot even see.

## Critical files
- `app/api/extension/agent/route.ts` — action union, system prompt, allowlist source of truth
- `chrome-extension/src/content/executor.ts` — new action handlers, file upload via DataTransfer, verify-after-act, custom-dropdown driving
- `chrome-extension/src/content/snapshot.ts` — checkboxes/file fields, shadow-DOM/iframe-aware querying, stable field IDs
- `chrome-extension/manifest.config.ts` — all_frames, match_about_blank, embed host patterns
- `chrome-extension/src/sidepanel/agentLoop.ts` — batched-action execution, resume-PDF fetch/transfer, logApply on completion
- `lib/resumePdf.ts` — server-side PDF building block
