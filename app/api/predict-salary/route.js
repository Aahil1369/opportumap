import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const CACHE = new Map();

export async function POST(request) {
  try {
    const { title, company, location, country } = await request.json();
    const key = `${title}|${country}`;
    if (CACHE.has(key)) return Response.json(CACHE.get(key));

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent(
      `Estimate the salary range for this job. Return only a JSON object, no markdown, no code blocks:
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

Base on real market data for this role/location. Be realistic.`
    );

    const text = result.response.text().trim().replace(/```json|```/g, '').trim();
    const data = JSON.parse(text);
    CACHE.set(key, data);
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
