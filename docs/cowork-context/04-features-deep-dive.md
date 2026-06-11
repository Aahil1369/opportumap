# 04 — Features Deep Dive

How each page/tool actually behaves. Use this to extend a feature without re-reverse-engineering it.

## Jobs (`/jobs`)

- Job search with filters: **sort, country, type, visa, remote, saved**.
- Default sort: **"Latest."**
- When logged in, the user's profile **syncs with Supabase** (`user_profiles`), falling back to localStorage, and pre-fills name from Google.
- Each job renders as a `JobCard` with a **visa badge**, an **opportunity-score bar**, salary, and an Apply button. Clicking opens `JobDetailPanel`.
- Data comes from `/api/jobs` (Adzuna + RemoteOK), backed by 33k+ jobs in Supabase.

## Map (`/map`)

- **Interactive Mapbox GL world map** with job pins — the product's signature feature.
- Needs `NEXT_PUBLIC_MAPBOX_TOKEN`.

## Community (`/community`)

- A **Reddit/LinkedIn hybrid**: posts, likes, comments, follow/unfollow.
- Tables: `posts`, `comments`, `post_likes`, `follows` (with RLS).
- Note: the `CreatePost` component must destructure `onSignIn` from props (a past bug).

## Resume Analyzer (`/resume`)

- Upload a **PDF** → AI returns a **brutally honest grade 1–100**.
- Grading is **deliberately recalibrated** so the average lands at **35–55**, not inflated. This is intentional — don't "fix" it to be nicer.
- Output includes: section scores, red flags, clichés detected, **bullet-point rewrites**, improvement suggestions, and job matches.
- Backed by `/api/resume-grade` (pdf-parse + Groq, `max_tokens=3000`).

## Visa Intelligence (`/visa`)

- Input: **nationality + destination country**.
- Output: a full visa report — document checklist, timeline, financial requirements, embassy contacts, language requirements, consulate interview tips, success-rate factors, recent policy changes.
- Backed by `/api/visa-intel` (Groq, 1-hour cache). One of the most differentiated features vs. ordinary job boards.

## Relocation Guide (`/relocate`)

- Produces a complete relocation brief: cost breakdown, neighborhoods, safety, climate, work culture, banking setup, SIM/internet, emergency numbers, cultural tips, visa-path summary, expat communities.
- Backed by `/api/relocation` (Groq + Supabase community connections).

## Cover Letter Generator (`/cover-letter`)

- Paste a **job description** + optional **resume PDF** + profile → AI writes a tailored cover letter.
- **Tone selector:** Professional / Enthusiastic / Concise. Copy + download.
- Backed by `/api/cover-letter`. Has a **character-by-character JSON sanitizer** before `JSON.parse` because the LLM emits literal newlines inside JSON strings — keep that sanitizer.

## Interview Prep (`/interview`)

- Input: job title + company + optional JD → **15 tailored questions** (5 behavioral, 5 technical, 5 culture).
- **Two modes:**
  - **Question Bank** — expandable cards with tips + example answers.
  - **Mock Interview** — type an answer → AI scores 1–10, gives feedback, rewrites a stronger version, then a final summary.
- Backed by `/api/interview` (generation, `max_tokens=3000`) and `/api/interview/feedback` (grading).

## Startup Discovery (`/startups` + `/startups/[id]`)

- **List page:** filter pills (stage / sector / trending), 2-col card grid, a featured startup, and a "Hot Sectors + stats" sidebar. A "Post Startup" button opens `StartupModal` (5-step form, pitch-deck upload to Supabase Storage).
- **Profile page (`/startups/[id]`):** description, **pitch deck gated behind "Express Interest,"** upvote toggle, interest toggle, and a "Message Founder" CTA.
- Cards (`StartupCard`) show a color-coded stage badge, sector emoji, raise amount, and upvote count.

## Messages (`/messages`)

- Inbox + **Supabase Realtime chat**: conversation-list sidebar + `StartupChat` panel.
- Auto-selects a thread from `?startup=&with=` query params.
- `StartupChat` subscribes to `postgres_changes` INSERT on `startup_messages` filtered by `startup_id`, with optimistic message rendering.
- ⚠️ The `/messages` page uses `useSearchParams()` → it **must** stay wrapped in `<Suspense>` or the Netlify build breaks.

## Saved (`/saved`)

- Saved-jobs page.

## Admin Dashboard (`/admin`)

- Shows: Total Users, **Live Users** (last 5 min, auto-refresh every 30s), Total Visits, Posts, Likes, Follows, Comments.
- Uses the `get_admin_stats()` SECURITY DEFINER RPC; live data from `site_pings` (populated by `PingTracker` every 60s).

## Other pages present in the app

`/match`, `/stories`, `/profile`, `/contact`, `/sign-in`, `/sign-up` exist in `app/`. Check current code for their state — they're newer than the original memory snapshot and may be in progress.

## Homepage design (completed 2026-04-04)

Dark-minimal, Vercel/Raycast-style — fully applied:
- Background `#080810`, **no animated blobs**.
- Hero `h1` and stat numbers use flat `text-indigo-400` (no gradient-text).
- All icon containers: flat `bg-[#1a1a28] border border-[#2a2a3e]` (dark) / `bg-zinc-100 border border-zinc-200` (light) — no colorful gradients.
- Feature cards: plain border, no `gradient-border` hover, no decorative glow blobs.
- "How it works" + testimonials: flat icons/avatars, no glow.
- CTA section intentionally keeps an indigo→violet→cyan gradient background (strong contrast — keep it).
- `.gradient-text` and `.gradient-border::before` CSS are disabled (flat fallback).
