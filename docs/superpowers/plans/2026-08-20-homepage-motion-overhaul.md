# Homepage Motion Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the OpportuMap homepage a managent.tech-style "everything flows" feel — smooth momentum scroll, staggered scroll reveals, animated counters, and a parallax hero — via reusable primitives.

**Architecture:** Add `motion` (Framer Motion) + `lenis`. Build small, generic client primitives under `app/components/motion/` (SmoothScroll, Reveal, Stagger, Parallax, CountUp, shared tokens), then apply them to the homepage sections. All motion is gated behind `prefers-reduced-motion`.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4, `motion` (Framer Motion, imported from `motion/react`), `lenis`.

**Spec:** `docs/superpowers/specs/2026-08-20-homepage-motion-overhaul-design.md`

## Verification model (read first)

This repo has no test runner and this is visual animation work. "Verify" throughout means:
1. `npm run build` → EXIT 0 and `✓ Compiled successfully`.
2. Serve the prod build and drive it in a browser:
   - `PORT=3100 npm run start` (background), wait for `http://localhost:3100/`.
   - Open the browser pane at that URL; `read_console_messages` (onlyErrors) → none.
   - Use `javascript_tool` to assert the effect (examples given per task).
   - Toggle reduced motion via `resize_window`/emulation or by asserting the reduced-motion code path.

Commit after each task.

## File structure

- Create `app/components/motion/tokens.js` — easing/duration/distance constants.
- Create `app/components/motion/SmoothScroll.js` — Lenis provider (client), reduced-motion aware.
- Create `app/components/motion/Reveal.js` — in-view fade/translate wrapper.
- Create `app/components/motion/Stagger.js` + `StaggerItem.js` — staggered group.
- Create `app/components/motion/Parallax.js` — scroll-linked transform wrapper.
- Create `app/components/motion/CountUp.js` — animate number in view.
- Modify `app/layout.js` — mount `<SmoothScroll>`.
- Modify `app/page.js` — apply primitives to hero, stats, tools grid, how-it-works.
- Possibly modify homepage section subcomponents rendered by `page.js`.
- Modify `package.json` + `package-lock.json` — add pinned deps.

---

### Task 0: Add dependencies

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install `motion` and `lenis` (latest stable), pinned via lockfile**

Run:
```bash
cd ~/opportumap && npm install motion lenis
```

- [ ] **Step 2: Confirm they resolved and are pinned**

Run: `node -e "const p=require('./package.json');console.log(p.dependencies.motion,p.dependencies.lenis)"`
Expected: two version strings printed (e.g. `^12.x.x ^1.x.x`).

- [ ] **Step 3: Verify build still green**

Run: `npm run build`
Expected: EXIT 0, `✓ Compiled successfully`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: add motion + lenis for homepage animations"
```

---

### Task 1: Motion tokens

**Files:**
- Create: `app/components/motion/tokens.js`

- [ ] **Step 1: Write the tokens module**

```js
// Shared motion tokens so every animation reads as one system.
// "expo-out" style easing gives the smooth, decelerating managent.tech feel.
export const EASE = [0.22, 1, 0.36, 1];

export const DUR = {
  fast: 0.4,
  base: 0.6,
  slow: 0.9,
};

// Default translate distance for reveals (px).
export const RISE = 24;

// Stagger gap between siblings (s).
export const STAGGER = 0.09;

// Standard in-view viewport config: play once, trigger a bit before fully visible.
export const VIEWPORT = { once: true, margin: '0px 0px -12% 0px' };
```

- [ ] **Step 2: Verify build green**

Run: `npm run build` → EXIT 0.

- [ ] **Step 3: Commit**

```bash
git add app/components/motion/tokens.js
git commit -m "feat(motion): shared easing/timing tokens"
```

---

### Task 2: SmoothScroll provider (Lenis)

**Files:**
- Create: `app/components/motion/SmoothScroll.js`
- Modify: `app/layout.js`

- [ ] **Step 1: Write the SmoothScroll client provider**

```js
'use client';
import { useEffect } from 'react';
import Lenis from 'lenis';

