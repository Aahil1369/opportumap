# Two-App Split (OpportuMap + Migrova) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split OpportuMap into two deployed apps — OpportuMap (career tools) and Migrova (visa/relocation/legal info for immigrant families) — per `docs/superpowers/specs/2026-06-11-two-app-split-design.md`.

**Architecture:** Migrova is created by copying the opportumap working tree into a new repo, pruning career features, rebranding, and adding a Lawyer Guide + legal layer. Both apps share one Supabase project (`gcrngdjrrfunokqfmkip`). Migrova deploys to Netlify FIRST; only then does OpportuMap delete the moved tools and add permanent redirects.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS 4 (paper design tokens), Supabase (`@supabase/ssr`), Groq (`llama-3.3-70b-versatile`), Netlify.

**Verification note:** This codebase has NO test framework (no test script in package.json) and the owner's workflow is build + manual verification. Every task verifies with `npm run build`, greps, and/or `curl` instead of unit tests. Do not add a test framework.

**Conventions (read first):**
- Work in bash with forward slashes. Repos: `~/opportumap` (exists), `~/migrova` (created in Task 1).
- All UI uses the paper design tokens already in `globals.css`: `bg-paper-bg`, `bg-paper-bg-alt`, `text-paper-ink`, `text-paper-ink-dim`, `text-paper-ink-sub`, `border-paper-rule`, `text-accent`/`bg-accent`, `font-display` (Instrument Serif), `font-mono` (JB Mono). No rounded-xl, no indigo/zinc.
- Mono label pattern: `font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub`.
- API routes return `Response.json()`, always with try/catch. New AI-response fields get array/null defaults after `JSON.parse`.
- Reference for a converted tool page: `app/match/page.js`. Reference for an AI route with cache: `app/api/visa-intel/route.js`.
- Commit after every task. Migrova commits go to `master` of the new repo. OpportuMap commits go to branch `split-migrova`, merged to `master` at the end.

---

## PHASE 1 — CREATE MIGROVA

### Task 1: Seed the migrova repo

**Files:** entire new repo `~/migrova` (copy of `~/opportumap` working tree)

- [ ] **Step 1: Copy the working tree (excluding git/build/tooling dirs)**

```bash
cd ~ && mkdir migrova && cd opportumap && \
tar --exclude='.git' --exclude='node_modules' --exclude='.next' \
    --exclude='.claude' --exclude='.superpowers' --exclude='docs' \
    --exclude='.netlify' -cf - . | (cd ~/migrova && tar -xf -)
ls ~/migrova/app ~/migrova/package.json
```
Expected: app dir + package.json present, no `.git`/`node_modules`/`docs`.

- [ ] **Step 2: Init git and install**

```bash
cd ~/migrova && git init -b master && npm install
```

- [ ] **Step 3: Verify the copy builds**

```bash
cd ~/migrova && npm run build 2>&1 | tail -5
```
Expected: `✓ Compiled successfully`, exit 0.

- [ ] **Step 4: Initial commit**

```bash
cd ~/migrova && git add -A && git commit -m "chore: seed migrova from opportumap working tree"
```

### Task 2: Prune career features from Migrova

**Files:**
- Delete pages: `app/jobs/`, `app/map/`, `app/saved/`, `app/startups/`, `app/community/`, `app/messages/`, `app/cover-letter/`, `app/interview/`, `app/resume/`, `app/admin/`, `app/sign-in/`, `app/sign-up/`
- Delete API routes: `app/api/jobs/`, `app/api/ingest/`, `app/api/chat/`, `app/api/predict-salary/`, `app/api/resume/`, `app/api/resume-grade/`, `app/api/cover-letter/`, `app/api/interview/`, `app/api/admin/`, `app/api/community/`, `app/api/startups/`, `app/api/messages/`
- Delete components: `JobCard.js`, `JobDetailPanel.js`, `ChatWidget.js`, `RelocationModal.js`, `StartupCard.js`, `StartupModal.js`, `StartupChat.js`, `Dashboard.js`, `CommunityModal.js`, `Map.js` (and `MapWrapper.js` if present — check `ls app/components | grep -i map`)
- Modify: `package.json` (remove `mapbox-gl`, `pdf-parse`, `@clerk/nextjs`)

- [ ] **Step 1: Delete pages, API routes, components**

```bash
cd ~/migrova && \
rm -rf app/jobs app/map app/saved app/startups app/community app/messages \
       app/cover-letter app/interview app/resume app/admin app/sign-in app/sign-up && \
rm -rf app/api/jobs app/api/ingest app/api/chat app/api/predict-salary \
       app/api/resume app/api/resume-grade app/api/cover-letter app/api/interview \
       app/api/admin app/api/community app/api/startups app/api/messages && \
rm -f app/components/JobCard.js app/components/JobDetailPanel.js \
      app/components/ChatWidget.js app/components/RelocationModal.js \
      app/components/StartupCard.js app/components/StartupModal.js \
      app/components/StartupChat.js app/components/Dashboard.js \
      app/components/CommunityModal.js
ls app/components | grep -iE "map" # delete any Map/MapWrapper component files this shows
```

- [ ] **Step 2: Remove dead deps**

```bash
cd ~/migrova && npm uninstall mapbox-gl pdf-parse @clerk/nextjs
```

- [ ] **Step 3: Find broken imports of deleted modules**

```bash
cd ~/migrova && grep -rn "Dashboard\|JobCard\|StartupCard\|StoryChat\|ChatWidget\|mapbox\|@clerk" app/ --include="*.js" | grep -v node_modules
```
Expected hits to fix in later tasks: `app/page.js` (imports Dashboard — fully rewritten in Task 5), `app/profile/page.js` (community fetches — rewritten in Task 6). Anything else found: delete the import and the JSX that uses it.

