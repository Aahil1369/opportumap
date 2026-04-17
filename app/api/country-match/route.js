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
