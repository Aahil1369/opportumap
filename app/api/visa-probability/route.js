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
- Skills: ${(profile.skills || []).join?.(', ') || profile.skills || 'unknown'}
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
