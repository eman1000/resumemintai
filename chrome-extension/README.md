# ResumeMint Apply — Chrome extension

Auto-fills job application forms with the user's ResumeMint resume.

## What it does
- Detects the ATS on the current page (Greenhouse, Lever, Ashby, Workable, Workday, LinkedIn, Indeed).
- Lives in Chrome's **Side Panel** (the right-side panel introduced in Chrome 114+). Click the
  toolbar icon — or the floating "Apply with ResumeMint" button on a job page — to open it.
- The side panel shows the active tab, the detected ATS, the cached resume, and a
  big "Fill this form" button.
- On click, fills the form from the user's saved resume.
  - Greenhouse uses a deterministic name/email/phone/etc. mapper.
  - Anything else uses AI (`/api/extension/fill-fields`) to map labels → resume values.
- Auth handoff: opens `https://www.resumemintai.com/extension/connect` in a tab, which pairs the
  extension to the user's account via `chrome.runtime.sendMessage` (allowed by
  `externally_connectable` in the manifest).

## Dev

```bash
cd chrome-extension
yarn install
yarn dev          # vite dev server with CRX
```

To load the unpacked extension:
1. `yarn build`
2. Chrome → `chrome://extensions` → toggle **Developer mode** on → **Load unpacked** → pick the `dist/` folder.

For dev against `http://localhost:3000`:
```bash
VITE_API_BASE=http://localhost:3000 yarn dev
```

## Build for the Chrome Web Store

```bash
yarn build
# zip the dist/ folder and upload to the Web Store dashboard
```

## Backend endpoints used
- `GET  /api/extension/me`          — current user (sanity check the token).
- `GET  /api/extension/resume`      — user's primary resume in flat shape (`FlatResume`).
- `POST /api/extension/fill-fields` — `{ fields, resume }` → `{ values: { fieldId: value } }`.
- `POST /api/extension/log-apply`   — record an application in the tracker.
- `GET  /api/extension/exchange`    — issued by `/extension/connect` page after Firebase auth,
  returns the long-lived extension token.
