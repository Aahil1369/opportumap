# Two-App Split: OpportuMap + Migrova — Design

**Date:** 2026-06-11
**Status:** Approved by Aahil (pending written-spec review)
**Scope:** The split itself + Migrova's launch feature set. The full lawyer *directory* (real listings, ratings) is explicitly out of scope and gets its own spec later.

---

## 1. Goal

Split OpportuMap into two products:

- **OpportuMap** (`opportumap.netlify.app`) — career tools: job search, map, resume grader, cover letter, interview prep, startups, community, messages.
- **Migrova** (`migrova.netlify.app`) — visa & relocation intelligence for immigrant families: Country Match, Visa Intelligence, Relocation Guide, Stories, plus a new AI Lawyer Guide — positioned strictly as *information, not legal advice*.

## 2. Decisions (settled in brainstorm)

| Decision | Choice |
|---|---|
| Gray-area tools (Country Match, Stories) | Both move to Migrova |
| Architecture | Two GitHub repos, two Netlify sites, ONE shared Supabase project (`gcrngdjrrfunokqfmkip`) |
| New app name | **Migrova** |
| Lawyer feature at launch | AI guide + links to real directories. No invented listings, no fake ratings |
| Legal positioning | Disclaimers + AI guardrails + one-time acknowledgment gate |
| Codebase creation | Clone-and-prune: copy opportumap repo → migrova, delete career features, rebrand |

## 3. Migrova

### 3.1 Repo & deploy
- New repo `Aahil1369/migrova`, branch `master`, seeded from a copy of the opportumap working tree (post-redesign), then pruned.
- Netlify site `migrova` auto-deploying from master.
- Env vars (All scopes): `GROQ_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. No Mapbox, no Adzuna, no INGEST_SECRET.
- Dependencies removed: `mapbox-gl`, `pdf-parse` (no resume/map features). Groq + Supabase stay.

### 3.2 Pages
| Route | Source | Notes |
|---|---|---|
| `/` | new | Editorial homepage written for immigrant families. Tools grid: Country Match, Visa Intelligence, Relocation Guide, Lawyer Guide. Stories strip. Footer disclaimer. |
| `/match` | ported | As-is from opportumap (already in editorial design). "Jobs" buttons link out to `opportumap.netlify.app/jobs`. |
| `/visa` | ported | As-is + DisclaimerBlock + acknowledgment gate. |
| `/relocate` | ported | As-is. |
| `/stories` | ported | As-is. |
| `/lawyer` | **new** | AI Lawyer Guide (see 3.3). DisclaimerBlock + acknowledgment gate. |
| `/legal` | **new** | Full static disclaimer / terms page: information-not-advice, no attorney-client relationship, accuracy not guaranteed, consult a licensed attorney. |
| `/contact`, `/profile`, `/auth/callback` | ported | As-is. |

Removed from the clone: jobs, map, saved, startups (+detail), community, messages, cover-letter, interview, resume, admin, sign-in/sign-up extras, and their API routes/components.

Navbar: **Match · Visa · Relocate · Lawyer Guide · Stories** + Migrova wordmark (same italic-serif editorial treatment). Same paper design system, same terracotta accent — the rebrand is wordmark + copy only.

`pageCopy.js`: rewritten for Migrova voice. HERO_COPY entries for match/visa/relocate/stories move here; new entries for home, lawyer. FOOTNOTES for all pages.

### 3.3 Lawyer Guide (`/lawyer` + `/api/lawyer-guide`)
**Input form:** case type (Work visa / Family reunification / Asylum / Green card / Citizenship / Student), destination (state if US, else country), budget range (Low / Medium / High / Need free help), preferred language (optional).

**API:** `POST /api/lawyer-guide` → Groq `llama-3.3-70b-versatile`, `max_tokens=3000`, 1-hour in-memory cache keyed on inputs (same pattern as visa-intel). JSON response fields (all get array/null defaults after parse):
- `fee_ranges[]` — typical fee ranges for this case type/region, with `stage`, `range`, `notes`
- `consult_questions[]` — what to ask in a first consultation
- `red_flags[]` — warning signs when choosing a lawyer
- `low_cost_options[]` — legal aid, nonprofits, pro-bono routes, sliding-scale clinics
- `process_overview` — short plain-English overview of how working with a lawyer on this case type usually goes
- `disclaimer` — reiterated info-not-advice line

**Real directories (NOT AI-generated):** a hardcoded constant in code rendered alongside the AI output — AILA lawyer search, ImmigrationLawHelp.org, state bar lawyer referral services, DOJ-recognized organizations list. The AI must never invent lawyer names, firms, or URLs; the system prompt forbids it and the UI only renders directory links from the static list.

### 3.4 Legal layer
1. **Footer disclaimer** — one-line on every page: "Migrova provides general information, not legal advice. For advice about your situation, consult a licensed immigration attorney." Links to `/legal`.
2. **`DisclaimerBlock` component** — visible bordered block rendered above results on `/visa` and `/lawyer`.
3. **Acknowledgment gate** — on the FIRST form submission on `/visa` or `/lawyer`, a modal: "I understand Migrova provides general information, not legal advice." Accept → stored as `migrova_legal_ack` (ISO timestamp) in localStorage, and merged into `user_profiles.profile_data.legal_ack` when signed in. Never shown again once stored. Declining closes the modal without submitting.
4. **AI guardrails** — all Migrova system prompts (visa-intel, relocation, lawyer-guide, country-match): informational phrasing ("applicants typically need…", never "you should…"), always end recommendations with consulting a licensed immigration attorney, refuse case-specific directives ("should I lie about…", "how do I get around…" → respond with general process info + attorney referral).

### 3.5 API routes kept in Migrova
`country-match`, `visa-intel`, `visa-probability`, `relocation`, `stories`, `user-profile`, `tool-usage`, `ping`. New: `lawyer-guide`.

## 4. OpportuMap changes

1. **Delete** pages `/visa`, `/relocate`, `/match`, `/stories`; API routes `visa-intel`, `visa-probability`, `relocation`, `country-match`, `stories`; components `VisaProbabilityMeter`, `CountryMatchCard`, `StoryCard`; their `pageCopy` entries. Also delete dead `CommunityModal.js`.
2. **Redirects** in `next.config` (`permanent: true`): `/visa`, `/relocate`, `/match`, `/stories` → `https://migrova.netlify.app/<same path>`.
3. **Homepage rework:** hero CTA → "Browse jobs → /jobs" (secondary stays "Spin the map"). Tools grid → Resume Grader, Cover Letter, Interview Prep + featured cross-promo card: "Moving abroad? **Migrova** — visas, relocation, legal guidance ↗". Live-jobs terminal panel unchanged.
4. **Dashboard:** prune match/visa/relocate tiles; add Migrova link tile.
5. **Navbar:** Tools menu loses moved tools; gains "Migrova ↗" external link.
6. **Footer:** sibling mention both ways ("A sibling of Migrova" / "A sibling of OpportuMap").

