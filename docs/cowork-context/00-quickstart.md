# 00 — Quickstart (the 60-second version)

**Who:** Aahil Akbar, 16, junior at Grapevine-Colleyville ISD (Texas). Aiming for top-10 CS schools, target major Software Engineering. Strong STEM student, self-taught coder (Python/Java/JS), founder-type.

**What he's building:** **OpportuMap AI** — a global career-discovery platform. Think "a world map of jobs + an AI career toolkit." Find jobs anywhere on Earth, then use AI tools to actually land them (resume grading, visa intelligence, relocation guides, cover letters, interview prep) and a startup/community layer on top.

**Why it matters to him:** It's a flagship college-application project — a real, deployed product with real data (33k+ jobs, 100 countries), not a toy.

**Stack in one line:** Next.js 16 (App Router) + React 19 + Tailwind 4, Supabase (Postgres + Auth + Realtime + Storage), Groq LLMs (Llama 3.x) for all AI, Mapbox for the map, Adzuna + RemoteOK for jobs. Deployed on Netlify.

**Where it lives:**
- Repo: `github.com/Aahil1369/opportumap`
- Live: `opportumap.netlify.app`
- Local: `~/opportumap`, run `npm run dev` → localhost:3000
- Active branch: `redesign-2026-04`

**The 3 build traps that keep biting (memorize these):**
1. Always `await createClient()` from `supabase-server.js` — `cookies()` is async in Next 16.
2. Wrap any `useSearchParams()` page in `<Suspense>`.
3. Count `../` depth carefully in nested API routes — cross-check an existing working route.

**Other key facts:**
- Middleware file is `proxy.js` (root), **not** `middleware.js` — Next 16 renamed it.
- AI = **Groq**, not Gemini (Gemini free tier was quota-limited) and not Clerk for auth (cost money) → **Supabase Auth**.
- pdf-parse must be `await import('pdf-parse/lib/pdf-parse.js')`, runtime `'nodejs'`.

**Second project (context, separate repo):** Medical AI Billing Assistant — his #1 college EC. Doctor-facing tool: voice recording → transcription → ICD-10/CPT billing codes + drug-interaction checking. Same stack family (Next.js + Groq + Supabase).

→ For the full picture, read `01` through `06` in order.
