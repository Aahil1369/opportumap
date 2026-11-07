// POST /api/chat { messages, profile? } -> { reply }: the AI desk on /jobs (ChatWidget). The work
// is lib/chatApi.js: a rate limit answers 429 "busy", any other failure a plain 502, never the
// error's own text.
import { GROQ_OPTIONS } from '../../../lib/ai.js';
import { chatter } from '../../../lib/aiRoute.js';
import { handleChat } from '../../../lib/chatApi.js';

const chat = chatter(GROQ_OPTIONS);

export async function POST(request) {
  let input = null;
  try {
    input = await request.json();
  } catch {
    input = null;
  }
  const { status, body } = await handleChat(input, chat);
  return Response.json(body, { status });
}