// Momentum smooth scroll for the whole document. No-ops when the user prefers
// reduced motion. Renders nothing; it just drives window scrolling.
export default function SmoothScroll() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    let rafId;
    const raf = (time) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return null;
}
```

- [ ] **Step 2: Mount it in the layout**

In `app/layout.js`, add the import near the other component imports:
```js
import SmoothScroll from './components/motion/SmoothScroll';
```
Then inside `<body>`, render it as the first child (before `<PageTransition />`):
```jsx
      <body className="min-h-full flex flex-col bg-paper-bg text-paper-ink">
        <SmoothScroll />
        <PageTransition />
        <PingTracker />
        {children}
      </body>
```

- [ ] **Step 3: Verify build green**

Run: `npm run build` → EXIT 0.

- [ ] **Step 4: Verify in browser**

Start `PORT=3100 npm run start` (background), open `http://localhost:3100/`.
- `read_console_messages` (onlyErrors) → none.
- `javascript_tool`: `!!document.querySelector('html')` sanity; scroll via `window.scrollTo({top:800})` then read `window.scrollY` after 200ms — value eases toward 800 (Lenis intercepts). At minimum: no errors and the page scrolls.

- [ ] **Step 5: Commit**

```bash
git add app/components/motion/SmoothScroll.js app/layout.js
git commit -m "feat(motion): Lenis smooth-scroll provider (reduced-motion aware)"
```

---

### Task 3: Reveal + Stagger primitives

**Files:**
- Create: `app/components/motion/Reveal.js`
- Create: `app/components/motion/Stagger.js`
- Create: `app/components/motion/StaggerItem.js`

- [ ] **Step 1: Write `Reveal.js`**

```js
'use client';
import { motion, useReducedMotion } from 'motion/react';
import { EASE, DUR, RISE, VIEWPORT } from './tokens';

// Fades + rises its child into place when scrolled into view.
export default function Reveal({ children, as = 'div', delay = 0, y = RISE, className, ...rest }) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as] || motion.div;
  if (reduce) {
    const Tag = as;
    return <Tag className={className} {...rest}>{children}</Tag>;
  }
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: DUR.base, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}
```

- [ ] **Step 2: Write `Stagger.js`**

```js
'use client';
import { motion, useReducedMotion } from 'motion/react';
import { STAGGER, VIEWPORT } from './tokens';

// Container that staggers the entrance of its <StaggerItem> children.
export default function Stagger({ children, as = 'div', gap = STAGGER, className, ...rest }) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as] || motion.div;
  if (reduce) {
    const Tag = as;
    return <Tag className={className} {...rest}>{children}</Tag>;
  }
  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
      variants={{ show: { transition: { staggerChildren: gap } } }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}
```

- [ ] **Step 3: Write `StaggerItem.js`**

```js
'use client';
import { motion, useReducedMotion } from 'motion/react';
import { EASE, DUR, RISE } from './tokens';

// Child of <Stagger>. Rises/fades in when the parent triggers.
export default function StaggerItem({ children, as = 'div', y = RISE, className, ...rest }) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as] || motion.div;
  if (reduce) {
    const Tag = as;
    return <Tag className={className} {...rest}>{children}</Tag>;
  }
  return (
    <MotionTag
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE } },
      }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}
```

- [ ] **Step 4: Verify build green**

Run: `npm run build` → EXIT 0.

- [ ] **Step 5: Commit**

```bash
git add app/components/motion/Reveal.js app/components/motion/Stagger.js app/components/motion/StaggerItem.js
git commit -m "feat(motion): Reveal + Stagger/StaggerItem primitives"
```

---

### Task 4: Parallax primitive

**Files:**
- Create: `app/components/motion/Parallax.js`

- [ ] **Step 1: Write `Parallax.js`**

```js
'use client';
import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';

// Translates its child on vertical scroll for depth. `speed` is the fraction of
// the element's travel to offset: positive drifts up as you scroll (moves faster),
// negative drifts down (moves slower). Keep small (0.05–0.25).
export default function Parallax({ children, speed = 0.15, className, ...rest }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [`${speed * 100}%`, `${-speed * 100}%`]);

  if (reduce) {
    return <div className={className} {...rest}>{children}</div>;
  }
  return (
    <motion.div ref={ref} className={className} style={{ y, willChange: 'transform' }} {...rest}>
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify build green**

Run: `npm run build` → EXIT 0.

- [ ] **Step 3: Commit**

```bash
git add app/components/motion/Parallax.js
git commit -m "feat(motion): scroll-linked Parallax primitive"
```

---

### Task 5: CountUp primitive

**Files:**
- Create: `app/components/motion/CountUp.js`

- [ ] **Step 1: Write `CountUp.js`**

```js
'use client';
import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'motion/react';
import { EASE, DUR } from './tokens';

