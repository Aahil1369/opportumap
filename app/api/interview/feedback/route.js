// POST /api/interview/feedback { question, answer, jobTitle?, category? } -> the answer's score.
// The work is lib/interviewApi.js: answers over 6,000 characters are a 400, the answer is fenced
// in the prompt as data, a rate limit answers 429 "busy", any other failure a plain 502.
import { GROQ_OPTIONS } from '../../../../lib/ai.js';
import { completer } from '../../../../lib/aiRoute.js';
import { handleFeedback } from '../../../../lib/interviewApi.js';

export const runtime = 'nodejs';

const complete = completer(GROQ_OPTIONS);
const MAX_BODY = 64 * 1024; // a 6,000-character answer, escaped, fits with room to spare

export async function POST(request) {
  if (Number(request.headers.get('content-length')) > MAX_BODY) {
    return Response.json({ error: 'Your answer is over 6,000 characters. Shorten it, then score it again.' }, { status: 413 });
  }
  let input = null;
  try {
    input = await request.json();
  } catch {
    input = null;
  }
  const { status, body } = await handleFeedback(input, complete);
  return Response.json(body, { status });
}
