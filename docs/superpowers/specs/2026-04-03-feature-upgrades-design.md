# OpportuMap Feature Upgrades — Design Spec
**Date:** 2026-04-03

## Overview
Five upgrades to make OpportuMap competitive against EasyJob.ai and similar tools:
1. Resume Analyzer — harsher, honest, actionable grading
2. Visa Intelligence — deeper data
3. Relocation Guide — deeper data
4. Cover Letter Generator (new page)
5. Interview Prep (new page)

---

## 1. Resume Analyzer — Honest + Brutal + Actionable

**Files changed:** `app/api/resume-grade/route.js`

**Scoring recalibration:**
- Average resume: 35–55 (not 65–75)
- 70+ requires genuinely strong resume
- 90+ is exceptional

**Tone:** Senior recruiter reviewing 200 resumes. Cuts through buzzwords ("team player", "passionate", "results-driven" with no numbers). Penalizes vague bullets hard. Still pairs every criticism with a concrete fix.

**New JSON fields added to response:**
- `redFlags`: array of things that would cause auto-rejection (ATS killers, formatting, unexplained gaps)
- `rewrittenBullets`: array of `{original, rewritten}` — picks 2–3 weak bullets and rewrites them
- `clichesFound`: array of overused phrases detected

**UI:** No changes needed — existing fields display fine. New fields rendered in new cards below existing sections.

---

## 2. Visa Intelligence — More Depth

**Files changed:** `app/api/visa-intel/route.js`, `app/visa/page.js`

**New JSON fields added to prompt:**
- `documentChecklist`: exact docs with format requirements
- `financialRequirements`: minimum bank balance, proof format
- `embassyContacts`: nearest embassy/consulate info
- `recentPolicyChanges`: notable changes post-2023
- `languageRequirements`: test scores if applicable
- `interviewTips`: if consulate interview required
- `timeline`: when to start applying relative to travel date
- `successRateFactors`: what actually determines approval

**UI:** New collapsible sections added to `app/visa/page.js` for each new field.

---

## 3. Relocation Guide — More Depth

**Files changed:** `app/api/relocation/route.js`, `app/relocate/page.js`

**New JSON fields added to prompt:**
- `safetyInfo`: crime index, safe vs avoid areas, night safety
- `climate`: seasons, best time to arrive
- `workCulture`: hours, formality, expat treatment
- `bankingSetup`: how to open account as foreigner, best expat banks
- `simAndInternet`: best providers, cost, how to get on arrival
- `emergencyNumbers`: police, ambulance, fire
- `culturalTips`: do's and don'ts, local etiquette
- `visaPathSummary`: brief note linking user to /visa for full details

**UI:** New sections rendered in `app/relocate/page.js`.

---

## 4. Cover Letter Generator

**New files:**
- `app/cover-letter/page.js`
- `app/api/cover-letter/route.js`

**Inputs:**
- Job description (textarea, required)
- Resume PDF upload (optional)
- Auto-loads profile from Supabase or localStorage if logged in
- Tone selector: Professional / Enthusiastic / Concise

**AI output (Groq llama-3.3-70b-versatile):**
Full cover letter with 4 paragraphs:
1. Hook opener tailored to role
2. Why this company
3. Experience match with specific examples from resume/profile
4. Strong closing

**UI features:**
- Rendered letter in styled card
- Copy to clipboard button
- Download as .txt button
- Regenerate button (same inputs, new generation)

**API route:** POST `/api/cover-letter` — accepts `{ jobDescription, resumeText?, profile?, tone }`

---

## 5. Interview Prep

**New files:**
- `app/interview/page.js`
- `app/api/interview/route.js`

**Inputs:**
- Job title (required)
- Company name (required)
- Job description (optional textarea)

**Two tabs:**

**Tab 1 — Question Bank:**
- AI generates 15 questions: 5 behavioral (STAR tips), 5 role-specific technical, 5 culture/company fit
- Each question shows: the question, how-to-answer tip, example strong answer (collapsed by default)

**Tab 2 — Mock Interview:**
- Presents one question at a time
- User types answer in textarea
- AI scores answer 1–10, gives specific feedback, shows a stronger version
- Progress bar across all 15 questions
- Summary at end: overall score, strongest answers, biggest improvement areas

**API routes:**
- POST `/api/interview` — generates question bank: `{ jobTitle, company, jobDescription? }`
- POST `/api/interview/feedback` — grades one answer: `{ question, answer, jobTitle }`

---

## Navbar

Add "Cover Letter" and "Interview Prep" to the Tools dropdown in `app/components/Navbar.js`.

---

## Deployment
- Push to GitHub → Netlify auto-deploys
- No new Supabase tables needed (cover letter and interview data not persisted)
