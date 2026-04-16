# OpportuMap International Relaunch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reposition OpportuMap as the global opportunity platform for international job seekers, shipping 7 features in 2 weeks.

**Architecture:** Extend existing Next.js 16 App Router + Supabase + Groq stack. No new dependencies. New pages (`/match`, `/stories`) and API routes (`/api/country-match`, `/api/visa-probability`, `/api/stories`). Conditional homepage for logged-in users. Nav restructured to lead with international features.

**Tech Stack:** Next.js 16.2.1, React 19, Supabase (auth + DB), Groq SDK (llama-3.3-70b-versatile), Tailwind CSS 4, Mapbox GL JS.

**Spec:** `docs/superpowers/specs/2026-04-16-opportumap-international-relaunch-design.md`

---

## File Map

### Modified Files
| File | Change |
|------|--------|
| `app/components/Navbar.js` | Reorder NAV_LINKS, move Visa/Relocate to primary, Resume/Interview/Cover Letter to Tools dropdown |
| `app/page.js` | New hero, feature cards, conditional dashboard for logged-in users |
| `app/visa/page.js` | Add Visa Probability Score meter above existing report |
| `app/layout.js` | Update OG meta tags |
| `app/components/ProfileModal.js` | No changes needed — existing flow already handles onboarding |

### New Files
| File | Purpose |
|------|---------|
| `app/api/country-match/route.js` | Groq-powered country recommender API |
| `app/match/page.js` | Country Match results page |
| `app/api/visa-probability/route.js` | Visa probability scoring API |
| `app/api/stories/route.js` | CRUD for user success stories |
| `app/stories/page.js` | Share Your Story page + display |
| `app/components/CountryMatchCard.js` | Individual country match result card |
| `app/components/VisaProbabilityMeter.js` | Visual probability gauge |
| `app/components/Dashboard.js` | Personalized dashboard for logged-in users |
| `app/components/StoryCard.js` | Individual story display card |

---

## Task 1: Nav Restructure

**Files:**
- Modify: `app/components/Navbar.js`

The current NAV_LINKS are: Jobs, Map, Startups, Saved, Community, Messages.
The current TOOL_LINKS are: Resume Analyzer, Cover Letter, Interview Prep, Visa Intelligence, Relocation Guide, Contact.

We need to move Visa and Relocate to primary nav, move Resume/Interview/Cover Letter into Tools.

- [ ] **Step 1: Update NAV_LINKS array**

In `app/components/Navbar.js`, find the NAV_LINKS array and replace it:

```javascript
const NAV_LINKS = [
  { label: 'Jobs',      href: '/jobs' },
  { label: 'Map',       href: '/map' },
  { label: 'Visa',      href: '/visa' },
  { label: 'Relocate',  href: '/relocate' },
  { label: 'Match',     href: '/match' },
  { label: 'Community', href: '/community' },
];
```

- [ ] **Step 2: Update TOOL_LINKS array**

Replace the TOOL_LINKS array:

```javascript
const TOOL_LINKS = [
  { label: 'Resume Analyzer',  href: '/resume' },
  { label: 'Cover Letter',     href: '/cover-letter' },
  { label: 'Interview Prep',   href: '/interview' },
  { label: 'Startups',         href: '/startups' },
  { label: 'Saved Jobs',       href: '/saved' },
  { label: 'Messages',         href: '/messages' },
  { label: 'Stories',          href: '/stories' },
  { label: 'Contact',          href: '/contact' },
];
```

- [ ] **Step 3: Run dev server and verify**

```bash
cd ~/opportumap && npm run dev
```

Open http://localhost:3000. Verify:
- Primary nav shows: Jobs, Map, Visa, Relocate, Match, Community
- Tools dropdown shows: Resume Analyzer, Cover Letter, Interview Prep, Startups, Saved Jobs, Messages, Stories, Contact
- Mobile drawer shows all links
- All links navigate correctly

- [ ] **Step 4: Commit**

```bash
cd ~/opportumap
git add app/components/Navbar.js
git commit -m "feat: restructure nav for international focus — visa/relocate/match primary, tools in dropdown"
```

---

## Task 2: Homepage Rewrite

**Files:**
- Modify: `app/page.js`

The current homepage has a generic "Global Career AI" hero. We need to rewrite the hero, stats, and feature cards to lead with the international wedge, and add conditional dashboard content for logged-in users.

- [ ] **Step 1: Rewrite the hero section**

In `app/page.js`, replace the existing hero section (the first `<section>` with the h1 and floating cards) with:

```jsx
{/* HERO */}
<section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
  <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-sm mb-8">
      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
      Built by an immigrant, for the world
    </div>
    <h1 className={`text-5xl md:text-7xl font-bold tracking-tight mb-6 ${
      isDark ? 'text-white' : 'text-zinc-900'
    }`}>
      Find opportunities you can<br />
      <span className="text-indigo-400">actually access</span>
    </h1>
    <p className={`text-xl md:text-2xl mb-10 max-w-2xl mx-auto ${
      isDark ? 'text-zinc-400' : 'text-zinc-600'
    }`}>
      Jobs, visas, and relocation intel across 100 countries.
      Built for people from everywhere else.
    </p>
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
      <a href="/match" className="px-8 py-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-lg transition-colors">
        Find Your Country Match
      </a>
      <a href="/jobs" className={`px-8 py-3.5 rounded-lg border font-semibold text-lg transition-colors ${
        isDark
          ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
          : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
      }`}>
        Browse Jobs
      </a>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Rewrite the stats strip**

Replace the STATS array with internationally-focused stats:

```javascript
const STATS = [
  { value: '33,664',  label: 'Jobs Worldwide' },
  { value: '100+',    label: 'Countries Covered' },
  { value: 'Free',    label: 'Visa Intelligence' },
  { value: 'AI',      label: 'Country Matching' },
];
```

- [ ] **Step 3: Rewrite the feature cards**

Replace the FEATURES array to lead with international tools:

```javascript
const FEATURES = [
  {
    icon: '🌍',
    title: 'Country Match',
    desc: 'AI finds the top 5 countries where you have the best shot — based on your nationality, skills, and visa access.',
    href: '/match',
  },
  {
    icon: '🛂',
    title: 'Visa Intelligence',
    desc: 'Detailed visa requirements, approval probability, document checklists, and embassy tips for any destination.',
    href: '/visa',
  },
  {
    icon: '📍',
    title: 'Global Job Map',
    desc: 'Interactive map showing real job openings across 100+ countries. Filter by visa sponsorship, remote, and more.',
    href: '/map',
  },
  {
    icon: '🏠',
    title: 'Relocation Guide',
    desc: 'Cost of living, neighborhoods, banking setup, cultural tips, and expat communities for your target country.',
    href: '/relocate',
  },
  {
    icon: '📄',
    title: 'Resume Analyzer',
    desc: 'Upload your resume for a brutally honest AI grade with section-by-section feedback and rewritten bullet points.',
    href: '/resume',
  },
  {
    icon: '🎤',
    title: 'Interview Prep',
    desc: '15 tailored questions plus a mock interview mode where AI scores your answers and rewrites stronger versions.',
    href: '/interview',
  },
];
```

- [ ] **Step 4: Rewrite the "How It Works" section**

Replace HOW_IT_WORKS:

```javascript
const HOW_IT_WORKS = [
  { step: '1', title: 'Tell Us About You', desc: 'Your nationality, skills, and where you want to go.' },
  { step: '2', title: 'Get Matched', desc: 'AI finds countries where you have the best visa and job access.' },
  { step: '3', title: 'Prepare', desc: 'Visa guides, interview prep, and resume analysis — all tailored to you.' },
  { step: '4', title: 'Go', desc: 'Apply with confidence. Real jobs, real visa paths, real relocation info.' },
];
```

- [ ] **Step 5: Update the CTA section**

Replace the CTA section text:

```jsx
<h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
  Opportunity shouldn&apos;t depend on your passport
</h2>
<p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
  Join thousands of people using OpportuMap to find jobs, visas, and new homes across 100+ countries.
</p>
<a href="/match" className="inline-block px-8 py-3.5 rounded-lg bg-white text-indigo-600 font-semibold text-lg hover:bg-indigo-50 transition-colors">
  Find Your Match — It&apos;s Free
</a>
```

- [ ] **Step 6: Run dev server and verify**

```bash
cd ~/opportumap && npm run dev
```

Open http://localhost:3000. Verify:
- Hero says "Find opportunities you can actually access"
- "Built by an immigrant, for the world" badge visible
- Primary CTA goes to /match
- Feature cards lead with Country Match, Visa Intelligence
- How It Works reflects new flow
- Dark and light mode both look correct
- Mobile layout responsive

- [ ] **Step 7: Commit**

```bash
cd ~/opportumap
git add app/page.js
git commit -m "feat: rewrite homepage for international job seekers — new hero, features, CTA"
```

---

## Task 3: Country Match API

**Files:**
- Create: `app/api/country-match/route.js`

- [ ] **Step 1: Create the API route**

```javascript
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000;

function cacheKey(profile) {
  const parts = [
    profile.nationality,
    profile.currentCountry,
    (profile.preferredCountries || []).sort().join(','),
    Array.isArray(profile.skills) ? profile.skills.sort().join(',') : (profile.skills || ''),
    profile.experience,
  ];
  return parts.join('|');
}