// Counts from 0 to `value` when scrolled into view. Formats with thousands
// separators. Renders the final value immediately under reduced motion.
export default function CountUp({ value, duration = DUR.slow, className, suffix = '', prefix = '' }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -15% 0px' });
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce || !inView) return;
    let raf;
    const start = performance.now();
    const ms = duration * 1000;
    // easeOutExpo to match EASE feel
    const easeOut = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms);
      setDisplay(Math.round(easeOut(t) * value));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}{display.toLocaleString('en-US')}{suffix}
    </span>
  );
}
```
Note: `EASE` is imported for symmetry/token discipline even though the RAF loop uses a matching closed-form ease; keep the import so future edits stay token-aligned. If the linter flags it as unused, drop the `EASE` import only.

- [ ] **Step 2: Verify build green**

Run: `npm run build` → EXIT 0. (If eslint fails on unused `EASE`, remove that import and rebuild.)

- [ ] **Step 3: Commit**

```bash
git add app/components/motion/CountUp.js
git commit -m "feat(motion): CountUp in-view number animation"
```

---

### Task 6: Hero — reveal, parallax layers, magnetic CTA

**Files:**
- Modify: `app/page.js` (hero section) and/or `app/components/ui/EditorialHero.js`

**Context to read first:** open `app/page.js` and `app/components/ui/EditorialHero.js` to see the current hero markup, the `HERO_COPY` usage, and the existing `useMagnetic` hook (`app/components/ui/hooks/useMagnetic.js`).

- [ ] **Step 1: Wrap the hero headline lines in a Stagger**

In the hero, split the display headline into its constituent lines (they already render as separate spans/blocks in `EditorialHero`; if it's a single node, wrap each logical line). Wrap the group in `<Stagger as="h1" ...>` and each line in `<StaggerItem as="span" className="block">`. Keep existing classes.

- [ ] **Step 2: Stagger the kicker, subcopy, and CTA after the headline**

Wrap the kicker, subcopy paragraph, and the CTA button container each in `<StaggerItem>` inside the same or a sibling `<Stagger>` so they enter after the headline lines.

- [ ] **Step 3: Add parallax depth to background layers**

Wrap the hero's background `NoiseSurface` and any decorative glyph/terminal motif layers in `<Parallax speed={0.12}>` and `<Parallax speed={0.2}>` (different speeds per layer). Do NOT parallax the readable headline text heavily (keep `speed` ≤ 0.06 if any), so copy stays legible.

- [ ] **Step 4: Ensure the CTA is magnetic**

Confirm the primary CTA (`Btn` / "Browse jobs") uses the existing `useMagnetic` behavior (Btn already integrates it). If the hero CTA is a plain link, swap it to the `Btn` primary variant.

- [ ] **Step 5: Verify build green**

Run: `npm run build` → EXIT 0.

- [ ] **Step 6: Verify in browser**

Serve prod build, open `http://localhost:3100/`.
- `read_console_messages` (onlyErrors) → none.
- `javascript_tool`: confirm hero heading text is present in DOM (`document.querySelector('h1')?.innerText`), and that hero elements have non-zero opacity after load (`getComputedStyle(document.querySelector('h1')).opacity`).
- Screenshot for the user.

- [ ] **Step 7: Commit**

```bash
git add app/page.js app/components/ui/EditorialHero.js
git commit -m "feat(home): animated hero — staggered reveal + parallax depth + magnetic CTA"
```

---

### Task 7: Stats bar — count-up + live dots

**Files:**
- Modify: `app/page.js` (stats section)
- Modify: `app/globals.css` (pulse keyframe)

**Context to read first:** find where the homepage shows `33,664` and `100` (countries/roles). It may be inline in `page.js` or in a stats block.

- [ ] **Step 1: Replace the static numbers with `CountUp`**

Import `CountUp` and render `<CountUp value={33664} />` and `<CountUp value={100} />` in place of the hardcoded strings, preserving surrounding labels/classes. Keep any non-numeric text (e.g. "roles", "countries") outside the component.

- [ ] **Step 2: Add a pulsing "live" dot**