- [ ] **Step 4: Commit (build still broken until Task 5 rewrites page.js — that's expected; commit the prune as-is)**

```bash
cd ~/migrova && git add -A && git commit -m "chore: prune career features (jobs, startups, community, resume tools)"
```

### Task 3: Rebrand Navbar + metadata + package name

**Files:**
- Modify: `app/components/Navbar.js` (NAV_LINKS ~line 10, TOOL_LINKS ~line 18, wordmark ~line 137 and ~179)
- Modify: `app/layout.js` (metadata)
- Modify: `package.json` (name)

- [ ] **Step 1: Replace the link arrays in `app/components/Navbar.js`**

Replace the existing `NAV_LINKS` and `TOOL_LINKS` constants with:

```js
const NAV_LINKS = [
  { href: '/stories', label: 'Stories' },
];

const TOOL_LINKS = [
  { href: '/match',    label: 'Country Match' },
  { href: '/visa',     label: 'Visa Intelligence' },
  { href: '/relocate', label: 'Relocation Guide' },
  { href: '/lawyer',   label: 'Lawyer Guide' },
];
```

Remove any other entries (Jobs, Map, Startups, Community, Messages, Resume, Cover Letter, Interview, Saved).

- [ ] **Step 2: Change both wordmark occurrences** (desktop ~line 137, mobile ~line 179): the text `OpportuMap` inside the `font-display italic` span becomes `Migrova`. Search: `grep -n "OpportuMap" app/components/Navbar.js` and replace every occurrence in this file.

- [ ] **Step 3: Update `app/layout.js` metadata** — replace the exported `metadata` object's title/description with:

```js
export const metadata = {
  title: 'Migrova — visas, relocation, and legal guidance',
  description: 'General information about visas, relocation, and finding immigration legal help — built for immigrant families. Information, not legal advice.',
};
```

- [ ] **Step 4: Set `"name": "migrova"` in `package.json`.**

- [ ] **Step 5: Verify no stray brand strings in components**

```bash
cd ~/migrova && grep -rn "OpportuMap" app/components/ app/layout.js
```
Expected: no output.

- [ ] **Step 6: Commit**

```bash
cd ~/migrova && git add -A && git commit -m "feat: rebrand navbar, metadata, package name to Migrova"
```

### Task 4: Rewrite pageCopy for Migrova

**Files:**
- Rewrite: `app/lib/pageCopy.js`

- [ ] **Step 1: Replace the entire file with:**

```js
export const FOOTNOTES = {
  home:      'Migrova is a field guide for moving countries — information, not legal advice.',
  match:     'Your nationality is half the answer. Your willingness to move is the other half.',
  visa:      'Visa policy is a moving target. We mark every report with a timestamp. This is information, not legal advice.',
  relocate:  'Rent numbers come from listings, not brochures. Assume +15% in the first month.',
  lawyer:    'We never list or recommend specific lawyers. We show you how to find and choose one safely.',
  stories:   'Real people, real moves. Submit yours — we’ll read it.',
  legal:     'Last updated June 2026. If anything here is unclear, ask a licensed immigration attorney.',
  profile:   'Your profile stays on this device unless you check the Remember box.',
  contact:   'We read every email. Response time is usually within 48 hours.',
  auth:      'Sign-in requires a verified email. We don’t sell data. We don’t spam.',
};

export const HERO_COPY = {
  home: {
    kicker: 'Issue 01 · Summer 2026',
    title: 'Moving countries,',
    italic: 'minus',
    tail: ' the guesswork.',
    sub: 'Visa intelligence, relocation guides, and legal-help navigation for immigrant families — across 100 countries. Information you can check, not advice you have to trust.',
  },
  match: {
    kicker: '§ Tool 01 · Country Match',
    title: 'Where can you',
    italic: 'actually',
    tail: ' go?',
    sub: 'Five countries, ranked by your real visa access and role fit. Takes 60 seconds.',
  },
  visa: {
    kicker: '§ Tool 02 · Visa Intelligence',
    title: 'The visa rules, in',
    italic: 'plain English',
    tail: '.',
    sub: 'Document checklists, timelines, embassy tips, approval signals — by nationality and destination. General information, not legal advice.',
  },
  relocate: {
    kicker: '§ Tool 03 · Relocation Guide',
    title: 'Land on your feet,',
    italic: 'anywhere',
    tail: '.',
    sub: 'Rent, neighborhoods, banking, SIM, expat community, safety — written for the week you arrive.',
  },
  lawyer: {
    kicker: '§ Tool 04 · Lawyer Guide',
    title: 'Find the right help,',
    italic: 'without',
    tail: ' getting burned.',
    sub: 'Typical fees, the questions to ask, the red flags to walk away from, and where to find free or low-cost legal aid. We link real directories — we never invent listings.',
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

- [ ] **Step 2: Find any page still reading a removed key**

```bash
cd ~/migrova && grep -rn "FOOTNOTES\.\|FOOTNOTES\[" app --include="*.js" | grep -vE "FOOTNOTES\.(home|match|visa|relocate|lawyer|stories|legal|profile|contact|auth)\b"
```
Expected: no output (pages referencing removed keys were deleted in Task 2). If `app/contact/page.js` or others reference keys fine — they're kept.

- [ ] **Step 3: Commit**

```bash
cd ~/migrova && git add app/lib/pageCopy.js && git commit -m "feat: Migrova page copy + footnotes"
```

### Task 5: New Migrova homepage

**Files:**
- Rewrite: `app/page.js`

- [ ] **Step 1: Replace `app/page.js` entirely with:**

```js
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import EditorialHero from './components/ui/EditorialHero';
import SectionHead from './components/ui/SectionHead';
import Btn from './components/ui/Btn';
import Glyph from './components/ui/Glyph';
import Footnote from './components/ui/Footnote';
import { useScrollReveal } from './components/ui/hooks/useScrollReveal';
import { HERO_COPY, FOOTNOTES } from './lib/pageCopy';

const TOOLS = [
  { n: '01', tag: 'MATCH', href: '/match',    glyph: 'compass',  name: 'Country Match',     desc: 'Top 5 countries where you actually have a shot.' },
  { n: '02', tag: 'VISA',  href: '/visa',     glyph: 'passport', name: 'Visa Intelligence', desc: 'Checklists, timelines, embassy tips — by country.' },
  { n: '03', tag: 'RLC',   href: '/relocate', glyph: 'suitcase', name: 'Relocation Guide',  desc: 'Cost, housing, SIM, expat community, step-by-step.' },
  { n: '04', tag: 'LAW',   href: '/lawyer',   glyph: 'document', name: 'Lawyer Guide',      desc: 'Fees, questions, red flags, free legal aid — and real directories.' },
];

const HOW_IT_WORKS = [
  { n: '01', title: 'Tell us about you',  body: 'Nationality, family, where you want to go. 60 seconds.' },
  { n: '02', title: 'See your options',   body: 'Countries ranked by your real visa access.' },
  { n: '03', title: 'Understand the path', body: 'Documents, timelines, costs — in plain English.' },
  { n: '04', title: 'Get real help',      body: 'Know what lawyers cost, what to ask, and where to find free aid.' },
];

export default function Home() {
  useScrollReveal();
  const [stories, setStories] = useState([]);

  useEffect(() => {
    fetch('/api/stories')
      .then((r) => r.json())
      .then((d) => setStories((d.stories || []).slice(0, 3)))
      .catch(() => {});
  }, []);

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
        meta={['MIGROVA · EST. 2026', '100 COUNTRIES', 'INFORMATION, NOT LEGAL ADVICE']}
        cta={<Btn variant="primary" href="/match" magnetic>Find my countries →</Btn>}
        secondaryCta={<Btn variant="secondary" href="/lawyer">Lawyer guide</Btn>}
      />

      <section className="max-w-[1280px] mx-auto px-6 sm:px-10 py-20 border-t border-paper-rule">
        <SectionHead
          number={1}
          kicker="TOOLS"
          title="Your move, mapped."
          sub="Four tools. Each one answers a question families ask before they move."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 mt-14 border-t border-l border-paper-rule">
          {TOOLS.map((t) => (
            <Link key={t.href} href={t.href}
              className="group block p-8 border-r border-b border-paper-rule bg-paper-bg hover:bg-paper-bg-alt transition-colors">
              <div className="text-paper-ink mb-6"><Glyph name={t.glyph} size={36} /></div>
              <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-2">№ {t.n} — {t.tag}</div>
              <div className="font-display text-[22px] leading-[1.15] mb-2">{t.name}</div>
              <div className="text-[13px] text-paper-ink-dim leading-[1.5]">{t.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-[1280px] mx-auto px-6 sm:px-10 py-20 border-t border-paper-rule">
        <SectionHead number={2} kicker="HOW IT WORKS" title="Four steps, no guesswork." />
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

      {stories.length > 0 && (
        <section className="max-w-[1280px] mx-auto px-6 sm:px-10 py-20 border-t border-paper-rule">
          <SectionHead number={3} kicker="FIELD REPORTS" title="People who made the move." />
          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-l border-paper-rule">
            {stories.map((s) => (
              <figure key={s.id} className="p-8 border-r border-b border-paper-rule">
                <blockquote className="font-display text-[18px] leading-[1.4] text-paper-ink mb-6">
                  &ldquo;{(s.story_text || '').slice(0, 160)}{(s.story_text || '').length > 160 ? '…' : ''}&rdquo;
                </blockquote>
                <figcaption className="font-mono text-[11px] tracking-[0.08em] text-paper-ink-sub">
                  {s.from_country} <span className="text-accent">→</span> {s.current_country}
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="mt-8"><Btn variant="ghost" href="/stories">All stories →</Btn></div>
        </section>
      )}

      <section className="max-w-[1280px] mx-auto px-6 sm:px-10 py-28 border-t border-paper-rule">
        <div className="max-w-[780px]">
          <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-paper-ink-sub mb-6">§ BEGIN</div>
          <h2 className="font-display text-[48px] sm:text-[64px] leading-[1.02] tracking-[-0.015em] mb-8">
            60 seconds from here to <em className="italic text-accent">somewhere new</em>.
          </h2>
          <div className="flex flex-wrap gap-3">
            <Btn variant="primary" href="/match" magnetic>Find my countries →</Btn>
            <Btn variant="ghost" href="/visa">Check a visa</Btn>
          </div>
          <Footnote>{FOOTNOTES.home}</Footnote>
        </div>
      </section>

      <footer className="border-t border-paper-rule px-6 sm:px-10 py-10 font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub max-w-[1280px] mx-auto">
        <div className="flex flex-wrap justify-between gap-4 mb-4">
          <span>© Migrova 2026</span>
          <span>A sibling of <a href="https://opportumap.netlify.app" className="hover:text-accent underline">OpportuMap</a></span>
          <span><Link href="/contact" className="hover:text-accent">Contact</Link> · <Link href="/stories" className="hover:text-accent">Stories</Link> · <Link href="/legal" className="hover:text-accent">Legal</Link></span>
        </div>
      </footer>
      {/* site-wide legal one-liner comes from LegalFooter in layout.js (Task 7) */}
    </div>
  );
}
```

- [ ] **Step 2: Build**

```bash
cd ~/migrova && npm run build 2>&1 | tail -5
```
Expected: may still fail on `app/profile/page.js` (community fetches) — if so, that's Task 6; any OTHER error must be fixed now (likely a missed import from Task 2).

- [ ] **Step 3: Commit**

```bash
cd ~/migrova && git add app/page.js && git commit -m "feat: Migrova editorial homepage"
```

### Task 6: Simplify Migrova profile page

**Files:**
- Rewrite: `app/profile/page.js`

The current page fetches `/api/community/follows` and `/api/community/posts` (deleted in Task 2). Replace the whole file with an account-only page:

- [ ] **Step 1: Replace `app/profile/page.js` with:**

```js
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import Btn from '../components/ui/Btn';
import Footnote from '../components/ui/Footnote';
import { FOOTNOTES } from '../lib/pageCopy';
import { createClient } from '../../lib/supabase-browser';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/'); return; }
      setUser(data.user);
      try {
        const res = await fetch('/api/user-profile');
        const d = await res.json();
        if (d.profile) setProfile(d.profile);
      } catch {}
      setLoading(false);
    });
  }, [router]);

  if (loading) return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />
      <div className="py-32 text-center font-mono text-[11px] tracking-[0.12em] text-paper-ink-sub">LOADING…</div>
    </div>
  );

  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You';
  const rows = [
    ['EMAIL', user?.email],
    ['NATIONALITY', profile?.nationality],
    ['FIELD', profile?.field],
    ['TARGET COUNTRIES', Array.isArray(profile?.countries) ? profile.countries.join(', ') : profile?.countries],
  ].filter(([, v]) => v);

  return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />
      <section className="max-w-[1280px] mx-auto px-6 sm:px-10 py-12">
        <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-paper-ink-sub mb-4 flex items-center gap-3">
          <span className="inline-block w-7 h-px bg-paper-ink-sub" /><span>§ PROFILE</span>
        </div>
        <h1 className="font-display text-[40px] sm:text-[56px] leading-[1.0] tracking-[-0.02em] text-paper-ink">{name}.</h1>
      </section>
      <main className="max-w-[1280px] mx-auto px-6 sm:px-10 pb-24 border-t border-paper-rule">
        <div className="py-12 max-w-[640px]">
          <div className="border border-paper-rule">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-6 px-5 py-4 border-b border-paper-rule last:border-b-0">
                <span className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub pt-1">{k}</span>
                <span className="text-[14px] text-paper-ink text-right">{v}</span>
              </div>
            ))}
          </div>
          <p className="text-[13px] text-paper-ink-dim mt-6 leading-[1.55]">
            Edit your profile from the avatar menu in the top-right. Your profile powers Country Match and Visa Intelligence.
          </p>
          <div className="mt-8 flex gap-3">
            <Btn variant="primary" href="/match">Run Country Match →</Btn>
            <Btn variant="ghost" href="/visa">Check a visa</Btn>
          </div>
          <Footnote>{FOOTNOTES.profile}</Footnote>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Full build must now pass**