export async function POST(request) {
  const { profile } = await request.json();

  if (!profile?.nationality) {
    return Response.json({ error: 'Nationality is required' }, { status: 400 });
  }

  const key = cacheKey(profile);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return Response.json(cached.data);
  }

  const prompt = `You are a global career advisor. Given this person's profile, recommend the top 5 countries where they would have the best chance of finding work and getting a visa.

Profile:
- Nationality: ${profile.nationality}
- Currently in: ${profile.currentCountry || 'not specified'}
- Experience: ${profile.experience || 'not specified'}
- Skills: ${Array.isArray(profile.skills) ? profile.skills.join(', ') : (profile.skills || 'not specified')}
- Preferred regions: ${(profile.preferredCountries || []).join(', ') || 'open to anywhere'}
- Job interests: ${(profile.jobTypes || []).join(', ') || 'not specified'}

For each country, provide:
1. match_score (1-100, be realistic)
2. country_name
3. country_code (ISO 2-letter)
4. visa_difficulty ("Easy", "Moderate", "Hard", "Very Hard")
5. job_availability ("High", "Medium", "Low")
6. cost_of_living ("$" cheap, "$$" moderate, "$$$" expensive, "$$$$" very expensive)
7. language_barrier ("None", "Low", "Medium", "High")
8. diaspora_size ("Large", "Medium", "Small")
9. top_reason (one sentence why this country is a good match)
10. visa_path (one sentence about the most realistic visa route)

Return ONLY valid JSON: { "matches": [...] } sorted by match_score descending. No markdown, no explanation.`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content || '';
    const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const data = JSON.parse(jsonStr);

    cache.set(key, { data, ts: Date.now() });
    return Response.json(data);
  } catch (err) {
    console.error('Country match error:', err);
    return Response.json({ error: 'Failed to generate matches' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Test the API with curl**

```bash
curl -X POST http://localhost:3000/api/country-match \
  -H "Content-Type: application/json" \
  -d '{"profile":{"nationality":"Pakistani","currentCountry":"United States","experience":"Student","skills":["JavaScript","Python","React"],"preferredCountries":["Canada","Germany","UK"],"jobTypes":["Software Engineering"]}}'
```

Expected: JSON with `{ "matches": [...] }` containing 5 countries with all fields populated.

- [ ] **Step 3: Test error case**

```bash
curl -X POST http://localhost:3000/api/country-match \
  -H "Content-Type: application/json" \
  -d '{"profile":{}}'
```

Expected: `{ "error": "Nationality is required" }` with status 400.

- [ ] **Step 4: Commit**

```bash
cd ~/opportumap
git add app/api/country-match/route.js
git commit -m "feat: add country match API — Groq-powered country recommendations with 24hr cache"
```

---

## Task 4: Country Match Page

**Files:**
- Create: `app/components/CountryMatchCard.js`
- Create: `app/match/page.js`

- [ ] **Step 1: Create CountryMatchCard component**

```jsx
'use client';

export default function CountryMatchCard({ match, isDark }) {
  const difficultyColor = {
    'Easy': 'text-green-400 bg-green-400/10 border-green-400/30',
    'Moderate': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    'Hard': 'text-orange-400 bg-orange-400/10 border-orange-400/30',
    'Very Hard': 'text-red-400 bg-red-400/10 border-red-400/30',
  }[match.visa_difficulty] || 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30';

  const jobColor = {
    'High': 'text-green-400',
    'Medium': 'text-yellow-400',
    'Low': 'text-red-400',
  }[match.job_availability] || 'text-zinc-400';

  return (
    <div className={`rounded-xl border p-6 transition-all hover:scale-[1.01] ${
      isDark
        ? 'bg-[#12121e] border-[#2a2a3e] hover:border-indigo-500/50'
        : 'bg-white border-zinc-200 hover:border-indigo-400'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            {match.country_name}
          </h3>
          <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {match.top_reason}
          </p>
        </div>
        <div className="flex items-center gap-1 ml-4">
          <span className="text-3xl font-bold text-indigo-400">{match.match_score}</span>
          <span className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>/100</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div>
          <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Visa</span>
          <p className={`text-sm font-medium px-2 py-0.5 rounded-full border inline-block mt-1 ${difficultyColor}`}>
            {match.visa_difficulty}
          </p>
        </div>
        <div>
          <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Jobs</span>
          <p className={`text-sm font-semibold mt-1 ${jobColor}`}>{match.job_availability}</p>
        </div>
        <div>
          <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Cost</span>
          <p className={`text-sm font-semibold mt-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{match.cost_of_living}</p>
        </div>
        <div>
          <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Language</span>
          <p className={`text-sm font-semibold mt-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{match.language_barrier}</p>
        </div>
      </div>

      <p className={`text-sm mb-4 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
        <span className="font-medium">Visa path:</span> {match.visa_path}
      </p>

      <div className="flex gap-3">
        <a href={`/visa?nationality=&country=${encodeURIComponent(match.country_name)}`}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
          Visa Details
        </a>
        <a href={`/relocate?country=${encodeURIComponent(match.country_name)}`}
          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
            isDark
              ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
              : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
          }`}>
          Relocation Guide
        </a>
        <a href={`/jobs?country=${encodeURIComponent(match.country_name)}`}
          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
            isDark
              ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
              : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
          }`}>
          View Jobs
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the /match page**

```jsx
'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import CountryMatchCard from '../components/CountryMatchCard';
import { useTheme } from '../hooks/useTheme';
import { createClient } from '../../lib/supabase-browser';

export default function MatchPage() {
  const { isDark } = useTheme();
  const [matches, setMatches] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [hasProfile, setHasProfile] = useState(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/user-profile');
        const data = await res.json();
        if (data.profile && data.profile.nationality) {
          setProfile(data.profile);
          setHasProfile(true);
        } else {
          const saved = localStorage.getItem('opportumap_profile');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.nationality) {
              setProfile(parsed);
              setHasProfile(true);
            } else {
              setHasProfile(false);
            }
          } else {
            setHasProfile(false);
          }
        }
      } catch {
        setHasProfile(false);
      }
    }
    loadProfile();
  }, []);

  async function findMatches() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/country-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMatches(data.matches);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (profile) findMatches();
  }, [profile]);

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#080810] text-zinc-100' : 'bg-white text-zinc-900'}`}>
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 pt-28 pb-16">
        <div className="text-center mb-12">
          <h1 className={`text-4xl md:text-5xl font-bold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Your Country Match
          </h1>
          <p className={`text-lg ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            AI-powered recommendations based on your nationality, skills, and goals.
          </p>
        </div>

        {hasProfile === false && (
          <div className={`text-center p-8 rounded-xl border ${
            isDark ? 'bg-[#12121e] border-[#2a2a3e]' : 'bg-zinc-50 border-zinc-200'
          }`}>
            <p className={`text-lg mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              Set up your profile first so we can find your best matches.
            </p>
            <p className={`text-sm mb-6 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
              Click your avatar in the top-right, or sign in to get started.
            </p>
          </div>
        )}

        {loading && (
          <div className="text-center py-16">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className={`text-lg ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Analyzing your profile across 100+ countries...
            </p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={findMatches}
              className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors">
              Try Again
            </button>
          </div>
        )}

        {matches && (
          <div className="space-y-4">
            {matches.map((match, i) => (
              <CountryMatchCard key={match.country_code || i} match={match} isDark={isDark} />
            ))}
            <div className="text-center pt-8">
              <button onClick={findMatches}
                className={`px-6 py-2 rounded-lg border font-medium transition-colors ${
                  isDark
                    ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                    : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                }`}>
                Refresh Matches
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Run dev server and test**

```bash
cd ~/opportumap && npm run dev
```

Test 3 scenarios:
1. Visit /match while logged out → "Set up your profile" message
2. Log in with a profile that has nationality → auto-runs match → shows 5 country cards
3. Each card's "Visa Details" and "Relocation Guide" links navigate correctly

- [ ] **Step 4: Commit**

```bash
cd ~/opportumap
git add app/components/CountryMatchCard.js app/match/page.js
git commit -m "feat: add Country Match page — AI recommends top 5 countries based on profile"
```

---

## Task 5: Visa Probability API

**Files:**
- Create: `app/api/visa-probability/route.js`

- [ ] **Step 1: Create the API route**

```javascript
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000;

export async function POST(request) {
  const { nationality, destination, purpose, profile } = await request.json();

  if (!nationality || !destination) {
    return Response.json({ error: 'Nationality and destination required' }, { status: 400 });
  }

  const key = `${nationality}|${destination}|${purpose || ''}|${profile?.experience || ''}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return Response.json(cached.data);
  }

  const prompt = `You are a visa and immigration expert. Assess the probability of a ${nationality} citizen getting a visa to ${destination} for ${purpose || 'work'}.

${profile ? `Additional context:
- Experience: ${profile.experience || 'unknown'}
- Skills: ${(profile.skills || []).join(', ') || 'unknown'}
- Education: ${profile.education || 'unknown'}` : ''}

Return ONLY valid JSON with this structure:
{
  "probability": "Low" | "Medium" | "High" | "Very High",
  "percentage_range": "X-Y%",
  "factors": [
    { "factor": "description", "impact": "positive" | "negative" | "neutral" }
  ],
  "key_requirements": ["requirement 1", "requirement 2"],
  "recommended_visa_type": "visa name",
  "processing_time": "X-Y weeks",
  "tip": "one actionable tip to improve chances"
}

Be realistic and specific. Consider actual visa policies between these countries. No markdown, no explanation.`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content || '';
    const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const data = JSON.parse(jsonStr);

    cache.set(key, { data, ts: Date.now() });
    return Response.json(data);
  } catch (err) {
    console.error('Visa probability error:', err);
    return Response.json({ error: 'Failed to assess probability' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Test with curl**

```bash
curl -X POST http://localhost:3000/api/visa-probability \
  -H "Content-Type: application/json" \
  -d '{"nationality":"Pakistani","destination":"Canada","purpose":"work","profile":{"experience":"Student","skills":["JavaScript","Python"]}}'
```

Expected: JSON with probability, percentage_range, factors array, key_requirements, recommended_visa_type, processing_time, tip.

- [ ] **Step 3: Commit**

```bash
cd ~/opportumap
git add app/api/visa-probability/route.js
git commit -m "feat: add visa probability scoring API with 1hr cache"
```

---

## Task 6: Visa Probability Meter + Page Enhancement

**Files:**
- Create: `app/components/VisaProbabilityMeter.js`
- Modify: `app/visa/page.js`

- [ ] **Step 1: Create VisaProbabilityMeter component**

```jsx
'use client';

export default function VisaProbabilityMeter({ data, isDark }) {
  if (!data) return null;

  const probColors = {
    'Low': { bar: 'bg-red-500', text: 'text-red-400', width: '20%' },
    'Medium': { bar: 'bg-yellow-500', text: 'text-yellow-400', width: '50%' },
    'High': { bar: 'bg-green-500', text: 'text-green-400', width: '75%' },
    'Very High': { bar: 'bg-emerald-400', text: 'text-emerald-400', width: '95%' },
  };

  const colors = probColors[data.probability] || probColors['Medium'];

  return (
    <div className={`rounded-xl border p-6 mb-8 ${
      isDark ? 'bg-[#12121e] border-[#2a2a3e]' : 'bg-white border-zinc-200'
    }`}>
      <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
        Visa Approval Probability
      </h3>

      <div className="flex items-center gap-4 mb-4">
        <div className={`flex-1 h-4 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
          <div className={`h-full rounded-full transition-all duration-1000 ${colors.bar}`}
            style={{ width: colors.width }} />
        </div>
        <span className={`text-2xl font-bold ${colors.text}`}>{data.probability}</span>
      </div>

      <p className={`text-sm mb-4 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
        Estimated range: <span className="font-semibold">{data.percentage_range}</span>
        {data.recommended_visa_type && <> via <span className="font-semibold">{data.recommended_visa_type}</span></>}
        {data.processing_time && <> &middot; Processing: {data.processing_time}</>}
      </p>

      {data.factors && data.factors.length > 0 && (
        <div className="space-y-2 mb-4">
          <h4 className={`text-sm font-semibold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Key Factors</h4>
          {data.factors.map((f, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-0.5">
                {f.impact === 'positive' ? '✅' : f.impact === 'negative' ? '❌' : '➖'}
              </span>
              <span className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>{f.factor}</span>
            </div>
          ))}
        </div>
      )}

      {data.tip && (
        <div className={`p-3 rounded-lg ${isDark ? 'bg-indigo-500/10 border border-indigo-500/30' : 'bg-indigo-50 border border-indigo-200'}`}>
          <p className={`text-sm ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
            <span className="font-semibold">Tip:</span> {data.tip}
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Integrate into visa page**

In `app/visa/page.js`, add the import at the top:

```javascript
import VisaProbabilityMeter from '../components/VisaProbabilityMeter';
```

Add state for probability data near the existing state declarations:

```javascript
const [probData, setProbData] = useState(null);
const [probLoading, setProbLoading] = useState(false);
```

After the existing `handleSearch` function's fetch to `/api/visa-intel`, add a parallel call to fetch probability. Inside the `handleSearch` function, after `setResult(data)` succeeds, add:

```javascript
setProbLoading(true);
fetch('/api/visa-probability', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nationality: nat,
    destination: dest,
    purpose: purpose,
    profile: profile,
  }),
})
  .then(r => r.json())
  .then(d => { if (!d.error) setProbData(d); })
  .catch(() => {})
  .finally(() => setProbLoading(false));
```

Then render the meter right after the status banner and before the visa types section. Find where the result rendering starts and add:

```jsx
{probLoading && (
  <div className="flex items-center gap-3 mb-6">
    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>Calculating approval probability...</span>
  </div>
)}
{probData && <VisaProbabilityMeter data={probData} isDark={isDark} />}
```

- [ ] **Step 3: Run dev server and test**

Open /visa, enter Pakistani → Canada → work → search. Verify:
- Probability meter appears above the detailed visa report
- Shows probability level (Low/Medium/High/Very High) with animated bar
- Factors show with checkmark/cross icons
- Tip shows in highlighted box
- Loading spinner appears briefly while probability loads

- [ ] **Step 4: Commit**

```bash
cd ~/opportumap
git add app/components/VisaProbabilityMeter.js app/visa/page.js
git commit -m "feat: add visa probability meter to visa page — shows approval chance with factors"
```

---

## Task 7: Dashboard (Conditional Homepage)

**Files:**
- Create: `app/components/Dashboard.js`
- Modify: `app/page.js`

- [ ] **Step 1: Create Dashboard component**

```jsx
'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';

export default function Dashboard({ profile }) {
  const { isDark } = useTheme();
  const [recentJobs, setRecentJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  useEffect(() => {
    async function loadJobs() {
      try {
        const countries = profile.preferredCountries || [];
        const country = countries[0] || '';
        const skills = (profile.skills || '').split?.(',')[0] || (profile.jobTypes || [])[0] || '';
        const query = skills ? `&query=${encodeURIComponent(skills.trim())}` : '';
        const res = await fetch(`/api/jobs?country=${encodeURIComponent(country)}${query}&sort=date`);
        const data = await res.json();
        setRecentJobs((data.jobs || []).slice(0, 6));
      } catch {
        setRecentJobs([]);
      } finally {
        setJobsLoading(false);
      }
    }
    loadJobs();
  }, [profile]);

  const firstName = (profile.name || '').split(' ')[0] || 'there';

  return (
    <div className="max-w-5xl mx-auto px-6 pt-28 pb-16">
      <div className="mb-10">
        <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Welcome back, {firstName}
        </h1>
        <p className={`text-lg ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Here&apos;s what&apos;s new for you across your target countries.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Country Match', href: '/match', icon: '🌍', desc: 'Find your best fit' },
          { label: 'Visa Intel', href: '/visa', icon: '🛂', desc: 'Check visa paths' },
          { label: 'Resume Grade', href: '/resume', icon: '📄', desc: 'Get feedback' },
          { label: 'Interview Prep', href: '/interview', icon: '🎤', desc: 'Practice now' },
        ].map(item => (
          <a key={item.href} href={item.href}
            className={`p-4 rounded-xl border text-center transition-all hover:scale-[1.02] ${
              isDark
                ? 'bg-[#12121e] border-[#2a2a3e] hover:border-indigo-500/50'
                : 'bg-white border-zinc-200 hover:border-indigo-400'
            }`}>
            <span className="text-2xl">{item.icon}</span>
            <p className={`text-sm font-semibold mt-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>{item.label}</p>
            <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>{item.desc}</p>
          </a>
        ))}
      </div>

      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Recent Jobs in Your Target Countries
          </h2>
          <a href="/jobs" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">View all →</a>
        </div>

        {jobsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className={`h-24 rounded-xl animate-pulse ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`} />
            ))}
          </div>
        ) : recentJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentJobs.map((job, i) => (
              <a key={i} href={job.url || job.redirect_url || '#'} target="_blank" rel="noopener noreferrer"
                className={`p-4 rounded-xl border transition-all hover:scale-[1.01] ${
                  isDark
                    ? 'bg-[#12121e] border-[#2a2a3e] hover:border-indigo-500/50'
                    : 'bg-white border-zinc-200 hover:border-indigo-400'
                }`}>
                <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {job.title}
                </p>
                <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {job.company?.display_name || job.company || 'Company'} · {job.location?.display_name || job.location || ''}
                </p>
              </a>
            ))}
          </div>
        ) : (
          <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
            No recent jobs found. Try updating your profile with target countries.
          </p>
        )}
      </div>

      {profile.preferredCountries && profile.preferredCountries.length > 0 && (
        <div>
          <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Your Target Countries
          </h2>
          <div className="flex flex-wrap gap-3">
            {profile.preferredCountries.map(c => (
              <a key={c} href={`/visa?country=${encodeURIComponent(c)}`}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  isDark
                    ? 'border-[#2a2a3e] text-zinc-300 hover:bg-zinc-800 hover:border-indigo-500/50'
                    : 'border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:border-indigo-400'
                }`}>
                {c} →
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add conditional rendering in page.js**

At the top of `app/page.js`, add these imports:

```javascript
import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
```

The page must be a client component (it already uses `useTheme`). Add state and profile loading at the top of the component function, before the return:

```javascript
const [profile, setProfile] = useState(null);
const [checkingProfile, setCheckingProfile] = useState(true);

useEffect(() => {
  async function check() {
    try {
      const res = await fetch('/api/user-profile');
      const data = await res.json();
      if (data.profile && data.profile.nationality) {
        setProfile(data.profile);
      }
    } catch {}
    setCheckingProfile(false);
  }
  check();
}, []);
```

Then wrap the return to show Dashboard for logged-in users with profiles:

```jsx
if (checkingProfile) return (
  <div className={`min-h-screen ${isDark ? 'bg-[#080810]' : 'bg-white'}`}>
    <Navbar />
  </div>
);

if (profile) return (
  <div className={`min-h-screen ${isDark ? 'bg-[#080810] text-zinc-100' : 'bg-white text-zinc-900'}`}>
    <Navbar />
    <Dashboard profile={profile} />
  </div>
);

return (
  // ... existing homepage JSX for anonymous users
);
```

- [ ] **Step 3: Run dev server and test**

Test:
1. Visit / while logged out → standard homepage with international hero
2. Log in with profile that has nationality → see Dashboard with "Welcome back", quick links, recent jobs, target countries
3. Log in without profile → standard homepage (no nationality in profile)

- [ ] **Step 4: Commit**

```bash
cd ~/opportumap
git add app/components/Dashboard.js app/page.js
git commit -m "feat: add personalized dashboard for logged-in users with profile"
```

---

## Task 8: Stories System — Supabase Table + API + Page

**Files:**
- Create: `app/api/stories/route.js`
- Create: `app/components/StoryCard.js`
- Create: `app/stories/page.js`

- [ ] **Step 1: Create the Supabase table**

Run this SQL in the Supabase SQL Editor (Dashboard → SQL Editor → New Query):

```sql
CREATE TABLE user_stories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  from_country text NOT NULL,
  current_country text NOT NULL,
  story_text text NOT NULL,
  rating smallint CHECK (rating >= 1 AND rating <= 5),
  approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read approved stories"
  ON user_stories FOR SELECT USING (approved = true);

CREATE POLICY "Authenticated users can insert stories"
  ON user_stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can read all stories"
  ON user_stories FOR SELECT
  USING (auth.jwt() ->> 'email' = 'aahilakbar567@gmail.com');

CREATE POLICY "Admin can update stories"
  ON user_stories FOR UPDATE
  USING (auth.jwt() ->> 'email' = 'aahilakbar567@gmail.com');
```

- [ ] **Step 2: Create the API route**

```javascript
import { createClient } from '../../../lib/supabase-server.js';
import { supabase, hasSupabase } from '../../../lib/supabase.js';

export async function GET(request) {
  if (!hasSupabase) return Response.json({ stories: [] });

  const { searchParams } = new URL(request.url);
  const all = searchParams.get('all') === 'true';

  let query = supabase.from('user_stories').select('*').order('created_at', { ascending: false });

  if (!all) {
    query = query.eq('approved', true);
  } else {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user || user.email !== 'aahilakbar567@gmail.com') {
      query = query.eq('approved', true);
    }
  }

  const { data, error } = await query.limit(50);
  return Response.json({ stories: data || [] });
}

export async function POST(request) {
  if (!hasSupabase) return Response.json({ error: 'Database unavailable' }, { status: 503 });

  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return Response.json({ error: 'Sign in to share your story' }, { status: 401 });

  const { from_country, current_country, story_text, rating } = await request.json();

  if (!from_country || !current_country || !story_text) {
    return Response.json({ error: 'All fields required' }, { status: 400 });
  }

  const { error } = await supabase.from('user_stories').insert({
    user_id: user.id,
    from_country,
    current_country,
    story_text,
    rating: rating || null,
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function PATCH(request) {
  if (!hasSupabase) return Response.json({ error: 'Database unavailable' }, { status: 503 });

  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user || user.email !== 'aahilakbar567@gmail.com') {
    return Response.json({ error: 'Not authorized' }, { status: 403 });
  }

  const { id, approved } = await request.json();
  const { error } = await supabase.from('user_stories').update({ approved }).eq('id', id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
```

- [ ] **Step 3: Create StoryCard component**

```jsx
'use client';

export default function StoryCard({ story, isDark }) {
  return (
    <div className={`rounded-xl border p-6 ${
      isDark ? 'bg-[#12121e] border-[#2a2a3e]' : 'bg-white border-zinc-200'
    }`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs px-2 py-1 rounded-full ${
          isDark ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30' : 'bg-indigo-50 text-indigo-600'
        }`}>
          {story.from_country} → {story.current_country}
        </span>
        {story.rating && (
          <span className="text-sm text-yellow-400">
            {'★'.repeat(story.rating)}{'☆'.repeat(5 - story.rating)}
          </span>
        )}
      </div>
      <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
        {story.story_text}
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Create the /stories page**

```jsx
'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import StoryCard from '../components/StoryCard';
import { useTheme } from '../hooks/useTheme';

const COUNTRIES = [
  'Afghanistan','Albania','Argentina','Australia','Bangladesh','Brazil','Canada','China','Colombia',
  'Egypt','Ethiopia','France','Germany','Ghana','India','Indonesia','Iran','Iraq','Japan','Kenya',
  'Malaysia','Mexico','Morocco','Nepal','Nigeria','Pakistan','Philippines','Poland','Russia',
  'Saudi Arabia','South Africa','South Korea','Sri Lanka','Syria','Thailand','Turkey','UAE',
  'Uganda','Ukraine','United Kingdom','United States','Vietnam',
];

export default function StoriesPage() {
  const { isDark } = useTheme();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ from_country: '', current_country: '', story_text: '', rating: 5 });

  useEffect(() => {
    fetch('/api/stories').then(r => r.json()).then(d => setStories(d.stories || [])).finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch('/api/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (res.ok) {
      setSubmitted(true);
      setShowForm(false);
    }
  }

  const inputClass = `w-full px-4 py-2.5 rounded-lg border text-sm ${
    isDark
      ? 'bg-[#0e0e18] border-[#2a2a3e] text-zinc-100 focus:border-indigo-500'
      : 'bg-white border-zinc-300 text-zinc-900 focus:border-indigo-500'
  } outline-none transition-colors`;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#080810] text-zinc-100' : 'bg-white text-zinc-900'}`}>
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 pt-28 pb-16">
        <div className="text-center mb-12">
          <h1 className={`text-4xl md:text-5xl font-bold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Stories
          </h1>
          <p className={`text-lg mb-6 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Real journeys from people who found opportunities across borders.
          </p>
          {!showForm && !submitted && (
            <button onClick={() => setShowForm(true)}
              className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors">
              Share Your Story
            </button>
          )}
        </div>

        {submitted && (
          <div className={`p-4 rounded-xl border mb-8 text-center ${
            isDark ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-green-50 border-green-200 text-green-700'
          }`}>
            Thanks for sharing! Your story will appear once approved.
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className={`rounded-xl border p-6 mb-10 ${
            isDark ? 'bg-[#12121e] border-[#2a2a3e]' : 'bg-zinc-50 border-zinc-200'
          }`}>
            <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>Share Your Story</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={`text-sm mb-1 block ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>Where are you from?</label>
                <select value={form.from_country} onChange={e => setForm(f => ({...f, from_country: e.target.value}))}
                  className={inputClass} required>
                  <option value="">Select country</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={`text-sm mb-1 block ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>Where are you now?</label>
                <select value={form.current_country} onChange={e => setForm(f => ({...f, current_country: e.target.value}))}
                  className={inputClass} required>
                  <option value="">Select country</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className={`text-sm mb-1 block ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>Your story</label>
              <textarea value={form.story_text} onChange={e => setForm(f => ({...f, story_text: e.target.value}))}
                rows={4} className={inputClass} required
                placeholder="How did you find your opportunity? What was the journey like?" />
            </div>
            <div className="mb-6">
              <label className={`text-sm mb-1 block ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>Rating</label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => setForm(f => ({...f, rating: n}))}
                    className={`text-2xl transition-colors ${n <= form.rating ? 'text-yellow-400' : isDark ? 'text-zinc-700' : 'text-zinc-300'}`}>
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={submitting}
                className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Submit Story'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className={`px-6 py-2.5 rounded-lg border font-medium transition-colors ${
                  isDark ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                }`}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className={`h-32 rounded-xl animate-pulse ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`} />
            ))}
          </div>
        ) : stories.length > 0 ? (
          <div className="space-y-4">
            {stories.map(story => (
              <StoryCard key={story.id} story={story} isDark={isDark} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className={`text-lg ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              No stories yet. Be the first to share your journey!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Run dev server and test**

Test:
1. Visit /stories → empty state with "Share Your Story" button
2. Click button → form appears with country dropdowns, textarea, star rating
3. Submit while logged in → success message, story stored (not approved yet)
4. Submit while logged out → error "Sign in to share your story"

- [ ] **Step 6: Commit**

```bash
cd ~/opportumap
git add app/api/stories/route.js app/components/StoryCard.js app/stories/page.js
git commit -m "feat: add Stories page — submit and browse success stories with admin approval"
```

---

## Task 9: Launch Polish

**Files:**
- Modify: `app/layout.js`

- [ ] **Step 1: Update OG meta tags**

In `app/layout.js`, replace the metadata export:

```javascript
export const metadata = {
  title: 'OpportuMap — Global Opportunities for Everyone',
  description: 'Find jobs, visas, and relocation intel across 100+ countries. AI-powered country matching, visa probability scoring, and career tools. Built for people from everywhere.',
  openGraph: {
    title: 'OpportuMap — Global Opportunities for Everyone',
    description: 'Find jobs you can actually get, visas you can actually land, from wherever you are.',
    url: 'https://opportumap.netlify.app',
    siteName: 'OpportuMap',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpportuMap — Global Opportunities for Everyone',
    description: 'Find jobs you can actually get, visas you can actually land, from wherever you are.',
  },
};
```

- [ ] **Step 2: Run dev server and verify OG tags**

```bash
cd ~/opportumap && npm run dev
```

Check page source at http://localhost:3000 — verify `<meta property="og:title"`, `<meta property="og:description"`, `<meta name="twitter:card"` are present in `<head>`.

- [ ] **Step 3: Mobile responsive check**

Open browser DevTools → toggle device toolbar. Check each new page at 375px width:
- Homepage: hero text readable, buttons stack vertically
- /match: cards stack single-column, scores visible
- /visa: probability meter full width, factors readable
- /stories: form inputs full width, cards readable

- [ ] **Step 4: Commit**

```bash
cd ~/opportumap
git add app/layout.js
git commit -m "feat: update OG meta tags for international positioning"
```

---

## Task 10: Final Integration Test

- [ ] **Step 1: Full flow test**

Run `cd ~/opportumap && npm run dev` and test the complete user journey:

1. Visit / as anonymous → international hero, "Find Your Country Match" CTA
2. Click nav → Jobs, Map, Visa, Relocate, Match all visible. Tools dropdown has Resume, Interview, etc.
3. Sign up / log in → ProfileModal appears (existing flow)
4. Complete profile with nationality, countries, skills
5. Return to / → Dashboard with "Welcome back", quick links, recent jobs
6. Click "Country Match" → /match loads, auto-fetches matches based on profile
7. Click "Visa Details" on a match → /visa with that country, probability meter loads
8. Visit /stories → empty state, submit form works
9. All pages work on mobile viewport

- [ ] **Step 2: Build check**

```bash
cd ~/opportumap && npm run build
```

Expected: Build succeeds with no errors. Fix any issues.

- [ ] **Step 3: Final commit if any fixes needed**

```bash
cd ~/opportumap
git add -A
git commit -m "fix: address integration test issues"
```
