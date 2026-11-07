// The airmail desk's letter (POST /api/cover-letter, from AirmailDesk), as plain functions with the
// model call and the PDF reader passed in, so every answer is tested without Next, Groq or a real
// PDF. Server only. The resume follows /resume's upload rules (lib/departures/resumeVerdict.js: PDF
// only, at most MAX_RESUME_LABEL, a real text layer), checked here as well as on the page; the
// model reads the job description up to JOB_DESCRIPTION_CHARS, the number the page sends
// (lib/departures/coverLetter.js). Every failure is a friendly line (lib/aiRoute.js aiFailure): a
// rate limit is a 429 "busy", anything else a 502; an error's own text is never sent.
//
//   handleLetterUpload(request, { complete, readPdf }) -> { status: 200, body: letter }
//                                  | { status: 400 | 413 | 415 | 422 | 429 | 502, body: { error } }
//   writeLetter({ jobDescription, tone, profile, resumeText }, complete) -> the model's half alone
import { aiFailure, failureNote } from './aiRoute.js';
import { JOB_DESCRIPTION_CHARS, resumeAttachError } from './departures/coverLetter.js';
import { MAX_RESUME_BYTES, MAX_RESUME_LABEL, hasReadableText, validateResumeFile } from './departures/resumeVerdict.js';

export const LETTER_BUSY = 'The airmail desk is busy right now. Try again in a minute.';
export const LETTER_FAILED = 'Couldn’t write the letter. Try again in a minute.';
export const LETTER_PDF_UNREADABLE = 'Couldn’t read that resume PDF. Export it again, or write the letter without it.';
const NEED_JOB = 'Paste the job description first.';
const BROKEN_FORM = 'The letter request didn’t arrive in one piece. Try again.';
const OVER_LIMIT = `That resume PDF is over the ${MAX_RESUME_LABEL} limit. Export a lighter copy, or write the letter without it.`;
// Said when the form was cut off in transit: the file itself may be just under the limit.
const NOT_RECEIVED = 'That resume PDF was too large to receive. Export a lighter copy, or write the letter without it.';

// The rest of the form (the job description, the profile, the multipart framing) stays far below this.
const FORM_BYTES = 64 * 1024;
const STATUS_FOR = { size: 413, type: 415, empty: 400, missing: 400 };
const RESUME_CHARS = 4000; // what the model reads of the resume
const LETTER_TOKENS = 1500;

const fail = (status, error) => ({ status, body: { error } });

const TONE_INSTRUCTIONS = {
  professional: 'formal, confident, and polished — standard business tone',
  enthusiastic: 'warm, energetic, and genuinely excited about the role — still professional but with personality',
  concise: 'direct and punchy — no fluff, every sentence earns its place. 3 short paragraphs maximum',
};

/** The sender's profile as the prompt lists it ('' without one). */
function profileBlock(profile) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return '';
  const jobTypes = Array.isArray(profile.jobTypes) ? profile.jobTypes.join(', ') : '';
  return `
Candidate profile:
- Name: ${profile.name || 'Not provided'}
- Current location: ${profile.currentCountry || 'Not provided'}
- Job types of interest: ${jobTypes || 'Not provided'}
- Skills: ${profile.skills || 'Not provided'}
- Experience level: ${profile.experienceLevel || 'Not provided'}
  `.trim();
}

/** The letter prompt: the job description up to JOB_DESCRIPTION_CHARS, the resume up to 4,000. */
export function letterPrompt({ jobDescription, tone, profile, resumeText } = {}) {
  const job = String(jobDescription ?? '').slice(0, JOB_DESCRIPTION_CHARS);
  const resume = String(resumeText ?? '').slice(0, RESUME_CHARS);
  const profileText = profileBlock(profile);
  const toneLine = Object.hasOwn(TONE_INSTRUCTIONS, tone) ? TONE_INSTRUCTIONS[tone] : TONE_INSTRUCTIONS.professional;
  return `You are an expert career coach who writes cover letters that actually get interviews. Write a tailored cover letter based on the information below.

Tone: ${toneLine}

JOB DESCRIPTION:
${job}

${resume ? `RESUME / EXPERIENCE:\n${resume}` : ''}
${profileText ? `\n${profileText}` : ''}

Write a complete, ready-to-send cover letter with:
1. A strong opening hook that shows you understand the role (not "I am writing to apply for...")
2. A paragraph on why THIS company specifically (not generic)
3. A paragraph matching your specific experience to the role's key requirements with concrete examples
4. A confident closing with clear call to action

Return ONLY valid JSON (no markdown) with this structure:
{
  "coverLetter": "<the full cover letter text, with \\n for line breaks between paragraphs>",
  "subjectLine": "<suggested email subject line>",
  "keywordsUsed": ["<ATS keyword you included>"],
  "tailoringNotes": ["<brief note on how you tailored this letter to this specific job>"]
}`;
}

