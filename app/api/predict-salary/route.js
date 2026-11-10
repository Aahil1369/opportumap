// POST /api/predict-salary { title, company?, location?, country? } -> { min, max, low, high,
// currency, display }: our salary model's estimate for one role (the boards' PAY · PREDICTED and
// the job gate's runway). Kept per exact question (title, company, location, country) while this
// server instance lives, so no caller can plant the answer other visitors get. A rate limit
// answers 429, so the page's pay queue cools down for a minute (usePredictedPay); any other
// failure a 502. Neither ever carries the provider's error text.
import { GROQ_FAST_OPTIONS } from '../../../lib/ai.js';
import { aiFailure, completer, failureNote } from '../../../lib/aiRoute.js';
import { MODEL_CURRENCIES, modelPay } from '../../../lib/departures/pay.js';

const complete = completer(GROQ_FAST_OPTIONS);
const CACHE = new Map();
const CACHE_MAX = 500;
const UNAVAILABLE = 'Pay estimate unavailable right now.';
const CURRENCIES = MODEL_CURRENCIES.map((c) => `"${c}"`).join('|');

const field = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

export async function POST(request) {
  let input;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: 'A job title is required.' }, { status: 400 });
  }
  const { title, company, location, country } = input && typeof input === 'object' ? input : {};
  if (!field(title, 200)) return Response.json({ error: 'A job title is required.' }, { status: 400 });

  const key = JSON.stringify([field(title, 200), field(company, 120), field(location, 120), field(country, 8)]);
  if (CACHE.has(key)) return Response.json(CACHE.get(key));

  let text;
  try {
    text = await complete(
      `Estimate the salary range for this job. Return ONLY a JSON object, no markdown, no code blocks, no explanation:
{"min":number,"max":number,"low":number,"high":number,"currency":${CURRENCIES},"display":"formatted string e.g. $80,000 – $120,000"}
min/max: this job's yearly pay range. low/high: the yearly pay range for this kind of role in this city, from entry level to the most senior (low <= min, max <= high). All in the same currency.

Job: ${field(title, 200)}
Company: ${field(company, 120)}
Location: ${field(location, 120)}
Country: ${field(country, 8)}

Base on real market data. Be realistic.`,
      300,
    );
  } catch (err) {
    console.warn(`[predict-salary] model call failed (${failureNote(err)})`);
    const { status, body } = aiFailure(err, { busy: UNAVAILABLE, failed: UNAVAILABLE });
    return Response.json(body, { status });
  }

  let data;
  try {
    const cleaned = String(text).trim().replace(/```json|```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    data = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
  } catch {
    data = null;
  }
  // Only an answer the board can show (modelPay) is sent and kept.
  if (!data || typeof data !== 'object' || Array.isArray(data) || !modelPay(data)) {
    return Response.json({ error: UNAVAILABLE }, { status: 502 });
  }
  if (CACHE.size >= CACHE_MAX) CACHE.delete(CACHE.keys().next().value);
  CACHE.set(key, data);
  return Response.json(data);
}
