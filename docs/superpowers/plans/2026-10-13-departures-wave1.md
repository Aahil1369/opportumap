# Departures — Step 0 + Wave 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the split-flap board is smooth on the owner's iPhone (step 0), then ship the dark "Departures" foundation, homepage, /jobs board and the job-detail gate (wave 1).

**Architecture:** Pure, tested modules in `lib/departures/` (flap diffing, city codes, pay, status, gates, pay-prediction queue) feed a small kit in `app/components/kit/` (FlapBoard, PageShell, GateSign, Dialog…). The homepage becomes a server component that renders a real board (ISR) and layers motion on after hydration; /jobs and the job detail are rebuilt on the kit. Other pages keep working in their old look until later waves (they only get the night navbar).

**Tech Stack:** Next.js 16 App Router, React 19, plain JS, Tailwind 4 (`app/globals.css`), existing `motion` + `lenis`, Supabase (`@supabase/ssr`), Groq via `lib/ai.js`, node:test.

**Spec:** `docs/superpowers/specs/2026-10-13-departures-redesign-design.md`

## Global Constraints

- No new runtime dependencies; keep `motion` + `lenis`, no other animation library. Plain JS, no TypeScript.
- Animate only `transform` and `opacity` (plus short `stroke-dashoffset` paths). No CSS trig (`tan(`, `atan2(`). No `backdrop-filter`/SVG filters on moving layers. No gating on `navigator.hardwareConcurrency`. At most ~120 elements animating at once.
- `prefers-reduced-motion: reduce` → final state at once (text simply appears).
- Signature moments play once; ambient loops pause off screen. Server-render every board's final text; motion layers on after hydration.
- Lenis: `data-lenis-prevent` on the job-detail panel and filters.
- Body text ≥ 16px on phones; inputs 16px; `svh`/`dvh` not `vh`; every text/background pair ≥ 4.5:1.
- The board is a real list with readable text; flap tiles are `aria-hidden` visual duplicates; status words always in text; dialogs trap focus and close on Esc; rows are links/buttons.
- **No job/listing counts anywhere** (no totals like "33,664", no "100 countries"). **Never the words "flight" or "fare"** in visible copy (say role, pay).
- Founder row text exactly: `GIL → EBB → DFW · FOUNDER, 16 · ARRIVED ✓`.
- Palette tokens exactly: `--hall #0a0b0d`, `--hall-2 #111316`, `--hall-3 #16181c`, `--rule #22262c`, `--ink #f4f1e6`, `--ink-dim #b9bdc4`, `--ink-sub #9aa0a8`, `--sign #ffc531`, `--sign-ink #0a0b0d`, `--amber #ffb547`, `--ok #3ce08a`, `--new #ffc531`, `--info #9fc8ff`, `--warn #ff6b4a`. Fonts: Inter + JetBrains Mono (Instrument Serif not used by redesigned pages).
- Budgets (`node scripts/perf/js-size.mjs <url>` on a local prod build): `/` ≤ 248 KB gzip, `/jobs` ≤ 318 KB; kit ≤ 6 KB JS + ≤ 8 KB CSS gzip; homepage LCP (`scripts/perf/lcp.mjs`) not worse than master (paired median).
- AI quota: salary prediction only for rows on screen, max 3 in flight, cached per `title|country`; never 60 parallel calls.
- Never put the owner's email in code. Git via the PowerShell tool in `C:\Users\aahil\opportumap-departures` (branch `departures`); commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never push or deploy.

## Review Focus

