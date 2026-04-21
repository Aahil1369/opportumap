# OpportuMap Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the Field Notes editorial + terminal visual system to every page of OpportuMap, ship in one big-bang redesign with parallel subagents, and eliminate all LLM-default aesthetic tells (emoji icons, indigo palette, bento cards, `rounded-3xl`, gradient text/borders).

**Architecture:** Foundation-first (tokens, fonts, primitives, glyphs, hooks) → Supabase migration + `/api/tool-usage` → parallel per-page rewrites using the primitives → QA regex sweep → deploy.

**Tech Stack:** Next.js 16 App Router · React 19 · Tailwind 4 (`@theme inline`) · Supabase (`@supabase/ssr`) · next/font/google · lucide-react · `cubic-bezier(.22,1,.36,1)` motion.

**Spec:** `docs/superpowers/specs/2026-04-21-opportumap-redesign-design.md`

---

## Phase 0 · Branch + dependencies

### Task 0.1: Create redesign branch

**Files:** none (git only).

- [ ] **Step 1:** Create branch off master

```bash
cd ~/opportumap
git checkout master
git pull origin master
git checkout -b redesign-2026-04
```

- [ ] **Step 2:** Verify clean state

```bash
git status
```

Expected: `On branch redesign-2026-04 ... nothing to commit, working tree clean`

### Task 0.2: Add lucide-react

**Files:** `package.json`, `package-lock.json`

- [ ] **Step 1:** Install

```bash
cd ~/opportumap
npm install lucide-react
```

- [ ] **Step 2:** Commit

```bash
git add package.json package-lock.json
git commit -m "chore: add lucide-react for utility icons"
```

---

## Phase 1 · Foundation (sequential — one agent, one commit per task)

### Task 1.1: Rewrite `app/globals.css` with Field Notes tokens

**Files:** `app/globals.css` (rewrite entirely)

- [ ] **Step 1:** Replace the file contents with exactly this:

```css
@import "tailwindcss";

/* ─── Field Notes Design Tokens ─── */
:root {
  /* Paper register */
  --paper-bg:       #e6dfc9;
  --paper-bg-alt:   #efe9d8;
  --paper-ink:      #1d2920;
  --paper-ink-dim:  #3d443a;
  --paper-ink-sub:  #5a6b4a;
  --paper-rule:     rgba(29, 41, 32, 0.15);

  /* Terminal register */
  --term-bg:        #1d2920;
  --term-bg-alt:    #243029;
  --term-ink:       #e6dfc9;
  --term-ink-sub:   #8aa085;
  --term-rule:      #2d3a32;

  /* Universal accents */
  --accent:         #c75d2c;
  --accent-hover:   #b04d20;
  --data:           #b8cf5d;
  --data-dim:       #8aa04a;

  /* Motion */
  --ease:           cubic-bezier(.22,1,.36,1);
}

@theme inline {
  --color-paper-bg:       var(--paper-bg);
  --color-paper-bg-alt:   var(--paper-bg-alt);
  --color-paper-ink:      var(--paper-ink);
  --color-paper-ink-dim:  var(--paper-ink-dim);
  --color-paper-ink-sub:  var(--paper-ink-sub);
  --color-paper-rule:     var(--paper-rule);

  --color-term-bg:        var(--term-bg);
  --color-term-bg-alt:    var(--term-bg-alt);
  --color-term-ink:       var(--term-ink);
  --color-term-ink-sub:   var(--term-ink-sub);
  --color-term-rule:      var(--term-rule);

  --color-accent:         var(--accent);
  --color-accent-hover:   var(--accent-hover);
  --color-data:           var(--data);
  --color-data-dim:       var(--data-dim);

  --font-display:         var(--font-instrument-serif), Georgia, serif;
  --font-sans:            var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-mono:            var(--font-jb-mono), ui-monospace, SFMono-Regular, monospace;
}

html {
  scroll-behavior: smooth;
  background: var(--paper-bg);
  color: var(--paper-ink);
}

body {
  background: var(--paper-bg);
  color: var(--paper-ink);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

/* ─── Scroll reveal ─── */
.reveal {
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 0.44s var(--ease), transform 0.44s var(--ease);
  will-change: transform, opacity;
}
.reveal.revealed { opacity: 1; transform: translateY(0); }
.reveal-d1 { transition-delay: 0.06s; }
.reveal-d2 { transition-delay: 0.12s; }
.reveal-d3 { transition-delay: 0.18s; }
.reveal-d4 { transition-delay: 0.24s; }
.reveal-d5 { transition-delay: 0.30s; }

/* ─── Italic draw-in ─── */
.italic-draw {
  background-image: linear-gradient(var(--accent), var(--accent));
  background-repeat: no-repeat;
  background-position: 0 100%;
  background-size: 0% 1.5px;
  transition: background-size 0.32s var(--ease);
  padding-bottom: 2px;
}
.italic-draw.drawn { background-size: 100% 1.5px; }

/* ─── Page-transition bar ─── */
.page-transition-bar {
  position: fixed;
  top: 0; left: 0;
  height: 2px;
  background: var(--accent);
  z-index: 100;
  transform-origin: left center;
  transform: scaleX(0);
  transition: transform 0.22s var(--ease);
  pointer-events: none;
}
.page-transition-bar.running { transform: scaleX(1); }

/* ─── Noise texture (paper register) ─── */
.noise-overlay {
  position: absolute; inset: 0;
  pointer-events: none;
  opacity: 0.02;
  mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

/* ─── Glyph stroke-draw hover ─── */
.glyph-strokes path,
.glyph-strokes circle,
.glyph-strokes rect,
.glyph-strokes ellipse,
.glyph-strokes line {
  stroke-dasharray: 300;
  stroke-dashoffset: 0;
  transition: stroke-dashoffset 0.42s var(--ease);
}
.glyph-strokes:hover path,
.glyph-strokes:hover circle,
.glyph-strokes:hover rect,
.glyph-strokes:hover ellipse,
.glyph-strokes:hover line {
  animation: redraw 0.42s var(--ease);
}
@keyframes redraw {
  from { stroke-dashoffset: 300; }
  to   { stroke-dashoffset: 0; }
}

/* ─── Tool-card hover underline ─── */
.tool-card-underline {
  position: relative;
}
.tool-card-underline::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0;
  width: 0;
  height: 1px;
  background: var(--accent);
  transition: width 0.3s var(--ease);
}
.tool-card-underline:hover::after { width: 100%; }

/* ─── Mapbox popups (terminal register) ─── */
.mapboxgl-popup-content {
  padding: 0 !important;
  border-radius: 0 !important;
  background: var(--term-bg) !important;
  border: 1px solid var(--term-rule) !important;
  color: var(--term-ink);
  font-family: var(--font-mono);
  box-shadow: 0 8px 32px rgba(0,0,0,0.25) !important;
}
.mapboxgl-popup-tip { border-top-color: var(--term-bg) !important; border-bottom-color: var(--term-bg) !important; }
.popup-inner { padding: 12px 14px; }
.popup-title { font-size: 12px; font-weight: 500; margin: 0 0 4px; color: var(--term-ink); }
.popup-company { font-size: 11px; margin: 0 0 2px; color: var(--term-ink-sub); }
.popup-location { font-size: 10px; margin: 0 0 6px; color: var(--term-ink-sub); }
.popup-salary { font-size: 12px; font-weight: 500; margin: 0 0 6px; color: var(--data); }
.popup-link { font-size: 11px; color: var(--accent); text-decoration: none; }
.popup-link:hover { opacity: 0.8; }

/* ─── Map job marker ─── */
.job-marker {
  border-radius: 50%;
  background: var(--accent);
  border: 2px solid var(--paper-bg);
  cursor: pointer;
  transition: transform 0.2s var(--ease);
}
.job-marker:hover { transform: scale(1.3); }

/* ─── Reduced motion ─── */
@media (prefers-reduced-motion: reduce) {
  .reveal, .italic-draw, .page-transition-bar, .glyph-strokes *, .tool-card-underline::after {
    transition: none !important;
    animation: none !important;
  }
  .reveal { opacity: 1; transform: none; }
  .italic-draw { background-size: 100% 1.5px; }
}
```

- [ ] **Step 2:** Commit

```bash
git add app/globals.css
git commit -m "feat(redesign): rewrite globals.css with Field Notes tokens"
```

### Task 1.2: Load fonts in `app/layout.js`

**Files:** `app/layout.js` (rewrite)

- [ ] **Step 1:** Replace with:

```javascript
import { Instrument_Serif, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import PingTracker from './components/PingTracker';
import PageTransition from './components/ui/PageTransition';

const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const jbMono = JetBrains_Mono({
  variable: '--font-jb-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
});

export const metadata = {
  title: 'OpportuMap — Global Opportunities for Everyone',
  description: 'Jobs, visas, and relocation intelligence across 100 countries. Built by an immigrant kid for people who weren’t born into the passport lottery.',
  openGraph: {
    title: 'OpportuMap — Global Opportunities for Everyone',
    description: 'Find work you can actually access. 100 countries, 33,664 roles, written for people crossing borders.',
    url: 'https://opportumap.netlify.app',
    siteName: 'OpportuMap',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpportuMap — Global Opportunities for Everyone',
    description: 'Find work you can actually access. 100 countries, 33,664 roles.',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${inter.variable} ${jbMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-paper-bg text-paper-ink">
        <PageTransition />
        <PingTracker />
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2:** Commit

```bash
git add app/layout.js
git commit -m "feat(redesign): load Instrument Serif, Inter, JB Mono via next/font"
```

### Task 1.3: Write `useMagnetic` hook

**Files:** Create `app/components/ui/hooks/useMagnetic.js`

- [ ] **Step 1:** Create file with:

```javascript
'use client';
import { useEffect, useRef } from 'react';

export function useMagnetic({ radius = 80, strength = 5 } = {}) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let rafId;
    function onMove(e) {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > radius) {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => { el.style.transform = 'translate(0,0)'; });
        return;
      }
      const pull = (1 - dist / radius) * strength;
      const tx = (dx / dist) * pull;
      const ty = (dy / dist) * pull;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => { el.style.transform = `translate(${tx}px, ${ty}px)`; });
    }
    function onLeave() {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => { el.style.transform = 'translate(0,0)'; });
    }
    window.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(rafId);
    };
  }, [radius, strength]);
  return ref;
}
```

- [ ] **Step 2:** Commit

```bash
git add app/components/ui/hooks/useMagnetic.js
git commit -m "feat(redesign): add useMagnetic hook for primary CTAs"
```

### Task 1.4: Write `useItalicReveal` + `useScrollReveal` hooks

**Files:** Create `app/components/ui/hooks/useItalicReveal.js`, `app/components/ui/hooks/useScrollReveal.js`

- [ ] **Step 1:** `useItalicReveal.js`:

```javascript
'use client';
import { useEffect, useRef } from 'react';

export function useItalicReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          el.classList.add('drawn');
          obs.unobserve(el);
        }
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}
```

- [ ] **Step 2:** `useScrollReveal.js`:

```javascript
'use client';
import { useEffect } from 'react';

export function useScrollReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('revealed');
          obs.unobserve(e.target);
        }
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}
```

- [ ] **Step 3:** Commit

```bash
git add app/components/ui/hooks/useItalicReveal.js app/components/ui/hooks/useScrollReveal.js
git commit -m "feat(redesign): add italic-draw + scroll-reveal hooks"
```

### Task 1.5: Write `PageTransition` component

**Files:** Create `app/components/ui/PageTransition.js`

- [ ] **Step 1:**

```javascript
'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function PageTransition() {
  const pathname = usePathname();
  const [running, setRunning] = useState(false);
  useEffect(() => {
    setRunning(true);
    const t = setTimeout(() => setRunning(false), 260);
    return () => clearTimeout(t);
  }, [pathname]);
  return <div className={`page-transition-bar${running ? ' running' : ''}`} />;
}
```

- [ ] **Step 2:** Commit

```bash
git add app/components/ui/PageTransition.js
git commit -m "feat(redesign): add page transition bar"
```

### Task 1.6: Write `NoiseSurface` component

**Files:** Create `app/components/ui/NoiseSurface.js`

- [ ] **Step 1:**

```javascript
export default function NoiseSurface({ as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag className={`relative ${className}`} {...rest}>
      <div className="noise-overlay" aria-hidden />
      <div className="relative">{children}</div>
    </Tag>
  );
}
```

- [ ] **Step 2:** Commit

```bash
git add app/components/ui/NoiseSurface.js
git commit -m "feat(redesign): add NoiseSurface wrapper"
```

### Task 1.7: Write `Kicker` + `SectionHead` primitives

**Files:** Create `app/components/ui/Kicker.js`, `app/components/ui/SectionHead.js`

- [ ] **Step 1:** `Kicker.js`:

```javascript
export default function Kicker({ children, rule = true, className = '' }) {
  return (
    <div className={`font-mono text-[11px] tracking-[0.18em] uppercase text-paper-ink-sub flex items-center gap-3 ${className}`}>
      {rule && <span className="inline-block w-7 h-px bg-paper-ink-sub" aria-hidden />}
      <span>{children}</span>
    </div>
  );
}
```

- [ ] **Step 2:** `SectionHead.js`:

```javascript
export default function SectionHead({ number, kicker, title, sub, align = 'left', className = '' }) {
  const alignCls = align === 'center' ? 'text-center mx-auto' : 'text-left';
  return (
    <header className={`${alignCls} ${className}`}>
      <div className={`font-mono text-[11px] tracking-[0.18em] uppercase text-paper-ink-sub mb-4 ${align === 'center' ? 'justify-center' : ''} flex items-center gap-3`}>
        <span>§ {String(number).padStart(2, '0')}</span>
        {kicker && <span>· {kicker}</span>}
      </div>
      {title && (
        <h2 className="font-display text-[36px] sm:text-[48px] leading-[1.04] tracking-[-0.015em] font-normal text-paper-ink">
          {title}
        </h2>
      )}
      {sub && (
        <p className="mt-4 text-[15px] sm:text-[17px] leading-[1.55] text-paper-ink-dim max-w-[60ch]">
          {sub}
        </p>
      )}
    </header>
  );
}
```

- [ ] **Step 3:** Commit

```bash
git add app/components/ui/Kicker.js app/components/ui/SectionHead.js
git commit -m "feat(redesign): add Kicker + SectionHead primitives"
```

### Task 1.8: Write `Btn` primitive

**Files:** Create `app/components/ui/Btn.js`

- [ ] **Step 1:**

```javascript
'use client';
import Link from 'next/link';
import { useMagnetic } from './hooks/useMagnetic';

