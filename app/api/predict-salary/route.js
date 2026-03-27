import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const CACHE = new Map();

export async function POST(request) {
  try {
    const { title, company, location, country } = await request.json();
    const key = `${title}|${country}`;
    if (CACHE.has(key)) return Response.json(CACHE.get(key));

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'user',
          content: `Estimate the salary range for this job. Return ONLY a JSON object, no markdown, no code blocks, no explanation:
{"min":number,"max":number,"currency":"USD"|"GBP"|"CAD"|"AUD"|"EUR"|"INR"|"SGD","display":"formatted string e.g. $80,000 – $120,000"}

Job: ${title}
Company: ${company}
Location: ${location}
Country: ${country}

Base on real market data. Be realistic.`,
        },
      ],
      max_tokens: 100,
    });

    const text = completion.choices[0].message.content.trim().replace(/```json|```/g, '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const data = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    CACHE.set(key, data);
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
