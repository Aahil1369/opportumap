# OpportuMap International Relaunch — Design Spec

**Date:** 2026-04-16
**Goal:** Reposition OpportuMap as the global opportunity platform for international job seekers, ship launch-ready in 2 weeks, then grow users + add technical depth over following months.

---

## Strategic Context

OpportuMap currently has ~20 features and 0 users. For college applications (top-10 CS schools), the strongest signal is: focused product + real users + technical depth + personal story.

**The wedge:** "Global opportunities for people from everywhere else." International students, immigrants, people in developing countries seeking jobs abroad. Authentic to the founder's Pakistan → Uganda → US journey.

**What changes:** Homepage, tagline, nav hierarchy, and onboarding all lead with this wedge. Existing tools (resume, interview, cover letter, startups, community) stay in the codebase but move behind a "Tools" submenu — they're member perks, not the front door.

---

## 2-Week Sprint Scope

### Week 1: Reposition + Core Features

#### 1. Homepage Rewrite
- **Hero:** "Find opportunities you can actually access, from wherever you are"
- **Subtext:** Brief line about the founder's journey (Pakistan → Uganda → US) as social proof of mission
- **Feature cards:** Rewritten to lead with international angle (visa intel, country matching, global jobs, relocation)
- **Nav reorder:** Primary: Jobs | Map | Visa | Relocate. Secondary (Tools dropdown): Resume | Interview | Cover Letter. Existing: Startups | Community | Messages stay in nav but lower priority
- **CTA:** "Get Started — Tell us where you're from" → links to onboarding

#### 2. Smart Onboarding Flow
- **Trigger:** After signup (or prompted from homepage CTA for anonymous users)
- **3 steps:**
  - Step 1: Nationality / passport country (dropdown with flags)
  - Step 2: Current location + up to 3 target countries/regions
  - Step 3: Skills (tags) + experience level (Student / Entry / Mid / Senior)
- **Storage:** Supabase `user_profiles.profile_data` jsonb (extends existing schema)
- **Usage:** Powers Country Match, Visa Probability, personalized job feed, "New For You" dashboard
- **Skippable:** Users can skip but get prompted again on /match or /visa

#### 3. Country Match Recommender (`/match`)
- **New page**
- **Input:** User's onboarding profile (nationality, skills, experience, target regions)
- **Output:** Top 5 recommended countries, each with:
  - Match score (1-100)
  - Job availability indicator (based on Adzuna data for that country)
  - Visa difficulty rating (Easy / Moderate / Hard / Very Hard)
  - Estimated cost of living range
  - Language barrier indicator
  - Diaspora/expat community size
- **Each result** links to `/visa?country=X` and `/relocate?country=X`
- **Implementation:** Groq API (llama-3.3-70b-versatile) with structured JSON output, using the user's profile + knowledge of visa policies. Later replaceable with real ML model.
- **Cache:** 24hr per user profile hash

### Week 2: Smart Features + Launch Prep

#### 4. Visa Probability Score (enhance `/visa`)
- **Addition to existing visa page**, not a replacement
- After user enters nationality + destination:
  - Probability meter: Low / Medium / High / Very High (with percentage range)
  - Key factors list: "Your nationality has visa-free access to X" / "Requires employer sponsorship" / "Student visa pathway available"
  - Specific actionable next steps
- **Implementation:** Groq-powered with structured output. Draws on nationality + destination + user's skills/experience from onboarding profile.
- **Display:** Visual meter/gauge above the existing visa report

#### 5. "New For You" Dashboard (conditional homepage for logged-in users)
- **For logged-in users with completed onboarding:**
  - New job matches since last visit (filtered by target countries + skills)
  - Visa policy updates for target countries (AI-generated summaries)
  - Quick links to their saved jobs, match results, recent visa lookups
- **For anonymous / no-profile users:** Standard homepage
- **Implementation:** Server component, queries jobs API with user's profile filters, shows delta since `user_profiles.updated_at`

#### 6. Share Your Story
- **Standalone `/stories` page**
- Fields: Name (optional), from country, current country, how OpportuMap helped (textarea), rating (1-5 stars)
- **Storage:** New Supabase table `user_stories` (id, user_id nullable, from_country, current_country, story_text, rating, approved boolean, created_at)
- **Display:** Approved stories shown on homepage as testimonials section
- **Moderation:** `approved` defaults to false, admin can approve via `/admin`

#### 7. Launch Polish
- **OG meta tags:** Title, description, image for social sharing (og:title, og:description, og:image)
- **Mobile responsive audit:** Test all new features on mobile viewport
- **Loading states:** Skeleton loaders for Country Match, Visa Probability, Dashboard
- **Error handling:** Graceful fallbacks when Groq is down or rate-limited
- **Community launch posts:** Draft 3 posts for r/csMajors, r/developersIndia, and one international student Discord

---

## What We Are NOT Building

- Email infrastructure (notifications, digests) — too complex for 2 weeks
- Real ML model — needs user data first; Groq serves as intelligent proxy until then
- Mobile app — responsive web is sufficient
- New AI tools — existing resume/interview/cover-letter tools are adequate
- Payment/monetization — premature at 0 users

---

## Technical Notes

- **Stack:** Next.js (App Router), Supabase, Groq, Mapbox, Tailwind — no new dependencies needed
- **New Supabase table:** `user_stories` (schema above)
- **Extended:** `user_profiles.profile_data` jsonb gains: `nationality`, `current_country`, `target_countries[]`, `skills[]`, `experience_level`
- **New pages:** `/match`, `/stories`. Homepage becomes conditional (standard for anon, dashboard for logged-in users with profile)
- **New API routes:** `/api/country-match`, `/api/visa-probability`, `/api/stories`
- **Nav changes:** Restructure Navbar.js — primary links + Tools dropdown

---

## Post-Launch Roadmap (after 2 weeks)

1. **Distribution grind** (ongoing): Reddit, Discord, Ismaili networks, international student orgs
2. **Real ML model** (June-July): Train salary prediction + visa difficulty on 33k jobs + user data using scikit-learn/XGBoost
3. **Research writeup** (August): "What 33k Job Listings Reveal About Global Opportunity Inequality"
4. **Testimonials + coverage** (August-September): Collect stories, pitch school paper, local news
5. **Target:** 500-1000 users by October, working ML model, publishable writeup — all before early action deadlines

---

## Success Metrics (2-week sprint)

- [ ] Homepage clearly communicates international wedge on first visit
- [ ] New user can complete onboarding in under 60 seconds
- [ ] Country Match returns useful, differentiated results for 3 test profiles (Nigerian student, Indian developer, Pakistani grad)
- [ ] Visa Probability adds clear value over plain visa report
- [ ] Dashboard shows personalized content for returning users
- [ ] OG tags render correctly when shared on Discord/Reddit
- [ ] All features work on mobile
