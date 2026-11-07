# Departures — Waves 2–5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Bring every remaining OpportuMap page into the Departures world (dark hall, gate signs, one signature moment each) and fix the bugs the page maps found, so the whole site is consistent.

**Architecture:** Builds on wave 1 (`docs/superpowers/plans/2026-10-13-departures-wave1.md`): kit `app/components/kit/` (FlapBoard, FlapText, PageShell, GateSign, StatusPill, AirportCode, SignatureMoment, Dialog), `lib/departures/*` (cityCode, codeSearch, localPay, jobStatus, localTime, gateFor, createPayQueue, createLatest, boardRowsFrom), `JobGate`, `usePredictedPay`. Each wave adds page-local components + one CSS file per page area (never grows `kit.css` beyond the budget). Waves 2, 3 and 4 touch disjoint pages and run on parallel branches off the wave-1 head; wave 5 (chrome + cleanup) runs last.

**Tech Stack / Spec / Global Constraints:** identical to wave 1 — see that plan's header and `docs/superpowers/specs/2026-10-13-departures-redesign-design.md` §8. Additionally: every page gets per-route `metadata` (title "<Page> — OpportuMap"), inputs 16px with `htmlFor` labels, `res.ok` checks before `res.json()`, and no `useScrollReveal`/`EditorialHero` on redesigned pages. Per-page JS must not exceed today's numbers (`/map` 210.9 KB + lazy mapbox, `/resume` 245.1, `/cover-letter` 244.3, `/interview` 245.0, `/startups` 304.9, `/community` 305.9 KB gzip).

## Review Focus
1. **Signed-out visitors** on social pages (startups, community, messages, profile) → clear sign-in prompts, no 401 dead ends, no infinite spinners. Pinned in Tasks 12–14.
2. **Empty database** (0 startups/posts/messages today) → designed empty states are the main screen and look intentional. Pinned in Tasks 12–14.
3. **Large/invalid uploads** (resume > 4 MB, image-only PDF, non-PDF) → friendly errors before/after upload, server enforces too. Pinned in Task 9. The limit is 4 MB on purpose: the route runs as a Netlify Function, which takes at most 6 MB of request body, and a PDF arrives Base64-encoded, about a third larger.
4. **Map with thousands of jobs on iPhone** → clustered layer stays smooth, old results cleared on new search, no hydration mismatch. Pinned in Task 7.
5. **Saved jobs no longer returned by search** → still shown from stored snapshots. Pinned in Task 8.

---

## WAVE 2 (branch `departures-w2`)

### Task 7: /map — control tower
- Files: `app/map/page.js`, `app/components/Map.js` (rewrite), `app/components/map/ArrivalsBoard.js`, `app/components/map/map.css`, `lib/departures/mapData.js`, test `scripts/departures/__tests__/mapData.test.mjs`.
- `jobsToGeoJSON(jobs) → FeatureCollection` (finite coords only; properties: id, code, title, company, payText, status); `countryArrivals(jobs, iso2, { limit = 8 }) → board rows` (via `boardRowsFrom`).
- Mapbox: GeoJSON source with `cluster: true`, amber circle layers (cluster size by count — **no numeric labels shown as totals**; clusters show a beacon, not a number), `pixelRatio: Math.min(devicePixelRatio, 2)`, dark style; clicking a cluster zooms; clicking a single beacon opens `JobGate`; clicking a country (or a cluster at low zoom) opens `ArrivalsBoard` (`ARRIVALS · <COUNTRY>` FlapBoard). New search replaces the source data (old beacons gone). Profile from Supabase then localStorage (in `useEffect`, no hydration mismatch). Height `100svh` minus navbar. Lenis disabled on /map (`data-lenis-prevent` on the map root and SmoothScroll skips the route). Error and empty states.
- Tests: GeoJSON drops NaN/missing coords; `countryArrivals` ≤ 8 rows, all same country. Browser: 390×664 + 1440×900, 1,500 mocked jobs → frame p95 < 20 ms while panning (emulated iPhone 13 CPU×4, real GPU); WebKit (Playwright) smoke: map renders, no errors.

