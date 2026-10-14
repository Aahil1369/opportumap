# OpportuMap "Departures" redesign — design spec

**Date:** 2026-10-13 · **Owner:** Aahil · **Status:** approved in conversation (parts 1–4), awaiting written review
**Sibling:** Migrova's Journey Book (passport) — `migrova/docs/superpowers/specs/2026-10-09-passport-homepage-design.md` and `2026-10-12-passport-site-design.md`.

## 1. Goal

Give OpportuMap its own unforgettable signature world that is clearly a sibling of Migrova but not a passport: **Migrova is the passport in your hand; OpportuMap is the airport departures board overhead.** The job search itself becomes the wow — real roles clack onto a split-flap board — and every tool is a place in the airport. Everything must be smooth on the owner's iPhone 13 (Safari).

**Owner decisions (binding):**
1. Direction **A · DEPARTURES** (chosen over Nightside and Survey). Same travel world as Migrova, different object.
2. **Dark all the way:** night-time airport — black terminal hall, yellow gate signage, amber/white type. The cream "Field Notes" paper theme is retired (it overlaps Migrova's paper).
3. **No job/listing counts anywhere** (no "33,664", no "100 countries" totals) — per-job data (role, city code, pay) is fine.
4. **Founder row:** `GIL → EBB → DFW · FOUNDER, 16 · ARRIVED ✓`.
5. **First wave:** foundation + homepage + /jobs + the job-detail gate. Then the remaining waves, each through a test link first.
6. **Copy rule:** say "role" and "pay", never "flight" or "fare" — it must never read like a flight-booking site.
7. **Ship via a test link first** (Netlify draft deploy the owner opens on his iPhone 13), live only after his OK.
8. The P0 security/bug fixes ship separately and first (branch `fix/p0-security`; DB migration already applied) — not part of this spec.

## 2. Scope

**This spec (all waves, built wave by wave):** shared foundation + homepage + /jobs + job detail (wave 1); /map + /saved (wave 2); /resume + /interview + /cover-letter (wave 3); /startups (+[id]) + /community + /messages + /profile (wave 4); /contact + /admin + a global footer + per-route titles/social images (wave 5). A **step 0** prototype gates everything.

**Out of scope:** Migrova; the stale jobs-ingest pipeline (needs a server-only service key — separate task); new product features beyond what each signature moment needs.

## 3. Global constraints

- Next.js 16 App Router, React 19, plain JS, Tailwind 4 tokens in `app/globals.css`. No new runtime dependencies. The existing `motion` (Framer) and `lenis` stay; no other animation library.
- Animate only `transform` and `opacity` (plus short `stroke-dashoffset` paths). No CSS trig. No `backdrop-filter` or SVG filters on moving layers. No motion gating on `navigator.hardwareConcurrency`. At most ~120 elements animating at once.
- `prefers-reduced-motion: reduce` → final state at once (text simply appears; no flaps, no slides).
- Signature moments play once (on arrival / when scrolled into view); ambient loops pause off screen.
- Server-render the final text of every board (SEO + instant open); motion is layered on after hydration.
- Lenis: `data-lenis-prevent` on scrollable panels (job detail, chat, filters); Lenis off on /map.
- Body text ≥ 16px on phones; inputs 16px; `dvh`/`svh` not `vh` for full-height areas; every text/background pair ≥ 4.5:1.
- Accessibility: the board is a real list/table with readable text (flaps are visual only, `aria-hidden` duplicates); status words always in text; modals have focus trap + Esc; cards are links/buttons, keyboard reachable.
- No job/listing counts anywhere. No "flight"/"fare" copy.
- Budgets: no page ships more JS than today (`/` ≤ 248 KB gzip, `/jobs` ≤ 318 KB — aim lower); the shared kit adds ≤ 6 KB JS + ≤ 8 KB CSS gzip; homepage LCP not worse than today; the 81 KB passport image is removed.
- AI quota: salary prediction runs only for rows on screen (batched), never 60 parallel calls; cached per job.
- Never put the owner's email anywhere in code. Git via PowerShell in the worktree; commits end with the `Co-Authored-By` line.

## 4. Visual language

- **Palette tokens:** `--hall` #0a0b0d (page), `--hall-2` #111316 (board/panels), `--hall-3` #16181c (rows/cards), `--rule` #22262c, `--ink` #f4f1e6, `--ink-dim` #b9bdc4, `--ink-sub` #9aa0a8, `--sign` #ffc531 (gate-sign yellow), `--sign-ink` #0a0b0d, `--amber` #ffb547 (city lights), status colours `--ok` #3ce08a (BOARDING), `--new` #ffc531 (NEW), `--info` #9fc8ff (ON TIME / ANY GATE), `--warn` #ff6b4a (only for genuine warnings). Contrast-tested.
- **Type:** Inter (headlines 800, tight; body 400/600) + JetBrains Mono (board, codes, signs, labels). Instrument Serif is retired. One accent per headline: the yellow word ("Pick your gate.").
- **Signage:** yellow gate signs with a black letter chip — A Jobs · B Map · C Security (Resume) · D Simulator (Interview) · E Hangar (Startups) · F Airmail (Cover letter) · Lounge (Community) · Itinerary (Saved) · Crew (Profile) · Passport Control → Migrova.
- **Board:** split-flap rows on `--hall-2`, mono characters on dark tiles with a hairline split; status column in colour + text.

## 5. Foundation (wave 1)

- **Tokens + theme:** replace the paper/terminal tokens with §4; delete the unused `useTheme`; remove `.noise-overlay`, `.italic-draw`, `.visa-stamp`, `.tool-card-underline` (width), `Btn` `transition-all`, and other layout-property animations.
- **Kit `app/components/kit/`:**
  - `FlapBoard({ rows, columns, playOnMount, reduced })` + `FlapText({ text, from })` — split-flap rendering where **only characters that change flip** (each flip = a `scaleY` on two half-tiles), staggered left→right per row, capped concurrency; server-rendered final text; reduced motion → plain text.
  - `GateSign({ letter, label })`, `PageShell({ sign, title, accent, sub, children })` (black hall header + content), `StatusPill({ status })`, `AirportCode({ code })`, `SignatureMoment` (plays once, final state under reduced motion), `Dialog` (focus trap, Esc).
  - Pure modules (unit-tested): `cityCode(location, countryCode)` → IATA-style 3-letter code from a static city table (≈400 major cities) with country-ISO3 / first-3-letters fallback; `codeSearch(query)` aliases (`tor` → YYZ/Toronto); `localPay(job)` → pay in the job's local currency (fixes the `$`-everywhere bug) with currency from country/source; `jobStatus(job, profile)` → `NEW` (posted < 48 h) · `ANY GATE` (remote) · `BOARDING` (strong match for the visitor's profile, when a profile exists) · `ON TIME` (default) — **no FINAL CALL** unless the job has a real closing date; `localTime(countryCode, now)` for the LOCAL column.
