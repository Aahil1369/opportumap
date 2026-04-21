# OpportuMap — Full Visual Redesign

**Date:** 2026-04-21
**Status:** Design approved, ready for implementation plan
**Driver:** Peer feedback that current site reads as AI-generated. Goal: unmistakably human, distinctive, retention-focused.

---

## 1. Problem

Current OpportuMap (`~/opportumap`) uses the aesthetic defaults that LLM code-generators ship:
- Emoji icons (🌍🛂📄🎤) for features and tools
- Indigo-600 primary + indigo/violet gradient accents
- Bento grid of rounded-3xl cards
- Grid-overlay behind hero, `font-black text-7xl` headline, pulsing dot "announcement pill"
- Pastel gradient-backed icon containers, "shadow-indigo-500/30" glows
- Animated floating fake job cards with match percentages

These are all competent individually but pattern-match instantly to v0 / Cursor / Bolt output. Peers read the whole as "AI-made."

## 2. Design Direction (locked)

**Primary aesthetic — Editorial / Humanist.** Paper, ink, serif display, terracotta accent. Readers should register it as a magazine or reference work, not a SaaS landing page.

**Secondary surface — Terminal / Utility.** Dense data pages (Jobs list, Saved, Map sidebar, Admin, Visa report, Resume grader output) shift to a moss-green terminal aesthetic with monospace type and sharp edges. Acts as a second "register" — the publication's data appendix.

Every surface belongs to one register. No hybrid cards / ambiguous bastards.

## 3. Design Tokens

### 3.1 Color — "Field Notes"

```css
/* Paper register */
--paper-bg:       #e6dfc9;  /* oat paper */
--paper-bg-alt:   #efe9d8;  /* lighter paper for cards */
--paper-ink:      #1d2920;  /* moss-ink */
--paper-ink-dim:  #3d443a;  /* body text */
--paper-ink-sub:  #5a6b4a;  /* captions, meta */
--paper-rule:     rgba(29,41,32,0.15);

/* Terminal register */
--term-bg:        #1d2920;  /* deep moss */
--term-bg-alt:    #243029;  /* card surfaces */
--term-ink:       #e6dfc9;  /* oat on moss */
--term-ink-sub:   #8aa085;  /* mint-muted */
--term-rule:      #2d3a32;

/* Universal accents */
--accent:         #c75d2c;  /* terracotta — highlights, CTAs, italics */
--accent-hover:   #b04d20;
--data:           #b8cf5d;  /* lime-sage — $ amounts, counts, "live" signals (terminal only) */
--data-dim:       #8aa04a;
```

**Usage rules.** Terracotta is the only highlight color. No blues, no greens (other than the moss surfaces), no indigo anywhere. Lime-sage (`--data`) is reserved for the terminal register — never appears on paper.

### 3.2 Type

Three fonts, loaded via Google Fonts (`next/font/google`) with `display: swap` and preloaded subsets:

- **Instrument Serif** — display. H1/H2 only. Italic is a primary feature, not decoration.
- **Inter** — body + UI. Weights 400/500/600/700.
- **JetBrains Mono** — kickers, meta, terminal-register body, data values.

```css
--font-display: 'Instrument Serif', Georgia, serif;
--font-body:    'Inter', system-ui, sans-serif;
--font-mono:    'JetBrains Mono', ui-monospace, monospace;
```

**Scale (paper register).**
- h1: display 56–80px / line 0.98 / -0.02em
- h2: display 36–48px / line 1.04 / -0.015em
- h3: body 18px / 600 / 1.3
- body: 15–17px / 1.55
- kicker: mono 11px / 0.18em letter-spacing / uppercase
- meta: mono 10–11px / 0.1em letter-spacing

**Scale (terminal register).**
- title: mono 14px / 500 / no tracking
- body: mono 12–13px / 1.5
- row: mono 11px / 1.4
- section label: mono 10px / 0.12em tracking / uppercase

### 3.3 Spacing, radii, motion

