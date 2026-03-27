import { GoogleGenAI } from '@google/genai';
import { supabase, hasSupabase } from '../../../lib/supabase.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const cache = new Map();

export async function POST(request) {
  try {
    const { destination, origin, field } = await request.json();
    if (!destination) return Response.json({ error: 'Destination required' }, { status: 400 });

    const cacheKey = `${destination}:${origin || 'unknown'}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < 3600000) {
      const connections = await getCommunityConnections(destination, field);
      return Response.json({ ...cached.data, connections });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-lite',
      contents: `You are an expert relocation consultant who has helped thousands of people move internationally.

Destination: ${destination}
${origin ? `Origin: ${origin}` : ''}
${field ? `Professional field: ${field}` : ''}

Return ONLY valid JSON (no markdown) with this exact structure:
{
  "destination": "${destination}",
  "overview": "<2-3 sentences about what it's like to live/work in ${destination}>",
  "costBreakdown": {
    "rent_1br_city_center": {"amount": "<USD/month>", "note": "<brief context>"},
    "rent_1br_outside_center": {"amount": "<USD/month>", "note": "<brief context>"},
    "groceries": {"amount": "<USD/month>", "note": "<brief context>"},
    "dining_out": {"amount": "<USD/month for eating out regularly>", "note": "<brief context>"},
    "public_transport": {"amount": "<USD/month>", "note": "<brief context>"},
    "utilities": {"amount": "<USD/month>", "note": "<brief context>"},
    "internet": {"amount": "<USD/month>", "note": "<brief context>"},
    "healthcare": {"amount": "<USD/month avg>", "note": "<brief context>"},
    "gym_entertainment": {"amount": "<USD/month>", "note": "<brief context>"}
  },
  "monthlyBudget": {
    "budget": <number, USD, minimal lifestyle>,
    "comfortable": <number, USD, comfortable lifestyle>,
    "luxury": <number, USD, luxury lifestyle>
  },
  "comparedToUS": "<cheaper/similar/more expensive — and by approximately how much>",
  "neighborhoods": [
    {
      "name": "<neighborhood name>",
      "vibe": "<1 sentence description>",
      "avgRent": "<USD/month 1BR>",
      "goodFor": "<type of person/lifestyle>",
      "safetyRating": "<1-5>"
    }
  ],
  "jobMarket": {
    "overview": "<2 sentences on job market for expats>",
    "topIndustries": ["<industry 1>", "<industry 2>", "<industry 3>"],
    "averageSalary": "<USD/year for skilled professional>",
    "jobSearchTips": ["<tip 1>", "<tip 2>"]
  },
  "languageBarrier": {"level": "<none|low|medium|high>", "detail": "<explanation>"},
  "qualityOfLife": {"score": <1-10>, "pros": ["<pro 1>", "<pro 2>"], "cons": ["<con 1>", "<con 2>"]},
  "beforeYouMove": ["<action item 1>", "<action item 2>", "<action item 3>", "<action item 4>", "<action item 5>"],
  "firstMonthTips": ["<tip 1>", "<tip 2>", "<tip 3>"],
  "expatCommunities": [
    {"name": "<community/group name>", "type": "<online/in-person/both>", "url": "<URL if known>", "description": "<brief>"}
  ],
  "taxInfo": "<brief note on income tax for expats>",
  "healthcareInfo": "<brief note on healthcare system and expat access>"
}
Include at least 4 neighborhoods, 3 expat communities, and 5 before-you-move actions.`,
    });

    let text = response.text.trim().replace(/```json|```/g, '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) text = jsonMatch[0];

    const data = JSON.parse(text);
    cache.set(cacheKey, { data, ts: Date.now() });

    const connections = await getCommunityConnections(destination, field);
    return Response.json({ ...data, connections });
  } catch (err) {
    console.error('Relocation error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

async function getCommunityConnections(destination, field) {
  if (!hasSupabase) return [];
  try {
    const dest = destination.toLowerCase();
    const { data } = await supabase
      .from('posts')
      .select('id, user_name, user_avatar, title, content, post_type, created_at, like_count')
      .or(`content.ilike.%${dest}%,title.ilike.%${dest}%`)
      .order('like_count', { ascending: false })
      .limit(6);
    return data || [];
  } catch {
    return [];
  }
}