/** The letter object in the model's answer (control characters inside its strings escaped), or null. */
export function parseLetter(raw) {
  let text = String(raw ?? '').trim().replace(/```json|```/g, '').trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) text = jsonMatch[0];

  // Escape literal control characters inside JSON string values before parsing
  let sanitized = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escaped) { sanitized += ch; escaped = false; continue; }
    if (ch === '\\' && inString) { sanitized += ch; escaped = true; continue; }
    if (ch === '"') { inString = !inString; sanitized += ch; continue; }
    if (inString) {
      if (ch === '\n') { sanitized += '\\n'; continue; }
      if (ch === '\r') { sanitized += '\\r'; continue; }
      if (ch === '\t') { sanitized += '\\t'; continue; }
      if (ch.charCodeAt(0) < 32) continue;
    }
    sanitized += ch;
  }

  let data;
  try {
    data = JSON.parse(sanitized);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  data.keywordsUsed = data.keywordsUsed || [];
  data.tailoringNotes = data.tailoringNotes || [];
  return data;
}

/** The model's half: the prompt asked, the answer parsed. */
export async function writeLetter(input, complete, log = console.error) {
  let raw;
  try {
    raw = await complete(letterPrompt(input), LETTER_TOKENS);
  } catch (err) {
    log(`[cover letter] model call failed (${failureNote(err)})`);
    return aiFailure(err, { busy: LETTER_BUSY, failed: LETTER_FAILED });
  }
  const data = parseLetter(raw);
  if (!data) {
    log('[cover letter] the answer was not the JSON asked for');
    return fail(502, LETTER_FAILED);
  }
  return { status: 200, body: data };
}

/** POST /api/cover-letter, from the request to the answer. */
export async function handleLetterUpload(request, { complete, readPdf, log = console.error }) {
  // Refuse an oversized upload from its declared length, before buffering any of it.
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_RESUME_BYTES + FORM_BYTES) return fail(413, OVER_LIMIT);

  let form;
  try {
    form = await request.formData();
  } catch {
    // Something on the way passed on only part of a body this large, so the form was cut off.
    if (Number.isFinite(declared) && declared > MAX_RESUME_BYTES) return fail(413, NOT_RECEIVED);
    return fail(400, BROKEN_FORM);
  }

  const jobDescription = form.get('jobDescription');
  if (typeof jobDescription !== 'string' || !jobDescription.trim()) return fail(400, NEED_JOB);

  // The resume is optional: no part, or an empty one, is no resume (the page never sends an empty one).
  let resumeText = '';
  const resume = form.get('resume');
  if (resume && typeof resume !== 'string' && resume.size > 0) {
    const check = validateResumeFile(resume);
    if (!check.ok) return fail(STATUS_FOR[check.reason] ?? 400, resumeAttachError(resume));
    const buffer = Buffer.from(await resume.arrayBuffer());
    if (buffer.length > MAX_RESUME_BYTES) return fail(413, OVER_LIMIT);
    try {
      resumeText = String((await readPdf(buffer)) ?? '');
    } catch {
      log('[cover letter] unreadable resume PDF');
      return fail(422, LETTER_PDF_UNREADABLE);
    }
    // A scan (an image-only PDF) has no text to cite: say so, rather than leave it out unsaid.
    if (!hasReadableText(resumeText)) return fail(422, LETTER_PDF_UNREADABLE);
  }

  let profile = null;
  try {
    profile = JSON.parse(String(form.get('profile') ?? 'null'));
  } catch {
    profile = null;
  }
  const tone = form.get('tone');
  return writeLetter({ jobDescription, tone: typeof tone === 'string' ? tone : '', profile, resumeText }, complete, log);
}