### Task 8: /saved — itinerary
- Files: `app/saved/page.js`, `lib/departures/savedStore.js`, update the save toggle in the jobs board/gate to store a job snapshot, test `scripts/departures/__tests__/savedStore.test.mjs`.
- `readSaved(storage) → job[]`, `saveJob(storage, job)`, `removeJob(storage, id)` — key `opportumap_saved_v2` storing snapshots `{id,title,company,location,country,url,salary_min,salary_max,currency,posted_at,remote,source}`; migrates old id-only `opportumap_saved` entries by fetching them once if possible, else keeps them as "details unavailable" rows; blocked storage → `[]`/no-op.
- UI: PageShell sign `{ letter: '—', label: 'ITINERARY' }` title "Your", accent "itinerary."; a FlapBoard of saved roles; Remove (visible on touch) flips the status cell to `CANCELLED` then removes the row; rows open `JobGate`; predicted pay via the shared queue (visible rows only); empty state "No roles saved yet — pick one on the board."
- Tests: snapshot round-trip; migration of id-only data; blocked storage. Browser: remove flips to CANCELLED then disappears; reduced motion removes at once.

## WAVE 3 (branch `departures-w3`)

### Task 9: /resume — security X-ray
- Files: `app/resume/page.js`, `app/components/resume/Scanner.js`, `app/components/resume/resume.css`, `app/api/resume-grade/route.js`, `lib/departures/resumeVerdict.js`, test `scripts/departures/__tests__/resumeVerdict.test.mjs`.
- `resumeVerdict(score) → { label: 'CLEARED' | 'BAG CHECK', tone }` (CLEARED ≥ 60); `validateResumeFile(file) → { ok } | { ok: false, error }` (PDF only, ≤ 4 MB = 4,000,000 bytes, `MAX_RESUME_BYTES`; why 4 MB: Review Focus 3).
- UI: sign `C · SECURITY`, title "Put your resume through", accent "security."; keyboard-accessible dropzone (a real button + hidden input; same file re-selectable); on upload the PDF tile slides through a scanner frame (transform) while grading; result: big `CLEARED 81` / `BAG CHECK 47` plate, section bars that actually animate (scaleX), clichés listed as "PROHIBITED ITEMS", red flags as alarms, rewrites before/after, job matches linking `/jobs?q=<role>`. Server: reject > 4 MB (413) and image-only PDFs (extracted text < 200 chars → 422 "We couldn't read text in this PDF — export it as a text PDF."). `res.ok` handling.
- Tests: verdict threshold; file validation. Browser: mocked grade response renders; a 5 MB file shows the error without uploading.
- Deviation (wave 3 fix round): the limit is 4 MB, down from the first plan's figure, so that every file the page accepts also reaches the route on Netlify; sizes are worded in decimal MB, as iPhone Files and macOS show them (Ruling R16). The over-limit and platform-413 browser checks were not re-run against the 4 MB wording; `scripts/departures/__tests__/resumeVerdict.test.mjs` covers both paths, and the Scanner applies them before any upload.

### Task 10: /interview — flight simulator
- Files: `app/interview/page.js`, `app/components/interview/Altimeter.js`, `app/components/interview/interview.css`, `lib/departures/interviewProgress.js`, test.
- `interviewProgress(answered, total) → 0..100` (reaches 100 when all answered or skipped); `takeoffVerdict(scores) → 'HOLDING' (fewer than 3 scored answers, Ruling R15) | 'CLEARED FOR TAKEOFF' (avg ≥ 7) | 'GO-AROUND'`; stable keys (`q.id ?? index`).
- UI: sign `D · SIMULATOR`; Question Bank as a pre-flight checklist; Mock mode with an altimeter progress (transform) that reaches 100%; Skip button; feedback errors shown in the mock area; final screen with the verdict plate; question preview without a stray "…" on short questions.
- Tests: progress reaches 100; verdict threshold; keys stable with duplicate/missing ids.

