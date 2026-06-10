# 02 — OpportuMap Overview

## One-line pitch

**OpportuMap AI** is a global career-discovery platform: explore real jobs anywhere on Earth via an interactive world map, then use an integrated suite of AI tools to actually land them — resume grading, visa intelligence, relocation guides, cover letters, and interview prep — wrapped in a startup-discovery and community layer.

## The vision

Most job boards are national, list-based, and end at "apply." OpportuMap is built around two ideas:

1. **Geography first.** Careers are global. A world map makes opportunity feel borderless — you can *see* where the jobs are, filter by visa-friendliness, remote, country, and type. This mirrors Aahil's own three-country background (Pakistan → Uganda → US).
2. **End-to-end, not just discovery.** Finding a job is step one. OpportuMap also helps you *get* it and *move* there: brutal-honest AI resume grading, country-specific visa intelligence, full relocation guides, tailored cover letters, and mock interviews. Then a community + startup layer so it's a place people return to.

## Who it's for

- International / globally-minded job seekers (students, new grads, remote workers, people open to relocating).
- People who want AI help with the un-fun parts of job hunting (resume, visa paperwork, relocation logistics, interview prep).
- Founders and early-stage startups looking for interest/talent (startup-discovery section).

## The data backbone

- **33,664 jobs ingested across 100 countries** (in Supabase Postgres).
- Live job sourcing via **Adzuna** + **RemoteOK** APIs.

## The pages (what a user can actually do)

| Route | What it does |
|-------|--------------|
| `/` | Homepage — dark, minimal landing (Vercel/Raycast aesthetic). |
| `/jobs` | Job search with filters (sort, country, type, visa, remote, saved). Profile syncs with Supabase when logged in. |
| `/map` | Interactive Mapbox world map with job pins. The signature feature. |
| `/community` | Reddit/LinkedIn hybrid — posts, likes, comments, follow/unfollow. |
| `/resume` | Resume Analyzer — upload PDF → brutally honest AI grade (1–100), section scores, red flags, clichés, bullet rewrites, job matches. |
| `/visa` | Visa Intelligence — nationality + destination → full visa report (checklist, timeline, finances, embassy contacts, interview tips, policy changes). |
| `/relocate` | Relocation Guide — cost breakdown, neighborhoods, safety, climate, banking, SIM/internet, emergency numbers, expat communities. |
| `/cover-letter` | Cover Letter Generator — JD + optional resume + profile → tailored letter with tone selector. |
| `/interview` | Interview Prep — 15 tailored questions + a Mock Interview mode that scores answers and rewrites them. |
| `/startups` | Startup Discovery — filterable grid of startups, featured startup, hot sectors. |
| `/startups/[id]` | Startup profile — gated pitch deck, upvote, express interest, message founder. |
| `/messages` | Inbox + Supabase Realtime chat between founders and interested users. |
| `/saved` | Saved jobs. |
| `/admin` | Admin dashboard — users, live users, visits, community stats. |
| `/match`, `/stories`, `/profile`, `/contact` | Additional pages present in the app (see code for current state). |

> Full per-feature mechanics are in `04-features-deep-dive.md`.

## Status

- **Deployed and live** at opportumap.netlify.app.
- Homepage redesign to a dark-minimal aesthetic completed (April 2026), on branch `redesign-2026-04`.
- Actively evolving — startup section, messaging, and community were added in successive sessions.

## Competitive context

- **EasyJob.ai** — competitor, still in stealth / not launched.
- **WeWorkRemotely** — established, clean, minimal; inspired the homepage redesign direction.

OpportuMap's differentiation: the **map-first discovery** + the **breadth of integrated AI tools** (visa + relocation especially are rare in job-board land) + the **community/startup layer**.
