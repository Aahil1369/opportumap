// What the AI routes share (server only): one Groq client, made on first use, and the answers a
// failed model call gets. A missing key, a rate limit or a network error is one friendly answer,
// never the provider's own error text (it can name the model, the organisation or the key).
//
//   const complete = completer(GROQ_FAST_OPTIONS);
//   const text = await complete(prompt, 600);             // the model's text, or it throws
//   aiFailure(err, { busy, failed })                      // -> { status: 429 | 502, body: { error } }
import Groq from 'groq-sdk';

let client = null;
// Made on first use, so a route without a key still loads and answers its friendly failure.
const groq = () => (client ??= new Groq({ apiKey: process.env.GROQ_API_KEY }));

/** complete(content, maxTokens) -> the model's answer to one user message ('' when it sent none). */
export function completer(options) {
  return async (content, maxTokens) => {
    const completion = await groq().chat.completions.create({
      ...options,
      messages: [{ role: 'user', content }],
      max_tokens: maxTokens, // gpt-oss reasoning tokens count toward this
    });
    return completion.choices?.[0]?.message?.content ?? '';
  };
}

/** True when the provider refused for its rate limit (Groq answers 429). */
export function isRateLimited(err) {
  return Number(err?.status) === 429;
}

/**
 * The answer for a failed model call: 429 with the `busy` line for a rate limit (the page can
 * say "try again in a minute", and the salary queue cools down), else 502 with the `failed` line.
 */
export function aiFailure(err, { busy, failed }) {
  return isRateLimited(err) ? { status: 429, body: { error: busy } } : { status: 502, body: { error: failed } };
}

/** What a server log may say about a failed call: its status and name, never a request's text. */
export function failureNote(err) {
  return `${err?.status ?? 'no status'} ${err?.name ?? typeof err}`;
}