```bash
cd ~/migrova && npm run build 2>&1 | tail -5
```
Expected: `✓ Compiled successfully`, exit 0. Fix any remaining import errors before continuing.

- [ ] **Step 3: Commit**

```bash
cd ~/migrova && git add app/profile/page.js && git commit -m "feat: account-only profile page (community features removed)"
```

### Task 7: Legal layer — DisclaimerBlock, LegalAckModal, /legal page

**Files:**
- Create: `app/components/DisclaimerBlock.js`
- Create: `app/components/LegalAckModal.js`
- Create: `app/legal/page.js`

- [ ] **Step 1: Create `app/components/DisclaimerBlock.js`:**

```js
import Link from 'next/link';

export default function DisclaimerBlock() {
  return (
    <div className="border border-accent/40 bg-paper-bg-alt px-5 py-4 mb-8 max-w-[760px]">
      <div className="font-mono text-[10px] tracking-[0.12em] text-accent mb-1.5">// GENERAL INFORMATION — NOT LEGAL ADVICE</div>
      <p className="text-[12px] text-paper-ink-dim leading-[1.5]">
        Migrova provides general information about immigration processes. It is not legal advice, and using it
        creates no attorney–client relationship. Rules change often — for advice about your situation, consult a
        licensed immigration attorney. <Link href="/legal" className="underline hover:text-accent">Full disclaimer</Link>.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/components/LegalAckModal.js`:**