Add to `app/globals.css`:
```css
@keyframes om-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.72); }
}
.om-live-dot {
  display: inline-block;
  width: 6px; height: 6px;
  border-radius: 9999px;
  background: var(--accent);
  animation: om-pulse 1.6s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .om-live-dot { animation: none; }
}
```
Add a `<span className="om-live-dot" />` next to the live stat(s).

- [ ] **Step 3: Verify build green**

Run: `npm run build` → EXIT 0.

- [ ] **Step 4: Verify in browser**

- `javascript_tool`: read the stat element text shortly after scrolling it into view (`el.scrollIntoView(); await 1s; el.innerText`) → shows `33,664` (with comma) once settled.
- `read_console_messages` (onlyErrors) → none.

- [ ] **Step 5: Commit**

```bash
git add app/page.js app/globals.css
git commit -m "feat(home): count-up stats + pulsing live indicators"
```

---

### Task 8: Tools grid — staggered reveal + hover

**Files:**
- Modify: `app/page.js` (tools grid section)

**Context to read first:** the `TOOLS` array and the grid that maps it into cards in `app/page.js`.

- [ ] **Step 1: Wrap the grid in `Stagger` and each card in `StaggerItem`**

Wrap the grid container in `<Stagger className="<existing grid classes>">` and each mapped card in `<StaggerItem key={...}>`. Move the existing grid layout classes onto the `Stagger` (it renders a real element). Preserve keys.

- [ ] **Step 2: Add a subtle hover lift**

On each card's root, add Tailwind transition classes for a lift on hover if not present: `transition-transform duration-300 hover:-translate-y-1` (compose with existing border/accent hover styles). Keep it CSS-only (cheap).

- [ ] **Step 3: Verify build green**

Run: `npm run build` → EXIT 0.

- [ ] **Step 4: Verify in browser**

- `read_console_messages` (onlyErrors) → none.
- `javascript_tool`: all four tool cards present in DOM and visible (opacity 1) after scrolling the section into view.
- Screenshot.

- [ ] **Step 5: Commit**

```bash
git add app/page.js
git commit -m "feat(home): staggered tools grid + hover lift"
```

---

### Task 9: How it works — connector line-draw + step reveal

**Files:**
- Modify: `app/page.js` (HOW_IT_WORKS section)

**Context to read first:** the `HOW_IT_WORKS` array and its rendered step list in `app/page.js`.

- [ ] **Step 1: Add a scroll-drawn connector line**

Make the steps container `relative`. Add a vertical line element positioned along the steps, and animate its `scaleY` from 0→1 tied to the section's scroll progress:
```jsx
// at top of file
import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
// inside the component that renders HOW_IT_WORKS:
const howRef = useRef(null);
const reduceMotion = useReducedMotion();
const { scrollYProgress: howProgress } = useScroll({ target: howRef, offset: ['start 80%', 'end 60%'] });
const lineScale = useTransform(howProgress, [0, 1], [0, 1]);
```
Render (inside the `relative` steps container, `howRef` on that container):
```jsx
{!reduceMotion && (
  <motion.span
    aria-hidden
    className="absolute left-[some-x] top-0 bottom-0 w-px bg-paper-rule origin-top"
    style={{ scaleY: lineScale }}
  />
)}
```
Position `left-[...]` to align with the step numbers/markers (read the current layout to pick the offset).

- [ ] **Step 2: Reveal each step in sequence**

Wrap the step list in `<Stagger>` and each step in `<StaggerItem>` so steps enter as the line reaches them. (If the section is client-scoped already, this composes fine; page is `'use client'`.)

- [ ] **Step 3: Verify build green**

Run: `npm run build` → EXIT 0.

- [ ] **Step 4: Verify in browser**

- `read_console_messages` (onlyErrors) → none.
- Scroll the section into view; confirm all four steps are present/visible and the line element exists.
- Screenshot.

- [ ] **Step 5: Commit**

```bash
git add app/page.js
git commit -m "feat(home): how-it-works connector line-draw + sequential steps"
```

---

### Task 10: Section transitions, reduced-motion pass, and cleanup

**Files:**
- Modify: `app/page.js`

- [ ] **Step 1: Wrap remaining top-level homepage blocks in `Reveal`**

Any section not already animated (e.g. secondary CTA, footnote band) gets wrapped in `<Reveal>` so the whole page eases in consistently. Do not double-wrap sections already using Stagger.

- [ ] **Step 2: Full reduced-motion verification**

