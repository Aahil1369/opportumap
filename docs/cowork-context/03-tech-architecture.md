# 03 — Tech Architecture

> Reference for anyone touching code. Cross-check file:line against the live repo before asserting — this reflects the project as of mid-2026.

## Stack at a glance

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | **Next.js 16.2.1** (App Router) | Middleware file is `proxy.js` at root, not `middleware.js`. |
| UI | **React 19.2.4** | |
| Styling | **Tailwind CSS 4** | `@tailwindcss/postcss`. Dark/light mode via a `useTheme` hook. |
| Auth | **Supabase Auth** (`@supabase/ssr ^0.9`) | Email/password + Google OAuth. Clerk was removed (cost money in prod). |
| Database | **Supabase (PostgreSQL)** | 33,664 jobs across 100 countries + community/startup/messaging tables. |
| AI | **Groq SDK** (`groq-sdk ^1.1`) | `llama-3.3-70b-versatile` (complex) + `llama-3.1-8b-instant` (fast). Replaced Gemini. |
| Maps | **Mapbox GL JS** (`mapbox-gl ^3.20`) | |
| Jobs data | **Adzuna + RemoteOK** APIs | |
| PDF parsing | **pdf-parse 1.1.1** | Must dynamic-import the lib path; runtime `'nodejs'`. |
| Icons | **lucide-react** | |
| Hosting | **Netlify** (`@netlify/functions`) | Not Vercel (despite a leftover `vercel.json`). |

> Note: `@anthropic-ai/sdk`, `@google/genai`, `@google/generative-ai`, and Clerk still appear in `package.json` as historical/unused dependencies. Active AI path is Groq only.

## Auth wiring (Supabase + Next 16)

- `lib/supabase-browser.js` — `createBrowserClient` for client components.
- `lib/supabase-server.js` — `createServerClient` using Next's `cookies()`. **Always `await createClient()`** — `cookies()` is async in Next 16.
- `app/auth/callback/route.js` — OAuth code-exchange route.
- `proxy.js` (root) — middleware for session refresh. Next 16 uses `proxy.js`, not `middleware.js`.

## Directory layout (app/)

```
app/
  page.js              # Homepage (dark minimal)
  layout.js            # Root layout; mounts PingTracker
  globals.css          # Tailwind + custom CSS (gradient-text disabled, etc.)
  api/                 # All API routes (see below)
  components/          # Shared components (see below)
  jobs/  map/  community/  resume/  visa/  relocate/
  cover-letter/  interview/  startups/  startups/[id]/
  messages/  saved/  admin/  match/  stories/  profile/
  contact/  sign-in/  sign-up/  auth/
  data/  hooks/  lib/
lib/                   # Root-level libs (supabase clients, etc.)
backend/  scripts/     # Ingestion / tooling
netlify/               # Netlify functions config
docs/cowork-context/   # ← THIS knowledge base
```

## API routes (`app/api/`)

| Route | Purpose |
|-------|---------|
| `jobs/route.js` | Adzuna + RemoteOK job fetching. |
| `chat/route.js` | Groq chat (`llama-3.3-70b-versatile`). |
| `predict-salary/route.js` | Groq salary estimate (`llama-3.1-8b-instant`), in-memory cache. |
| `visa-intel/route.js` | Groq visa info, 1-hour cache. |
| `relocation/route.js` | Groq relocation guide + Supabase community connections. |
| `resume/route.js` | pdf-parse + Groq skills/experience extraction. |
| `resume-grade/route.js` | pdf-parse + Groq brutal resume grading. `max_tokens=3000`. |
| `cover-letter/route.js` | pdf-parse + Groq cover letter. Has a char-by-char JSON sanitizer for literal newlines in LLM output. |
| `interview/route.js` | Groq — 15 interview questions. `max_tokens=3000`. |
| `interview/feedback/route.js` | Groq — grades a mock-interview answer. |
| `user-profile/route.js` | GET/POST user profile ↔ Supabase `user_profiles`. |
| `community/posts/route.js` | Community posts. |
| `community/comments/route.js` | Comments. |
| `community/likes/route.js` | Like toggle. |
| `community/follows/route.js` | Follow toggle + counts. |
| `admin/stats/route.js` | Admin stats via `get_admin_stats()` RPC. |
| `ping/route.js` | Upserts session pings to `site_pings`. |
| `startups/route.js` | GET filtered list / POST create (auth required). |
| `startups/[id]/route.js` | GET single startup. |
| `startups/[id]/upvote/route.js` | POST toggle upvote. |
| `startups/[id]/interest/route.js` | POST toggle interest. |
| `messages/route.js` | GET conversations (grouped) / POST send message. |
| `messages/[startupId]/route.js` | GET thread `?with=userId`, marks read. |