First open `app/api/user-profile/route.js` and note the POST body shape it expects (the key the route reads from `await request.json()` — e.g. `{ profile }`). Use that exact shape in `storeLegalAck` below (the code assumes `{ profile }`; adjust if the route differs).

```js
'use client';

const KEY = 'migrova_legal_ack';

export function hasLegalAck() {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}

export function storeLegalAck() {
  const ts = new Date().toISOString();
  try { localStorage.setItem(KEY, ts); } catch {}
  // Best-effort merge into the signed-in user's profile; ignore failures.
  fetch('/api/user-profile')
    .then((r) => r.json())
    .then((d) => {
      if (d.profile) {
        fetch('/api/user-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile: { ...d.profile, legal_ack: ts } }),
        });
      }
    })
    .catch(() => {});
}

export default function LegalAckModal({ open, onAccept, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-paper-bg border border-paper-rule max-w-[480px] w-full p-8">
        <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-4">// BEFORE YOU CONTINUE</div>
        <h2 className="font-display text-[26px] leading-[1.15] mb-4">Information, not legal advice.</h2>
        <p className="text-[13px] text-paper-ink-dim leading-[1.55] mb-6">
          Migrova gives general information about visas and immigration processes. It is not legal advice, it may
          be incomplete or out of date, and no attorney–client relationship is created. For decisions about your
          situation, consult a licensed immigration attorney.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => { storeLegalAck(); onAccept(); }}
            className="px-[22px] py-3 bg-paper-ink text-paper-bg text-[13px] font-medium hover:bg-[#2a3a2f] transition-colors">
            I understand — continue
          </button>
          <button onClick={onClose}
            className="px-[22px] py-3 border border-paper-rule text-paper-ink text-[13px] font-medium hover:bg-paper-bg-alt transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `app/legal/page.js`:**

```js
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footnote from '../components/ui/Footnote';
import { FOOTNOTES } from '../lib/pageCopy';

export const metadata = { title: 'Legal — Migrova' };

const SECTIONS = [
  ['Not legal advice', 'Everything on Migrova — including AI-generated reports — is general information about immigration processes. It is not legal advice and is not a substitute for advice from a licensed immigration attorney who knows your specific situation.'],
  ['No attorney–client relationship', 'Using Migrova does not create an attorney–client relationship with anyone. Migrova is not a law firm and does not employ, list, recommend, or endorse specific lawyers.'],
  ['Accuracy', 'Immigration rules change frequently and vary by case. We work to keep information current, but we cannot guarantee accuracy, completeness, or that information applies to your circumstances. Verify anything important with official government sources or a licensed attorney.'],
  ['AI-generated content', 'Migrova uses AI to summarize publicly available information. AI output can be wrong. Treat every report as a starting point for your own verification, never as a final answer.'],
  ['When to get a lawyer', 'If your case involves prior visa denials, criminal history, deportation or removal proceedings, asylum claims, or anything time-sensitive, talk to a licensed immigration attorney or a DOJ-accredited representative before acting. Our Lawyer Guide links to real directories where you can find one.'],
  ['Contact', 'Questions about this disclaimer? Reach us via the contact page.'],
];

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />
      <section className="max-w-[1280px] mx-auto px-6 sm:px-10 py-12">
        <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-paper-ink-sub mb-4 flex items-center gap-3">
          <span className="inline-block w-7 h-px bg-paper-ink-sub" /><span>§ LEGAL</span>
        </div>
        <h1 className="font-display text-[40px] sm:text-[56px] leading-[1.0] tracking-[-0.02em] text-paper-ink">The fine print, in plain English.</h1>
      </section>
      <main className="max-w-[1280px] mx-auto px-6 sm:px-10 pb-24 border-t border-paper-rule">
        <div className="py-12 max-w-[720px] space-y-10">
          {SECTIONS.map(([title, body]) => (
            <section key={title}>
              <h2 className="font-display text-[24px] mb-2">{title}</h2>
              <p className="text-[14px] text-paper-ink-dim leading-[1.6]">{body}</p>
            </section>
          ))}
          <p className="text-[13px] text-paper-ink-sub">
            Back to <Link href="/" className="underline hover:text-accent">Migrova</Link>.
          </p>
          <Footnote>{FOOTNOTES.legal}</Footnote>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Create `app/components/LegalFooter.js`** (site-wide disclaimer line, satisfies "footer disclaimer on every page"):

```js
import Link from 'next/link';

export default function LegalFooter() {
  return (
    <div className="border-t border-paper-rule px-6 sm:px-10 py-4 max-w-[1280px] mx-auto">
      <p className="text-[11px] text-paper-ink-sub leading-[1.5]">
        Migrova provides general information, not legal advice. For advice about your situation, consult a
        licensed immigration attorney. <Link href="/legal" className="underline hover:text-accent">Full disclaimer</Link>.
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Render it on every page** — in `app/layout.js`, import `LegalFooter` and add `<LegalFooter />` immediately after `{children}` inside the `<body>` (keep PingTracker and everything else as-is).

- [ ] **Step 6: Build + commit**

```bash
cd ~/migrova && npm run build 2>&1 | tail -3 && git add app/components/DisclaimerBlock.js app/components/LegalAckModal.js app/components/LegalFooter.js app/legal app/layout.js && git commit -m "feat: legal layer — DisclaimerBlock, LegalAckModal, LegalFooter, /legal page"
```

### Task 8: Wire gate + disclaimer into /visa

**Files:**
- Modify: `app/visa/page.js`

- [ ] **Step 1: Add imports** at the top of `app/visa/page.js`:

```js
import DisclaimerBlock from '../components/DisclaimerBlock';
import LegalAckModal, { hasLegalAck } from '../components/LegalAckModal';
```

- [ ] **Step 2: Add gate state + wrap the submit handler.** Inside the component add:

```js
const [showAck, setShowAck] = useState(false);
const [pendingSubmit, setPendingSubmit] = useState(false);
```

Find the existing form-submit/search handler (the function that calls `/api/visa-intel`). Rename it to `runSearch` if needed, then add a gate wrapper used by the form/button instead:

```js
function handleSubmitGated(e) {
  e?.preventDefault?.();
  if (!hasLegalAck()) { setPendingSubmit(true); setShowAck(true); return; }
  runSearch();
}
```

And render the modal near the end of the returned JSX (inside the outermost div):

```js
<LegalAckModal
  open={showAck}
  onAccept={() => { setShowAck(false); if (pendingSubmit) { setPendingSubmit(false); runSearch(); } }}
  onClose={() => { setShowAck(false); setPendingSubmit(false); }}