- Spacing scale: 4 · 8 · 12 · 16 · 20 · 28 · 40 · 56 · 80 · 120 (Tailwind default fine)
- Radii: paper = 0 or 2px max; terminal = 0. **No `rounded-3xl`**, no `rounded-2xl`, no `rounded-xl`. Hard edges or `rounded-sm`.
- Motion easing: `cubic-bezier(.22,1,.36,1)` everywhere.
- Motion durations: 160ms (micro), 260ms (standard), 440ms (deliberate reveals).

## 4. Components / Primitives

New shared primitives in `app/components/ui/`:

- `EditorialHero.js` — hero wrapper: kicker + H1 + sub + meta-footer. Props: `kicker`, `title`, `sub`, `meta[]`, `cta`, `secondaryCta`, `rightPanel`.
- `TerminalPanel.js` — moss-bg container. Props: `label` (e.g. "LIVE FEED · /JOBS"), `children`. Used for data surfaces inside editorial pages and whole terminal-register pages.
- `SectionHead.js` — renders `§ ${number} · ${kicker}` in mono + H2 below. Every section on every page uses this.
- `Btn.js` — 3 variants only: `primary` (moss-on-oat), `secondary` (outlined), `ghost` (text only with terracotta underline on hover). No gradients. No shadows.
- `Tag.js` — small mono tag, inverse of register: oat-on-moss on paper surfaces, moss-on-oat on terminal surfaces.
- `Glyph.js` — renders a custom SVG glyph by key. Props: `name`, `size`, `stroke`. See §6.
- `Kicker.js` — mono uppercase small text with optional leading rule-line. Used as section eyebrow.
- `MonoRow.js` — terminal table row. Props: `label`, `value`, `meta`, `accent` (bool).
- `Footnote.js` — bottom-of-page editorial aside. Props: `number`, `children`. Italic serif with terracotta asterisk.
- `NoiseSurface.js` — wraps children in a div with a 2% opacity SVG noise texture overlay.

Retired/deleted:
- All `.glass-dark` / `.glass-light` / `.gradient-text` / `.gradient-border` CSS from `globals.css`.
- All emoji-based icons in page.js FEATURES / HOW_IT_WORKS arrays.
- `Dashboard.js` gets redesigned, not deleted.

## 5. Page surface assignment

| Page | Register | Notes |
|---|---|---|
| `/` homepage | editorial + terminal right-panel | hero + tools strip + features = editorial; live-feed sidebar = terminal |
| `/jobs` | terminal | full-width moss table, paper-surface filter bar |
| `/map` | terminal | moss chrome around Mapbox, oat popups |
| `/community` | editorial | posts as magazine items, no Reddit-style density |
| `/resume` | editorial (upload) → terminal (results) | split screen after submit |
| `/visa` | editorial (input) → hybrid (report) | terracotta-accented report page with terminal data rows |
| `/relocate` | editorial | long-form city guide feel |
| `/cover-letter` | editorial | paper textarea for drafted output |
| `/interview` | editorial (questions) + terminal (mock interview) | mode-based |
| `/startups` | editorial | grid of "business profiles" as magazine entries |
| `/startups/[id]` | editorial with terminal stat block | |
| `/messages` | hybrid | paper chat bubbles on moss channel list |
| `/saved` | terminal | table format |
| `/admin` | terminal | stats as mono rows |
| `/match` | editorial | wizard as magazine pages |
| `/auth/*` | editorial | paper modal/page |
| `/contact`, `/stories`, `/profile`, `/data` | editorial | |

## 6. Custom glyph set

12 hand-drawn SVGs in `app/components/ui/glyphs/`. All 1.2px stroke, 32×32 viewbox, `currentColor`. Replace every emoji icon on the site:

| Key | Replaces | Appears on |
|---|---|---|
| `globe-wire` | 🌍 | /, /match |
| `passport` | 🛂 | /, /visa |
| `document` | 📄 | /, /resume, /cover-letter |
| `microphone` | 🎤 | /, /interview |
| `suitcase` | 🏠 ✈️ | /, /relocate |
| `compass` | 🎯 | /, /match, dashboard |
| `map-pin` | 📍 | /, /map |
| `rocket` | 🚀 | /startups |
| `envelope` | 💌 | /messages, /contact |
| `bookmark` | 💾 | /saved |
| `chat` | 💬 | /community |
| `spark` | ✨ | empty states, celebratory moments |

