# AI Resume Builder (Next.js + OpenAI)

An opinionated, production-ready starter for an AI-powered resume builder. Paste your resume and a job description; get an ATS-friendly tailored resume (JSON-structured), keyword list, suggestions, and a one-click cover letter. Print to PDF.

## Stack
- Next.js App Router (TS)
- Tailwind CSS
- OpenAI Node SDK (defaults to `gpt-4o-mini`)
- Zod + React Hook Form
- Client-side print-to-PDF via `react-to-print`

## Quickstart

```bash
pnpm i   # or npm i / yarn
cp .env.example .env.local
# put your key:
# OPENAI_API_KEY=sk-...
# (optional) OPENAI_MODEL=gpt-4o-mini
pnpm dev
```

Then visit http://localhost:3000

## Notes
- `/api/generate` enforces JSON output and schema via `response_format: { type: 'json_object' }`. You can swap to the Responses API + Structured Outputs easily.
- `/api/cover-letter` generates a compact cover letter based on the generated summary + JD.
- `components/ATSScore` provides a fast local heuristic score; combine with model feedback for richer guidance.
- Export: use the **Print / Save PDF** button (it opens the browser print dialog with a print-optimized view).

## Switching to the Responses API
If you prefer the new Responses API plus Structured Outputs, replace the call in `/api/generate` with:

```ts
const response = await openai.responses.create({
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  input: [
    { role: 'system', content: sys },
    { role: 'user', content: user },
  ],
  response_format: { type: 'json_schema', json_schema: { name: 'Resume', schema: {/* same schema */} } },
});
const text = response.output_text;
```

See: https://platform.openai.com/docs/guides/structured-outputs

## License
MIT


## Marketing routes
- `/` Home (marketing)
- `/features`
- `/how-it-works`
- `/reviews`
- `/pricing`
- `/privacy`
- `/terms`
- `/refund`
- `/unsubscribe`
- `/builder` (app)
