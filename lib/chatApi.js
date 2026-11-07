// The AI desk on /jobs (POST /api/chat, from ChatWidget): the conversation so far and the
// visitor's profile in, one reply out. The model call is passed in, so this is tested without
// Next or Groq. Server only. A rate limit answers 429 "busy", any other failure a plain 502; the
// model's or the provider's own error text is never sent (lib/aiRoute.js aiFailure).
//
//   handleChat({ messages, profile }, chat) -> { status: 200, body: { reply } }
//                                            | { status: 400 | 429 | 502, body: { error } }
import { aiFailure, failureNote } from './aiRoute.js';

export const CHAT_BUSY = 'The desk is busy right now. Try again in a minute.';
export const CHAT_FAILED = 'The desk couldn’t answer just now. Try again in a moment.';
const NO_QUESTION = 'Ask the desk a question first.';
const CHAT_TOKENS = 1200; // gpt-oss replies run ~700-850 tokens; 512 cut them off

/** The desk's instructions, with the visitor's profile when there is one. */
export function chatSystemPrompt(profile) {
  const jobTypes = Array.isArray(profile?.jobTypes) ? profile.jobTypes.join(', ') : '';
  return `You are OpportuMap AI — a career and global relocation assistant built into OpportuMap, a platform that helps people find jobs worldwide and navigate moving to a new country.

${profile ? `
USER PROFILE:
- Name: ${profile.name || 'Unknown'}
- Nationality: ${profile.nationality || 'Unknown'}
- Currently lives in: ${profile.currentCountry || 'Unknown'}
- Experience level: ${profile.experience || 'Unknown'}
- Interested in: ${jobTypes || 'Not specified'}
- Skills: ${profile.skills || 'Not specified'}
${profile.resumeSummary ? `- Resume summary: ${profile.resumeSummary}` : ''}
` : 'No profile set up yet.'}

You have knowledge of:
- Visa requirements for all major nationalities to US, UK, Canada, Australia, Germany, India, Singapore
- Work visa types, how to apply, processing times
- Cost of living, neighborhoods, safety in each country
- Legal first steps when relocating (registering, bank accounts, healthcare)
- Salary ranges by role and country
- Job search strategies for international applicants

Be friendly, concise, and practical. Give actionable advice. Keep responses under 200 words unless asked for detail. Use bullet points where helpful.`;
}

/**
 * One reply for the conversation so far. Messages with text keep their order; only the
 * assistant's own keep the assistant role (anything else is the visitor's). No question is a 400.
 */
export async function handleChat(input, chat, log = console.error) {
  const src = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const messages = (Array.isArray(src.messages) ? src.messages : [])
    .filter((m) => m && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));
  if (!messages.length) return { status: 400, body: { error: NO_QUESTION } };
  const profile = src.profile && typeof src.profile === 'object' && !Array.isArray(src.profile) ? src.profile : null;

  let reply;
  try {
    reply = await chat([{ role: 'system', content: chatSystemPrompt(profile) }, ...messages], CHAT_TOKENS);
  } catch (err) {
    log(`[chat] model call failed (${failureNote(err)})`);
    return aiFailure(err, { busy: CHAT_BUSY, failed: CHAT_FAILED });
  }
  if (typeof reply !== 'string' || !reply.trim()) {
    log('[chat] the model sent no reply');
    return { status: 502, body: { error: CHAT_FAILED } };
  }
  return { status: 200, body: { reply } };
}
