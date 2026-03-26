import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Simple in-memory cache (nationality+country → result, 1hr TTL)
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

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent(
      `You are a world-class immigration lawyer and visa expert. Provide comprehensive, accurate visa information.

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
  "officialWebsite": "<official immigration website URL>"
}
Include at least 3 visa types, 5 application steps, 5 guarantee tips, and 3 rejection reasons.`
    );

    let text = result.response.text().trim().replace(/```json|```/g, '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) text = jsonMatch[0];

    const data = JSON.parse(text);
    cache.set(cacheKey, { data, ts: Date.now() });
    return Response.json(data);
  } catch (err) {
    console.error('Visa intel error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