Utility icons (close, chevron, search, filter, menu, check, x, arrow, external-link, upload, download, sort) use **Lucide** at 1.5px stroke. Imported via `lucide-react`.

## 7. Engagement + animation layer

Non-negotiable part of the redesign — not a later polish pass.

### 7.1 Motion
- **Italic draw-in** — every `<em>` inside H1/H2 on paper surfaces gets a 1px terracotta underline drawn L→R over 320ms when its parent enters viewport. Implemented as CSS `background-size` transition on a linear-gradient background. Once per element.
- **Reveal stagger** — sections fade + rise 12px with 60ms stagger between children. Intersection Observer, `cubic-bezier(.22,1,.36,1)`, 440ms duration.
- **Magnetic primary CTA** — "Find my countries" and any `variant="primary"` `Btn` bias-translates 3–5px toward cursor within 80px radius. `requestAnimationFrame` based, never wobbles past 5px.
- **Glyph re-stroke on hover** — custom SVG glyphs use `stroke-dasharray` trick: set dasharray to path length, animate `stroke-dashoffset` from `length` to 0 on hover. 420ms.
- **Hover underline on tool cards** — 1px terracotta line draws bottom-edge L→R on 300ms dwell. Receeds on mouse-leave.
- **Page transition bar** — thin terracotta bar sweeps across top of viewport on route change. 220ms. Next.js `useRouter` + `usePathname` to detect.
- **Noise texture** — 2% opacity monochrome SVG grain overlaid on every paper surface via `NoiseSurface` wrapper.

### 7.2 Live content
- **Live jobs ticker (homepage right panel)** — `TerminalPanel` with 5 visible rows. Every 9 seconds, top row fades out, rest shift up, new row fades in at bottom. Pulls from existing `/api/jobs` at page load (50 rows in memory, cycled).
- **Counter roll-up** — 33,664 counts from 0 to target over 1200ms on first view. localStorage flag `om_counter_seen` prevents re-animation.
- **"Today's catch" chip** — single highlighted job with terracotta dot rotates every 30s among last 20 live jobs.
- **Recent matches ticker (below fold)** — if `user_profiles` table has recent country match events, rotate 3 examples "Priya, IN → DE · matched yesterday". Fallback to static seed if empty.

### 7.3 Psychology hooks
- **Curiosity gap in sub-headline** — server component reads request IP country (via Netlify edge function or `x-country` header), computes roles open to that nationality, renders "**412 roles** are open to someone with your passport right now." Falls back to "Find out how many roles are open to someone with your passport →" if country unknown.
- **Personalized re-entry** — logged-in returning users see "*Welcome back, {first_name} — {n} new jobs since {last_visit}*" as the h1 sub-headline. Uses Supabase `user_profiles.last_seen`.
- **Progress thread in Navbar** — 2px terracotta progress line under the wordmark shows `(tools_used / 8)` for logged-in users. Reads from new Supabase table `user_tool_usage`.
- **Editorial footnote per page** — each page has one italic serif footnote at the bottom, content per-page in `PAGE_FOOTNOTES` dict. Adds character.
- **Loss framing on Visa** — if `/visa` returns a report timestamp > 7 days old for that country-nationality pair, show "Visa policy for {country} changed on {date} — regenerate for fresh report" banner.

### 7.4 Small craft details
- **Section numbering** — every H2 is prefixed with `§ 01`, `§ 02` in mono by `SectionHead`. Numbering resets per page.
- **Custom cursor** — map page only: thin terracotta crosshair (16px) replaces default cursor. Editorial pages keep default.
- **Wordmark in italic** — Navbar wordmark is "OpportuMap" in Instrument Serif italic, not a logo mark.

## 8. Global infrastructure changes

### 8.1 `app/globals.css`
- Delete: `.gradient-text`, `.gradient-text-warm`, `.gradient-border`, `.glass-dark`, `.glass-light`, `.animate-blob*`, all blob keyframes.
- Add: CSS variables from §3.1, noise-texture SVG data URI, italic-draw-in keyframes, magnetic-CTA scope styles.
- Update: scroll reveal keeps current shape but with new easing + timing.