- **Navbar + layout:** night navbar (logo, gate-sign nav, sign-in), per-route `<title>`/metadata, global footer (wave 5 finishes it).
- **Copy:** remove the hard-coded testimonials and the "Visa guides" promise; "Passport Control → Migrova" is the only cross-link to visas.
- **js-size / lcp scripts:** add `scripts/perf/js-size.mjs` and `lcp.mjs` (same as Migrova's) + `npm test` (node:test).

## 6. Homepage (wave 1)

Server-rendered board of real roles (fetched server-side with ISR, `revalidate` ≈ 10 min); motion layered on top. Beats as you scroll:
1. **The board.** Black terminal hall; kicker `DEPARTURES · روانگی · DÉPARTS`; headline "The world is hiring. *Pick your gate.*" Real roles clack in: LOCAL time · code · role · pay (local currency) · status.
2. **The prediction.** One row lifts out; its pay rolls into `C$88–102K · PREDICTED` — the ML salary model, labelled honestly as a prediction.
3. **The window.** The board slides aside like a terminal window onto the world at night (amber city lights), routes drawing out from the visitor's city (from their profile or a neutral default; never geolocation without consent).
4. **The gates.** Yellow gate signs slide past (A–F), each a link to its tool.
5. **Your row.** The board dims except one row lit gold: `GIL → EBB → DFW · FOUNDER, 16 · ARRIVED ✓` + one short line from Aahil.
6. **Where to?** `WHERE TO? ____` — typing flaps onto the board; Enter goes to `/jobs?q=…` (the board re-flaps into the results). A `🛂 PASSPORT CONTROL → Migrova` sign hands off to the sibling.

**Signed-in users with a profile** see the same page with the board personalised to their corridor (the rows simply re-flap — no marketing→dashboard page swap). The Dashboard's broken query params are fixed (`q`, `countries`).
**Retired:** PassportHero, its 81 KB image and stamp; stats CountUp strip; testimonials.

## 7. Jobs + job detail (wave 1)

- **/jobs is the board** (`PageShell` sign `A · JOBS`, "Where to *next?*"): search by role/company/city/code; filters become gate chips (role type, remote = ANY GATE, country, saved); rows show code · role · company · pay · status; phones get two-line rows; no horizontal overflow; real error state (not "no matches"); "Load more" re-flaps new rows in.
- **AI quota fix:** salary predictions only for visible rows, batched, cached; failures show "pay estimate unavailable".
- **Score/sort consistency:** one scoring function used for both sort and badge.
- **Job detail = the gate** (a `Dialog` panel, `data-lenis-prevent`): header `OM <id> · <CODE> · GATE <letter+number>` (deterministic from the job id), role + company + location + age; **predicted pay flaps in** over a range bar lit like runway lights (the city's range); the AI advice reads as an announcement ("Attention, candidates for …") — no canned verdict shown as AI (if `job-advice` fails, say advice unavailable); CTAs "Board this role →" (apply) and "🛂 Visa for <country>" → `https://migrova.netlify.app/visa?to=<iso2>`.

## 8. Later waves (each its own plan section, same rules)

- **Wave 2 — /map = control tower:** Mapbox dark/asphalt + amber clustered beacons (cluster layer, not 2000 DOM markers; `pixelRatio` ≤ 2); tapping a country opens an `ARRIVALS · <COUNTRY>` mini-board; Lenis off. **/saved = itinerary:** saved roles as a board; removing flips the row to `CANCELLED`; Remove visible on touch.
- **Wave 3 — /resume = security X-ray:** the PDF slides through a scanner; grade reads `CLEARED 81` / `BAG CHECK 47`; clichés show as prohibited items; red flags as alarms; enforce the 10 MB limit; image-only PDFs flagged. **/interview = flight simulator:** the 15 questions as a pre-flight checklist with an altimeter progress (reaches 100%); ends `CLEARED FOR TAKEOFF` / `GO-AROUND`. **/cover-letter = airmail desk:** tone as luggage tags; editable letter; folds into a PAR AVION envelope on copy/download; show `keywordsUsed`.
- **Wave 4 — /startups = hangar:** each startup gets a generated tail fin; upvote = `+1 PASSENGER`, interest = `STANDBY`. **/community = departure lounge:** route chips (`LHE → TOR`) by authors. **/messages = gate chat:** realtime, phone-first. **/profile = crew badge.**
- **Wave 5 — /contact** (Netlify Forms, from the P0 fix) as an information desk; **/admin** in hall style; global footer; per-route titles + social images.

## 9. Step 0 — split-flap prototype (go/no-go)

Before wave 1: a single test page with a 12-row FlapBoard (homepage-sized), deployed to a Netlify draft link. Pass: on the owner's iPhone 13, a full board re-flap holds ~60 fps (`?fps=1` overlay p95 frame < 20 ms) and looks right. If it fails, fall back to a lighter flap (opacity crossfade per character, or row-level flips) before building on it.

## 10. Testing and verification (every wave)

- Unit (node:test): `cityCode`, `codeSearch`, `localPay`, `jobStatus`, `localTime`, flap diffing (only changed characters), scoring consistency, gate-number determinism, no counts in copy (source scan for large numeric job totals), no "flight"/"fare" in copy, no raw-HTML sinks.
- Build + budgets (`js-size.mjs` per page, paired LCP A/B vs master on `/` and `/jobs`).
- Browser (real-GPU Chromium CDP): 375×548, 390×664, 390×844, 768×1024, 1440×900; reduced motion; no console errors; frame timing of each signature moment on emulated iPhone 13 (CPU ×4): p95 < 20 ms.
- Review per task + whole-wave review; test link on the owner's iPhone 13; live after his OK.

## 11. Open items
- Aahil's one-line founder note under his row (draft: "I made it across three countries. This board is so you can too.").
- City→code table source (static file in the repo; ≈400 cities) — curated once.
- The jobs-ingest pipeline (stale since March) — separate task with a server-only service key.
