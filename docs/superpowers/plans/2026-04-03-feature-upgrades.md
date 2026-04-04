# OpportuMap Feature Upgrades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Cover Letter Generator and Interview Prep pages, harden the Resume Analyzer, and deepen Visa Intelligence and Relocation Guide with more data.

**Architecture:** All AI calls go through Groq (`llama-3.3-70b-versatile`) via existing API route pattern. New pages follow the existing Next.js App Router pattern with `'use client'` pages, `useTheme` hook, and Navbar. No new Supabase tables needed.

**Tech Stack:** Next.js 16 App Router, Groq SDK, Tailwind CSS 4, Supabase (existing), `pdf-parse` (existing)

---

## File Map

| Action | File |
|---|---|
| Modify | `app/api/resume-grade/route.js` |
| Modify | `app/resume/page.js` |
| Modify | `app/api/visa-intel/route.js` |
| Modify | `app/visa/page.js` |
| Modify | `app/api/relocation/route.js` |
| Modify | `app/relocate/page.js` |
| Modify | `app/components/Navbar.js` |
| Create | `app/api/cover-letter/route.js` |
| Create | `app/cover-letter/page.js` |
| Create | `app/api/interview/route.js` |
| Create | `app/api/interview/feedback/route.js` |
| Create | `app/interview/page.js` |

---

## Task 1: Harden Resume Analyzer Prompt + Add New Fields

**Files:**
- Modify: `app/api/resume-grade/route.js`

- [ ] **Step 1: Replace the prompt in `app/api/resume-grade/route.js`**

Replace the entire `content` string inside the `messages` array with:

```js
content: `You are a brutally honest senior recruiter who has reviewed over 10,000 resumes. You do not sugarcoat. You do not inflate scores to make people feel good. Your job is to tell the truth so candidates actually improve.

SCORING CALIBRATION:
- Average resume: 35-55. Do NOT score average resumes above 55.
- Good resume: 56-70.
- Strong resume: 71-85. Rare. Must have quantified impact, clean formatting, strong keywords.
- Exceptional: 86-100. Almost never seen. Top 1% of candidates only.
- If a resume has vague bullets, buzzwords without evidence, or no quantified achievements, it CANNOT score above 55.

TONE: Direct, cold, professional. Like a recruiter's internal notes. No cheerleading. Every weakness gets a concrete fix.

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "score": <integer 1-100, calibrated as above>,
  "grade": "<A+|A|A-|B+|B|B-|C+|C|C-|D|F>",
  "summary": "<2-3 sentences. Honest assessment. What a recruiter would actually think when they see this.>",
  "sectionScores": {
    "formatting": <1-100>,
    "experience": <1-100>,
    "skills": <1-100>,
    "education": <1-100>,
    "impact": <1-100>,
    "ats_compatibility": <1-100>
  },
  "strengths": ["<specific, genuine strength — only include if it actually exists>"],
  "improvements": [
    {"issue": "<specific problem, be blunt>", "fix": "<concrete actionable fix with example if possible>", "priority": "high|medium|low"}
  ],
  "redFlags": ["<thing that would cause immediate rejection: ATS failure, unexplained gap, red-flag formatting, lying indicators, etc.>"],
  "clichesFound": ["<overused buzzword found: e.g. 'team player', 'passionate', 'results-driven' with no numbers>"],
  "rewrittenBullets": [
    {"original": "<weak bullet copied verbatim from resume>", "rewritten": "<strong version with action verb + metric + impact>"}
  ],
  "jobMatches": [
    {"title": "<job title>", "matchScore": <1-100>, "reason": "<why this person qualifies or doesn't>"}
  ],
  "keywords_missing": ["<ATS keyword missing from resume>"],
  "name": "<candidate's name if visible, else null>"
}
Provide at least 3 strengths (only if genuine), 5 improvements, 3 red flags (or state none if truly clean), 3 rewritten bullets, and 8 job matches. Be specific, not generic. If the resume has no quantified achievements, say so directly.

RESUME TEXT:
${resumeText.slice(0, 6000)}`,
```

- [ ] **Step 2: Verify the route file looks correct**

```bash
head -60 ~/opportumap/app/api/resume-grade/route.js
```

- [ ] **Step 3: Commit**

```bash
cd ~/opportumap
git add app/api/resume-grade/route.js
git commit -m "feat: harden resume grader — honest scoring, red flags, rewrites, clichés"
```

---

## Task 2: Render New Resume Fields in UI

**Files:**
- Modify: `app/resume/page.js`

- [ ] **Step 1: Read the current bottom of the results section in `app/resume/page.js`**

Find where `improvements` and `jobMatches` are rendered (around line 160–280) to know where to insert new cards.

- [ ] **Step 2: Add Red Flags card after the improvements section**

Find the improvements rendering block (look for `result.improvements?.map`) and add the following card directly after it:

```jsx
{/* Red Flags */}
{result.redFlags?.length > 0 && (
  <div className={`rounded-2xl border p-5 ${ui.card} border-red-500/20`}>
    <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 text-red-400`}>
      🚨 Red Flags — Fix These First
    </h3>
    <ul className="space-y-2">
      {result.redFlags.map((flag, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-red-400 text-xs flex-shrink-0 mt-0.5">✗</span>
          <span className={`text-xs leading-relaxed ${ui.sub}`}>{flag}</span>
        </li>
      ))}
    </ul>
  </div>
)}

