# 06 — Roadmap & Ideas

> A scratchpad for direction. Update this as priorities shift. Not all of these are committed — they're the option space.

## Recently shipped (context)

- Dark-minimal homepage redesign (branch `redesign-2026-04`).
- Startup discovery section + profiles + pitch-deck gating.
- Realtime messaging between founders and interested users.
- Community layer (posts/comments/likes/follows).
- Admin analytics dashboard with live-user tracking.
- The full AI toolkit: resume grading, visa intel, relocation, cover letters, interview prep.

## Open ideas / likely next steps

- **Finish/polish the newer pages** — `/match`, `/stories`, `/profile`, `/contact` appear newer than the original notes; confirm their state and complete them.
- **Job ↔ profile matching** — a real "match score" between a user's profile and a job (the `/match` page hints at this). Could use the opportunity-score concept already in `JobCard`.
- **Salary prediction depth** — the project's original framing included **ML salary prediction**. Currently `/api/predict-salary` uses Groq estimation; a real trained model (or at least a more rigorous data-driven estimate over the 33k-job dataset) would strengthen the "ML" story for college apps.
- **Saved searches / job alerts** — email or in-app notifications for new matching jobs.
- **Map UX upgrades** — clustering pins, country-level heat of opportunity, visa-friendliness overlay.
- **Mobile polish** — verify the dark-minimal redesign holds up on small screens.
- **SEO / shareability** — visa + relocation reports are inherently shareable; per-country landing pages could drive organic traffic.
- **Onboarding** — a first-run flow that captures nationality + target countries to personalize the whole app.

## College-application framing (why this matters to Aahil)

OpportuMap is a **flagship project** for top-10 CS applications. The strongest angles to emphasize and build toward:

1. **Real, deployed, used product** — live URL, real data (33k jobs / 100 countries), real auth, real database. Not a tutorial clone.
2. **Genuine ML component** — lean into the salary-prediction / matching model so "AI" means more than "calls an LLM."
3. **Personal narrative fit** — a *global* opportunity map directly reflects Aahil's Pakistan → Uganda → US journey. That story-to-product coherence is compelling in essays.
4. **Breadth of engineering** — full-stack (Next.js, Postgres, Realtime, Storage, OAuth, maps, multiple external APIs, LLM orchestration) demonstrates range.

## Related project (separate repo, shares the stack)

**Medical AI Billing Assistant** — Aahil's #1 college EC. Doctor-facing: voice recording → Whisper transcription → speaker diarization → ICD-10/CPT billing codes + drug-interaction checking (RxNav/RxNorm + OpenFDA + Google Knowledge Graph). Same Next.js + Groq + Supabase family. Path: `C:\Users\aahil\Medical ai billing assistant`. Keep architectural lessons shared between the two (pdf-parse handling, lazy Supabase init, Groq usage).

## Parking lot (unsorted)

- _Add ideas here as they come up._