## Key components (`app/components/`)

- `Navbar.js` — Supabase auth state, avatar/dropdown, Tools menu, AuthModal. Nav links: Jobs, Map, Startups, Saved, Community, Messages.
- `AuthModal.js` — Google OAuth + email/password.
- `JobCard.js` — visa badge, opportunity-score bar, salary, Apply button.
- `JobDetailPanel.js` — full job detail + apply.
- `ProfileModal.js` — 5-step profile setup; step 5 has "Remember my profile on this device."
- `PingTracker.js` — mounted in layout; pings `/api/ping` on mount + every 60s.
- `StartupCard.js` — stage badge, sector emoji, raise amount, upvotes → links to `/startups/[id]`.
- `StartupModal.js` — 5-step startup post form, including pitch-deck upload to Supabase Storage.
- `StartupChat.js` — Supabase Realtime chat; subscribes to `postgres_changes` INSERT on `startup_messages` filtered by `startup_id`; optimistic rendering.

## Database schema (Supabase / Postgres)

**Community:** `posts`, `comments`, `post_likes`, `follows` (all with RLS policies).

**User profile sync:** `user_profiles` (`user_id` PK, `profile_data` jsonb, `updated_at`).

**Admin/analytics:**
- `site_pings` (`session_id` PK, `last_seen`, `page`) — open RLS, populated by PingTracker every 60s.
- `get_admin_stats()` — SECURITY DEFINER RPC returning total_users, live_users (last 5 min), total_visits.

**Startup section (added 2026-04-03):**
- `startups` (id, user_id, user_name, name, tagline, description, stage, sector, raise_amount, equity_offered, team_size, location, website, pitch_deck_url, upvote_count, interest_count, created_at)
- `startup_upvotes` (startup_id, user_id) — composite PK
- `startup_interests` (startup_id, user_id, created_at) — composite PK
- `startup_messages` (id, startup_id, sender_id, receiver_id, content, read, created_at) — Realtime enabled
- Storage bucket: `pitch-decks` (public)

## Profile sync logic (`jobs/page.js`)

1. On mount: if logged in → fetch `/api/user-profile` → fallback to localStorage → pre-fill name from Google.
2. On save: if logged in → POST to `/api/user-profile`; if `rememberOnDevice` → save to localStorage, else remove.

## Environment variables (`.env.local`, gitignored)

| Var | Status |
|-----|--------|
| `GROQ_API_KEY` | **Active** — all AI. |
| `NEXT_PUBLIC_SUPABASE_URL` | Active. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Active. |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Active — map. |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | Active — jobs. |
| `GEMINI_API_KEY` | Legacy, unused. |
| `ANTHROPIC_API_KEY` | Present, not currently used. |
| Old Clerk keys | Unused. |

> **Netlify:** env vars (esp. `GROQ_API_KEY`) must be scoped to **All scopes / Functions**, not just Builds, or server routes fail in production.

## Run / build

```bash
cd ~/opportumap
npm run dev      # localhost:3000
npm run build    # production build (this is where the Next-16 traps surface)
npm run lint
```