## 5. Shared Supabase

- **No schema changes.** Both apps use the existing project. Migrova writes `user_stories`, `user_tool_usage`, `site_pings`, `user_profiles`; OpportuMap keeps the rest. Admin stats remain in OpportuMap `/admin` and cover both apps.
- **Auth config (manual dashboard step):** add `https://migrova.netlify.app/auth/callback` to Supabase Auth → URL Configuration → Redirect URLs (verify `http://localhost:3000/auth/callback` is there too for local dev), so Google OAuth works on both domains. Same user accounts on both apps; sessions are per-domain.

## 6. Rollout order (nothing goes missing mid-flight)

1. Create migrova repo: clone working tree → prune → rebrand → lawyer guide + legal layer.
2. Verify locally (build + manual pass), push to GitHub.
3. Create Netlify site + env vars; add Supabase auth redirect URL; deploy Migrova; verify live.
4. Then prune OpportuMap, add redirects + cross-links; deploy.
5. Verify redirects and OAuth on both live sites.

## 7. Error handling & testing

- Lawyer-guide route: same defensive pattern as visa-intel (try/catch, JSON sanitizer if needed, array/null defaults, 500 with error message). UI shows paper-styled error block with retry.
- Acknowledgment gate must not block rendering if localStorage is unavailable (fail open to showing the modal each time).
- Verification: `npm run build` green on both repos; manual pass on Migrova (`/match`, `/visa`, `/relocate`, `/stories`, `/lawyer` happy paths + gate + disclaimers); OpportuMap redirect spot-checks; Google OAuth sign-in on Migrova production.

## 8. Out of scope (future specs)

- Real lawyer directory with listings, affordability filters, commitment indicators, ratings (the described end-state — needs real data strategy and traffic first). The launch schema deliberately adds NO lawyer tables.
- Community lawyer submissions/reviews.
- Custom domains (both stay on netlify.app for now).
- Separate Supabase projects, shared UI package (revisit if design drift hurts).
- Re-ingesting the jobs corpus (OpportuMap issue, unrelated to split).