### Task 11: /cover-letter — airmail desk
- Files: `app/cover-letter/page.js`, `app/components/coverLetter/Envelope.js`, `app/components/coverLetter/coverLetter.css`.
- UI: sign `F · AIRMAIL`; tone picker as luggage tags (`Chip`s); the letter is an editable `<textarea>` (copy/download use the edited text); show `keywordsUsed` chips; Regenerate keeps the current letter visible (dimmed) with an inline loader; clipboard in try/catch with a fallback message; on Copy/Download the letter folds into a PAR AVION envelope (transform, once; reduced motion: instant). Profile from Supabase or localStorage.
- Tests: a pure `letterText(edited, original)` helper; source scan that the letter element is a textarea.

## WAVE 4 (branch `departures-w4`)

### Task 12: /startups (+ [id]) — hangar
- Files: `app/startups/page.js`, `app/startups/[id]/page.js`, `app/components/startups/TailFin.js`, `app/components/startups/startups.css`, `app/api/startups/[id]/route.js` (return `mine: { upvoted, interested }` for the signed-in user), `lib/departures/tailFin.js`, test.
- `tailFin(name) → { hue, stripes, letter }` deterministic from the name.
- UI: sign `E · HANGAR`; each startup card shows a generated tail fin; upvote label `+1 PASSENGER`, interest `STANDBY`; detail page loads the user's own state (no accidental un-vote); signed-out users see "Sign in to board" prompts instead of disabled buttons; filter chips scroll horizontally on phones; sector chips filter without counts (Ruling R14); "THIS WEEK" removed (no totals); error states; empty state "The hangar is empty — post the first startup."
- Tests: tailFin determinism; the sector chips carry no counts (Ruling R14).

### Task 13: /community — departure lounge, /profile — crew badge
- Files: `app/community/page.js`, `app/components/community/community.css`, `app/profile/page.js`, `app/components/profile/CrewBadge.js`, `lib/departures/routeChip.js`, test.
- `routeChip(profile) → 'LHE → YYZ' | null` (from profile nationality/current country → preferred country via `cityCode` country fallback).
- Community: dark lounge restyle, composer + feed + likes/comments/follows as today (no email anywhere), route chips by author names when available, error states (not swallowed), sign-in prompts for actions. Profile: crew badge (initials avatar, display name, route chip, member since), stats without totals language beyond the user's own counts, `.catch` on `getUser` (no endless LOADING), signed-out → sign-in prompt instead of silent redirect.
- Tests: routeChip cases.

### Task 14: /messages — gate chat
- Files: `app/messages/page.js`, `app/components/StartupChat.js`, `app/components/messages/messages.css`.
- UI: phone-first: list view → thread view with a back button (no fixed 256 px sidebar on phones); desktop two-pane; no "SIGN IN REQUIRED" flash for signed-in users, a sign-in button for signed-out; avatar letters from display names; chat scrolls inside its own container (`data-lenis-prevent`, no page scroll); failed sends show an error with retry; unread badge clears when a thread opens.
- Tests: a pure `threadKey`/`partnerOf(message, me)` helper.

## WAVE 5 (on `departures` after merging waves 2–4)

### Task 15: Chrome, contact desk, admin, metadata, cleanup
- Files: `app/components/SiteFooter.js` (new global footer in layout: gate-sign links, Passport Control → Migrova, legal line), `app/layout.js` (footer; drop Instrument Serif), `app/contact/page.js` (information-desk restyle on top of the Supabase inbox flow), `app/admin/page.js` (hall style; Inbox keeps working), per-route `metadata` for every route, `app/opengraph-image.js` (next/og, dark board image with "The world is hiring."), delete dead code (`EditorialHero`, `useScrollReveal`, `PassportHero` leftovers, Field Notes utilities and `paper-*`/`term-*` tokens once unused, `.noise-overlay`).
- Tests: source scans — no `EditorialHero`/`useScrollReveal` imports; every `app/**/page.js` route has metadata (page or layout); no `paper-` classes left in app/; no "flight"/"fare" copy; no job-total numbers.
- Browser: every route at 390×844 + 1440×900 in Chromium and WebKit: no console errors, no horizontal scroll, consistent navbar/footer.

**Final gate (controller):** whole-branch review (most capable model), one fix wave, then deploy via push to master (CI), live checks on every route (Chromium + WebKit), morning report to the owner.