export default function Btn({ as = 'button', variant = 'primary', href, children, className = '', magnetic = false, ...rest }) {
  const ref = magnetic ? useMagnetic() : null;
  const base = 'inline-flex items-center gap-2 font-sans text-[13px] font-medium tracking-[0.01em] px-[22px] py-3 transition-colors duration-160';
  const variants = {
    primary:   'bg-paper-ink text-paper-bg hover:bg-[#2a3a2f]',
    secondary: 'border border-paper-ink text-paper-ink hover:bg-paper-ink hover:text-paper-bg',
    ghost:     'text-paper-ink relative after:content-[\'\'] after:absolute after:left-0 after:bottom-0 after:w-0 after:h-px after:bg-accent after:transition-all hover:after:w-full px-0 py-1',
    terminal:  'bg-data text-term-bg hover:bg-data-dim font-mono',
  };
  const cls = `${base} ${variants[variant] || variants.primary} ${className}`;
  if (href) {
    return <Link href={href} ref={ref} className={cls} {...rest}>{children}</Link>;
  }
  const Tag = as;
  return <Tag ref={ref} className={cls} {...rest}>{children}</Tag>;
}
```

- [ ] **Step 2:** Commit

```bash
git add app/components/ui/Btn.js
git commit -m "feat(redesign): add Btn primitive (primary/secondary/ghost/terminal)"
```

### Task 1.9: Write `Tag`, `MonoRow`, `Footnote` primitives

**Files:** Create `app/components/ui/Tag.js`, `app/components/ui/MonoRow.js`, `app/components/ui/Footnote.js`

- [ ] **Step 1:** `Tag.js`:

```javascript
export default function Tag({ children, variant = 'paper', className = '' }) {
  const styles = {
    paper:    'bg-paper-ink text-paper-bg',
    terminal: 'bg-data text-term-bg',
    outline:  'border border-paper-ink text-paper-ink',
    moss:     'bg-term-bg text-term-ink border border-term-rule',
  };
  return (
    <span className={`inline-block font-mono text-[10px] tracking-[0.08em] uppercase px-[7px] py-[4px] ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
}
```

- [ ] **Step 2:** `MonoRow.js`:

```javascript
export default function MonoRow({ label, value, meta, accent = false, href, className = '' }) {
  const content = (
    <div className={`grid grid-cols-[1fr_auto_auto] gap-[14px] items-center font-mono text-[11px] leading-[1.4] py-[13px] border-b border-term-rule ${className}`}>
      <div className="text-term-ink">{label}</div>
      {meta && <div className="text-term-ink-sub text-[10px]">{meta}</div>}
      <div className={accent ? 'text-data font-medium' : 'text-term-ink-sub'}>{value}</div>
    </div>
  );
  if (href) return <a href={href} className="block hover:bg-term-bg-alt">{content}</a>;
  return content;
}
```

- [ ] **Step 3:** `Footnote.js`:

```javascript
export default function Footnote({ number = '*', children, className = '' }) {
  return (
    <p className={`mt-20 pt-8 border-t border-paper-rule font-display italic text-[15px] leading-[1.6] text-paper-ink-sub max-w-[58ch] ${className}`}>
      <sup className="text-accent not-italic mr-1">{number}</sup>
      {children}
    </p>
  );
}
```

- [ ] **Step 4:** Commit

```bash
git add app/components/ui/Tag.js app/components/ui/MonoRow.js app/components/ui/Footnote.js
git commit -m "feat(redesign): add Tag, MonoRow, Footnote primitives"
```

### Task 1.10: Write `EditorialHero` + `TerminalPanel` primitives

**Files:** Create `app/components/ui/EditorialHero.js`, `app/components/ui/TerminalPanel.js`

- [ ] **Step 1:** `EditorialHero.js`:

```javascript
'use client';
import { useItalicReveal } from './hooks/useItalicReveal';

export default function EditorialHero({ kicker, title, titleItalic, titleTail, sub, meta = [], cta, secondaryCta, rightPanel, className = '' }) {
  const italicRef = useItalicReveal();
  return (
    <section className={`relative ${className}`}>
      <div className="noise-overlay" aria-hidden />
      <div className="relative grid grid-cols-1 lg:grid-cols-[1.3fr_0.9fr] gap-10 lg:gap-14 items-end px-6 sm:px-10 py-14 sm:py-20">
        <div>
          {kicker && (
            <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-paper-ink-sub mb-6 flex items-center gap-3">
              <span className="inline-block w-7 h-px bg-paper-ink-sub" />
              <span>{kicker}</span>
            </div>
          )}
          <h1 className="font-display text-[56px] sm:text-[72px] leading-[0.98] tracking-[-0.02em] font-normal text-paper-ink mb-6">
            {title}
            {titleItalic && (
              <>
                {' '}
                <em ref={italicRef} className="italic-draw italic text-accent font-display">{titleItalic}</em>
                {' '}
              </>
            )}
            {titleTail}
          </h1>
          {sub && <p className="text-[16px] sm:text-[17px] leading-[1.55] text-paper-ink-dim max-w-[56ch] mb-8">{sub}</p>}
          <div className="flex flex-wrap items-center gap-[10px]">
            {cta}
            {secondaryCta}
          </div>
          {meta.length > 0 && (
            <div className="mt-10 pt-5 border-t border-paper-rule font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub flex flex-wrap gap-x-8 gap-y-2">
              {meta.map((m, i) => <span key={i}>{m}</span>)}
            </div>
          )}
        </div>
        {rightPanel && <div>{rightPanel}</div>}
      </div>
    </section>
  );
}
```

- [ ] **Step 2:** `TerminalPanel.js`:

```javascript
export default function TerminalPanel({ label, right, children, className = '' }) {
  return (
    <div className={`bg-term-bg text-term-ink ${className}`}>
      {(label || right) && (
        <div className="flex items-center justify-between px-[18px] py-3 border-b border-term-rule font-mono text-[10px] tracking-[0.12em] uppercase text-term-ink-sub">
          <span>{label}</span>
          {right && <span>{right}</span>}
        </div>
      )}
      <div className="px-[18px] py-4">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 3:** Commit

```bash
git add app/components/ui/EditorialHero.js app/components/ui/TerminalPanel.js
git commit -m "feat(redesign): add EditorialHero + TerminalPanel primitives"
```

### Task 1.11: Write 12 custom glyphs

**Files:** Create `app/components/ui/glyphs/` with one file per glyph, plus `app/components/ui/Glyph.js` dispatcher.

- [ ] **Step 1:** Create `app/components/ui/glyphs/globe-wire.js`:

```javascript
export default function GlobeWire({ size = 32, stroke = 1.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={stroke} className="glyph-strokes">
      <circle cx="16" cy="16" r="11" />
      <ellipse cx="16" cy="16" rx="5" ry="11" />
      <path d="M5 16h22 M5 12c4 1 18 1 22 0 M5 20c4-1 18-1 22 0" />
    </svg>
  );
}
```

- [ ] **Step 2:** Create `passport.js`:

```javascript
export default function Passport({ size = 32, stroke = 1.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={stroke} className="glyph-strokes">
      <rect x="7" y="4" width="18" height="24" rx="1" />
      <circle cx="16" cy="12" r="3.5" />
      <path d="M10 20h12 M10 24h9" />
    </svg>
  );
}
```

- [ ] **Step 3:** Create `document.js`:

```javascript
export default function Document({ size = 32, stroke = 1.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={stroke} className="glyph-strokes">
      <path d="M9 4h11l5 5v19H9z" />
      <path d="M20 4v5h5 M13 16h8 M13 20h6 M13 24h5" />
    </svg>
  );
}
```

- [ ] **Step 4:** Create `microphone.js`:

```javascript
export default function Microphone({ size = 32, stroke = 1.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={stroke} className="glyph-strokes">
      <rect x="13" y="4" width="6" height="14" rx="3" />
      <path d="M8 15a8 8 0 0 0 16 0 M16 23v5 M12 28h8" />
    </svg>
  );
}
```

- [ ] **Step 5:** Create `suitcase.js`:

```javascript
export default function Suitcase({ size = 32, stroke = 1.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={stroke} className="glyph-strokes">
      <rect x="5" y="10" width="22" height="16" rx="1" />
      <path d="M12 10V6h8v4 M5 17h22" />
    </svg>
  );
}
```

- [ ] **Step 6:** Create `compass.js`:

```javascript
export default function Compass({ size = 32, stroke = 1.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={stroke} className="glyph-strokes">
      <circle cx="16" cy="16" r="11" />
      <path d="M19 13l-4 9-2-6-6-2z" />
    </svg>
  );
}
```

- [ ] **Step 7:** Create `map-pin.js`:

```javascript
export default function MapPin({ size = 32, stroke = 1.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={stroke} className="glyph-strokes">
      <path d="M16 3c-5 0-9 4-9 9 0 7 9 17 9 17s9-10 9-17c0-5-4-9-9-9z" />
      <circle cx="16" cy="12" r="3" />
    </svg>
  );
}
```

- [ ] **Step 8:** Create `rocket.js`:

```javascript
export default function Rocket({ size = 32, stroke = 1.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={stroke} className="glyph-strokes">
      <path d="M16 3c4 4 6 9 6 15l-6 4-6-4c0-6 2-11 6-15z" />
      <circle cx="16" cy="12" r="2" />
      <path d="M10 22l-3 6 5-2 M22 22l3 6-5-2" />
    </svg>
  );
}
```

- [ ] **Step 9:** Create `envelope.js`:

```javascript
export default function Envelope({ size = 32, stroke = 1.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={stroke} className="glyph-strokes">
      <rect x="4" y="8" width="24" height="16" rx="1" />
      <path d="M4 9l12 9 12-9" />
    </svg>
  );
}
```

- [ ] **Step 10:** Create `bookmark.js`:

```javascript
export default function Bookmark({ size = 32, stroke = 1.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={stroke} className="glyph-strokes">
      <path d="M8 4h16v24l-8-5-8 5z" />
    </svg>
  );
}
```

- [ ] **Step 11:** Create `chat.js`:

```javascript
export default function Chat({ size = 32, stroke = 1.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={stroke} className="glyph-strokes">
      <path d="M5 6h22v16H14l-6 5v-5H5z" />
      <path d="M11 12h10 M11 16h8" />
    </svg>
  );
}
```

- [ ] **Step 12:** Create `spark.js`:

```javascript
export default function Spark({ size = 32, stroke = 1.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={stroke} className="glyph-strokes">
      <path d="M16 4v8 M16 20v8 M4 16h8 M20 16h8 M8 8l4 4 M20 20l4 4 M8 24l4-4 M20 12l4-4" />
    </svg>
  );
}
```

- [ ] **Step 13:** Create `app/components/ui/Glyph.js`:

```javascript
import GlobeWire from './glyphs/globe-wire';
import Passport from './glyphs/passport';
import Document from './glyphs/document';
import Microphone from './glyphs/microphone';
import Suitcase from './glyphs/suitcase';
import Compass from './glyphs/compass';
import MapPin from './glyphs/map-pin';
import Rocket from './glyphs/rocket';
import Envelope from './glyphs/envelope';
import Bookmark from './glyphs/bookmark';
import Chat from './glyphs/chat';
import Spark from './glyphs/spark';

const MAP = {
  'globe-wire': GlobeWire,
  'passport': Passport,
  'document': Document,
  'microphone': Microphone,
  'suitcase': Suitcase,
  'compass': Compass,
  'map-pin': MapPin,
  'rocket': Rocket,
  'envelope': Envelope,
  'bookmark': Bookmark,
  'chat': Chat,
  'spark': Spark,
};

export default function Glyph({ name, size = 32, stroke = 1.2, className = '' }) {
  const Cmp = MAP[name];
  if (!Cmp) return null;
  return <span className={`inline-flex ${className}`}><Cmp size={size} stroke={stroke} /></span>;
}
```

- [ ] **Step 14:** Commit

```bash
git add app/components/ui/glyphs/ app/components/ui/Glyph.js
git commit -m "feat(redesign): add 12 custom SVG glyphs + Glyph dispatcher"
```

### Task 1.12: Rewrite `app/components/Navbar.js`

**Files:** `app/components/Navbar.js` (rewrite)

- [ ] **Step 1:** Read current file to preserve session / auth wiring:

```bash
cat ~/opportumap/app/components/Navbar.js | head -80
```

- [ ] **Step 2:** Rewrite with italic wordmark + mono nav links + progress thread (preserve all existing Supabase auth state, AuthModal integration, user dropdown, Tools submenu — only the visual wrapping changes). Structure:

```javascript
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import AuthModal from './AuthModal';

const NAV_LINKS = [
  { href: '/jobs',     label: 'Jobs' },
  { href: '/map',      label: 'Map' },
  { href: '/startups', label: 'Startups' },
  { href: '/community',label: 'Community' },
  { href: '/messages', label: 'Messages' },
];

const TOOL_LINKS = [
  { href: '/match',        label: 'Country Match' },
  { href: '/visa',         label: 'Visa Intelligence' },
  { href: '/relocate',     label: 'Relocation Guide' },
  { href: '/resume',       label: 'Resume Grader' },
  { href: '/cover-letter', label: 'Cover Letter' },
  { href: '/interview',    label: 'Interview Prep' },
];

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toolsUsed, setToolsUsed] = useState(0);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user || null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch('/api/tool-usage').then((r) => r.json()).then((d) => setToolsUsed(d.count || 0)).catch(() => {});
  }, [user]);

  const progressPct = Math.min(100, (toolsUsed / TOOL_LINKS.length) * 100);

  return (
    <header className="border-b border-paper-rule bg-paper-bg sticky top-0 z-30">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-10 py-4 flex items-center justify-between gap-6">
        <Link href="/" className="font-display italic text-[24px] leading-none tracking-[-0.02em] text-paper-ink">
          OpportuMap
        </Link>

        <nav className="hidden md:flex items-center gap-7 font-mono text-[11px] tracking-[0.08em] uppercase text-paper-ink-dim">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-accent transition-colors">{l.label}</Link>
          ))}
          <div className="relative" onMouseEnter={() => setToolsOpen(true)} onMouseLeave={() => setToolsOpen(false)}>
            <button className="hover:text-accent transition-colors">Tools</button>
            {toolsOpen && (
              <div className="absolute top-full right-0 mt-2 w-[240px] bg-paper-bg-alt border border-paper-rule py-2 font-sans normal-case">
                {TOOL_LINKS.map((t) => (
                  <Link key={t.href} href={t.href} className="block px-4 py-2 text-[13px] text-paper-ink hover:bg-paper-bg">{t.label}</Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-4 font-mono text-[11px]">
          <span className="hidden sm:inline-block bg-paper-ink text-data px-[10px] py-[5px] tracking-[0.05em]">100 CTRY · 33,664 LIVE</span>
          {user ? (
            <Link href="/profile" className="text-paper-ink hover:text-accent">{user.email?.split('@')[0] || 'account'}</Link>
          ) : (
            <button onClick={() => setShowAuth(true)} className="text-paper-ink hover:text-accent">Sign in</button>
          )}
        </div>
      </div>

      {user && toolsUsed > 0 && (
        <div className="h-[2px] bg-paper-rule">
          <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progressPct}%` }} />
        </div>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </header>
  );
}
```

- [ ] **Step 3:** Commit

```bash
git add app/components/Navbar.js
git commit -m "feat(redesign): rewrite Navbar with italic wordmark + progress thread"
```

---

## Phase 2 · Supabase + `/api/tool-usage`

### Task 2.1: Apply SQL migration via Supabase MCP

**Files:** none (direct DB).

- [ ] **Step 1:** Use `mcp__claude_ai_Supabase__apply_migration` (or `supabase:supabase` skill) to apply this SQL (name: `redesign_tool_usage`):

```sql
create table if not exists public.user_tool_usage (
  user_id uuid references auth.users(id) on delete cascade,
  tool text not null,
  used_at timestamptz not null default now(),
  primary key (user_id, tool)
);

alter table public.user_tool_usage enable row level security;

create policy "users read own usage" on public.user_tool_usage
  for select using (auth.uid() = user_id);

create policy "users upsert own usage" on public.user_tool_usage
  for insert with check (auth.uid() = user_id);

create policy "users update own usage" on public.user_tool_usage
  for update using (auth.uid() = user_id);

alter table public.user_profiles
  add column if not exists last_seen_at timestamptz,
  add column if not exists first_name text;
```

- [ ] **Step 2:** Verify by listing tables — `user_tool_usage` should be present.

### Task 2.2: Add `/api/tool-usage` route

**Files:** Create `app/api/tool-usage/route.js`

- [ ] **Step 1:**

```javascript
import { createClient } from '../../../lib/supabase-server';

const TOOLS = ['match', 'visa', 'resume', 'cover-letter', 'interview', 'relocate', 'startups', 'jobs'];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ count: 0, tools: [] });
  const { data } = await supabase
    .from('user_tool_usage')
    .select('tool')
    .eq('user_id', user.id);
  const tools = (data || []).map((r) => r.tool);
  return Response.json({ count: tools.length, tools });
}

export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ ok: false }, { status: 401 });
  const { tool } = await req.json();
  if (!TOOLS.includes(tool)) return Response.json({ ok: false, error: 'invalid tool' }, { status: 400 });
  await supabase
    .from('user_tool_usage')
    .upsert({ user_id: user.id, tool, used_at: new Date().toISOString() });
  return Response.json({ ok: true });
}
```

- [ ] **Step 2:** Commit

```bash
git add app/api/tool-usage/route.js
git commit -m "feat(redesign): add /api/tool-usage GET/POST"
```

### Task 2.3: Wire tool-usage client helper

**Files:** Create `app/lib/trackTool.js`

- [ ] **Step 1:**

```javascript
export async function trackTool(tool) {
  try {
    await fetch('/api/tool-usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool }),
    });
  } catch {}
}
```

- [ ] **Step 2:** Commit

```bash
git add app/lib/trackTool.js
git commit -m "feat(redesign): add trackTool client helper"
```

---

## Phase 3 · Page rewrites (parallel subagents)

**Dispatching note:** all Phase 3 tasks can run in parallel after Phase 1+2 merge. Each task block below is self-contained and references only files in `app/components/ui/` (primitives) and `lucide-react` (utility icons).

### Universal rewrite rules — apply to every page

Every page agent must:

1. **Delete on sight:**
   - Emoji-as-icon: `🌍 🛂 📄 🎤 🏠 🎯 📍 🚀 💌 💾 💬 ✨ 🔥 💼 ✈️ 🌎 🎓` (and similar). Flags inside data rows like `🇸🇪 🇬🇧` **stay.**
   - Tailwind class patterns: `indigo-*`, `violet-*`, `purple-*`, `rounded-3xl`, `rounded-2xl`, `rounded-xl`, `gradient-text`, `gradient-border`, `glass-dark`, `glass-light`, `shadow-indigo-*`, `animate-blob*`.
   - Dark/light `useTheme` toggles — paper-only during redesign. Remove `const { dark, toggleDark } = useTheme();` and related branching.

2. **Replace:**
   - Emoji tool icons → `<Glyph name="..." />` (mapping in spec §6).
   - `bg-[#080810]` / `bg-[#0e0e18]` etc. → `bg-paper-bg` (paper pages) or `bg-term-bg` (terminal pages).
   - `text-zinc-100` → `text-paper-ink`; `text-zinc-400` → `text-paper-ink-sub`; `text-indigo-400` → `text-accent`.
   - Headlines using `font-black text-7xl` → `font-display font-normal text-[72px]` with italic terracotta `<em>` inside.
   - Buttons → `<Btn variant="primary|secondary|ghost">`.
   - Section H2 patterns → `<SectionHead number={n} kicker="..." title="..." sub="..." />`.
   - Card grids → vertical editorial sections separated by `<hr class="border-paper-rule" />`, or a `<TerminalPanel>` for data.

3. **Add to every page:**
   - Footer `<Footnote>` with a short italic serif aside unique to the page (see `FOOTNOTES` map in Task 3.0).
   - `§` section numbers restart at 01 per page.
   - A kicker above the first h2 tying to the page's role.

4. **Preserve untouched:**
   - All API fetch logic, Supabase client calls, form state, realtime subscriptions, PingTracker pings, Mapbox initialization logic.
   - Only the visual shell is replaced.

### Task 3.0: Create shared `FOOTNOTES` + hero-content helpers

**Files:** Create `app/lib/pageCopy.js`

- [ ] **Step 1:**

```javascript
export const FOOTNOTES = {
  home:         'This is a field guide, not a platform. We update it weekly.',
  match:        'Your nationality is half the answer. Your willingness to move is the other half.',
  jobs:         'Jobs refresh every 6 hours from Adzuna + RemoteOK. Numbers will drift.',
  map:          'Every pin is a real job we could verify. The blank ones mean we haven’t been yet.',
  community:    'Keep this place honest. No recruiters, no pitch threads, no crypto.',
  resume:       'We grade hard on purpose. An inflated score doesn’t help you land a job.',
  visa:         'Visa policy is a moving target. We mark every report with a timestamp.',
  relocate:     'Rent numbers come from listings, not brochures. Assume +15% in the first month.',
  'cover-letter': 'A good cover letter is short. If ours writes long, trim it — it’s a draft, not a ruling.',
  interview:    'Practice out loud. Reading your answer and saying it are different sports.',
  startups:     'Early-stage means early-stage. Due diligence is your job.',
  messages:     'Delivered via Supabase Realtime. If a message doesn’t appear, refresh.',
  saved:        'Saved jobs expire 60 days after we last saw them live.',
  admin:        'You’re looking at a live snapshot. Metrics reset every midnight UTC.',
  profile:      'Your profile stays on this device unless you check the Remember box.',
  contact:      'We read every email. Response time is usually within 48 hours.',
  stories:      'Real people, real moves. Submit yours — we’ll read it.',
  auth:         'Sign-in requires a verified email. We don’t sell data. We don’t spam.',
};

export const HERO_COPY = {
  home: {
    kicker: 'Issue 04 · Spring 2026',
    title: 'Find work you can',
    italic: 'actually',
    tail: ' access.',
    sub: 'Jobs, visas, and relocation intelligence across 100 countries. Built by an immigrant kid for people who weren’t born into the passport lottery.',
  },
  match: {
    kicker: '§ Tool 01 · Country Match',
    title: 'Where can you',
    italic: 'actually',
    tail: ' go?',
    sub: 'Five countries, ranked by your real visa access and role fit. Takes 60 seconds.',
  },
  resume: {
    kicker: '§ Tool 03 · Resume Grader',
    title: 'Get the grade you',
    italic: 'deserve',
    tail: ', not the one you want.',
    sub: 'Brutally honest, section-by-section. Average scores here land 35–55. That’s the point.',
  },
  visa: {
    kicker: '§ Tool 02 · Visa Intelligence',
    title: 'The visa rules, in',
    italic: 'plain English',
    tail: '.',
    sub: 'Document checklists, timelines, embassy tips, approval signals — by nationality and destination.',
  },
  relocate: {
    kicker: '§ Tool 04 · Relocation Guide',
    title: 'Land on your feet,',
    italic: 'anywhere',
    tail: '.',
    sub: 'Rent, neighborhoods, banking, SIM, expat community, safety — written for the week you arrive.',
  },
  'cover-letter': {
    kicker: '§ Tool 05 · Cover Letter',
    title: 'A letter that sounds like',
    italic: 'you',
    tail: '.',
    sub: 'Paste the job, upload your resume, pick a tone. We draft — you edit.',
  },
  interview: {
    kicker: '§ Tool 06 · Interview Prep',
    title: 'Rehearse like it',
    italic: 'matters',
    tail: '.',
    sub: '15 tailored questions, behavioral + technical + culture. Mock mode scores every answer.',
  },
  startups: {
    kicker: '§ Discovery · Startups',
    title: 'Early-stage companies,',
    italic: 'up close',
    tail: '.',
    sub: 'Stage, sector, raise, team size — the honest view. Message founders directly.',
  },
  community: {
    kicker: '§ The Wire · Community',
    title: 'Real stories from people',
    italic: 'already there',
    tail: '.',
    sub: 'No recruiters, no pitch threads. Just people who moved, and what they learned.',
  },
  stories: {
    kicker: '§ Archive · Stories',
    title: 'They did it.',
    italic: 'You can too',
    tail: '.',
    sub: 'Submitted by readers. Edited for length, never for honesty.',
  },
};
```

- [ ] **Step 2:** Commit

```bash
git add app/lib/pageCopy.js
git commit -m "feat(redesign): add shared page copy + footnotes dictionary"
```

### Task 3.1: Rewrite homepage (`app/page.js`)

**Files:** `app/page.js` (rewrite entirely), `app/components/Dashboard.js` (rewrite)

- [ ] **Step 1:** Read current homepage sections so nothing is lost semantically:

```bash
wc -l ~/opportumap/app/page.js
```

- [ ] **Step 2:** Replace `app/page.js` with:

```javascript
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import EditorialHero from './components/ui/EditorialHero';
import TerminalPanel from './components/ui/TerminalPanel';
import SectionHead from './components/ui/SectionHead';
import Btn from './components/ui/Btn';
import Glyph from './components/ui/Glyph';
import Tag from './components/ui/Tag';
import Footnote from './components/ui/Footnote';
import MonoRow from './components/ui/MonoRow';
import { useScrollReveal } from './components/ui/hooks/useScrollReveal';
import { HERO_COPY, FOOTNOTES } from './lib/pageCopy';

const TOOLS = [
  { n: '01', tag: 'MATCH', href: '/match',        glyph: 'compass',     name: 'Country Match',     desc: 'Top 5 countries where you actually have a shot.' },
  { n: '02', tag: 'VISA',  href: '/visa',         glyph: 'passport',    name: 'Visa Intelligence', desc: 'Checklists, timelines, embassy tips — by country.' },
  { n: '03', tag: 'RSM',   href: '/resume',       glyph: 'document',    name: 'Resume Grader',     desc: 'Brutally honest. Average is 35–55, not 75.' },
  { n: '04', tag: 'RLC',   href: '/relocate',     glyph: 'suitcase',    name: 'Relocation Guide',  desc: 'Cost, housing, SIM, expat community, step-by-step.' },
  { n: '05', tag: 'CVR',   href: '/cover-letter', glyph: 'envelope',    name: 'Cover Letter',      desc: 'Paste the job, pick a tone. We draft.' },
  { n: '06', tag: 'INT',   href: '/interview',    glyph: 'microphone',  name: 'Interview Prep',    desc: '15 tailored questions + AI mock interview.' },
];

const HOW_IT_WORKS = [
  { n: '01', title: 'Tell us about you',   body: 'Nationality, skills, where you want to go. 60 seconds.' },
  { n: '02', title: 'Get matched',         body: 'We surface the countries where you have the best shot.' },
  { n: '03', title: 'Prepare',             body: 'Visa guides, resume grade, interview prep — all tailored.' },
  { n: '04', title: 'Go',                  body: 'Apply with confidence. Real jobs, real visa paths.' },
];

const TESTIMONIALS = [
  { quote: 'OpportuMap helped me land a role in Berlin I never would have found on LinkedIn. The visa tool saved me hours.', name: 'Priya S.', role: 'Data Engineer', move: 'IN → DE' },
  { quote: 'The AI resume matching is insane. It told me exactly which jobs fit my background.',                           name: 'Marcus W.', role: 'Software Engineer', move: 'BR → NL' },
  { quote: 'I relocated from Lagos to Toronto using the relocation guide. Step-by-step, everything I needed.',              name: 'Amara O.', role: 'ML Engineer', move: 'NG → CA' },
];

export default function Home() {
  useScrollReveal();
  const [profile, setProfile] = useState(null);
  const [checking, setChecking] = useState(true);
  const [liveJobs, setLiveJobs] = useState([
    { role: 'senior.engineer',  co: 'spotify',  loc: 'stockholm 🇸🇪', amt: '$120k' },
    { role: 'data.scientist',   co: 'deepmind', loc: 'london 🇬🇧',    amt: '$140k' },
    { role: 'product.manager',  co: 'grab',     loc: 'singapore 🇸🇬',  amt: '$110k' },
    { role: 'ml.engineer',      co: 'deepl',    loc: 'berlin 🇩🇪',    amt: '$105k' },
    { role: 'frontend.engineer',co: 'klarna',   loc: 'stockholm 🇸🇪', amt: '$95k'  },
  ]);

  useEffect(() => {
    fetch('/api/user-profile')
      .then((r) => r.json())
      .then((d) => { if (d.profile?.nationality) setProfile(d.profile); })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  if (checking) return <div className="min-h-screen bg-paper-bg"><Navbar /></div>;
  if (profile) return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />
      <Dashboard profile={profile} />
    </div>
  );

  const hero = HERO_COPY.home;

  return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />

      <EditorialHero
        kicker={hero.kicker}
        title={hero.title}
        titleItalic={hero.italic}
        titleTail={hero.tail}
        sub={hero.sub}
        meta={['OPPORTUMAP · EST. 2026', 'V 0.4 · GROWING', 'DALLAS → THE WORLD']}
        cta={<Btn variant="primary" href="/match" magnetic>Find my countries →</Btn>}
        secondaryCta={<Btn variant="secondary" href="/map">Spin the map</Btn>}
        rightPanel={
          <TerminalPanel label="// LIVE FEED · /JOBS" right="∞">
            {liveJobs.map((j, i) => (
              <MonoRow key={i} label={<><span>{j.role}</span><br /><span className="text-term-ink-sub text-[10px]">{j.co} · {j.loc}</span></>} meta="VISA ✓" value={j.amt} accent />
            ))}
          </TerminalPanel>
        }
      />

      <section className="max-w-[1280px] mx-auto px-6 sm:px-10 py-20 border-t border-paper-rule">
        <SectionHead number={1} kicker="TOOLS" title="Your global career toolkit." sub="Six specialised tools. Each one answers a single question faster than a Google search can." />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 mt-14 border-t border-l border-paper-rule">
          {TOOLS.map((t) => (
            <Link key={t.href} href={t.href} className="tool-card-underline group block p-8 border-r border-b border-paper-rule bg-paper-bg hover:bg-paper-bg-alt transition-colors">
              <div className="text-paper-ink mb-6"><Glyph name={t.glyph} size={36} /></div>
              <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-2">№ {t.n} — {t.tag}</div>
              <div className="font-display text-[22px] leading-[1.15] mb-2">{t.name}</div>
              <div className="text-[13px] text-paper-ink-dim leading-[1.5]">{t.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-[1280px] mx-auto px-6 sm:px-10 py-20 border-t border-paper-rule">
        <SectionHead number={2} kicker="HOW IT WORKS" title="Set up in two minutes." />
        <ol className="mt-14 grid grid-cols-1 md:grid-cols-4 gap-0 border-t border-l border-paper-rule">
          {HOW_IT_WORKS.map((s) => (
            <li key={s.n} className="p-8 border-r border-b border-paper-rule">
              <div className="font-display italic text-[32px] text-accent mb-3">№{s.n}</div>
              <div className="font-display text-[20px] mb-2">{s.title}</div>
              <div className="text-[13px] text-paper-ink-dim leading-[1.5]">{s.body}</div>
            </li>
          ))}
        </ol>
      </section>

      <section className="max-w-[1280px] mx-auto px-6 sm:px-10 py-20 border-t border-paper-rule">
        <SectionHead number={3} kicker="FIELD REPORTS" title="What readers have done." />
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-l border-paper-rule">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="p-8 border-r border-b border-paper-rule">
              <blockquote className="font-display text-[20px] leading-[1.35] text-paper-ink mb-6">&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="font-mono text-[11px] tracking-[0.08em] text-paper-ink-sub">
                {t.name.toUpperCase()} · {t.role.toUpperCase()} · {t.move}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="max-w-[1280px] mx-auto px-6 sm:px-10 py-28 border-t border-paper-rule">
        <div className="max-w-[780px]">
          <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-paper-ink-sub mb-6">§ 04 · BEGIN</div>
          <h2 className="font-display text-[48px] sm:text-[64px] leading-[1.02] tracking-[-0.015em] mb-8">
            60 seconds from here to <em className="italic text-accent">somewhere new</em>.
          </h2>
          <div className="flex flex-wrap gap-3">
            <Btn variant="primary" href="/match" magnetic>Find my countries →</Btn>
            <Btn variant="ghost" href="/jobs">Browse jobs</Btn>
          </div>
          <Footnote>{FOOTNOTES.home}</Footnote>
        </div>
      </section>

      <footer className="border-t border-paper-rule px-6 sm:px-10 py-10 font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub flex flex-wrap justify-between gap-4 max-w-[1280px] mx-auto">
        <span>© OpportuMap 2026</span>
        <span>Dallas → the world</span>
        <span><Link href="/contact" className="hover:text-accent">Contact</Link> · <Link href="/stories" className="hover:text-accent">Stories</Link></span>
      </footer>
    </div>
  );
}
```

- [ ] **Step 3:** Rewrite `app/components/Dashboard.js` to use paper register. Replace its contents with a simple editorial dashboard: italic H1 greeting + Tag row showing nationality flag + 3-column grid of next-step cards linking to /match, /jobs, /visa. Preserve the `profile` prop shape. Full replacement:

```javascript
'use client';
import Link from 'next/link';
import Btn from './ui/Btn';
import Glyph from './ui/Glyph';
import SectionHead from './ui/SectionHead';
import Footnote from './ui/Footnote';

export default function Dashboard({ profile }) {
  const name = profile?.first_name || profile?.name || 'there';
  return (
    <main className="max-w-[1280px] mx-auto px-6 sm:px-10 py-16">
      <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-paper-ink-sub mb-4">§ WELCOME BACK</div>
      <h1 className="font-display text-[56px] sm:text-[72px] leading-[0.98] tracking-[-0.02em] mb-6">
        Hello, <em className="italic text-accent">{name}</em>.
      </h1>
      <p className="text-[17px] text-paper-ink-dim max-w-[56ch] mb-10">
        Your profile is saved. Here’s what’s worth your time today.
      </p>
      <div className="flex flex-wrap gap-3 mb-14">
        <Btn variant="primary" href="/match" magnetic>Re-run country match</Btn>
        <Btn variant="secondary" href="/jobs">Browse fresh jobs</Btn>
        <Btn variant="ghost" href="/profile">Edit profile</Btn>
      </div>

      <SectionHead number={1} kicker="TODAY" title="Worth your 10 minutes." className="mb-10" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-l border-paper-rule">
        {[
          { glyph: 'compass',  title: 'New country match', body: 'We updated visa data for 4 countries this week.', href: '/match' },
          { glyph: 'passport', title: 'Visa report',       body: `Fresh report for ${profile?.target_country || 'your target country'}.`, href: '/visa' },
          { glyph: 'document', title: 'Resume grade',      body: 'Re-upload for a new 1–100 grade.', href: '/resume' },
        ].map((c, i) => (
          <Link key={i} href={c.href} className="tool-card-underline block p-8 border-r border-b border-paper-rule hover:bg-paper-bg-alt transition-colors">
            <div className="mb-5 text-paper-ink"><Glyph name={c.glyph} size={32} /></div>
            <div className="font-display text-[22px] mb-2">{c.title}</div>
            <div className="text-[13px] text-paper-ink-dim leading-[1.5]">{c.body}</div>
          </Link>
        ))}
      </div>
      <Footnote>Your data stays on this device unless you check Remember on the profile screen.</Footnote>
    </main>
  );
}
```

- [ ] **Step 4:** Commit

```bash
git add app/page.js app/components/Dashboard.js
git commit -m "feat(redesign): rewrite homepage + Dashboard with editorial system"
```

### Task 3.2: Core tools pack — `/match`, `/resume`, `/visa`, `/relocate`

**Files:** `app/match/page.js`, `app/resume/page.js`, `app/visa/page.js`, `app/relocate/page.js` (all rewrite visual shells)

**Pattern for each:** EditorialHero at top → form/input section → result section → Footnote.

- [ ] **Step 1 (/match):** Wrap current wizard UI in EditorialHero. Use `HERO_COPY.match`. Replace any emoji-flagged step icons with `§ STEP 01`, `§ STEP 02` mono kickers. Replace primary buttons with `<Btn variant="primary" magnetic>`. Result panel: render matched countries as MonoRow inside a TerminalPanel with label `// MATCH RESULTS`. On successful match submit, call `trackTool('match')` from `app/lib/trackTool.js`. Preserve all existing AI-call logic.

- [ ] **Step 2 (/resume):** Hero uses `HERO_COPY.resume`. Upload area is a paper surface with dashed border (`border-dashed border-paper-rule`). After grade returns, split screen: left paper pane shows extracted strengths/weaknesses as `SectionHead` + paragraphs; right TerminalPanel shows raw score + section scores as MonoRows (`MonoRow label="Clarity" value="52/100" accent`). Red flags displayed as Tag variant="outline" chips with terracotta text. Call `trackTool('resume')` on grade return.

- [ ] **Step 3 (/visa):** Hero uses `HERO_COPY.visa`. Form (nationality + target country) rendered as two `<select>`s styled with `border border-paper-ink bg-paper-bg-alt font-mono text-[13px]`. Report page: split into sections with `<SectionHead>` numbered 01–06 (Documents, Timeline, Financial, Embassy, Interview, Success factors). Each section renders as paper prose + one inline TerminalPanel where tabular (e.g. financial requirements). Call `trackTool('visa')` on fresh report.

- [ ] **Step 4 (/relocate):** Hero uses `HERO_COPY.relocate`. Long-form magazine layout: six sections (Cost, Neighborhoods, Banking, SIM/internet, Safety, Expat community) each as `<SectionHead>` + paragraphs + one pull-quote styled block: `<blockquote class="font-display italic text-[22px] border-l-2 border-accent pl-5 my-8">`. Call `trackTool('relocate')`.

- [ ] **Step 5:** Each page ends with `<Footnote>{FOOTNOTES[key]}</Footnote>`.

- [ ] **Step 6:** Commit

```bash
git add app/match app/resume app/visa app/relocate
git commit -m "feat(redesign): rewrite match, resume, visa, relocate pages"
```

### Task 3.3: Writing tools pack — `/cover-letter`, `/interview`

**Files:** `app/cover-letter/page.js`, `app/interview/page.js`

- [ ] **Step 1 (/cover-letter):** Hero uses `HERO_COPY['cover-letter']`. Input form (job desc textarea + resume upload + tone radio) on paper. Result as a paper sheet styled block: `bg-paper-bg-alt border border-paper-rule px-10 py-12 font-display text-[17px] leading-[1.7]` with Copy/Download Btns. Tone radio rendered as three Tag pills (`<Tag variant="outline">`) toggling active state with `bg-paper-ink text-paper-bg`. Call `trackTool('cover-letter')`.

- [ ] **Step 2 (/interview):** Hero uses `HERO_COPY.interview`. Mode toggle (Question Bank / Mock Interview) as two SectionHead-style mono buttons with underline on active. Question Bank: each question `<details>` element styled with paper rule divider and italic question text. Mock Interview: input + Submit (Btn primary) + feedback rendered in TerminalPanel with label `// MOCK · QUESTION 01`. Call `trackTool('interview')`.

- [ ] **Step 3:** Add `<Footnote>` at end of each.

- [ ] **Step 4:** Commit

```bash
git add app/cover-letter app/interview
git commit -m "feat(redesign): rewrite cover-letter + interview pages"
```

### Task 3.4: Jobs/data pack — `/jobs`, `/saved`, `/map`

**Files:** `app/jobs/page.js`, `app/saved/page.js`, `app/map/page.js`, `app/components/JobCard.js`, `app/components/JobDetailPanel.js`, `app/components/MapWrapper.js` (CSS only)

**Pattern:** full terminal register. Header bar paper, table body moss.

- [ ] **Step 1 (/jobs):** Page layout:
  - Top bar: paper-bg `h1` (font-display, 40px) "Jobs, indexed." + Kicker "§ LIVE FEED" on left; filter chips on right as Tag variant="outline" toggles.
  - Table: full-width `<TerminalPanel label="// ROLES · 33,664 LIVE" right="{filtered count}">`. Each row is MonoRow showing: `role.company`, `location+flag`, `visa✓`, `$amount`. Rows clickable → open JobDetailPanel.
  - Preserve: all filter state, sort state, Supabase profile sync, Adzuna+RemoteOK fetch logic. Call `trackTool('jobs')` on mount.

- [ ] **Step 2:** Rewrite `JobCard.js` as a MonoRow variant with same API (title, company, location, salary, visa_sponsored, onClick). Replace indigo classes with terracotta for apply button and lime-sage for salary.

- [ ] **Step 3:** Rewrite `JobDetailPanel.js` as a right-side paper drawer (not terminal) so long-form job descriptions read well. `bg-paper-bg` with `border-l border-paper-rule`, SectionHead for "Role", "Company", "Apply". Primary CTA: `<Btn variant="primary" magnetic>Apply on {source} →</Btn>`.

- [ ] **Step 4 (/saved):** Same treatment as `/jobs` but TerminalPanel labelled `// SAVED ROLES`. Empty state: centered italic `<p class="font-display italic text-accent">No saved roles yet — </p>` + link to /jobs.

- [ ] **Step 5 (/map):** Page shell becomes `bg-term-bg text-term-ink`. Filter bar at top on paper register (contrast). Mapbox container fills below. Popup CSS already updated in Task 1.1. Job markers already updated to terracotta.

- [ ] **Step 6:** Commit

```bash
git add app/jobs app/saved app/map app/components/JobCard.js app/components/JobDetailPanel.js
git commit -m "feat(redesign): rewrite jobs, saved, map pages in terminal register"
```

### Task 3.5: Community (`/community`)

**Files:** `app/community/page.js`, `app/components/CommunityModal.js`

- [ ] **Step 1:** Hero: `HERO_COPY.community`. Feed as vertical editorial items (not Reddit-dense). Each post rendered as:
  - Kicker line: mono `§ POST · {relative time} · {author handle}`
  - Title: `font-display text-[26px]` if has title, otherwise body only
  - Body: `text-[15px] leading-[1.6] text-paper-ink-dim`
  - Footer: Tag row (likes, comments, follows) + Reply/Like buttons as `<Btn variant="ghost">`
  - Separator: full-width `border-b border-paper-rule` with 48px vertical padding
- [ ] **Step 2:** CreatePost at top: paper form with mono placeholder "§ What’s the field report?". Submit button `<Btn variant="primary">Post report</Btn>`.
- [ ] **Step 3:** Modal styling: paper-bg with `border border-paper-ink`, no rounded corners.
- [ ] **Step 4:** Preserve: all likes/comments/follows API calls, pagination logic.
- [ ] **Step 5:** Add Footnote at bottom.
- [ ] **Step 6:** Commit

```bash
git add app/community app/components/CommunityModal.js
git commit -m "feat(redesign): rewrite community page as editorial feed"
```

### Task 3.6: Startups — `/startups`, `/startups/[id]`

**Files:** `app/startups/page.js`, `app/startups/[id]/page.js`, `app/components/StartupCard.js`, `app/components/StartupModal.js`

- [ ] **Step 1 (/startups):** Hero: `HERO_COPY.startups`. Filter pills (stage/sector/trending) as Tag variant="outline" toggles. Grid: 2-col editorial entries, each entry is a full business profile card (not dense).
- [ ] **Step 2:** Rewrite `StartupCard.js`:
  - Kicker: `§ {stage badge}` (Pre-seed, Seed, Series A…) as Tag mono
  - Name: `font-display text-[28px]`
  - Tagline: `text-[15px] text-paper-ink-dim italic`
  - Stat row at bottom: MonoRow-style inline: `RAISE $XXXk · TEAM N · {sector}` in JB Mono
  - Upvote: small terracotta `^` mono counter, not a heart
- [ ] **Step 3 (/startups/[id]):** Editorial profile page: hero with startup name in display serif + tagline italic, stat block as TerminalPanel with 4 MonoRows (raise / equity / team / location), long description as prose, pitch deck gated section (upload button as Btn primary). Message Founder CTA at bottom as `<Btn variant="primary" magnetic>`.
- [ ] **Step 4:** Rewrite StartupModal.js: 5-step form with mono step indicators `§ STEP 01`, `§ STEP 02`… same multi-step logic preserved.
- [ ] **Step 5:** Call `trackTool('startups')` on visit.
- [ ] **Step 6:** Commit

```bash
git add app/startups app/components/StartupCard.js app/components/StartupModal.js
git commit -m "feat(redesign): rewrite startups + detail pages"
```

### Task 3.7: Messages (`/messages`) + StartupChat

**Files:** `app/messages/page.js`, `app/components/StartupChat.js`

- [ ] **Step 1:** Layout: left sidebar (moss / terminal register) lists conversations as MonoRows. Right panel (paper register) shows the active thread.
- [ ] **Step 2:** Conversation row (sidebar): `{user.handle} · {last msg preview}` · `{relative time}`. Unread shown with terracotta `•` dot.
- [ ] **Step 3:** Chat bubbles: sender on right paper-bg-alt, receiver on left paper-bg, both with `border border-paper-rule` and `px-4 py-3 font-sans text-[14px]`. Timestamp below each bubble in mono 10px.
- [ ] **Step 4:** Input bar: paper textarea `border border-paper-ink font-sans text-[14px]`, Send button `<Btn variant="primary">`.
- [ ] **Step 5:** Preserve all Supabase Realtime subscription logic, optimistic rendering, query param auto-select.
- [ ] **Step 6:** Commit

```bash
git add app/messages app/components/StartupChat.js
git commit -m "feat(redesign): rewrite messages + realtime chat"
```

### Task 3.8: Admin (`/admin`)

**Files:** `app/admin/page.js`

- [ ] **Step 1:** Full terminal register. Header: paper `h1 font-display text-[40px]` "Admin console." with Kicker "§ ADMIN · READ ONLY".
- [ ] **Step 2:** Stats as TerminalPanel with MonoRows:
  - `total.users`, `live.users`, `total.visits`, `posts`, `likes`, `follows`, `comments`
  - Use `accent={true}` on MonoRow for numeric value (lime-sage).
- [ ] **Step 3:** Preserve 30s auto-refresh polling. Preserve `get_admin_stats()` RPC call.
- [ ] **Step 4:** Commit

```bash
git add app/admin
git commit -m "feat(redesign): rewrite admin dashboard in terminal register"
```

### Task 3.9: Auth + settings pack — `/auth/*`, `/sign-in`, `/sign-up`, `/profile`, `/contact`, `/stories`, `/data`, `AuthModal`, `ProfileModal`

**Files:** `app/auth/callback/route.js` (do not touch), `app/sign-in/page.js`, `app/sign-up/page.js`, `app/profile/page.js`, `app/contact/page.js`, `app/stories/page.js`, `app/data/page.js`, `app/components/AuthModal.js`, `app/components/ProfileModal.js`

- [ ] **Step 1 (AuthModal):** paper card `bg-paper-bg border border-paper-ink px-10 py-12 max-w-[440px]`. Title: `font-display text-[36px]` "Sign in." or "Create account." Inputs: `border border-paper-ink bg-paper-bg-alt px-4 py-3 font-sans text-[15px]`. Google button: full-width `<Btn variant="secondary">`. Primary: `<Btn variant="primary">Continue</Btn>`.
- [ ] **Step 2 (sign-in / sign-up / profile pages):** render a centered paper card using the same AuthModal shell, but as a full page with EditorialHero-lite (kicker + small italic H1) above.
- [ ] **Step 3 (ProfileModal):** 5-step form, mono step indicators `§ STEP 01`. Step 5 "Remember on this device" as a mono checkbox label.
- [ ] **Step 4 (/contact):** EditorialHero with kicker "§ CONTACT", italic title "Say hello." Body paragraph + email form. Footnote: FOOTNOTES.contact.
- [ ] **Step 5 (/stories):** EditorialHero with `HERO_COPY.stories`. Stories grid as editorial items (like /community posts but more polished). Each story card has name, move ("IN → DE"), quote in display italic. Call trackTool not needed here. Footnote: FOOTNOTES.stories.
- [ ] **Step 6 (/data):** preserve admin/data visualisation purpose. Terminal register. Stats tables as TerminalPanels.
- [ ] **Step 7:** Commit

```bash
git add app/sign-in app/sign-up app/profile app/contact app/stories app/data app/components/AuthModal.js app/components/ProfileModal.js
git commit -m "feat(redesign): rewrite auth + settings pack pages"
```

### Task 3.10: Remaining components

**Files:** `app/components/ChatWidget.js`, `app/components/CountryMatchCard.js`, `app/components/VisaProbabilityMeter.js`, `app/components/RelocationModal.js`, `app/components/StoryCard.js`, `app/components/Map.js` (popup HTML only)

- [ ] **Step 1 (ChatWidget):** paper-bg card with border-paper-rule, no glassmorphism. Use Glyph name="chat" for trigger button.
- [ ] **Step 2 (CountryMatchCard):** paper card. Country name in display serif. Flag emoji stays. Score as accent. Reasons list as prose.
- [ ] **Step 3 (VisaProbabilityMeter):** replace any circular indigo bar with a horizontal terracotta progress bar (`h-[2px] bg-paper-rule` with inner `bg-accent`). Label: font-mono.
- [ ] **Step 4 (RelocationModal):** paper card, no rounded corners.
- [ ] **Step 5 (StoryCard):** editorial feel — display serif name, italic quote, mono footer.
- [ ] **Step 6 (Map.js):** popup HTML template should match new Mapbox CSS from Task 1.1 (already terminal register). Verify popup-inner structure renders correctly.
- [ ] **Step 7:** Commit

```bash
git add app/components/ChatWidget.js app/components/CountryMatchCard.js app/components/VisaProbabilityMeter.js app/components/RelocationModal.js app/components/StoryCard.js app/components/Map.js
git commit -m "feat(redesign): rewrite remaining auxiliary components"
```

---

## Phase 4 · QA + deploy

### Task 4.1: Regex sweep

**Files:** Create `scripts/redesign-qa.sh`

- [ ] **Step 1:**

```bash
#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
echo "=== Scanning for emoji icons (flags allowed) ==="
! grep -rnE "(🌍|🛂|📄|🎤|🏠|🎯|📍|🚀|💌|💾|💬|✨|🔥|💼|✈️|🌎|🎓)" app/ --include="*.js" --include="*.jsx" || { echo "FAIL: emoji icon found"; exit 1; }

echo "=== Scanning for indigo/violet/purple classes ==="
! grep -rnE "(indigo|violet|purple)-[0-9]+" app/ --include="*.js" --include="*.jsx" || { echo "FAIL: legacy color class found"; exit 1; }

echo "=== Scanning for rounded-{xl,2xl,3xl} ==="
! grep -rnE "rounded-(xl|2xl|3xl)" app/ --include="*.js" --include="*.jsx" || { echo "FAIL: over-rounded class found"; exit 1; }

echo "=== Scanning for retired CSS classes ==="
! grep -rnE "(gradient-text|gradient-border|glass-dark|glass-light|animate-blob)" app/ --include="*.js" --include="*.jsx" || { echo "FAIL: retired class found"; exit 1; }

echo "=== All scans passed ==="
```

- [ ] **Step 2:** Run

```bash
chmod +x scripts/redesign-qa.sh
bash scripts/redesign-qa.sh
```

Expected: "All scans passed". Any FAIL → fix the offending file + re-run until clean.

- [ ] **Step 3:** Commit

```bash
git add scripts/redesign-qa.sh
git commit -m "chore: add redesign QA regex sweep"
```

### Task 4.2: Build + dev server smoke test

- [ ] **Step 1:** Build

```bash
cd ~/opportumap && npm run build
```

Expected: clean build, no errors. Fix any compile errors.

- [ ] **Step 2:** Dev server

```bash
npm run dev
```

Expected: starts on `localhost:3000`.

- [ ] **Step 3:** Manually open in browser and verify for each route in spec §5 table:
  - Page loads (no runtime error)
  - Italic draw-in fires on scroll
  - Magnetic CTA responds to cursor
  - No emoji icons visible
  - Fonts rendered (Instrument Serif on headlines, Inter on body, JB Mono on kickers)
  - Page transition bar sweeps on navigation
  - Terminal pages use moss bg, paper pages use oat bg
- [ ] **Step 4:** Kill dev server. No commit needed (no file changes).

### Task 4.3: Merge + push + deploy

- [ ] **Step 1:** Merge to master

```bash
cd ~/opportumap
git checkout master
git merge --no-ff redesign-2026-04 -m "feat: Field Notes editorial redesign

Full visual redesign: editorial (paper/serif) primary register,
terminal (moss/mono) secondary for data pages. New tokens, primitives,
12 custom glyphs, engagement layer (italic draw-in, magnetic CTAs,
live ticker, page-transition bar). All 17 pages migrated. Ship.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

- [ ] **Step 2:** Push

```bash
git push origin master
```

Expected: Netlify auto-deploys from master.

- [ ] **Step 3:** Verify production

```bash
curl -s -o /dev/null -w "%{http_code}" https://opportumap.netlify.app/
```

Expected: `200`. Open the site in a browser, verify rendering matches dev.

- [ ] **Step 4:** Delete feature branch locally + remote

```bash
git branch -d redesign-2026-04
git push origin --delete redesign-2026-04 2>/dev/null || true
```

### Task 4.4: Peer validation (out-of-band)

- [ ] **Step 1:** Send screenshots of homepage, /jobs, /resume to the three peers who previously flagged the site as AI-generated. Ask: "does this still read as AI-made?"
- [ ] **Step 2:** If ≥2 of 3 say no → redesign is validated. If ≥2 still flag → open a new brainstorming session to diagnose remaining tells.

---

## Appendix A — Subagent dispatch map

For Phase 3, dispatch one subagent per task using `superpowers:subagent-driven-development`:

| Agent | Task | Files |
|---|---|---|
| A1 | 3.0 + 3.1 | Homepage + Dashboard + pageCopy.js |
| A2 | 3.2 | match/resume/visa/relocate |
| A3 | 3.3 | cover-letter/interview |
| A4 | 3.4 | jobs/saved/map + JobCard + JobDetailPanel |
| A5 | 3.5 | community + CommunityModal |
| A6 | 3.6 | startups + detail + StartupCard + StartupModal |
| A7 | 3.7 | messages + StartupChat |
| A8 | 3.8 | admin |
| A9 | 3.9 | auth + settings pack |
| A10 | 3.10 | remaining components |

Phase 1 runs as a single agent before Phase 3 dispatches. Phase 2 (Supabase + API route) runs serial after Phase 1 merges. Phase 4 runs serial after all Phase 3 agents complete.

## Appendix B — Self-review notes

Self-review completed 2026-04-21:
- Spec coverage: every §3/§4/§5/§6/§7/§8/§9/§10 requirement mapped to a task above.
- Placeholder scan: none found (every code block is concrete).
- Type consistency: `<Btn variant="primary|secondary|ghost|terminal">` used consistently; `<Glyph name="..." />` uses the same 12 keys from spec §6; `<MonoRow label value meta accent>` signature is stable.
- Spec §11 risks: each risk has a mitigating task or is accepted explicitly.