### 8.2 `tailwind.config.mjs` (creating — currently lives via `@theme inline` in globals.css)
- Extend with all design tokens as Tailwind theme values so classes like `bg-paper-bg`, `text-paper-ink`, `text-accent`, `bg-term-bg`, `font-display`, `font-mono` resolve.

### 8.3 `app/layout.js`
- Load Instrument Serif + Inter + JetBrains Mono via `next/font/google`.
- Inject CSS variables for font families on `<html>`.
- Add `<NoiseSurface>` wrapping top-level children (or inline noise class).
- Keep PingTracker, keep Supabase session provider.

### 8.4 `app/components/Navbar.js`
- Replace wordmark with italic-serif text "OpportuMap"
- Add progress-thread bar under wordmark for logged-in users
- Nav link style: mono uppercase 11px with letter-spacing
- Retire emoji in Tools submenu

### 8.5 Theme hook
- `useTheme.js` stays but simplifies: only `paper` mode for now. Dark mode → deferred to after redesign stable (see §11 Risk).

## 9. File/component map (what changes where)

**New files:**
- `app/components/ui/EditorialHero.js`
- `app/components/ui/TerminalPanel.js`
- `app/components/ui/SectionHead.js`
- `app/components/ui/Btn.js`
- `app/components/ui/Tag.js`
- `app/components/ui/Glyph.js`
- `app/components/ui/Kicker.js`
- `app/components/ui/MonoRow.js`
- `app/components/ui/Footnote.js`
- `app/components/ui/NoiseSurface.js`
- `app/components/ui/glyphs/*.js` (12 custom SVGs)
- `app/components/ui/hooks/useMagnetic.js`
- `app/components/ui/hooks/useItalicReveal.js`
- `app/components/ui/PageTransition.js`
- `tailwind.config.mjs`

**Rewritten files:**
- `app/globals.css`
- `app/layout.js`
- `app/page.js`
- `app/components/Navbar.js`
- All pages under §5 table (17 pages + subpages)
- `app/components/Dashboard.js`
- `app/components/JobCard.js` (terminal-register MonoRow variant)
- `app/components/AuthModal.js` (paper modal)
- `app/components/ProfileModal.js` (paper modal)
- `app/components/StartupCard.js`, `StartupModal.js`, `StartupChat.js`
- `app/components/CountryMatchCard.js`, `VisaProbabilityMeter.js`, `RelocationModal.js`, `CommunityModal.js`, `ChatWidget.js`, `StoryCard.js`, `JobDetailPanel.js`, `Map.js` popups

**Unchanged (infrastructure):**
- All `app/api/**/route.js` files
- `lib/supabase-*.js`
- `proxy.js`
- `scripts/**` ingestion scripts
- Database schema (but see §10 for 2 small additions)

## 10. Supabase changes

Two small additions only:

```sql
-- 1. Tool usage tracking (for Navbar progress thread)
create table if not exists public.user_tool_usage (
  user_id uuid references auth.users(id) on delete cascade,
  tool text not null, -- e.g. 'match', 'visa', 'resume', 'cover-letter', 'interview', 'relocate', 'startups', 'jobs'
  used_at timestamptz not null default now(),
  primary key (user_id, tool)
);
alter table public.user_tool_usage enable row level security;
create policy "users read own usage" on public.user_tool_usage
  for select using (auth.uid() = user_id);
create policy "users insert own usage" on public.user_tool_usage
  for insert with check (auth.uid() = user_id);

-- 2. Extend user_profiles for personalized re-entry
alter table public.user_profiles
  add column if not exists last_seen_at timestamptz,
  add column if not exists first_name text;
```

API side: new `app/api/tool-usage/route.js` (POST logs usage, GET returns distinct tools used). Each tool page calls POST on successful submit.

## 11. Risks + edge cases