{/* Clichés Found */}
{result.clichesFound?.length > 0 && (
  <div className={`rounded-2xl border p-5 ${ui.card} border-amber-500/20`}>
    <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 text-amber-400`}>
      ⚠️ Buzzwords & Clichés Detected
    </h3>
    <p className={`text-xs mb-3 ${ui.sub}`}>These phrases are meaningless to recruiters. Replace them with specific achievements and numbers.</p>
    <div className="flex flex-wrap gap-2">
      {result.clichesFound.map((c, i) => (
        <span key={i} className="text-xs px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 line-through">{c}</span>
      ))}
    </div>
  </div>
)}

{/* Rewritten Bullets */}
{result.rewrittenBullets?.length > 0 && (
  <div className={`rounded-2xl border p-5 ${ui.card}`}>
    <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${ui.text}`}>
      ✏️ Bullet Point Rewrites
    </h3>
    <p className={`text-xs mb-4 ${ui.sub}`}>Here's how to rewrite your weakest bullets to actually land interviews.</p>
    <div className="space-y-4">
      {result.rewrittenBullets.map((b, i) => (
        <div key={i} className={`rounded-xl p-4 border ${dark ? 'border-[#1e1e2e] bg-[#0a0a14]' : 'border-zinc-100 bg-zinc-50'}`}>
          <div className="mb-2">
            <span className="text-xs font-semibold text-red-400 block mb-1">Before</span>
            <p className={`text-xs ${ui.sub} line-through`}>{b.original}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-green-400 block mb-1">After</span>
            <p className={`text-xs ${ui.text}`}>{b.rewritten}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
cd ~/opportumap
git add app/resume/page.js
git commit -m "feat: render red flags, clichés, and bullet rewrites in resume analyzer UI"
```

---

## Task 3: Deepen Visa Intelligence Prompt

**Files:**
- Modify: `app/api/visa-intel/route.js`

- [ ] **Step 1: Add new fields to the JSON schema in the prompt**

In `app/api/visa-intel/route.js`, find the closing of the existing JSON schema (after `"officialWebsite"`) and add these fields before the closing `}`:

```js
  "documentChecklist": [
    {"document": "<exact document name>", "format": "<original|certified copy|notarized|apostille|translated>", "notes": "<any important note>"}
  ],
  "financialRequirements": {
    "minimumBankBalance": "<amount in USD if applicable, else null>",
    "proofFormat": "<bank statement, sponsorship letter, etc.>",
    "notes": "<any nuance>"
  },
  "embassyContacts": [
    {"country": "<where this embassy is located>", "address": "<address if known>", "phone": "<phone if known>", "website": "<URL>"}
  ],
  "recentPolicyChanges": ["<notable change post-2023 if any>"],
  "languageRequirements": {
    "required": <true|false>,
    "tests": ["<e.g. IELTS 6.0, DELF B1>"],
    "notes": "<explanation>"
  },
  "interviewTips": ["<tip for consulate interview if required — null array if no interview needed>"],
  "timeline": {
    "applyHowFarInAdvance": "<e.g. 3 months before travel date>",
    "typicalApprovalTime": "<e.g. 2-4 weeks>",
    "urgentOptionAvailable": <true|false>
  },
  "successRateFactors": ["<what actually determines approval — be specific>"]
```

Also update the instruction at the bottom to say:
```
Include at least 3 visa types, 5 application steps, 5 guarantee tips, 3 rejection reasons, a full document checklist, and timeline info.
```

- [ ] **Step 2: Commit**

```bash
cd ~/opportumap
git add app/api/visa-intel/route.js
git commit -m "feat: deepen visa intelligence with documents, embassy, timeline, interview tips"
```

---

## Task 4: Render New Visa Fields in UI

**Files:**
- Modify: `app/visa/page.js`

- [ ] **Step 1: Add new sections after the existing "Path to Residency" card**

Find the `pathToResidency` section in `app/visa/page.js` (around line 318) and add these new cards after it and before the disclaimer:

```jsx
{/* Document Checklist */}
{result.documentChecklist?.length > 0 && (
  <div className={`rounded-2xl border p-5 ${ui.card}`}>
    <h3 className={`text-sm font-bold mb-4 ${ui.text}`}>📋 Document Checklist</h3>
    <div className="space-y-2">
      {result.documentChecklist.map((doc, i) => (
        <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${dark ? 'bg-[#0a0a14]' : 'bg-zinc-50'}`}>
          <input type="checkbox" className="mt-0.5 flex-shrink-0" />
          <div>
            <p className={`text-xs font-semibold ${ui.text}`}>{doc.document}</p>
            <p className={`text-xs mt-0.5 ${ui.sub}`}>Format: <span className="text-indigo-400">{doc.format}</span>{doc.notes ? ` · ${doc.notes}` : ''}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
)}

{/* Timeline + Financial */}
<div className="grid sm:grid-cols-2 gap-5">
  {result.timeline && (
    <div className={`rounded-2xl border p-5 ${ui.card}`}>
      <h3 className={`text-sm font-bold mb-3 ${ui.text}`}>⏱ Application Timeline</h3>
      <div className="space-y-2">
        <div className={`flex justify-between text-xs ${ui.sub}`}>
          <span>Apply how far in advance</span>
          <span className={`font-semibold ${ui.text}`}>{result.timeline.applyHowFarInAdvance}</span>
        </div>
        <div className={`flex justify-between text-xs ${ui.sub}`}>
          <span>Typical approval time</span>
          <span className={`font-semibold ${ui.text}`}>{result.timeline.typicalApprovalTime}</span>
        </div>
        <div className={`flex justify-between text-xs ${ui.sub}`}>
          <span>Urgent processing</span>
          <span className={result.timeline.urgentOptionAvailable ? 'text-green-400 font-semibold text-xs' : 'text-red-400 font-semibold text-xs'}>
            {result.timeline.urgentOptionAvailable ? 'Available' : 'Not available'}
          </span>
        </div>
      </div>
    </div>
  )}
  {result.financialRequirements && (
    <div className={`rounded-2xl border p-5 ${ui.card}`}>
      <h3 className={`text-sm font-bold mb-3 ${ui.text}`}>💰 Financial Requirements</h3>
      {result.financialRequirements.minimumBankBalance && (
        <p className={`text-xs mb-2 ${ui.sub}`}>Min bank balance: <span className={`font-semibold ${ui.text}`}>{result.financialRequirements.minimumBankBalance}</span></p>
      )}
      {result.financialRequirements.proofFormat && (
        <p className={`text-xs mb-2 ${ui.sub}`}>Proof required: <span className="text-indigo-400">{result.financialRequirements.proofFormat}</span></p>
      )}
      {result.financialRequirements.notes && (
        <p className={`text-xs ${ui.sub}`}>{result.financialRequirements.notes}</p>
      )}
    </div>
  )}
</div>

{/* Language Requirements */}
{result.languageRequirements?.required && (
  <div className={`rounded-2xl border p-5 ${ui.card}`}>
    <h3 className={`text-sm font-bold mb-3 ${ui.text}`}>🗣 Language Requirements</h3>
    {result.languageRequirements.tests?.length > 0 && (
      <div className="flex flex-wrap gap-2 mb-2">
        {result.languageRequirements.tests.map((t, i) => (
          <span key={i} className={`text-xs px-2 py-1 rounded-full ${dark ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'}`}>{t}</span>
        ))}
      </div>
    )}
    {result.languageRequirements.notes && <p className={`text-xs ${ui.sub}`}>{result.languageRequirements.notes}</p>}
  </div>
)}

{/* Interview Tips */}
{result.interviewTips?.length > 0 && (
  <div className={`rounded-2xl border p-5 ${ui.card}`}>
    <h3 className={`text-sm font-bold mb-3 ${ui.text}`}>🎤 Consulate Interview Tips</h3>
    <ul className="space-y-2">
      {result.interviewTips.map((tip, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-indigo-400 text-xs flex-shrink-0 mt-0.5">→</span>
          <span className={`text-xs leading-relaxed ${ui.sub}`}>{tip}</span>
        </li>
      ))}
    </ul>
  </div>
)}

{/* Success Rate Factors */}
{result.successRateFactors?.length > 0 && (
  <div className={`rounded-2xl border p-5 ${ui.card}`}>
    <h3 className={`text-sm font-bold mb-3 ${ui.text}`}>🎯 What Actually Gets You Approved</h3>
    <ul className="space-y-2">
      {result.successRateFactors.map((f, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-green-400 text-xs flex-shrink-0 mt-0.5">✓</span>
          <span className={`text-xs leading-relaxed ${ui.sub}`}>{f}</span>
        </li>
      ))}
    </ul>
  </div>
)}

{/* Recent Policy Changes */}
{result.recentPolicyChanges?.length > 0 && (
  <div className={`rounded-2xl border p-5 ${dark ? 'border-blue-500/20 bg-blue-500/5' : 'border-blue-200 bg-blue-50'} ${ui.card}`}>
    <h3 className={`text-sm font-bold mb-3 text-blue-400`}>🔔 Recent Policy Changes</h3>
    <ul className="space-y-1.5">
      {result.recentPolicyChanges.map((c, i) => (
        <li key={i} className={`text-xs flex gap-1.5 ${ui.sub}`}><span className="text-blue-400 flex-shrink-0">•</span>{c}</li>
      ))}
    </ul>
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
cd ~/opportumap
git add app/visa/page.js
git commit -m "feat: render document checklist, timeline, financial reqs, interview tips in visa UI"
```

---

## Task 5: Deepen Relocation Guide Prompt

**Files:**
- Modify: `app/api/relocation/route.js`

- [ ] **Step 1: Add new fields to the JSON schema in the relocation prompt**

Find the closing of the existing JSON schema (after `"healthcareInfo"`) and add before the closing `}`:

```js
  "safetyInfo": {
    "crimeIndex": "<low|medium|high|very high>",
    "safeAreas": ["<safe neighborhood or area>"],
    "areasToAvoid": ["<area to avoid, especially at night>"],
    "nightSafety": "<brief note on safety after dark>"
  },
  "climate": {
    "overview": "<brief description of climate>",
    "bestTimeToArrive": "<month or season and why>",
    "whatToPack": ["<item to bring>"]
  },
  "workCulture": {
    "typicalHours": "<e.g. 9-5 strict, or flexible>",
    "formality": "<casual|business casual|formal>",
    "expatTreatment": "<how locals treat expat professionals>",
    "tips": ["<work culture tip>"]
  },
  "bankingSetup": {
    "howToOpen": "<steps to open account as foreigner>",
    "bestBanksForExpats": ["<bank name>"],
    "alternativeApps": ["<e.g. Wise, Revolut, N26>"],
    "notes": "<any gotchas>"
  },
  "simAndInternet": {
    "bestProviders": ["<provider name>"],
    "avgMonthlyCost": "<USD>",
    "howToGetOnArrival": "<where to buy SIM — airport, store, etc.>",
    "internetSpeed": "<avg download speed>"
  },
  "emergencyNumbers": {
    "police": "<number>",
    "ambulance": "<number>",
    "fire": "<number>",
    "generalEmergency": "<single emergency number if exists>"
  },
  "culturalTips": {
    "dos": ["<do this>"],
    "donts": ["<avoid this>"],
    "etiquette": "<brief note on local etiquette>"
  },
  "visaPathSummary": "<1-2 sentences on what visa most expats use to live/work here — point them to check visa intelligence for details>"
```

Also update the instruction at the bottom to say:
```
Include at least 4 neighborhoods, 3 expat communities, 5 before-you-move actions, full safety info, climate overview, banking setup, emergency numbers, and cultural tips.
```

- [ ] **Step 2: Commit**

```bash
cd ~/opportumap
git add app/api/relocation/route.js
git commit -m "feat: deepen relocation guide — safety, climate, banking, SIM, emergency numbers, culture"
```

---

## Task 6: Render New Relocation Fields in UI

**Files:**
- Modify: `app/relocate/page.js`

- [ ] **Step 1: Add Safety Info card after the neighborhoods section**

Find the neighborhoods section (around line 314) and add these cards after `result.neighborhoods` and before `result.beforeYouMove`:

```jsx
{/* Safety Info */}
{result.safetyInfo && (
  <div className={`rounded-2xl border p-5 ${ui.card}`}>
    <h3 className={`text-sm font-bold mb-4 ${ui.text}`}>🛡 Safety Overview</h3>
    <div className="flex items-center gap-3 mb-4">
      <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
        result.safetyInfo.crimeIndex === 'low' ? 'text-green-400 border-green-500/30 bg-green-500/10' :
        result.safetyInfo.crimeIndex === 'medium' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
        'text-red-400 border-red-500/30 bg-red-500/10'
      }`}>
        {result.safetyInfo.crimeIndex?.toUpperCase()} CRIME
      </span>
      {result.safetyInfo.nightSafety && <p className={`text-xs ${ui.sub}`}>{result.safetyInfo.nightSafety}</p>}
    </div>
    <div className="grid sm:grid-cols-2 gap-4">
      {result.safetyInfo.safeAreas?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-green-400 mb-2">Safe Areas</p>
          {result.safetyInfo.safeAreas.map((a, i) => <p key={i} className={`text-xs flex gap-1.5 mb-1 ${ui.sub}`}><span className="text-green-400">✓</span>{a}</p>)}
        </div>
      )}
      {result.safetyInfo.areasToAvoid?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-red-400 mb-2">Areas to Avoid</p>
          {result.safetyInfo.areasToAvoid.map((a, i) => <p key={i} className={`text-xs flex gap-1.5 mb-1 ${ui.sub}`}><span className="text-red-400">✗</span>{a}</p>)}
        </div>
      )}
    </div>
  </div>
)}

{/* Climate */}
{result.climate && (
  <div className={`rounded-2xl border p-5 ${ui.card}`}>
    <h3 className={`text-sm font-bold mb-3 ${ui.text}`}>🌤 Climate & Weather</h3>
    {result.climate.overview && <p className={`text-xs leading-relaxed mb-3 ${ui.sub}`}>{result.climate.overview}</p>}
    {result.climate.bestTimeToArrive && (
      <p className={`text-xs mb-3 ${ui.sub}`}>Best time to arrive: <span className={`font-semibold ${ui.text}`}>{result.climate.bestTimeToArrive}</span></p>
    )}
    {result.climate.whatToPack?.length > 0 && (
      <div className="flex flex-wrap gap-2">
        {result.climate.whatToPack.map((item, i) => (
          <span key={i} className={`text-xs px-2 py-1 rounded-full ${dark ? 'bg-[#1a1a2e] text-zinc-400' : 'bg-zinc-100 text-zinc-600'}`}>{item}</span>
        ))}
      </div>
    )}
  </div>
)}

{/* Work Culture */}
{result.workCulture && (
  <div className={`rounded-2xl border p-5 ${ui.card}`}>
    <h3 className={`text-sm font-bold mb-3 ${ui.text}`}>💼 Work Culture</h3>
    <div className="grid sm:grid-cols-3 gap-3 mb-3">
      {result.workCulture.typicalHours && (
        <div className={`p-3 rounded-xl ${dark ? 'bg-[#0a0a14]' : 'bg-zinc-50'}`}>
          <p className={`text-xs ${ui.sub} mb-1`}>Hours</p>
          <p className={`text-xs font-semibold ${ui.text}`}>{result.workCulture.typicalHours}</p>
        </div>
      )}
      {result.workCulture.formality && (
        <div className={`p-3 rounded-xl ${dark ? 'bg-[#0a0a14]' : 'bg-zinc-50'}`}>
          <p className={`text-xs ${ui.sub} mb-1`}>Dress Code</p>
          <p className={`text-xs font-semibold ${ui.text} capitalize`}>{result.workCulture.formality}</p>
        </div>
      )}
    </div>
    {result.workCulture.expatTreatment && <p className={`text-xs mb-3 ${ui.sub}`}>{result.workCulture.expatTreatment}</p>}
    {result.workCulture.tips?.map((t, i) => (
      <p key={i} className={`text-xs flex gap-1.5 mb-1 ${ui.sub}`}><span className="text-indigo-400">→</span>{t}</p>
    ))}
  </div>
)}
```

- [ ] **Step 2: Add Banking, SIM, Emergency Numbers, Cultural Tips, and Visa Path cards**

Add these after the existing `firstMonthTips` / `taxInfo` / `healthcareInfo` section (before the expat communities section):

```jsx
{/* Banking + SIM side by side */}
<div className="grid sm:grid-cols-2 gap-5">
  {result.bankingSetup && (
    <div className={`rounded-2xl border p-5 ${ui.card}`}>
      <h3 className={`text-sm font-bold mb-3 ${ui.text}`}>🏦 Banking for Expats</h3>
      {result.bankingSetup.howToOpen && <p className={`text-xs mb-3 ${ui.sub}`}>{result.bankingSetup.howToOpen}</p>}
      {result.bankingSetup.bestBanksForExpats?.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-indigo-400 mb-1">Recommended Banks</p>
          <div className="flex flex-wrap gap-1.5">
            {result.bankingSetup.bestBanksForExpats.map((b, i) => (
              <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${dark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>{b}</span>
            ))}
          </div>
        </div>
      )}
      {result.bankingSetup.alternativeApps?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-green-400 mb-1">Digital Alternatives</p>
          <div className="flex flex-wrap gap-1.5">
            {result.bankingSetup.alternativeApps.map((a, i) => (
              <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${dark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'}`}>{a}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )}
  {result.simAndInternet && (
    <div className={`rounded-2xl border p-5 ${ui.card}`}>
      <h3 className={`text-sm font-bold mb-3 ${ui.text}`}>📱 SIM & Internet</h3>
      {result.simAndInternet.howToGetOnArrival && <p className={`text-xs mb-2 ${ui.sub}`}>{result.simAndInternet.howToGetOnArrival}</p>}
      {result.simAndInternet.avgMonthlyCost && (
        <p className={`text-xs mb-2 ${ui.sub}`}>Avg monthly cost: <span className={`font-semibold ${ui.text}`}>{result.simAndInternet.avgMonthlyCost}</span></p>
      )}
      {result.simAndInternet.internetSpeed && (
        <p className={`text-xs mb-2 ${ui.sub}`}>Avg speed: <span className={`font-semibold ${ui.text}`}>{result.simAndInternet.internetSpeed}</span></p>
      )}
      {result.simAndInternet.bestProviders?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {result.simAndInternet.bestProviders.map((p, i) => (
            <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${dark ? 'bg-[#1a1a2e] text-zinc-400' : 'bg-zinc-100 text-zinc-600'}`}>{p}</span>
          ))}
        </div>
      )}
    </div>
  )}
</div>

{/* Emergency Numbers */}
{result.emergencyNumbers && (
  <div className={`rounded-2xl border p-5 ${dark ? 'border-red-500/20 bg-red-500/5' : 'border-red-200 bg-red-50'}`}>
    <h3 className={`text-sm font-bold mb-3 text-red-400`}>🆘 Emergency Numbers</h3>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        ['Police', result.emergencyNumbers.police, '🚔'],
        ['Ambulance', result.emergencyNumbers.ambulance, '🚑'],
        ['Fire', result.emergencyNumbers.fire, '🚒'],
        ['General', result.emergencyNumbers.generalEmergency, '📞'],
      ].filter(([,num]) => num).map(([label, num, icon]) => (
        <div key={label} className={`text-center p-3 rounded-xl ${dark ? 'bg-[#0a0a14]' : 'bg-white'}`}>
          <p className="text-lg mb-1">{icon}</p>
          <p className={`text-sm font-black ${ui.text}`}>{num}</p>
          <p className={`text-xs ${ui.sub}`}>{label}</p>
        </div>
      ))}
    </div>
  </div>
)}

{/* Cultural Tips */}
{result.culturalTips && (
  <div className={`rounded-2xl border p-5 ${ui.card}`}>
    <h3 className={`text-sm font-bold mb-4 ${ui.text}`}>🤝 Cultural Tips & Etiquette</h3>
    {result.culturalTips.etiquette && <p className={`text-xs mb-4 ${ui.sub}`}>{result.culturalTips.etiquette}</p>}
    <div className="grid sm:grid-cols-2 gap-4">
      {result.culturalTips.dos?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-green-400 mb-2">Do</p>
          {result.culturalTips.dos.map((d, i) => <p key={i} className={`text-xs flex gap-1.5 mb-1.5 ${ui.sub}`}><span className="text-green-400 flex-shrink-0">✓</span>{d}</p>)}
        </div>
      )}
      {result.culturalTips.donts?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-red-400 mb-2">Don't</p>
          {result.culturalTips.donts.map((d, i) => <p key={i} className={`text-xs flex gap-1.5 mb-1.5 ${ui.sub}`}><span className="text-red-400 flex-shrink-0">✗</span>{d}</p>)}
        </div>
      )}
    </div>
  </div>
)}

{/* Visa Path Summary */}
{result.visaPathSummary && (
  <div className={`rounded-2xl border p-5 ${dark ? 'border-indigo-500/20 bg-indigo-500/5' : 'border-indigo-200 bg-indigo-50'}`}>
    <h3 className={`text-sm font-bold mb-2 text-indigo-400`}>🛂 Visa Path for This Destination</h3>
    <p className={`text-xs leading-relaxed ${ui.sub}`}>{result.visaPathSummary}</p>
    <a href="/visa" className="inline-block mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
      Get full visa intelligence →
    </a>
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
cd ~/opportumap
git add app/relocate/page.js
git commit -m "feat: render safety, climate, work culture, banking, SIM, emergency, cultural tips in relocation UI"
```

---

## Task 7: Create Cover Letter API Route

**Files:**
- Create: `app/api/cover-letter/route.js`

- [ ] **Step 1: Create the file**

```js
import Groq from 'groq-sdk';
export const runtime = 'nodejs';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request) {
  try {
    const formData = await request.formData();
    const jobDescription = formData.get('jobDescription');
    const tone = formData.get('tone') || 'professional';
    const profileRaw = formData.get('profile');
    const resumeFile = formData.get('resume');

    if (!jobDescription) {
      return Response.json({ error: 'Job description is required' }, { status: 400 });
    }

    let resumeText = '';
    if (resumeFile && resumeFile.size > 0) {
      const buffer = Buffer.from(await resumeFile.arrayBuffer());
      const pdfParseModule = await import('pdf-parse/lib/pdf-parse.js');
      const pdfParse = pdfParseModule.default ?? pdfParseModule;
      const { text } = await pdfParse(buffer);
      resumeText = text.slice(0, 4000);
    }

    let profileText = '';
    if (profileRaw) {
      try {
        const profile = JSON.parse(profileRaw);
        profileText = `
Candidate profile:
- Name: ${profile.name || 'Not provided'}
- Current location: ${profile.currentCountry || 'Not provided'}
- Job types of interest: ${profile.jobTypes?.join(', ') || 'Not provided'}
- Skills: ${profile.skills || 'Not provided'}
- Experience level: ${profile.experienceLevel || 'Not provided'}
        `.trim();
      } catch {}
    }

    const toneInstructions = {
      professional: 'formal, confident, and polished — standard business tone',
      enthusiastic: 'warm, energetic, and genuinely excited about the role — still professional but with personality',
      concise: 'direct and punchy — no fluff, every sentence earns its place. 3 short paragraphs maximum',
    };

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: `You are an expert career coach who writes cover letters that actually get interviews. Write a tailored cover letter based on the information below.

Tone: ${toneInstructions[tone] || toneInstructions.professional}

JOB DESCRIPTION:
${jobDescription.slice(0, 3000)}

${resumeText ? `RESUME / EXPERIENCE:\n${resumeText}` : ''}
${profileText ? `\n${profileText}` : ''}

Write a complete, ready-to-send cover letter with:
1. A strong opening hook that shows you understand the role (not "I am writing to apply for...")
2. A paragraph on why THIS company specifically (not generic)
3. A paragraph matching your specific experience to the role's key requirements with concrete examples
4. A confident closing with clear call to action

Return ONLY valid JSON (no markdown) with this structure:
{
  "coverLetter": "<the full cover letter text, with \\n for line breaks between paragraphs>",
  "subjectLine": "<suggested email subject line>",
  "keywordsUsed": ["<ATS keyword you included>"],
  "tailoringNotes": ["<brief note on how you tailored this letter to this specific job>"]
}`,
        },
      ],
      max_tokens: 1500,
    });

    let text = completion.choices[0].message.content.trim().replace(/```json|```/g, '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) text = jsonMatch[0];

    const data = JSON.parse(text);
    return Response.json(data);
  } catch (err) {
    console.error('Cover letter error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/opportumap
git add app/api/cover-letter/route.js
git commit -m "feat: add cover letter API route with Groq"
```

---

## Task 8: Create Cover Letter Page

**Files:**
- Create: `app/cover-letter/page.js`

- [ ] **Step 1: Create the page**

```jsx
'use client';

import { useState, useRef, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useTheme } from '../hooks/useTheme';

const TONES = [
  { id: 'professional', label: 'Professional', desc: 'Formal and polished' },
  { id: 'enthusiastic', label: 'Enthusiastic', desc: 'Warm with personality' },
  { id: 'concise', label: 'Concise', desc: 'Short and punchy' },
];

export default function CoverLetterPage() {
  const { dark, toggleDark } = useTheme();
  const [jobDescription, setJobDescription] = useState('');
  const [tone, setTone] = useState('professional');
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const fileRef = useRef(null);
  const fileObjRef = useRef(null);

  const ui = {
    bg: dark ? 'bg-[#080810]' : 'bg-[#f8f8fc]',
    card: dark ? 'bg-[#0e0e18] border-[#1e1e2e]' : 'bg-white border-zinc-200',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
    input: dark ? 'bg-[#12121e] border-[#2a2a3e] text-zinc-100 placeholder-zinc-600' : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400',
    pill: (a) => a ? 'bg-indigo-600 text-white border-indigo-600' : dark ? 'bg-[#12121e] text-zinc-400 border-[#2a2a3e] hover:border-indigo-500/50' : 'bg-white text-zinc-500 border-zinc-200 hover:border-indigo-300',
    divider: dark ? 'border-[#1e1e2e]' : 'border-zinc-100',
  };

  useEffect(() => {
    // pre-load profile from localStorage
  }, []);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) { setFileName(f.name); fileObjRef.current = f; }
  };

  const generate = async () => {
    if (!jobDescription.trim()) { setError('Please paste the job description.'); return; }
    setLoading(true);
    setError('');
    setResult(null);

    const form = new FormData();
    form.append('jobDescription', jobDescription);
    form.append('tone', tone);
    if (fileObjRef.current) form.append('resume', fileObjRef.current);

    const saved = localStorage.getItem('opportumap_profile');
    if (saved) form.append('profile', saved);

    try {
      const res = await fetch('/api/cover-letter', { method: 'POST', body: form });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(e.message || 'Failed to generate cover letter.');
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result.coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTxt = () => {
    const blob = new Blob([result.coverLetter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cover-letter.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`min-h-screen ${ui.bg} transition-colors duration-300`}>
      <Navbar dark={dark} onToggleDark={toggleDark} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg shadow-violet-500/30">✉️</div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-0.5">AI Tool</p>
              <h1 className="text-3xl font-black gradient-text">Cover Letter Generator</h1>
            </div>
          </div>
          <p className={`text-sm max-w-lg ${ui.sub}`}>
            Paste a job description, optionally upload your resume, and get a tailored cover letter that actually gets read.
          </p>
        </div>

        {/* Input form */}
        <div className={`rounded-2xl border p-6 mb-6 ${ui.card}`}>
          {/* Job description */}
          <div className="mb-5">
            <label className={`text-xs font-medium block mb-1.5 ${ui.sub}`}>Job Description *</label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here..."
              rows={8}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none ${ui.input}`}
            />
          </div>

          {/* Resume upload */}
          <div className="mb-5">
            <label className={`text-xs font-medium block mb-1.5 ${ui.sub}`}>Your Resume (optional — PDF)</label>
            <div
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${dark ? 'border-[#2a2a3e] hover:border-indigo-500/50' : 'border-zinc-200 hover:border-indigo-300'}`}
            >
              {fileName ? (
                <p className={`text-xs font-medium ${ui.text}`}>📄 {fileName}</p>
              ) : (
                <p className={`text-xs ${ui.sub}`}>Click to upload your resume PDF</p>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
            <p className={`text-xs mt-1.5 ${ui.sub}`}>If you have a saved profile, it will be used automatically.</p>
          </div>

          {/* Tone selector */}
          <div className="mb-5">
            <label className={`text-xs font-medium block mb-2 ${ui.sub}`}>Tone</label>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  className={`px-4 py-2 rounded-xl border text-xs font-medium transition-all ${ui.pill(tone === t.id)}`}
                >
                  <span className="block font-semibold">{t.label}</span>
                  <span className="block opacity-70 text-[10px]">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

          <button
            onClick={generate}
            disabled={loading || !jobDescription.trim()}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Writing your cover letter...
              </span>
            ) : 'Generate Cover Letter'}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className="space-y-5">
            {/* Subject line */}
            {result.subjectLine && (
              <div className={`rounded-2xl border p-4 ${ui.card}`}>
                <p className={`text-xs font-semibold mb-1 ${ui.sub}`}>Suggested Email Subject</p>
                <p className={`text-sm font-medium ${ui.text}`}>{result.subjectLine}</p>
              </div>
            )}

            {/* Cover letter */}
            <div className={`rounded-2xl border p-6 ${ui.card}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-bold ${ui.text}`}>Your Cover Letter</h3>
                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${dark ? 'bg-[#1a1a2e] text-zinc-300 hover:bg-indigo-500/20 hover:text-indigo-400' : 'bg-zinc-100 text-zinc-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
                  >
                    {copied ? '✓ Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={downloadTxt}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${dark ? 'bg-[#1a1a2e] text-zinc-300 hover:bg-indigo-500/20 hover:text-indigo-400' : 'bg-zinc-100 text-zinc-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
                  >
                    Download .txt
                  </button>
                </div>
              </div>
              <div className={`whitespace-pre-line text-sm leading-relaxed ${ui.sub}`}>
                {result.coverLetter}
              </div>
            </div>

            {/* Tailoring notes */}
            {result.tailoringNotes?.length > 0 && (
              <div className={`rounded-2xl border p-5 ${ui.card}`}>
                <h3 className={`text-sm font-bold mb-3 ${ui.text}`}>How This Was Tailored</h3>
                <ul className="space-y-1.5">
                  {result.tailoringNotes.map((note, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-indigo-400 text-xs flex-shrink-0 mt-0.5">→</span>
                      <span className={`text-xs ${ui.sub}`}>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Regenerate */}
            <button
              onClick={generate}
              className={`w-full py-3 rounded-xl border text-sm font-semibold transition-all ${dark ? 'border-[#2a2a3e] text-zinc-400 hover:border-indigo-500/50 hover:text-indigo-400' : 'border-zinc-200 text-zinc-500 hover:border-indigo-300 hover:text-indigo-600'}`}
            >
              Regenerate (get a different version)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/opportumap
git add app/cover-letter/page.js
git commit -m "feat: add Cover Letter Generator page"
```

---

## Task 9: Create Interview API Routes

**Files:**
- Create: `app/api/interview/route.js`
- Create: `app/api/interview/feedback/route.js`

- [ ] **Step 1: Create `app/api/interview/route.js`**

```js
import Groq from 'groq-sdk';
export const runtime = 'nodejs';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request) {
  try {
    const { jobTitle, company, jobDescription } = await request.json();
    if (!jobTitle || !company) {
      return Response.json({ error: 'Job title and company are required' }, { status: 400 });
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: `You are a senior interviewer at ${company} hiring for a ${jobTitle} role. Generate a realistic interview question bank.

${jobDescription ? `Job description:\n${jobDescription.slice(0, 2000)}` : ''}

Return ONLY valid JSON (no markdown) with this exact structure:
{
  "questions": [
    {
      "id": <1-15>,
      "category": "behavioral|technical|culture",
      "question": "<the interview question>",
      "why": "<why interviewers ask this — what they're really assessing>",
      "howToAnswer": "<specific advice on how to answer this for ${jobTitle} at ${company}>",
      "exampleAnswer": "<a strong example answer using STAR method where applicable — specific, not generic>"
    }
  ]
}

Generate exactly 15 questions:
- 5 behavioral (use STAR method — e.g. "Tell me about a time when...", "Describe a situation where...")
- 5 technical/role-specific (relevant to ${jobTitle} skills and responsibilities)
- 5 culture/company fit (specific to ${company}'s known culture and values)

Make questions realistic and specific to this role, not generic.`,
        },
      ],
      max_tokens: 3000,
    });

    let text = completion.choices[0].message.content.trim().replace(/```json|```/g, '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) text = jsonMatch[0];

    const data = JSON.parse(text);
    return Response.json(data);
  } catch (err) {
    console.error('Interview questions error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create `app/api/interview/feedback/route.js`**

```js
import Groq from 'groq-sdk';
export const runtime = 'nodejs';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request) {
  try {
    const { question, answer, jobTitle, category } = await request.json();
    if (!question || !answer) {
      return Response.json({ error: 'Question and answer required' }, { status: 400 });
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: `You are a senior interviewer evaluating a ${jobTitle || 'candidate'}'s answer to an interview question. Be honest and specific — not harsh, but not gentle either. Your goal is to help them actually improve.

Question: ${question}
Category: ${category || 'general'}

Candidate's answer:
"${answer}"

Return ONLY valid JSON (no markdown):
{
  "score": <1-10, where 7+ is good, 5-6 is acceptable, below 5 needs major work>,
  "verdict": "<one sentence summary — would this answer impress an interviewer? Be honest.>",
  "whatWorked": ["<specific thing they did well — only if genuine>"],
  "whatToImprove": ["<specific weakness with concrete fix>"],
  "strongerVersion": "<rewrite of their answer that would score a 9/10 — same role/context but much better>",
  "tips": ["<1-2 quick tips for this specific question type>"]
}`,
        },
      ],
      max_tokens: 1000,
    });

    let text = completion.choices[0].message.content.trim().replace(/```json|```/g, '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) text = jsonMatch[0];

    const data = JSON.parse(text);
    return Response.json(data);
  } catch (err) {
    console.error('Interview feedback error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd ~/opportumap
git add app/api/interview/route.js app/api/interview/feedback/route.js
git commit -m "feat: add interview question generation and answer feedback API routes"
```

---

## Task 10: Create Interview Prep Page

**Files:**
- Create: `app/interview/page.js`

- [ ] **Step 1: Create the page**

```jsx
'use client';

import { useState } from 'react';
import Navbar from '../components/Navbar';
import { useTheme } from '../hooks/useTheme';

const CATEGORY_COLORS = {
  behavioral: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  technical: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  culture: 'text-green-400 bg-green-500/10 border-green-500/20',
};

function ScoreBadge({ score }) {
  const color = score >= 7 ? 'text-green-400' : score >= 5 ? 'text-amber-400' : 'text-red-400';
  return <span className={`text-2xl font-black ${color}`}>{score}<span className="text-sm font-normal opacity-50">/10</span></span>;
}

export default function InterviewPage() {
  const { dark, toggleDark } = useTheme();
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('bank');
  const [expandedQ, setExpandedQ] = useState(null);

  // Mock interview state
  const [mockIndex, setMockIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [feedbacks, setFeedbacks] = useState({});
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [mockDone, setMockDone] = useState(false);

  const ui = {
    bg: dark ? 'bg-[#080810]' : 'bg-[#f8f8fc]',
    card: dark ? 'bg-[#0e0e18] border-[#1e1e2e]' : 'bg-white border-zinc-200',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
    input: dark ? 'bg-[#12121e] border-[#2a2a3e] text-zinc-100 placeholder-zinc-600' : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400',
    divider: dark ? 'border-[#1e1e2e]' : 'border-zinc-100',
    tab: (a) => a ? 'border-b-2 border-indigo-500 text-indigo-400 font-semibold' : `${dark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'}`,
  };

  const generateQuestions = async () => {
    if (!jobTitle.trim() || !company.trim()) { setError('Job title and company name are required.'); return; }
    setLoading(true);
    setError('');
    setQuestions([]);
    setFeedbacks({});
    setMockIndex(0);
    setMockDone(false);
    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobTitle, company, jobDescription }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setQuestions(data.questions || []);
    } catch (e) {
      setError(e.message || 'Failed to generate questions.');
    }
    setLoading(false);
  };

  const submitAnswer = async () => {
    if (!currentAnswer.trim()) return;
    const q = questions[mockIndex];
    setFeedbackLoading(true);
    try {
      const res = await fetch('/api/interview/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q.question, answer: currentAnswer, jobTitle, category: q.category }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFeedbacks((prev) => ({ ...prev, [mockIndex]: data }));
    } catch (e) {
      setError(e.message);
    }
    setFeedbackLoading(false);
  };

  const nextQuestion = () => {
    setCurrentAnswer('');
    if (mockIndex + 1 >= questions.length) {
      setMockDone(true);
    } else {
      setMockIndex(mockIndex + 1);
    }
  };

  const avgScore = Object.values(feedbacks).length > 0
    ? Math.round(Object.values(feedbacks).reduce((s, f) => s + f.score, 0) / Object.values(feedbacks).length * 10) / 10
    : null;

  return (
    <div className={`min-h-screen ${ui.bg} transition-colors duration-300`}>
      <Navbar dark={dark} onToggleDark={toggleDark} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/30">🎤</div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-0.5">AI Tool</p>
              <h1 className="text-3xl font-black gradient-text">Interview Prep</h1>
            </div>
          </div>
          <p className={`text-sm max-w-lg ${ui.sub}`}>
            Get a tailored question bank for any role, then practice with AI-graded mock interviews.
          </p>
        </div>

        {/* Setup form */}
        <div className={`rounded-2xl border p-6 mb-6 ${ui.card}`}>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={`text-xs font-medium block mb-1.5 ${ui.sub}`}>Job Title *</label>
              <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Software Engineer"
                className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
            </div>
            <div>
              <label className={`text-xs font-medium block mb-1.5 ${ui.sub}`}>Company *</label>
              <input value={company} onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Google"
                className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
            </div>
          </div>
          <div className="mb-4">
            <label className={`text-xs font-medium block mb-1.5 ${ui.sub}`}>Job Description (optional — makes questions more specific)</label>
            <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              rows={4}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none ${ui.input}`} />
          </div>
          {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
          <button onClick={generateQuestions} disabled={loading || !jobTitle.trim() || !company.trim()}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold transition-all">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating questions...
              </span>
            ) : 'Generate Interview Questions'}
          </button>
        </div>

        {/* Questions loaded */}
        {questions.length > 0 && (
          <div>
            {/* Tabs */}
            <div className={`flex gap-6 border-b mb-6 ${ui.divider}`}>
              {['bank', 'mock'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`pb-3 text-sm transition-all ${ui.tab(activeTab === tab)}`}>
                  {tab === 'bank' ? '📚 Question Bank' : '🎤 Mock Interview'}
                </button>
              ))}
            </div>

            {/* Question Bank Tab */}
            {activeTab === 'bank' && (
              <div className="space-y-3">
                {questions.map((q, i) => (
                  <div key={q.id} className={`rounded-2xl border ${ui.card}`}>
                    <button className="w-full p-4 text-left" onClick={() => setExpandedQ(expandedQ === i ? null : i)}>
                      <div className="flex items-start gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 mt-0.5 capitalize ${CATEGORY_COLORS[q.category] || CATEGORY_COLORS.behavioral}`}>
                          {q.category}
                        </span>
                        <p className={`text-sm font-medium flex-1 text-left ${ui.text}`}>{q.question}</p>
                        <span className={`text-xs ${ui.sub} flex-shrink-0`}>{expandedQ === i ? '▲' : '▼'}</span>
                      </div>
                    </button>
                    {expandedQ === i && (
                      <div className={`px-4 pb-4 border-t ${ui.divider} pt-3 space-y-3`}>
                        {q.why && (
                          <div>
                            <p className={`text-xs font-semibold mb-1 text-amber-400`}>What they're assessing</p>
                            <p className={`text-xs ${ui.sub}`}>{q.why}</p>
                          </div>
                        )}
                        {q.howToAnswer && (
                          <div>
                            <p className={`text-xs font-semibold mb-1 text-indigo-400`}>How to answer</p>
                            <p className={`text-xs ${ui.sub}`}>{q.howToAnswer}</p>
                          </div>
                        )}
                        {q.exampleAnswer && (
                          <div>
                            <p className={`text-xs font-semibold mb-1 text-green-400`}>Example strong answer</p>
                            <p className={`text-xs ${ui.sub} whitespace-pre-line`}>{q.exampleAnswer}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Mock Interview Tab */}
            {activeTab === 'mock' && !mockDone && (
              <div className="space-y-5">
                {/* Progress */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className={ui.sub}>Question {mockIndex + 1} of {questions.length}</span>
                    <span className={ui.sub}>{Object.keys(feedbacks).length} answered</span>
                  </div>
                  <div className={`h-2 rounded-full ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                    <div className="h-2 rounded-full bg-indigo-600 transition-all duration-500"
                      style={{ width: `${((mockIndex) / questions.length) * 100}%` }} />
                  </div>
                </div>

                {/* Current question */}
                <div className={`rounded-2xl border p-6 ${ui.card}`}>
                  <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${CATEGORY_COLORS[questions[mockIndex]?.category] || CATEGORY_COLORS.behavioral} mb-3 inline-block`}>
                    {questions[mockIndex]?.category}
                  </span>
                  <p className={`text-base font-semibold mb-5 ${ui.text}`}>{questions[mockIndex]?.question}</p>

                  {!feedbacks[mockIndex] ? (
                    <>
                      <textarea
                        value={currentAnswer}
                        onChange={(e) => setCurrentAnswer(e.target.value)}
                        placeholder="Type your answer here — write it as you'd actually say it in an interview..."
                        rows={6}
                        className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none mb-4 ${ui.input}`}
                      />
                      <button onClick={submitAnswer} disabled={feedbackLoading || !currentAnswer.trim()}
                        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold transition-all">
                        {feedbackLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Evaluating...
                          </span>
                        ) : 'Submit Answer for Feedback'}
                      </button>
                    </>
                  ) : (
                    <div className="space-y-4">
                      {/* Score */}
                      <div className={`flex items-center justify-between p-4 rounded-xl ${dark ? 'bg-[#0a0a14]' : 'bg-zinc-50'}`}>
                        <div>
                          <p className={`text-xs font-semibold mb-0.5 ${ui.sub}`}>Your Score</p>
                          <ScoreBadge score={feedbacks[mockIndex].score} />
                        </div>
                        <p className={`text-xs max-w-xs text-right ${ui.sub}`}>{feedbacks[mockIndex].verdict}</p>
                      </div>

                      {/* What worked */}
                      {feedbacks[mockIndex].whatWorked?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-green-400 mb-1.5">What worked</p>
                          {feedbacks[mockIndex].whatWorked.map((w, i) => (
                            <p key={i} className={`text-xs flex gap-1.5 mb-1 ${ui.sub}`}><span className="text-green-400">✓</span>{w}</p>
                          ))}
                        </div>
                      )}

                      {/* What to improve */}
                      {feedbacks[mockIndex].whatToImprove?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-amber-400 mb-1.5">What to improve</p>
                          {feedbacks[mockIndex].whatToImprove.map((w, i) => (
                            <p key={i} className={`text-xs flex gap-1.5 mb-1 ${ui.sub}`}><span className="text-amber-400">→</span>{w}</p>
                          ))}
                        </div>
                      )}

                      {/* Stronger version */}
                      {feedbacks[mockIndex].strongerVersion && (
                        <div className={`p-4 rounded-xl ${dark ? 'bg-indigo-500/5 border border-indigo-500/20' : 'bg-indigo-50 border border-indigo-200'}`}>
                          <p className="text-xs font-semibold text-indigo-400 mb-2">Stronger version of your answer</p>
                          <p className={`text-xs leading-relaxed ${ui.sub}`}>{feedbacks[mockIndex].strongerVersion}</p>
                        </div>
                      )}

                      <button onClick={nextQuestion}
                        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all">
                        {mockIndex + 1 >= questions.length ? 'See Final Results' : 'Next Question →'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mock done — summary */}
            {activeTab === 'mock' && mockDone && (
              <div className={`rounded-2xl border p-8 text-center ${ui.card}`}>
                <p className="text-4xl mb-4">🎉</p>
                <h2 className={`text-xl font-black mb-2 ${ui.text}`}>Mock Interview Complete</h2>
                {avgScore !== null && (
                  <p className={`text-sm mb-6 ${ui.sub}`}>
                    You answered {Object.keys(feedbacks).length} of {questions.length} questions.
                    Average score: <span className={`font-bold ${avgScore >= 7 ? 'text-green-400' : avgScore >= 5 ? 'text-amber-400' : 'text-red-400'}`}>{avgScore}/10</span>
                  </p>
                )}
                <div className="space-y-3 text-left max-w-lg mx-auto mb-6">
                  {Object.entries(feedbacks).map(([idx, fb]) => (
                    <div key={idx} className={`flex items-center justify-between p-3 rounded-xl ${dark ? 'bg-[#0a0a14]' : 'bg-zinc-50'}`}>
                      <p className={`text-xs flex-1 mr-3 ${ui.sub}`}>{questions[parseInt(idx)]?.question?.slice(0, 60)}...</p>
                      <ScoreBadge score={fb.score} />
                    </div>
                  ))}
                </div>
                <button onClick={() => { setMockIndex(0); setFeedbacks({}); setMockDone(false); setCurrentAnswer(''); }}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all">
                  Practice Again
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/opportumap
git add app/interview/page.js
git commit -m "feat: add Interview Prep page with question bank and mock interview mode"
```

---

## Task 11: Add New Pages to Navbar

**Files:**
- Modify: `app/components/Navbar.js`

- [ ] **Step 1: Add Cover Letter and Interview to `TOOL_LINKS`**

In `app/components/Navbar.js`, find the `TOOL_LINKS` array (line 17) and replace it with:

```js
const TOOL_LINKS = [
  { href: '/resume', label: 'Resume Analyzer', icon: '📄', desc: 'Grade your resume with AI' },
  { href: '/cover-letter', label: 'Cover Letter', icon: '✉️', desc: 'Generate a tailored cover letter' },
  { href: '/interview', label: 'Interview Prep', icon: '🎤', desc: 'Practice with AI mock interviews' },
  { href: '/visa', label: 'Visa Intelligence', icon: '🛂', desc: 'Know your visa status instantly' },
  { href: '/relocate', label: 'Relocation Guide', icon: '✈️', desc: 'Full city relocation plan' },
  { href: '/contact', label: 'Contact', icon: '📬', desc: 'Get in touch with us' },
];
```

- [ ] **Step 2: Commit**

```bash
cd ~/opportumap
git add app/components/Navbar.js
git commit -m "feat: add Cover Letter and Interview Prep to navbar tools menu"
```

---

## Task 12: Push to GitHub and Verify Netlify Deploy

- [ ] **Step 1: Push all commits to GitHub**

```bash
cd ~/opportumap
git push origin main
```

- [ ] **Step 2: Check deploy status**

```bash
# Wait ~2 minutes then check Netlify deploy logs via CLI or browser
# netlify status  (if netlify CLI is installed)
# Or just check https://app.netlify.com
```

- [ ] **Step 3: Verify live at https://opportumap.netlify.app**

Check these pages load:
- `/resume` — new red flags / clichés / rewrites sections appear after upload
- `/visa` — new document checklist / timeline sections appear after search
- `/relocate` — new safety / climate / banking sections appear after search
- `/cover-letter` — page loads, form works, letter generates
- `/interview` — page loads, questions generate, mock interview works

---

## Self-Review

**Spec coverage check:**
- ✅ Resume analyzer hardened (Task 1 + 2)
- ✅ Visa intelligence deepened (Task 3 + 4)
- ✅ Relocation guide deepened (Task 5 + 6)
- ✅ Cover Letter Generator (Task 7 + 8)
- ✅ Interview Prep (Task 9 + 10)
- ✅ Navbar updated (Task 11)
- ✅ Deployed to GitHub/Netlify (Task 12)

**Type consistency:**
- `feedbacks` object keyed by index (number as string), consistently accessed with `feedbacks[mockIndex]` and `feedbacks[parseInt(idx)]`
- `fileObjRef.current` used consistently for resume file reference
- API routes use `Response.json()` consistently (Next.js App Router pattern)

**No placeholders:** All tasks contain complete code.
