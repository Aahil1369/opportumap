# Homepage Motion Overhaul — Design

**Date:** 2026-08-20
**Status:** Approved (direction + stack), pending spec review
**Scope:** OpportuMap homepage (`app/page.js`) only, plus reusable motion primitives

## Goal

Make the homepage feel like managent.tech — "everything flows, smooth and
interactive." The user explicitly chose **max wow, accept weight** and picked all
four qualities: staggered scroll reveals, smooth momentum scrolling, animated
counters, and a parallax/layered hero. This is the flagship page; the primitives
built here are designed to extend to other pages in a later pass.

## Non-goals

- Other pages (jobs, community, tools, etc.) — later, reusing these primitives.
- No WebGL/Three.js/canvas. No scroll-jacking that hijacks the user's ability to
  scroll freely (momentum easing only, never trapping).
- No redesign of the editorial "paper" visual system — colors, type, and layout
  stay; we are adding motion, not restyling.

## Chosen stack

- **`motion`** (Framer Motion) — declarative in-view reveals, staggered children,
  scroll-linked parallax (`useScroll`/`useTransform`), and count-up. React-native,
  maintainable, reusable.
- **`lenis`** — buttery momentum smooth scroll for the whole page.

Both are pinned and lockfile-committed. Rationale over GSAP+ScrollTrigger:
comparable wow for our needs, far more maintainable in a React/Next codebase for a
solo developer, and the primitives compose cleanly.

## Architecture — reusable primitives

New directory `app/components/motion/`:

- **`SmoothScroll.js`** — client provider that initializes Lenis on mount, drives
  its RAF loop, and destroys on unmount. No-ops when `prefers-reduced-motion:
  reduce`. Mounted once in `app/layout.js` so momentum scroll is global-ready even
  though only the homepage is choreographed now.
- **`Reveal.js`** — wraps children; fades + translates up into place when scrolled
  into view (`whileInView`, `viewport={{ once: true, margin }}`). Props: `as`,
  `delay`, `y`, `blur?`.
- **`Stagger.js`** + **`StaggerItem.js`** — a container that staggers its
  `StaggerItem` children's entrances (for the tools grid and step list).
- **`Parallax.js`** — translates its child on scroll progress via
  `useScroll`+`useTransform`; prop `speed` (negative = moves up faster). Used for
  hero depth layers.
- **`CountUp.js`** — animates a number from 0 to target when in view, with
  thousands formatting (e.g. `33,664`). Respects reduced-motion (renders final
  value immediately).
- **`tokens.js`** — shared easing (`[0.22, 1, 0.36, 1]` "expo-out" feel),
  durations, and translate distances so every animation reads as one system.
- Reuse the **existing** `useMagnetic` hook for the hero CTA; do not reinvent it.

All motion components are client components. A single `useReducedMotion()` gate
(from `motion`) centralizes the accessibility fallback.

## Homepage section-by-section

Applied in `app/page.js` (and the section subcomponents it renders):

1. **Hero** — on load, the Instrument-Serif headline reveals line-by-line
   (staggered mask/translate-up); kicker, subcopy, and the magnetic CTA follow in
   sequence. On scroll, background layers (`NoiseSurface` + glyph/terminal motifs)
   drift via `Parallax` at differing speeds; the headline eases up slightly slower
   than the page for depth.
2. **Live stats bar** — `100 countries` and `33,664 roles` use `CountUp` when
   scrolled into view; small `● live` status dots pulse (CSS keyframe) for the
   "operational" feel.
3. **Tools grid (4 cards)** — `Stagger` reveals the cards in sequence on enter;
   hover = lift + accent border + magnetic pull (compose existing hover styles with
   a subtle `motion` scale).
4. **How it works (4 steps)** — a vertical connector line "draws" (scaleY 0→1 tied
   to scroll progress) as you scroll; each step `Reveal`s as the line reaches it.
5. **Section transitions** — every top-level block eases in on enter using the
   shared tokens, so timing/easing feel unified.

## Accessibility

- `prefers-reduced-motion: reduce` → Lenis disabled (native scroll), all reveals
  render in final state, counters show final value, parallax layers static. The
  page is fully usable and identical in content.
- No focus traps; keyboard scrolling unaffected; animations never gate content.

## Performance & first paint

The user accepted added weight, but we still avoid gratuitous cost:

- Content is present in markup so the hero text is not blank before JS (see SSR
  note); motion enhances rather than gates rendering.
- `motion` and `lenis` load with the page bundle (homepage is already a client
  page); the heaviest below-the-fold choreography uses in-view triggers so work is
  deferred until needed. Animations use transform/opacity only (GPU), with
  `will-change` applied narrowly.
- We will **re-measure** the homepage JS after implementation and report the delta
  (baseline: 187KB brotli JS after the recent perf pass).

## SSR / first-paint note

`app/page.js` is currently `'use client'`, so its content is absent from server
HTML. Minimal restructure: keep the interactive profile/`Dashboard` logic as a
small client island, but ensure the hero and static marketing copy render in the
server HTML (so the page "opens" with text, then animates). This is a light
extraction, not a full RSC rewrite, and it directly improves perceived open time.
If it proves entangled, fall back to keeping `'use client'` and rely on fast hero
reveal — decided during implementation, noted in the plan.

## Verification

- Build must stay green (`npm run build`, EXIT 0).
- Serve the prod build and drive it in the browser: confirm no console errors;
  hero reveal + stagger + counters + parallax + line-draw all fire; smooth scroll
  active; `prefers-reduced-motion` path renders static/instant.
- Measure and report homepage JS delta.
- Screenshot the result for the user.

## Rollout

Homepage first. Primitives (`Reveal`, `Stagger`, `Parallax`, `CountUp`,
`SmoothScroll`, tokens) are generic so subsequent pages can adopt them without new
infrastructure.

## Risks & mitigations

- **Bundle weight** (accepted) — mitigate with in-view deferral; report the delta.
- **Low-end jank** — transform/opacity only, narrow `will-change`, reduced-motion
  fallback; avoid animating layout properties.
- **Hydration mismatch** — motion/Lenis are client-only and gated in `useEffect`;
  server and first client render agree on final DOM.