| Risk | Mitigation |
|---|---|
| Dark mode toggle breaks during redesign | Drop the user-toggleable dark mode entirely. The "terminal register" (§2) is a surface style applied to specific pages based on content, not a user preference. Most pages are paper, some are terminal — both coexist in a single theme. A future dark mode is out of scope. |
| Subagents collide on shared files (`globals.css`, `layout.js`, `Navbar.js`, `tailwind.config.mjs`) | Foundation-first phase runs as a single agent before page subagents dispatch in parallel. |
| Mapbox map chrome looks wrong against moss-green | Override Mapbox style + popup CSS in this repo's `globals.css` (already patched there). Test at /map early. |
| Emoji country flags inside job rows — 🇸🇪 🇬🇧 etc. | Keep these. Country flags are the one emoji class that reads as data, not decoration. |
| Instrument Serif doesn't render on older browsers | `next/font` handles the fallback to Georgia gracefully. Mockup already uses the fallback chain. |
| Realtime chat (StartupChat) during redesign | Update visual shell only; subscription logic stays untouched. Test after. |
| Accessibility — moss terminal register contrast | All terminal text is `#e6dfc9` on `#1d2920` → WCAG AAA for body. Lime-sage data (`#b8cf5d` on moss) → AA for 14px+, keep mono ≥12px. |
| Count-up animation flashing for returning visitors | localStorage flag `om_counter_seen`. |
| Magnetic CTA annoying users who prefer reduced motion | Wrap all motion in `@media (prefers-reduced-motion: no-preference)` guards. Site still fully usable without motion. |

## 12. Rollout — big-bang with parallel subagents

Approved scope: ship everything in one session.

Order of operations (to be expanded by writing-plans skill):

1. **Foundation (serial, one agent).** globals.css, tailwind.config.mjs, layout.js, Navbar, all `ui/` primitives, all 12 glyphs, `useTheme` simplification, NoiseSurface, italic-draw hook, magnetic hook, page-transition bar. Deletes retired CSS.
2. **Per-page subagents (parallel).** Each subagent gets: spec §5 row for its page + list of components to use + `ui/` primitive import paths + examples. Approximately 10 agents, bundled as follows to avoid trivial single-page agents:
   - Homepage (`/`) — solo
   - Core tools pack: `/match`, `/resume`, `/visa`, `/relocate` (all editorial input → report)
   - Writing tools pack: `/cover-letter`, `/interview` (all editorial)
   - Jobs/data pack: `/jobs`, `/saved`, `/map` (all terminal)
   - Community: `/community`
   - Startups: `/startups`, `/startups/[id]`
   - Messages: `/messages`
   - Admin: `/admin`
   - Auth + settings pack: `/auth/*`, `/sign-in`, `/sign-up`, `/profile`, `/contact`, `/stories`, `/data` (all editorial)
3. **Supabase migration.** Run §10 SQL via Supabase MCP. Add `/api/tool-usage` route.
4. **QA sweep (serial, one agent).** Hit every page in dev, verify: no emoji icons (regex scan), no indigo classes (regex scan), no `rounded-3xl`/`rounded-2xl` (regex scan), all fonts loading, italic draw-in firing, magnetic CTA on primary buttons, reveal stagger working.
5. **Deploy.** Commit to master → Netlify auto-deploys. Verify live site.

## 13. Success criteria

- Pattern-matching test: send screenshots to 3 peers who previously called it AI-generated. Expect them to not flag it.
- Regex scans return 0 matches for: `🌍|🛂|📄|🎤|🏠|🎯|📍|🚀|💌|💾|💬|✨` (emoji icons), `indigo-[0-9]+`, `violet-[0-9]+`, `gradient-text`, `gradient-border`, `glass-dark`, `glass-light`, `rounded-3xl`, `rounded-2xl`, `rounded-xl`.
- Lighthouse: no performance regression vs. current site (fonts preloaded, noise texture as inline SVG not image).
- All 17 pages load without runtime error, all forms submit, chat still delivers, auth still works.

---

## Appendix A — Things explicitly *not* in scope

- Dark mode toggle (paper-only during redesign; terminal register is a separate register, not a theme mode)
- New features (anything beyond what pages already do)
- Database changes beyond §10
- Mobile app
- Internationalization
- Changes to `/api/**` logic beyond §10 additions
- CMS / editorial-management for footnotes (hardcoded dict is fine)

## Appendix B — Open questions at time of writing

None. All direction / palette / type / icon / scope / engagement questions resolved during brainstorming session 2026-04-21.