Serve prod build. In the browser, emulate reduced motion (`resize_window` with a reduced-motion emulation if available, or set the emulation via `javascript_tool` is not possible for the media query — instead assert the code path): confirm each primitive early-returns to a plain element when `useReducedMotion()` is true by reading the components. At minimum, confirm the page renders all content and is scrollable with no console errors when the OS setting is reduce.

- [ ] **Step 3: Verify build green**

Run: `npm run build` → EXIT 0.

- [ ] **Step 4: Commit**

```bash
git add app/page.js
git commit -m "feat(home): unify section transitions + reduced-motion pass"
```

---

### Task 11: First-paint hero copy (light SSR improvement)

**Files:**
- Modify: `app/page.js` (and possibly extract a small client island)

**Decision point:** The homepage is `'use client'`, so its text is absent from server HTML. If feasible without a large refactor, ensure the hero headline/subcopy render server-side (extract the interactive profile/`Dashboard` logic into a child client component, leaving the marketing shell renderable). If this proves entangled (profile state deeply interleaved), STOP and keep `'use client'` — the fast hero reveal is acceptable; note the decision in the commit message.

- [ ] **Step 1: Assess entanglement**

Read `app/page.js` fully. If the hero/marketing JSX is separable from the `useState`/`useEffect` profile logic, proceed; else skip to Step 4 (keep as-is) and record why.

- [ ] **Step 2: Extract interactive island (only if separable)**

Move the profile/`Dashboard`-driven interactive portion into e.g. `app/components/HomeInteractive.js` (`'use client'`), and make `app/page.js` a server component that renders the static hero/marketing sections + `<HomeInteractive />`. Motion primitives remain client components used inside the still-client sections as needed (wrap only the animated leaf nodes in client boundaries).

- [ ] **Step 3: Confirm hero text is in server HTML**

Run: `curl -s --compressed http://localhost:3100/ | grep -c "Browse jobs"` (or the actual hero CTA/headline string) → ≥ 1.

- [ ] **Step 4: Verify build green + browser**

Run: `npm run build` → EXIT 0. Browser: no console errors, hero visible immediately.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "perf(home): render hero copy server-side for instant first paint"
```

---

### Task 12: Final verification, measure, deploy

**Files:** none (verification + deploy)

- [ ] **Step 1: Full build green**

Run: `npm run build` → EXIT 0, `✓ Compiled successfully`.

- [ ] **Step 2: End-to-end browser drive**

Serve prod build; open `http://localhost:3100/`. Confirm, with screenshots:
- Hero staggers in; parallax layers drift on scroll.
- Stats count up; live dots pulse.
- Tools grid staggers; hover lift works.
- How-it-works line draws; steps reveal.
- Smooth momentum scroll active.
- No console errors.

- [ ] **Step 3: Measure homepage JS delta**

Reuse the asset-measurement approach from the perf pass: sum brotli-compressed `/_next/static/chunks/*.js` referenced by `/`. Report new total vs the 187KB baseline (weight increase is expected/accepted; report it honestly).

- [ ] **Step 4: Stop local server**

Stop the `PORT=3100` process.

- [ ] **Step 5: Deploy**

```bash
git push origin master
```
Poll the live site until the new deploy is serving, then screenshot the live homepage.

- [ ] **Step 6: Update memory**

Append to `~/.claude/projects/C--Users-aahil/memory/opportumap_performance.md` (or a new `opportumap_motion.md` + MEMORY.md pointer): what shipped, the primitives added, the measured JS delta, and that the primitives are ready to extend to other pages.

---

## Self-review (author checklist — completed)

- **Spec coverage:** smooth scroll (Task 2), reveals/stagger (Tasks 3,6,8,9,10), parallax (Tasks 4,6), counters (Tasks 5,7), magnetic CTA (Task 6), tokens (Task 1), reduced-motion (every primitive + Task 10), first-paint/SSR (Task 11), verify + measure (Task 12). All spec sections mapped.
- **Placeholders:** none — every code step contains full code; `left-[some-x]` in Task 9 is explicitly "read layout to pick offset," not a hidden TODO.
- **Type/name consistency:** primitives named consistently (`Reveal`, `Stagger`, `StaggerItem`, `Parallax`, `CountUp`, `SmoothScroll`); imports from `motion/react`; tokens (`EASE`, `DUR`, `RISE`, `STAGGER`, `VIEWPORT`) used uniformly.
