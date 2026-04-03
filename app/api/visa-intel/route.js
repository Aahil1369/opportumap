import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const cache = new Map();

export async function POST(request) {
  try {
    const { nationality, targetCountry, purpose } = await request.json();
    if (!nationality || !targetCountry) {
      return Response.json({ error: 'Missing nationality or target country' }, { status: 400 });
    }

    const cacheKey = `${nationality}:${targetCountry}:${purpose || 'work'}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < 3600000) return Response.json(cached.data);

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: `You are a world-class immigration lawyer and visa expert. Provide comprehensive, accurate visa information.

Passport country: ${nationality.toUpperCase()}
Destination country: ${targetCountry.toUpperCase()}
Primary purpose: ${purpose || 'work/career'}

Return ONLY valid JSON (no markdown) with this exact structure:
{
  "currentStatus": "<visa-free | e-visa | visa-on-arrival | visa-required | citizen>",
  "statusSummary": "<1 sentence: what ${nationality} passport holders can do right now in ${targetCountry}>",
  "overview": "<2-3 sentences about the overall relationship between these two countries re: travel/immigration>",
  "visaTypes": [
    {
      "name": "<visa type name>",
      "purpose": "<tourist | work | study | permanent residency | digital nomad | etc>",
      "duration": "<max allowed stay>",
      "validity": "<how long visa is valid>",
      "cost": "<approximate cost in USD>",
      "processingTime": "<typical processing time>",
      "requirements": ["<requirement 1>", "<requirement 2>"],
      "where_to_apply": "<URL or instructions>",
      "difficulty": "<easy|moderate|hard>",
      "notes": "<any important notes>"
    }
  ],
  "applicationSteps": [
    {"step": 1, "title": "<step title>", "detail": "<what to do>"}
  ],
  "guaranteeTips": [
    {"tip": "<specific tip to maximize approval chances>", "importance": "critical|important|helpful"}
  ],
  "commonRejectionReasons": ["<reason 1>", "<reason 2>"],
  "pathToResidency": "<practical description of how to eventually get PR/citizenship>",
  "importantNotes": ["<note 1>", "<note 2>"],
  "officialWebsite": "<official immigration website URL>",
  "documentChecklist": [
    {"document": "<exact document name>", "format": "<original|certified copy|notarized|apostille|apostille|translated>", "notes": "<any important note>"}
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
    "required": true,
    "tests": ["<e.g. IELTS 6.0, DELF B1>"],
    "notes": "<explanation>"
  },
  "interviewTips": ["<tip for consulate interview if required — empty array if no interview needed>"],
  "timeline": {
    "applyHowFarInAdvance": "<e.g. 3 months before travel date>",
    "typicalApprovalTime": "<e.g. 2-4 weeks>",
    "urgentOptionAvailable": true
  },
  "successRateFactors": ["<what actually determines approval — be specific>"]
}
Include at least 3 visa types, 5 application steps, 5 guarantee tips, 3 rejection reasons, a full document checklist, and timeline info.`,
        },
      ],
      max_tokens: 2048,
    });

    let text = completion.choices[0].message.content.trim().replace(/```json|```/g, '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) text = jsonMatch[0];

    const data = JSON.parse(text);
    data.documentChecklist = data.documentChecklist || [];
    data.recentPolicyChanges = data.recentPolicyChanges || [];
    data.interviewTips = data.interviewTips || [];
    data.successRateFactors = data.successRateFactors || [];
    cache.set(cacheKey, { data, ts: Date.now() });
    return Response.json(data);
  } catch (err) {
    console.error('Visa intel error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