/>
```

- [ ] **Step 3: Render `<DisclaimerBlock />`** directly above the results section (where the visa report renders once loaded).

- [ ] **Step 4: Build, manually verify gate** (`npm run dev`, open /visa, submit → modal appears once; accept → results; reload → no modal).

- [ ] **Step 5: Commit**

```bash
cd ~/migrova && git add app/visa/page.js && git commit -m "feat: acknowledgment gate + disclaimer on visa intelligence"
```

### Task 9: Lawyer directories constant + /api/lawyer-guide

**Files:**
- Create: `app/lib/lawyerDirectories.js`
- Create: `app/api/lawyer-guide/route.js`

- [ ] **Step 1: Create `app/lib/lawyerDirectories.js`:**

```js
// Real, public lawyer-finding resources. Rendered as-is in the UI.
// The AI is forbidden from generating lawyer names or URLs — links come ONLY from this list.
export const LAWYER_DIRECTORIES = [
  { name: 'AILA Immigration Lawyer Search', url: 'https://www.ailalawyer.com', desc: 'American Immigration Lawyers Association member directory — search by location and practice area.' },
  { name: 'ImmigrationLawHelp.org', url: 'https://www.immigrationlawhelp.org', desc: 'Directory of free and low-cost nonprofit immigration legal services.' },
  { name: 'DOJ Accredited Representatives', url: 'https://www.justice.gov/eoir/find-legal-representation', desc: 'US government roster of organizations accredited to give immigration legal help.' },
  { name: 'ABA Lawyer Referral Directory', url: 'https://www.americanbar.org/groups/legal_services/flh-home/flh-lawyer-referral-directory/', desc: 'American Bar Association list of state bar lawyer-referral services.' },
];
```

- [ ] **Step 2: Create `app/api/lawyer-guide/route.js`:**

```js
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const cache = new Map();
const CACHE_MS = 60 * 60 * 1000;

