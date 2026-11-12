# 05 — Gotchas & Locked Decisions

> Read before writing code. These are paid-in-blood lessons and settled choices. **Do not re-litigate the decisions; do not re-discover the gotchas.**

## Locked technical decisions (don't reopen)

| Decision | Why |
|----------|-----|
| **Groq** for all AI, not Gemini | Gemini free tier hit `quota limit: 0`. Groq (Llama 3.x) is fast + free enough. |
| **Supabase Auth**, not Clerk | Clerk costs money in production. Clerk was fully removed. |
| **Netlify** hosting, not Vercel | Settled. (`vercel.json` is a leftover, ignore it.) |
| **`master`** base branch, not `main` | Repo convention. Current feature branch: `redesign-2026-04`. |
| **pdf-parse 1.1.1**, not v2 | v2's class API broke; 1.1.1 with the lib-path import works. |
| Resume grades **recalibrated low** (avg 35–55) | Intentional "brutally honest" UX. Not a bug. |

## The Next.js 16 build traps (these cause Netlify build failures)

**1. Always `await createClient()` from `supabase-server.js`.**
`cookies()` from `next/headers` is async in Next 16. A route that calls `createClient()` without `await` silently fails auth — the user always reads as `null`. (Broke admin/stats + ingest routes; fixed 2026-04-04.)
```js
const supabase = await createClient(); // every server-side call
```

**2. `useSearchParams()` requires a `<Suspense>` wrapper.**
Using it directly in a page component hard-fails the build. Extract the inner component and wrap it.
```js
function PageInner() {
  const searchParams = useSearchParams();
  // ...
}
export default function Page() {
  return <Suspense><PageInner /></Suspense>;
}
```
(Broke `messages/page.js`; fixed 2026-04-04.)

**3. Count `../` depth carefully in nested API routes.**
Subagents and humans frequently get relative import depth wrong for `lib/supabase*.js`.
- `app/api/startups/route.js` → 3 deep → `../../../lib/`
- `app/api/community/posts/route.js` → 4 deep → `../../../../lib/`
- `app/api/startups/[id]/upvote/route.js` → 5 deep → `../../../../../lib/`

Always cross-check against an existing **working** route. (One extra `../` caused 11 "Module not found" build errors across the startup/messages routes.)

## Other gotchas

- **Middleware file is `proxy.js`** at the project root, **not** `middleware.js` — Next 16 renamed it.
- **pdf-parse import:** use `await import('pdf-parse/lib/pdf-parse.js')` dynamically, with `export const runtime = 'nodejs'`. Importing `index.js` runs its self-test → ENOENT.
- **Cover-letter JSON parse:** the LLM returns literal newlines inside JSON strings → use the existing char-by-char sanitizer before `JSON.parse`. Don't remove it.
- **Netlify env scoping:** env vars (esp. `GROQ_API_KEY`) must be scoped to **Functions / All scopes**, not just Builds, or production server routes break.
- **Never paste Groq/Supabase keys in chat** — they get auto-revoked when they appear in conversation.
- **Don't commit** `.superpowers/` (plugin runtime), `.claude/`, `.env.local`, `node_modules/`, `.next/`.
- **Community `CreatePost`** must include `onSignIn` in its props destructuring.
- **Grammarly** browser extension causes a harmless hydration warning on `<body>` — ignore.

## Shared cross-project gotchas (also apply to the Medical Billing app)

- pdf-parse v2 class API → downgrade to v1.1.1; import the lib path at runtime.
- Lazy-init Supabase clients — eager init can crash at import time.
- Large-PDF base64: use a for-loop, not the spread operator (stack overflow on big files).
- Keep pdf error handling tight — `msg.includes("Bad")` was too broad and swallowed recoverable cases.
