// POST /api/interview { jobTitle, company, jobDescription? } -> { questions } (the simulator's
// question bank). The work is lib/interviewApi.js: the visitor's text is fenced in the prompt,
// a rate limit answers 429 "busy", any other failure a plain 502 (never the error's own text).
import { GROQ_OPTIONS } from '../../../lib/ai.js';
import { completer } from '../../../lib/aiRoute.js';
import { handleQuestions } from '../../../lib/interviewApi.js';

export const runtime = 'nodejs';

const complete = completer(GROQ_OPTIONS);
const MAX_BODY = 64 * 1024; // a title, a company and a 6,000-character description fit many times

export async function POST(request) {
  if (Number(request.headers.get('content-length')) > MAX_BODY) {
    return Response.json({ error: 'That job description is too long. Shorten it, then try again.' }, { status: 413 });
  }
  let input = null;
  try {
    input = await request.json();
  } catch {
    input = null;
  }
  const { status, body } = await handleQuestions(input, complete);
  return Response.json(body, { status });
}
