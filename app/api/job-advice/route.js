// The job gate's announcement (app/components/jobs/JobGate.js): the AI's read on one role. With
// the visitor's profile it says whether they should apply; with none it speaks to everyone
// thinking of applying (who is a strong fit, what to check first). On any failure (no key, a
// rate limit, a timeout, an answer that is not the JSON asked for) it answers 503
// { error: 'advice-unavailable' }, and the gate says the announcement is unavailable. It never
// stands in a canned verdict dressed up as AI.
import Groq from 'groq-sdk';
import { GROQ_FAST_OPTIONS } from '../../../lib/ai.js';

let client = null;
// Made on first use, so a missing key is one failed request (503), not a route that cannot load.
const groq = () => (client ??= new Groq({ apiKey: process.env.GROQ_API_KEY }));

const VERDICTS = new Set(['apply', 'maybe', 'skip']);

// Advice for visitors with no profile is the same for everyone: kept per role while this server
// instance lives, so a popular role costs one model call, not one per visitor.
const ANON = new Map();
const ANON_MAX = 300;

/** The one failure answer: the gate shows "Announcement unavailable right now." */
export function adviceFailure() {
  return { status: 503, body: { error: 'advice-unavailable' } };
}

// "bold sentence" makes gpt-oss wrap words in **markdown**; the gate renders plain text.
const plain = (v) => (typeof v === 'string' ? v.replace(/\*+/g, '').replace(/\s+/g, ' ').trim() : '');
const lines = (v, max) => (Array.isArray(v) ? v.map(plain).filter(Boolean).slice(0, max) : []);

/**
 * The model's answer -> { headline, reasons (<= 3), tips (<= 2), verdict? } as plain strings, or
 * null when it is not usable advice (not JSON, not an object, no headline).
 */
export function parseAdvice(raw) {
  const cleaned = String(raw ?? '').replace(/```json?/gi, '').replace(/```/g, '').trim();
  let data;
  try {
    data = JSON.parse(cleaned);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const headline = plain(data.headline);
  if (!headline) return null;
  const advice = { headline, reasons: lines(data.reasons, 3), tips: lines(data.tips, 2) };
  if (VERDICTS.has(data.verdict)) advice.verdict = data.verdict;
  return advice;
}

/** The messages for one role: for this visitor (a profile), or for everyone applying (none). */
export function advicePrompt(job, profile) {
  const description = String(job?.description || '').replace(/<[^>]+>/g, ' ').slice(0, 500);
  const jobSummary = `Title: ${job?.title}. Company: ${job?.company}. Location: ${job?.location}. Salary: ${job?.salary}. Description: ${description}`;
  if (!profile) {
    return {
      system: `You are a career advisor for OpportuMap, a global job platform. Given a job, write a short announcement for everyone thinking of applying to it: who is a strong fit (the skills and experience this role asks for) and what to check before applying (for example, whether the employer sponsors work visas for international candidates). Be specific to this job, honest and friendly. Return a JSON object with: headline (one sentence, max 14 words, saying who is a strong fit, like "Strong fit if you have shipped React and TypeScript in production"), reasons (array of 3 short strings: what the role needs, or what to check), and tips (array of 2 short application tips).`,
      user: `Job: ${jobSummary}\n\nReturn only valid JSON.`,
    };
  }
  const profileSummary = `Skills: ${profile.skills || 'not specified'}. Experience: ${profile.experience || 'not specified'}. Job types interested in: ${(Array.isArray(profile.jobTypes) ? profile.jobTypes : []).join(', ') || 'not specified'}. Nationality: ${profile.nationality || 'not specified'}. Current country: ${profile.currentCountry || 'not specified'}.`;
  return {
    system: `You are a career advisor for OpportuMap, a global job platform. Given a job and a user's profile, give a short, direct assessment of whether they should apply. Be honest, specific, and encouraging. Return a JSON object with: verdict ("apply", "maybe", or "skip"), headline (one bold sentence, max 12 words), reasons (array of 3 short strings — why/why not), and tips (array of 2 short application tips if verdict is apply or maybe). Keep the tone friendly and confident.`,
    user: `Job: ${jobSummary}\n\nCandidate profile: ${profileSummary}\n\nReturn only valid JSON.`,
  };
}

function fail() {
  const { status, body } = adviceFailure();
  return Response.json(body, { status });
}

export async function POST(request) {
  let job;
  let profile;
  try {
    ({ job, profile } = await request.json());
  } catch {
    return Response.json({ error: 'Job required' }, { status: 400 });
  }
  if (!job || typeof job !== 'object') return Response.json({ error: 'Job required' }, { status: 400 });

  const anonKey = profile ? null : [job.title, job.company, job.location].map((v) => String(v ?? '')).join('|');
  if (anonKey && ANON.has(anonKey)) return Response.json(ANON.get(anonKey));

  try {
    const { system, user } = advicePrompt(job, profile);
    const completion = await groq().chat.completions.create({
      ...GROQ_FAST_OPTIONS,
      max_tokens: 600, // gpt-oss reasoning tokens count toward this
      temperature: 0.7,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

    const choice = completion.choices?.[0];
    const advice = parseAdvice(choice?.message?.content);
    if (!advice) {
      console.warn(`[job-advice] unusable answer (finish: ${choice?.finish_reason ?? 'none'})`);
      return fail();
    }
    if (anonKey) {
      if (ANON.size >= ANON_MAX) ANON.delete(ANON.keys().next().value);
      ANON.set(anonKey, advice);
    }
    return Response.json(advice);
  } catch (err) {
    console.warn(`[job-advice] model call failed: ${err?.status ?? err?.name ?? 'error'}`);
    return fail();
  }
}