1. **Odd job data** (no salary, unknown city, "Remote"/"Anywhere", non-Latin or 200-char titles, missing `posted_at`) → rows never overflow, codes are exactly 3 letters, pay reads "Pay not listed", status falls back to ON TIME. Pinned in Task 2 tests + Task 5 layout check.
2. **AI failures / quota** (predict-salary 429/500, job-advice error) → "Pay estimate unavailable" / "Announcement unavailable", never a canned verdict shown as AI, no retry storm. Pinned in Task 5 (`createPayQueue`) and Task 6 (job-advice route) tests.
3. **Live feeds slow or down at ISR time** → the homepage still renders a board from a static fallback sample. Pinned in Task 4 (`boardRowsFrom`) tests.
4. **Typing/searching while results load** → the newest results win; stale responses ignored. Pinned in Task 5 (`createLatest`) tests.
5. **Reduced motion + keyboard/screen reader** → board text present without flaps, dialog focus trap/Esc, rows reachable. Pinned in Task 1 (FlapText reduced path) and Task 6 (Dialog) browser checks.

---

## File structure

```
lib/departures/   flap.js  cityCode.js  cityCodes.data.js  codeSearch.js  pay.js  status.js
                  localTime.js  gate.js  payQueue.js  createLatest.js  board.js
lib/jobsFeed.js   (fetchers moved out of app/api/jobs/route.js, shared by the API and the homepage)
app/components/kit/  FlapText.js  FlapBoard.js  GateSign.js  PageShell.js  StatusPill.js
                     AirportCode.js  SignatureMoment.js  Dialog.js  kit.css
app/lab/flap/page.js  (step-0 prototype, noindex)     public/om-fps.js  (?fps=1 overlay)
scripts/perf/js-size.mjs  scripts/perf/lcp.mjs        scripts/departures/__tests__/*.test.mjs
```

---

## STEP 0

### Task 1: Split-flap engine + prototype page

