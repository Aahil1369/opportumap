import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CACHE = new Map();

export async function POST(request) {
  try {
    const { title, company, location, country } = await request.json();
    const key = `${title}|${country}`;
    if (CACHE.has(key)) return Response.json(CACHE.get(key));

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `Estimate the salary range for this job. Return only a JSON object, no markdown:
{
  "min": number (annual, in local currency),
  "max": number (annual, in local currency),
  "currency": "USD" | "GBP" | "CAD" | "AUD" | "EUR" | "INR" | "SGD",
  "display": "formatted string e.g. $80,000 – $120,000"
}

Job: ${title}
Company: ${company}
Location: ${location}
Country: ${country}

Base on real market data for this role/location. Be realistic.`,
      }],
    });

    const data = JSON.parse(message.content[0].text.trim());
    CACHE.set(key, data);
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