export async function POST(request) {
  try {
    const { caseType, destination, budget, language } = await request.json();
    if (!caseType || !destination) {
      return Response.json({ error: 'Case type and destination are required' }, { status: 400 });
    }

    const cacheKey = `${caseType}|${destination}|${budget || ''}|${language || ''}`.toLowerCase();
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.t < CACHE_MS) return Response.json(hit.data);

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 3000,
      messages: [
        {
          role: 'system',
          content: `You are an immigration information specialist helping families understand how to find and work with immigration lawyers. You provide GENERAL INFORMATION ONLY — never legal advice, never case-specific directives. Use informational phrasing ("applicants typically...", "fees commonly range...", never "you should..."). NEVER invent or name specific lawyers, law firms, websites, or URLs. NEVER guarantee outcomes. Always note that fees vary and that the reader should consult a licensed immigration attorney about their specific situation.

Respond with ONLY valid JSON (no markdown fences) in exactly this shape:
{
  "process_overview": "2-3 sentence plain-English overview of how working with a lawyer on this case type usually goes",
  "fee_ranges": [{"stage": "string", "range": "string", "notes": "string"}],
  "consult_questions": ["string"],
  "red_flags": ["string"],
  "low_cost_options": ["string"],
  "disclaimer": "one sentence reminding this is general information, not legal advice"
}`,
        },
        {
          role: 'user',
          content: `Case type: ${caseType}. Destination: ${destination}. Budget: ${budget || 'not specified'}. Preferred language: ${language || 'not specified'}. Give general information about typical lawyer fees for this case type in this destination, what to ask in a first consultation, red flags when choosing a lawyer, and free/low-cost legal aid routes.`,
        },
      ],
    });

    let raw = completion.choices?.[0]?.message?.content || '';
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return Response.json({ error: 'Could not parse the guide. Try again.' }, { status: 500 });
    }

    const result = {
      process_overview: data.process_overview || null,
      fee_ranges: Array.isArray(data.fee_ranges) ? data.fee_ranges : [],
      consult_questions: Array.isArray(data.consult_questions) ? data.consult_questions : [],
      red_flags: Array.isArray(data.red_flags) ? data.red_flags : [],
      low_cost_options: Array.isArray(data.low_cost_options) ? data.low_cost_options : [],
      disclaimer: data.disclaimer || 'This is general information, not legal advice. Consult a licensed immigration attorney about your situation.',
    };

    cache.set(cacheKey, { t: Date.now(), data: result });
    return Response.json(result);
  } catch (err) {
    console.error('lawyer-guide error:', err);
    return Response.json({ error: 'Failed to generate the guide. Try again.' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify route with curl** (dev server running: `npm run dev`):

```bash
curl -s -X POST http://localhost:3000/api/lawyer-guide -H "Content-Type: application/json" \
  -d '{"caseType":"Work visa","destination":"Texas, USA","budget":"Low"}' | head -c 400
```
Expected: JSON starting with `{"process_overview":...` containing fee_ranges array. Re-run: second call should return instantly (cache).

- [ ] **Step 4: Commit**

```bash
cd ~/migrova && git add app/lib/lawyerDirectories.js app/api/lawyer-guide && git commit -m "feat: lawyer-guide API + real directories constant"
```

### Task 10: /lawyer page

**Files:**
- Create: `app/lawyer/page.js`

- [ ] **Step 1: Create `app/lawyer/page.js`:**

```js
'use client';

import { useState } from 'react';
import Navbar from '../components/Navbar';
import EditorialHero from '../components/ui/EditorialHero';
import Btn from '../components/ui/Btn';
import Footnote from '../components/ui/Footnote';
import DisclaimerBlock from '../components/DisclaimerBlock';
import LegalAckModal, { hasLegalAck } from '../components/LegalAckModal';
import { useScrollReveal } from '../components/ui/hooks/useScrollReveal';
import { HERO_COPY, FOOTNOTES } from '../lib/pageCopy';
import { LAWYER_DIRECTORIES } from '../lib/lawyerDirectories';

const CASE_TYPES = ['Work visa', 'Family reunification', 'Green card', 'Asylum', 'Citizenship', 'Student visa'];
const BUDGETS = ['Need free help', 'Low', 'Medium', 'High'];

export default function LawyerPage() {
  useScrollReveal();
  const [caseType, setCaseType] = useState(CASE_TYPES[0]);
  const [destination, setDestination] = useState('');
  const [budget, setBudget] = useState('');
  const [language, setLanguage] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAck, setShowAck] = useState(false);

  async function runGuide() {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch('/api/lawyer-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseType, destination, budget, language }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!destination.trim()) return;
    if (!hasLegalAck()) { setShowAck(true); return; }
    runGuide();
  }

  const hero = HERO_COPY.lawyer;
  const inputCls = 'bg-paper-bg border border-paper-rule text-paper-ink text-[14px] px-4 py-3 focus:border-accent outline-none w-full';

  return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />
      <EditorialHero
        kicker={hero.kicker} title={hero.title} titleItalic={hero.italic} titleTail={hero.tail} sub={hero.sub}
        meta={['TYPICAL FEES BY CASE TYPE', 'RED FLAGS + CONSULT QUESTIONS', 'REAL DIRECTORIES ONLY']}
      />
      <main className="max-w-[1280px] mx-auto px-6 sm:px-10 pb-24 border-t border-paper-rule">
        <div className="py-14 grid grid-cols-1 lg:grid-cols-[0.9fr_1.3fr] gap-12">
          <form onSubmit={handleSubmit} className="space-y-6 max-w-[440px]">
            <div>
              <label className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub block mb-2">CASE TYPE</label>
              <div className="flex flex-wrap gap-2">
                {CASE_TYPES.map((c) => (
                  <button type="button" key={c} onClick={() => setCaseType(c)}
                    className={`px-3 py-1.5 font-mono text-[11px] transition-colors ${caseType === c ? 'bg-paper-ink text-paper-bg' : 'border border-paper-rule text-paper-ink hover:bg-paper-bg-alt'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub block mb-2">DESTINATION (STATE OR COUNTRY)</label>
              <input className={inputCls} value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. Texas, USA" />
            </div>
            <div>
              <label className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub block mb-2">BUDGET (OPTIONAL)</label>
              <div className="flex flex-wrap gap-2">
                {BUDGETS.map((b) => (
                  <button type="button" key={b} onClick={() => setBudget(budget === b ? '' : b)}
                    className={`px-3 py-1.5 font-mono text-[11px] transition-colors ${budget === b ? 'bg-paper-ink text-paper-bg' : 'border border-paper-rule text-paper-ink hover:bg-paper-bg-alt'}`}>
                    {b}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub block mb-2">PREFERRED LANGUAGE (OPTIONAL)</label>
              <input className={inputCls} value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="e.g. Urdu" />
            </div>
            <Btn as="button" type="submit" variant="primary" disabled={loading || !destination.trim()} className="disabled:opacity-40">
              {loading ? 'Building your guide…' : 'Build my guide →'}
            </Btn>
          </form>

          <div>
            {loading && (
              <div className="py-20 text-center font-mono text-[11px] tracking-[0.12em] text-paper-ink-sub animate-pulse">
                GATHERING GENERAL FEE + LEGAL AID INFORMATION…
              </div>
            )}
            {error && (
              <div className="border border-accent/40 bg-paper-bg-alt p-6 max-w-[520px]">
                <div className="font-mono text-[10px] tracking-[0.12em] text-accent mb-2">// ERROR</div>
                <p className="text-[14px] text-paper-ink-dim mb-4">{error}</p>
                <Btn as="button" variant="secondary" onClick={runGuide}>Try again</Btn>
              </div>
            )}
            {result && (
              <div className="space-y-10">
                <DisclaimerBlock />
                {result.process_overview && (
                  <section>
                    <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-3">// HOW IT USUALLY WORKS</div>
                    <p className="text-[15px] text-paper-ink leading-[1.6] max-w-[60ch]">{result.process_overview}</p>
                  </section>
                )}
                {result.fee_ranges.length > 0 && (
                  <section>
                    <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-3">// TYPICAL FEES</div>
                    <div className="border border-paper-rule">
                      {result.fee_ranges.map((f, i) => (
                        <div key={i} className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4 border-b border-paper-rule last:border-b-0">
                          <div>
                            <div className="text-[14px] font-medium text-paper-ink">{f.stage}</div>
                            {f.notes && <div className="text-[12px] text-paper-ink-dim mt-1">{f.notes}</div>}
                          </div>
                          <div className="font-display text-[18px] text-accent whitespace-nowrap">{f.range}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                {result.consult_questions.length > 0 && (
                  <section>
                    <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-3">// ASK IN THE FIRST CONSULT</div>
                    <ul className="space-y-2">
                      {result.consult_questions.map((q, i) => (
                        <li key={i} className="text-[14px] text-paper-ink-dim leading-[1.5] pl-5 relative">
                          <span className="absolute left-0 text-accent">→</span>{q}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {result.red_flags.length > 0 && (
                  <section>
                    <div className="font-mono text-[10px] tracking-[0.12em] text-accent mb-3">// RED FLAGS — WALK AWAY</div>
                    <ul className="space-y-2">
                      {result.red_flags.map((r, i) => (
                        <li key={i} className="text-[14px] text-paper-ink-dim leading-[1.5] pl-5 relative">
                          <span className="absolute left-0 text-accent">✗</span>{r}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {result.low_cost_options.length > 0 && (
                  <section>
                    <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-3">// FREE + LOW-COST ROUTES</div>
                    <ul className="space-y-2">
                      {result.low_cost_options.map((o, i) => (
                        <li key={i} className="text-[14px] text-paper-ink-dim leading-[1.5] pl-5 relative">
                          <span className="absolute left-0 text-accent">→</span>{o}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                <p className="text-[12px] text-paper-ink-sub italic">{result.disclaimer}</p>
              </div>
            )}
          </div>
        </div>

        <section className="border-t border-paper-rule pt-12">
          <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-6">// FIND A REAL LAWYER — TRUSTED DIRECTORIES</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-t border-l border-paper-rule">
            {LAWYER_DIRECTORIES.map((d) => (
              <a key={d.url} href={d.url} target="_blank" rel="noopener noreferrer"
                className="block p-6 border-r border-b border-paper-rule hover:bg-paper-bg-alt transition-colors">
                <div className="font-display text-[18px] mb-1">{d.name} ↗</div>
                <div className="text-[13px] text-paper-ink-dim leading-[1.5]">{d.desc}</div>
              </a>
            ))}
          </div>
        </section>

        <Footnote>{FOOTNOTES.lawyer}</Footnote>
      </main>
      <LegalAckModal open={showAck} onAccept={() => { setShowAck(false); runGuide(); }} onClose={() => setShowAck(false)} />
    </div>
  );
}
```

- [ ] **Step 2: Build + manual verify** (`npm run dev`: /lawyer → fill form → submit → ack modal (first time) → guide renders with all sections + directory links).

- [ ] **Step 3: Commit**

```bash
cd ~/migrova && git add app/lawyer && git commit -m "feat: lawyer guide page"
```

### Task 11: AI guardrails on inherited prompts

**Files:**
- Modify: `app/api/visa-intel/route.js:22`, `app/api/relocation/route.js:24`, `app/api/country-match/route.js:32`, `app/api/visa-probability/route.js:21`

- [ ] **Step 1:** In each file, find the persona line and replace it as follows (keep the rest of each prompt intact):

`visa-intel` — replace `You are a world-class immigration lawyer and visa expert. Provide comprehensive, accurate visa information.` with:
```
You are an immigration information specialist (not a lawyer). Provide general, educational information about visa processes — never legal advice and never case-specific directives. Use informational phrasing ("applicants typically need…", never "you should…"). Where relevant, note that individual situations need a licensed immigration attorney. Never invent lawyer names, firms, or URLs.
```

`relocation` — replace `You are an expert relocation consultant who has helped thousands of people move internationally.` with:
```
You are a relocation information guide. Provide general, practical information about relocating — never legal or financial advice. Use informational phrasing. For visa or legal questions, note that a licensed immigration attorney should be consulted.
```

`country-match` — replace `You are a global career advisor.` (start of the prompt) with:
```
You are a global mobility information guide providing general information only, not legal or career advice.
```

`visa-probability` — replace `You are a visa and immigration expert.` with:
```
You are an immigration information specialist providing a rough, general estimate only — not legal advice and not a prediction of any individual outcome.
```

- [ ] **Step 2: Verify no persona claims remain**

```bash
cd ~/migrova && grep -rn "immigration lawyer\|expert relocation consultant\|career advisor\|immigration expert" app/api/
```
Expected: no output.

- [ ] **Step 3: Build + commit**

```bash
cd ~/migrova && npm run build 2>&1 | tail -3 && git add app/api && git commit -m "feat: information-not-advice guardrails on all AI prompts"
```

### Task 12: Cross-links + final sweep

**Files:**
- Modify: `app/components/CountryMatchCard.js` (Jobs link)
- Modify: `app/match/page.js`, `app/relocate/page.js`, `app/stories/page.js`, `app/visa/page.js`, `app/contact/page.js` (any links to deleted routes)

- [ ] **Step 1:** In `app/components/CountryMatchCard.js`, replace the internal Jobs link:

```js
<a href="https://opportumap.netlify.app/jobs" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 border border-paper-rule text-paper-ink hover:bg-paper-bg-alt transition-colors">Jobs ↗</a>
```
(replacing the existing `<Link href="/jobs" ...>Jobs</Link>` element).

- [ ] **Step 2: Find every remaining link to a deleted route**

```bash
cd ~/migrova && grep -rnE "href=[\"'/]+(jobs|map|saved|startups|community|messages|resume|cover-letter|interview|admin)" app --include="*.js"
```
For each hit: if it makes sense as a cross-link (jobs), point it at `https://opportumap.netlify.app/<path>` with `target="_blank"`; otherwise delete the element.

- [ ] **Step 3: Full build, zero broken refs**

```bash
cd ~/migrova && npm run build 2>&1 | tail -3
```
Expected: `✓ Compiled successfully` and route list shows exactly: `/`, `/match`, `/visa`, `/relocate`, `/lawyer`, `/stories`, `/legal`, `/profile`, `/contact`, `/auth/callback`, and APIs `country-match`, `visa-intel`, `visa-probability`, `relocation`, `stories`, `lawyer-guide`, `user-profile`, `tool-usage`, `ping`.

- [ ] **Step 4: Commit**

```bash
cd ~/migrova && git add -A && git commit -m "feat: cross-links to OpportuMap + dead-link sweep"
```

### Task 13: Push Migrova to GitHub + deploy to Netlify

- [ ] **Step 1: Create repo and push**

```bash
cd ~/migrova && gh repo create Aahil1369/migrova --public --source=. --remote=origin --push
```
Expected: repo created, master pushed.

- [ ] **Step 2: Create the Netlify site** — Netlify dashboard → Add new site → Import from GitHub → `Aahil1369/migrova`, branch `master`. (Or `npx netlify init` from `~/migrova`.) Next.js preset; defaults are fine (same as opportumap).

- [ ] **Step 3: Set env vars** (Site settings → Environment variables, **All scopes** including Functions — this bit OpportuMap before):
- `GROQ_API_KEY` (same value as opportumap's)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

- [ ] **Step 4: Set the site name to `migrova`** (Site settings → Site details → Change site name) so the URL is `migrova.netlify.app`. If taken, pick the closest available and note it — every `migrova.netlify.app` reference in BOTH repos must then be updated to the actual URL.

- [ ] **Step 5: Supabase auth redirect** — Supabase dashboard → project `gcrngdjrrfunokqfmkip` → Authentication → URL Configuration → add `https://migrova.netlify.app/auth/callback` to Redirect URLs (and confirm `http://localhost:3000/auth/callback` is present).

- [ ] **Step 6: Trigger deploy and verify live**

```bash
curl -s https://migrova.netlify.app/ | grep -o "Migrova" | head -1   # expect: Migrova
curl -s -X POST https://migrova.netlify.app/api/lawyer-guide -H "Content-Type: application/json" \
  -d '{"caseType":"Work visa","destination":"Texas, USA"}' | head -c 200   # expect JSON with process_overview
```
Also manually: Google sign-in on the live site must round-trip (verifies Step 5).

**CHECKPOINT: Migrova must be live and verified before Phase 2 begins.**

---

## PHASE 2 — PRUNE OPPORTUMAP

All Phase 2 work on a branch:

```bash
cd ~/opportumap && git checkout master && git pull && git checkout -b split-migrova
```

### Task 14: Delete moved features

**Files:**
- Delete: `app/visa/`, `app/relocate/`, `app/match/`, `app/stories/`, `app/api/visa-intel/`, `app/api/visa-probability/`, `app/api/relocation/`, `app/api/country-match/`, `app/api/stories/`, `app/components/VisaProbabilityMeter.js`, `app/components/CountryMatchCard.js`, `app/components/StoryCard.js`, `app/components/CommunityModal.js`
- Modify: `app/lib/pageCopy.js` (remove moved HERO_COPY/FOOTNOTES entries)

- [ ] **Step 1: Delete**

```bash
cd ~/opportumap && \
rm -rf app/visa app/relocate app/match app/stories \
       app/api/visa-intel app/api/visa-probability app/api/relocation \
       app/api/country-match app/api/stories && \
rm -f app/components/VisaProbabilityMeter.js app/components/CountryMatchCard.js \
      app/components/StoryCard.js app/components/CommunityModal.js
```

- [ ] **Step 2:** In `app/lib/pageCopy.js`, delete the `match`, `visa`, `relocate`, `stories` entries from BOTH `HERO_COPY` and `FOOTNOTES`.

- [ ] **Step 3: Find broken references** (homepage + Dashboard + Navbar still reference these — fixed in Tasks 15–16; anything else, fix now):

```bash
cd ~/opportumap && grep -rnE "/match|/visa|/relocate|/stories|CountryMatchCard|StoryCard|VisaProbabilityMeter" app --include="*.js" | grep -v node_modules
```

- [ ] **Step 4: Commit**

```bash
cd ~/opportumap && git add -A && git commit -m "chore: remove visa/relocate/match/stories (moved to Migrova)"
```

### Task 15: Redirects to Migrova

**Files:**
- Rewrite: `next.config.mjs`

- [ ] **Step 1: Replace `next.config.mjs` with:**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    const migrova = 'https://migrova.netlify.app';
    return ['/visa', '/relocate', '/match', '/stories'].map((path) => ({
      source: path,
      destination: `${migrova}${path}`,
      permanent: true,
    }));
  },
};

export default nextConfig;
```

- [ ] **Step 2: Commit**

```bash
cd ~/opportumap && git add next.config.mjs && git commit -m "feat: permanent redirects for moved routes -> Migrova"
```

### Task 16: Homepage + Dashboard + Navbar rework

**Files:**
- Modify: `app/page.js` (TOOLS array, hero CTAs, footer)
- Modify: `app/components/Dashboard.js` (tool tiles, ~lines 59, 67)
- Modify: `app/components/Navbar.js` (TOOL_LINKS)

- [ ] **Step 1: `app/page.js` — replace the `TOOLS` array with:**

```js
const TOOLS = [
  { n: '01', tag: 'RSM', href: '/resume',       glyph: 'document',   name: 'Resume Grader',  desc: 'Brutally honest. Average is 35–55, not 75.' },
  { n: '02', tag: 'CVR', href: '/cover-letter', glyph: 'envelope',   name: 'Cover Letter',   desc: 'Paste the job, pick a tone. We draft.' },
  { n: '03', tag: 'INT', href: '/interview',    glyph: 'microphone', name: 'Interview Prep', desc: '15 tailored questions + AI mock interview.' },
  { n: '04', tag: 'MGV', href: 'https://migrova.netlify.app', external: true, glyph: 'globe-wire', name: 'Migrova ↗', desc: 'Moving abroad? Visas, relocation, legal guidance — our sibling app.' },
];
```

In the TOOLS `.map()`, render external entries with `<a href={t.href} target="_blank" rel="noopener noreferrer" ...>` instead of `<Link>` (same classNames):

```js
{TOOLS.map((t) => {
  const Cmp = t.external ? 'a' : Link;
  const extra = t.external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
  return (
    <Cmp key={t.href} href={t.href} {...extra}
      className="tool-card-underline group block p-8 border-r border-b border-paper-rule bg-paper-bg hover:bg-paper-bg-alt transition-colors">
      <div className="text-paper-ink mb-6"><Glyph name={t.glyph} size={36} /></div>
      <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-2">№ {t.n} — {t.tag}</div>
      <div className="font-display text-[22px] leading-[1.15] mb-2">{t.name}</div>
      <div className="text-[13px] text-paper-ink-dim leading-[1.5]">{t.desc}</div>
    </Cmp>
  );
})}
```

Change the grid wrapper from `lg:grid-cols-3` to `lg:grid-cols-4` and the SectionHead sub-line to: `Three career tools plus our visa & relocation sibling, Migrova.`

- [ ] **Step 2: hero CTAs in `app/page.js`:** primary becomes `<Btn variant="primary" href="/jobs" magnetic>Browse jobs →</Btn>` (secondary "Spin the map" stays). The bottom CTA section's primary also changes from `/match` to `/jobs` with label `Browse jobs →`. Replace the `HOW_IT_WORKS` step 2 entry with `{ n: '02', title: 'Get matched', body: 'We surface the jobs that fit your skills and visa needs.' }`.

- [ ] **Step 3: footer in `app/page.js`:** in the footer's middle span change to `A sibling of <a href="https://migrova.netlify.app" className="hover:text-accent underline">Migrova</a>`; in the right span replace the `/stories` link with `<a href="https://migrova.netlify.app" className="hover:text-accent">Migrova</a>`.

- [ ] **Step 4: `app/components/Dashboard.js`:** the tiles at ~line 59 (`href="/match"`) and ~line 67 (`href="/visa"`) become: `/match` tile → `href="/resume"`, title `Resume Grader`, description `Get the brutal-honest grade and fix what's broken.`; `/visa` tile → external `<a href="https://migrova.netlify.app" target="_blank" rel="noopener noreferrer">`, title `Migrova ↗`, description `Visas, relocation, legal guidance — our sibling app.` Keep each tile's existing classNames and surrounding JSX identical (only href/element type/title/description change).

- [ ] **Step 5: `app/components/Navbar.js`:** in `TOOL_LINKS` remove the `/match`, `/visa`, `/relocate` entries (keep resume, cover-letter, interview). In the Tools dropdown JSX, after the `TOOL_LINKS.map(...)` block add:

```js
<a href="https://migrova.netlify.app" target="_blank" rel="noopener noreferrer"
   className="block px-4 py-2 text-[13px] text-paper-ink hover:bg-paper-bg-alt">
  Migrova ↗
</a>
```
(match the classNames of the dropdown items above it — copy from an existing item).

- [ ] **Step 6: Build — full pass required**

```bash
cd ~/opportumap && npm run build 2>&1 | tail -5 && grep -rnE "href=\"/(match|visa|relocate|stories)\"" app --include="*.js"
```
Expected: build green; grep returns nothing.

- [ ] **Step 7: Commit**

```bash
cd ~/opportumap && git add -A && git commit -m "feat: homepage/Dashboard/Navbar rework + Migrova cross-promo"
```

### Task 17: Merge, deploy, verify both apps

- [ ] **Step 1: Merge + push (Netlify auto-deploys master)**

```bash
cd ~/opportumap && git checkout master && git merge --no-ff split-migrova -m "Merge split-migrova: move visa/relocation tools to Migrova" && git push origin master
```

- [ ] **Step 2: Verify production redirects** (wait for the Netlify build, ~2-4 min, then):

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://opportumap.netlify.app/visa
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://opportumap.netlify.app/match
```
Expected: `308 https://migrova.netlify.app/visa` (and `/match` likewise).

- [ ] **Step 3: Verify OpportuMap homepage** shows the Migrova card and "Browse jobs" CTA (curl for `Migrova` in homepage HTML).

- [ ] **Step 4: Final manual pass on Migrova production:** /match happy path, /visa with ack gate, /lawyer full flow, /stories, Google sign-in.

---

## Self-review checklist (run after writing, fixed inline)
- Spec coverage: every spec section maps to a task (3.1→T1/13, 3.2→T2-6, 3.3→T9/10, 3.4→T7/8/10/11, 3.5→T2/12, §4→T14-16, §5→T13.5, §6→ordering, §7→verify steps).
- Known landmines documented: profile page community deps (T6), Clerk leftovers (T2), AI persona lines (T11), netlify site-name fallback (T13.4), env var scoping (T13.3).