**Files:**
- Create: `lib/departures/flap.js`, `app/components/kit/FlapText.js`, `app/components/kit/FlapBoard.js`, `app/components/kit/kit.css`, `app/lab/flap/page.js`, `public/om-fps.js`, `scripts/perf/js-size.mjs`, `scripts/perf/lcp.mjs` (copy both from `C:\Users\aahil\migrova\scripts\perf\`), `scripts/departures/__tests__/flap.test.mjs`.
- Modify: `package.json` (add `"test": "node --test \"scripts/**/__tests__/*.test.mjs\""`), `app/layout.js` (load `public/om-fps.js` only when `?fps=1` — inline 3-line loader or a tiny client component).

**Interfaces:**
- Produces:
  - `FLAP_CHARS` = `' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·:$€£¥→✓-/.,'` (cycle order for the tiles).
  - `flapDiff(from: string, to: string) → Array<{ index, from, to, changed }>` — pads the shorter string with spaces to the longer length; `changed` false where characters match.
  - `flapSchedule(diff, { stepMs = 45, rowDelayMs = 0, maxSteps = 6 }) → Array<{ index, delayMs, steps }>` — only changed cells; delay grows left→right (`rowDelayMs + index * stepMs`); `steps` = intermediate characters to show (≤ `maxSteps`, ending on `to`).
  - `FlapText({ text, from = '', play = true, className })` — renders the final `text` as real text (screen readers read it) plus `aria-hidden` tiles that animate per `flapSchedule` once when `play` turns true; each flip is a `scaleY` on two half-tiles (`transform` only); under `prefers-reduced-motion` renders plain text, no tiles.
  - `FlapBoard({ columns: Array<{ key, label, width }>, rows: Array<{ id, cells: Record<key,string>, href? }>, play = true, caption })` — a `<table>`-semantics board (`role="table"`), header labels in mono, each cell a `FlapText`; rows stagger by 120 ms; at most 120 tiles animating at once (queue the rest).
  - `/lab/flap` — 12 rows of realistic sample roles (LOCAL · CODE · ROLE · PAY · STATUS) that re-flap to a second set every 4 s; `export const metadata = { robots: { index: false } }`.

- [ ] **Step 1: Write the failing test** `flap.test.mjs`: `flapDiff('YYZ','YVR')` → 3 entries, `changed` = `[false, true, true]`; `flapDiff('AB','ABCD')` pads → length 4, indexes 2–3 changed; `flapDiff('', '')` → `[]`; `flapSchedule(flapDiff('08:40','09:15'))` returns only changed indexes `[1,3,4]`, delays strictly increasing, every `steps` array ends with the target char and has ≤ 6 entries; a 200-char target never yields more than 200 entries; unknown characters (e.g. `'Ō'`) still end on themselves.
- [ ] **Step 2: Run** `node --test scripts/departures/__tests__/flap.test.mjs` → FAIL.
- [ ] **Step 3: Implement** the module, components, kit.css flap styles (tiles on `--hall-3`, hairline split, `transform-origin` center; reduced-motion block), the lab page and the fps overlay (fps p50/p95 over 2 s, tiles animating, viewport — same idea as Migrova's `public/passport-fps.js`).
- [ ] **Step 4: Run** `npm test` → pass; `npm run build` → pass. Browser (real-GPU Chromium CDP, emulated iPhone 13 390×664 touch, CPU ×4): load `/lab/flap?fps=1`, record frame intervals over 3 re-flaps → report p50/p95/% > 16.7 ms; reduced-motion emulation shows plain text with no tiles; screenshot.
- [ ] **Step 5: Commit** `feat(lab): split-flap engine + iPhone prototype page`

**Step 0 gate (controller):** deploy a Netlify draft (`--alias flap-test`), the owner opens `/lab/flap?fps=1` on his iPhone 13. Pass = smooth to his eye and p95 < 20 ms on the overlay; fail = switch FlapText to the lighter fallback (opacity crossfade per character) before Task 4.

---

## WAVE 1

### Task 2: Departures data helpers + jobs feed fixes

**Files:**
- Create: `lib/departures/cityCodes.data.js` (≈400 rows `[name, aliases[], iata, iso2, tz]` for major cities incl. every Adzuna country's top cities and remote hubs), `lib/departures/cityCode.js`, `lib/departures/codeSearch.js`, `lib/departures/pay.js`, `lib/departures/status.js`, `lib/departures/localTime.js`, `lib/departures/gate.js`, `lib/jobsFeed.js`, tests `scripts/departures/__tests__/{cityCode,pay,status,gate,feed}.test.mjs`.
- Modify: `app/api/jobs/route.js` (use `lib/jobsFeed.js`; Adzuna jobs gain numeric `salary_min`, `salary_max`, `currency`; fix `COUNTRY_COORDS[c].lng` NaN by reading the `[lng, lat]` array; keep the response shape `{ jobs, total, source }`).

**Interfaces:**
- Produces:
  - `cityCode(location: string, iso2?: string) → { code: string (3 A–Z), city: string|null, matched: boolean }` — exact/alias match on the city part of `location` (before the first comma) against the table; remote words (`remote`, `anywhere`, `worldwide`) → `{ code: 'ANY' }`; else the country's main city code from the table; else the first three letters of the city/country uppercased (letters only, padded `X`).
  - `codeSearch(query) → { codes: string[], cities: string[] }` — `'tor'` → includes `'YYZ'` and `'Toronto'`; `'yyz'` → Toronto; case-insensitive; empty → empty arrays.
  - `CURRENCY_BY_COUNTRY` (Adzuna countries: gb GBP, us USD, ca CAD, au AUD, de/fr/nl/at/be/es/it EUR, in INR, nz NZD, pl PLN, sg SGD, za ZAR, br BRL, ch CHF, mx MXN) and `localPay(job) → string` — numeric min/max → `'C$88K–102K'`-style compact range with the currency's symbol (`$` only for USD; `C$` CAD, `A$` AUD, `NZ$` NZD, `S$` SGD, `£`, `€`, `₹`, `R`, `R$`, `CHF`, `zł`, `MX$`); one value → `'C$88K'`; nothing usable → `'Pay not listed'`.
  - `jobStatus(job, { now, profile }) → 'NEW' | 'ANY GATE' | 'BOARDING' | 'ON TIME'` — remote → `ANY GATE`; `posted_at` within 48 h of `now` → `NEW`; `profile` present and `scoreJob(job, profile) ≥ 75` → `BOARDING`; else `ON TIME`. Precedence: ANY GATE > NEW > BOARDING > ON TIME.
  - `localTime(iso2, now) → 'HH:MM'` via the table's/country's main timezone and `Intl.DateTimeFormat` (24 h); unknown → UTC.
  - `gateFor(jobId) → { flight: 'OM 4127', gate: 'A12' }` — deterministic hash of the id; flight number 1000–9999; gate letter A–F + 1–30.
  - `lib/jobsFeed.js`: `fetchLiveJobs({ query, countries }) → Promise<job[]>` and `fetchDbJobs(...)` moved verbatim from the route (behaviour unchanged except the fixes above).

- [ ] **Step 1: Write the failing tests**
  - cityCode: `('Toronto, Ontario','ca')` → `YYZ`; `('Lahore, Punjab','pk')` → `LHE`; `('Remote')` → `ANY`; `('Some Village','de')` → Germany's main code (e.g. `FRA` or `BER` as in the table) with `matched:false`; `('Ōsaka!!')` → `/^[A-Z]{3}$/`; `('')` → 3 letters.
  - codeSearch: `'tor'` → codes include `YYZ`; `'yyz'` → cities include `Toronto`.
  - pay: `{ salary_min: 88000, salary_max: 102000, currency: 'CAD' }` → `'C$88K–102K'`; GBP 45000 only → `'£45K'`; no numbers → `'Pay not listed'`; USD → starts with `'$'`, CAD never starts with a bare `'$'`.
  - status: remote + posted 1 h ago → `ANY GATE`; posted 2 h ago → `NEW`; posted 5 days ago, no profile → `ON TIME`; missing `posted_at` → not NEW.
  - gate: `gateFor('adzuna_123')` stable across calls, matches `/^OM \d{4}$/` and `/^[A-F]([1-9]|[12]\d|30)$/`.
  - feed: a stub Adzuna payload → job has numeric `salary_min`, `currency: 'CAD'` for `ca`, finite `lng`/`lat`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test`, `npm run build`; `curl http://localhost:3200/api/jobs?q=engineer&countries=ca` (prod build) returns jobs with `currency` and finite coordinates.
- [ ] **Step 5: Commit** `feat(departures): city codes, local pay, status, gates; jobs feed fixes`

### Task 3: Foundation — dark tokens, kit chrome, night navbar

**Files:**
- Modify: `app/globals.css` (add the §Global palette tokens to `:root` + `@theme inline` as `hall`, `hall-2`, `hall-3`, `rule`, `ink`, `ink-dim`, `ink-sub`, `sign`, `sign-ink`, `amber`, `ok`, `new`, `info`, `warn`; keep `paper-*`/`term-*` for not-yet-redesigned pages; `.tool-card-underline` → `scaleX`; drop `.noise-overlay` usage on redesigned pages), `app/components/Navbar.js` (night style on every page: logo, gate-sign styled nav links, sign-in; mobile drawer gets `aria-label`, focus to Close, Esc closes), `app/components/ui/Btn.js` (`transition` only `transform, opacity`), delete `app/hooks/useTheme.js` (unused).
- Create: `app/components/kit/GateSign.js`, `PageShell.js`, `StatusPill.js`, `AirportCode.js`, `SignatureMoment.js`, `Dialog.js`, `lib/departures/createLatest.js`, styles in `kit.css`; test `scripts/departures/__tests__/foundation.test.mjs`.

**Interfaces:**
- Produces:
  - `GateSign({ letter, label, href? })` — yellow `--sign` plate, black letter chip, mono label; a link when `href`.
  - `PageShell({ sign: { letter, label }, title, accent, sub, children, wide = false })` — black hall header (GateSign, h1 with the yellow `accent` word, sub) then content on `--hall`; max width 1120 (`wide`) or 880.
  - `StatusPill({ status })` — text always present; colour per status (`BOARDING` --ok, `NEW` --new, `ON TIME`/`ANY GATE` --info).
  - `AirportCode({ code })` — mono 3-letter tile.
  - `SignatureMoment({ children, playWhen = 'mount' | 'inView', onPlay })` — calls children with `play: boolean` once; reduced motion → `play` false and final state.
  - `Dialog({ open, onClose, labelledBy, children })` — `role="dialog" aria-modal`, focus trap, Esc, restores focus, `data-lenis-prevent`, body scroll lock.
  - `createLatest() → { next(): number, isCurrent(id): boolean }`.
- [ ] **Step 1: Write the failing tests** `foundation.test.mjs`: contrast (`contrastRatio` helper in the test) ≥ 4.5 for `#f4f1e6` on `#0a0b0d`, `#b9bdc4` on `#111316`, `#9aa0a8` on `#0a0b0d`, `#0a0b0d` on `#ffc531`, `#3ce08a`/`#9fc8ff`/`#ffc531` on `#111316`; `createLatest` invalidates earlier ids; source scans: `app/globals.css` (comments stripped) has no `atan2|tan\(`; no file under `app/` or `lib/` contains `flight` or `fare` inside JSX text/strings of redesigned files (`app/page.js`, `app/jobs/**`, `app/components/kit/**`, `app/components/Job*`) — case-insensitive word match; no 4+ digit job-total patterns like `/\b\d{1,3},\d{3}\s*(jobs|roles|departures)\b/i` in those files.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test`, `npm run build`; browser 390×844 + 1440×900: every page shows the night navbar without layout breakage (old pages keep their bodies); drawer opens/closes with Esc and returns focus.
- [ ] **Step 5: Commit** `feat(kit): dark hall tokens, gate signs, page shell, dialog, night navbar`

### Task 4: Homepage — the departures board

**Files:**
- Create: `lib/departures/board.js`, `app/components/home/HomeBoard.js` (client, motion), `app/components/home/PersonalBoard.js` (client), `app/components/home/WhereTo.js` (client), `app/components/home/GateWalk.js`, `app/components/home/NightWindow.js`, `app/components/home/home.css`; test `scripts/departures/__tests__/board.test.mjs`.
- Modify: `app/page.js` → server component (`export const revalidate = 600`; per-route `metadata`); remove `PassportHero`, the CountUp stats strip, testimonials, the "Visa guides" step and the Dashboard swap; delete `app/components/ui/PassportHero.js` and `public/passport-hero.webp` if no longer imported; fix `app/components/Dashboard.js` params (`q`, `countries`) if still used anywhere, otherwise delete it.

**Interfaces:**
- Consumes: `fetchLiveJobs` (Task 2), `cityCode`, `localPay`, `jobStatus`, `localTime`, `FlapBoard`, `FlapText`, `GateSign`, `SignatureMoment`, `createLatest`.
- Produces:
  - `BOARD_COLUMNS` = `[{ key: 'time', label: 'LOCAL' }, { key: 'code', label: 'TO' }, { key: 'role', label: 'ROLE' }, { key: 'pay', label: 'PAY' }, { key: 'status', label: 'STATUS' }]`.
  - `boardRowsFrom(jobs, { now, profile, limit = 8 }) → row[]` — picks a varied set (distinct cities, ≤ 2 per country, prefer jobs with pay), maps to cells via the Task 2 helpers, `href: '/jobs?job=<id>'`; when `jobs` is empty or throws upstream, returns `FALLBACK_ROWS` (8 static realistic rows, marked `fallback: true`, linking to `/jobs`).
  - `FOUNDER_ROW` = `{ id: 'founder', cells: { time: 'NOW', code: 'DFW', role: 'GIL → EBB → DFW · FOUNDER, 16', pay: '', status: 'ARRIVED ✓' } }`.
- **Page beats** (server-rendered text, motion after hydration; reduced motion = static):
  1. Kicker `DEPARTURES · روانگی · DÉPARTS`, h1 "The world is hiring." + yellow "Pick your gate.", the board (8 rows) clacking in on mount.
  2. One row (first with pay) lifts out and its pay re-flaps to the prediction `· PREDICTED` (from `/api/predict-salary` once, cached; on failure the beat shows the listed pay without "PREDICTED").
  3. `NightWindow`: amber city lights (static positions from the city table) with 3 route arcs drawing (`stroke-dashoffset`) from the visitor's profile city or a neutral default (no geolocation).
  4. `GateWalk`: GateSigns A Jobs `/jobs`, B Map `/map`, C Security `/resume`, D Simulator `/interview`, E Hangar `/startups`, F Airmail `/cover-letter` slide in (`transform`) when in view.
  5. The board dims except `FOUNDER_ROW` lit gold, with the line "I made it across three countries. This board is so you can too."
  6. `WhereTo`: label `WHERE TO?`, a 16px input whose typed text also flaps onto a one-row board; Enter → `/jobs?q=<text>`; a `🛂 PASSPORT CONTROL → Migrova` sign linking `https://migrova.netlify.app` (`rel="noopener"`).
  - `PersonalBoard`: for signed-in users with a profile, fetch `/api/jobs?q=<profile query>&countries=<profile countries>` and re-flap the board rows in place (same DOM, no page swap).
- [ ] **Step 1: Write the failing test** `board.test.mjs`: `boardRowsFrom([])` → `FALLBACK_ROWS` (8, all `fallback: true`); with 30 stub jobs across 5 countries → ≤ 8 rows, ≤ 2 per country, every row has 5 cells with `code` `/^[A-Z]{3}$/`; `FOUNDER_ROW.cells.role` === `'GIL → EBB → DFW · FOUNDER, 16'` and `status` === `'ARRIVED ✓'`; no cell text matches `/flight|fare/i`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** (homepage stays lean: motion components are client islands, `NightWindow`/`GateWalk` load when near view).
- [ ] **Step 4: Run** `npm test`, `npm run build`; prod build: `curl /` HTML contains the h1 text, 8 role names and the founder row (server-rendered); `js-size` `/` ≤ 248 KB; paired LCP vs master not worse; browser 390×664 + 1440×900: beats play once in order, reduced motion static, no horizontal scroll, `WHERE TO?` Enter navigates; signed-in path checked by mocking `/api/user-profile` + `/api/jobs` via request interception (rows re-flap, no page swap).
- [ ] **Step 5: Commit** `feat(home): the departures board homepage`

### Task 5: /jobs — the board

**Files:**
- Create: `lib/departures/payQueue.js`, `app/components/jobs/JobsBoard.js`, `app/components/jobs/GateFilters.js`, `app/components/jobs/usePredictedPay.js`, `app/components/jobs/jobs.css`; test `scripts/departures/__tests__/payQueue.test.mjs`, `scripts/departures/__tests__/scoring.test.mjs`.
- Modify: `app/jobs/page.js` (rebuild on `PageShell` sign `{ letter: 'A', label: 'JOBS' }`, title "Where to", accent "next?"; per-route metadata via a small `app/jobs/layout.js`), `app/data/matchJobs.js` (one `scoreJob` used for both sort and badge), `app/components/JobCard.js` (delete if replaced).

**Interfaces:**
- Consumes: Task 2 helpers, `FlapBoard`, `StatusPill`, `AirportCode`, `createLatest`, `scoreJob`, `gateFor`.
- Produces:
  - `createPayQueue({ fetcher, concurrency = 3, cache = new Map() }) → { request(job) → Promise<pay|null>, size() }` — dedupes by `title|country`, max `concurrency` in flight, caches successes and failures (a failure resolves `null` and is not retried within the session).
  - `usePredictedPay(job, { visible })` → `{ pay: string|null, state: 'idle'|'loading'|'done'|'unavailable' }` — requests only when `visible` (IntersectionObserver) through one shared queue.
  - Search: free text + `codeSearch` aliases (typing `tor` matches Toronto/YYZ jobs); gate-chip filters: role type, `ANY GATE` (remote), country, saved; newest request wins (`createLatest`); real error state ("We couldn't load roles right now. Try again.") distinct from "No roles match"; "Load more" appends rows that flap in.
  - Rows: desktop one line (code · role · company · pay · status); phones two lines (code + role / company · pay · status); each row is a button opening the gate (Task 6) and has `?job=<id>` deep links.
- [ ] **Step 1: Write the failing tests** — payQueue: 10 requests for 4 distinct `title|country` keys → fetcher called 4 times; never more than 3 in flight (instrumented fetcher); a rejecting fetcher → `request` resolves `null`, second request for the same key does not call fetcher again. scoring: for a fixed profile and jobs, sorting by `scoreJob` descending matches the order of the displayed badge values.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test`, `npm run build`; prod build browser (mock `/api/jobs` + `/api/predict-salary` via interception for determinism, one real call allowed): 390×664 no horizontal overflow, two-line rows, `tor` finds Toronto rows, only on-screen rows trigger predict calls (count requests while scrolling), a 500 from `/api/jobs` shows the error state, a 429 from predict-salary shows "Pay estimate unavailable"; `js-size /jobs` ≤ 318 KB.
- [ ] **Step 5: Commit** `feat(jobs): the jobs page is the departures board`

### Task 6: Job detail — the gate

**Files:**
- Create: `app/components/jobs/JobGate.js`, `app/components/jobs/RunwayRange.js`; test `scripts/departures/__tests__/gate-advice.test.mjs`.
- Modify: `app/api/job-advice/route.js` (on any failure return `503 { error: 'advice-unavailable' }` instead of the canned `maybe` verdict; keep the markdown-asterisk strip), `app/components/JobDetailPanel.js` (replaced by `JobGate`; delete when unused).

**Interfaces:**
- Consumes: `Dialog`, `FlapText`, `gateFor`, `cityCode`, `localPay`, `usePredictedPay`, `createLatest`.
- Produces:
  - `JobGate({ job, profile, onClose })` — inside `Dialog`: header `OM 4127 · YYZ · <CITY>` (from `gateFor` + `cityCode`) with a yellow `GATE A12` plate; role, company, location, age; **PAY · PREDICTED FOR THIS ROLE** — the prediction flaps in (`FlapText`) over `RunwayRange`; `🔊 ANNOUNCEMENT · AI ADVICE` — text begins "Attention, candidates for <role>:" + the advice headline and reasons as plain text; on advice failure: "Announcement unavailable right now." (no verdict); CTAs: "Board this role →" (job.url, `target="_blank" rel="noopener noreferrer"`, only http(s)) and "🛂 Visa for <Country>" → `https://migrova.netlify.app/visa?to=<iso2>`.
  - `RunwayRange({ min, max, low, high })` — a row of lights; lights between `min`–`max` within the city range `low`–`high` light up (opacity only), labels at both ends; values missing → hidden.
- [ ] **Step 1: Write the failing test** `gate-advice.test.mjs`: import the job-advice route's pure helper `adviceFailure()` (export it) → `{ status: 503, body: { error: 'advice-unavailable' } }`; source scan: `app/api/job-advice/route.js` no longer contains `'Looks like a solid opportunity'`; `visaLink('ca')` (export from `JobGate` helpers module) → `'https://migrova.netlify.app/visa?to=ca'`; non-http job URLs produce no Board link (`safeHttpUrl` helper: `javascript:`→ null).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test`, `npm run build`; browser: open a row → dialog focused, Esc closes and focus returns to the row; pay flaps once (static under reduced motion); a 500 from `/api/job-advice` shows "Announcement unavailable right now."; Visa link correct; `?job=<id>` deep link opens the gate; scroll inside the gate works with Lenis on.
- [ ] **Step 5: Commit** `feat(jobs): the job detail is the gate (predicted pay + announcement)`

**Wave 1 gate (controller):** whole-wave review, then a Netlify draft test link for the owner's iPhone 13; live after his OK.
