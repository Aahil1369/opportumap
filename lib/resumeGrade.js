// /resume's grader (POST /api/resume-grade, from the Scanner), as plain functions with the model
// call and the PDF reader passed in, so every answer is tested without Next, Groq or a real PDF.
// Server only. The upload rules are lib/departures/resumeVerdict.js's (PDF only, at most
// MAX_RESUME_LABEL, refused from its declared length before any of it is read; an image-only PDF
// has no text to grade). Every failure is a friendly line (lib/aiRoute.js aiFailure): a rate limit
// is a 429 "busy", anything else a 502; the model's or the provider's own error text is never sent.
//
//   handleGradeUpload(request, { complete, readPdf }) -> { status: 200, body: grade }
//                                     | { status: 400 | 413 | 415 | 422 | 429 | 502, body: { error } }
//   gradeResumeText(text, complete)    -> the model's half alone
import { aiFailure, failureNote } from './aiRoute.js';
import {
  MAX_RESUME_BYTES,
  OVER_LIMIT,
  UNREADABLE_PDF,
  hasReadableText,
  normalizeGrade,
  validateResumeFile,
} from './departures/resumeVerdict.js';

export const GRADE_BUSY = 'The scanner is busy right now. Try again in a minute.';
export const GRADE_FAILED = 'The grader is unavailable right now. Try again in a minute.';
export const GRADE_UNREAD = 'The grader sent back an unreadable answer. Try again.';
export const NOT_OPENED = 'We couldn\'t open this PDF. Export it again as a PDF, then scan it.';
// OVER_LIMIT is said only when the file is known to be over the limit (from its declared length,
// its size or its bytes). A form cut off in transit was too large to arrive, but the file itself
// may be just under the limit, so that answer names no limit.
export const NOT_RECEIVED = 'That PDF was too large for the scanner to receive. Export a lighter copy (fewer images), then scan it.';
const BROKEN_UPLOAD = 'The upload didn\'t arrive in one piece. Try again.';
const NO_FILE = 'Choose a PDF of your resume to scan.';

// The multipart framing around the file (boundaries, part headers) stays far below this.
const FRAMING_BYTES = 64 * 1024;
const STATUS_FOR = { size: 413, type: 415, empty: 400, missing: 400 };
const TEXT_CHARS = 6000; // what the model reads of the resume
const GRADE_TOKENS = 3000;

const fail = (status, error) => ({ status, body: { error } });

/** The grading prompt for one resume's text (the model reads up to TEXT_CHARS of it). */
export function gradePrompt(text) {
  return `You are a brutally honest senior recruiter who has reviewed over 10,000 resumes. You do not sugarcoat. You do not inflate scores to make people feel good. Your job is to tell the truth so candidates actually improve.

SCORING CALIBRATION:
- Average resume: 35-55. Do NOT score average resumes above 55.
- Good resume: 56-70.
- Strong resume: 71-85. Rare. Must have quantified impact, clean formatting, strong keywords.
- Exceptional: 86-100. Almost never seen. Top 1% of candidates only.
- If a resume has vague bullets, buzzwords without evidence, or no quantified achievements, it CANNOT score above 55.

TONE: Direct, cold, professional. Like a recruiter's internal notes. No cheerleading. Every weakness gets a concrete fix.

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "score": <integer 1-100, calibrated as above>,
  "grade": "<A+|A|A-|B+|B|B-|C+|C|C-|D|F>",
  "summary": "<2-3 sentences. Honest assessment. What a recruiter would actually think when they see this.>",
  "sectionScores": {
    "formatting": <1-100>,
    "experience": <1-100>,
    "skills": <1-100>,
    "education": <1-100>,
    "impact": <1-100>,
    "ats_compatibility": <1-100>
  },
  "strengths": ["<specific, genuine strength — only include if it actually exists>"],
  "improvements": [
    {"issue": "<specific problem, be blunt>", "fix": "<concrete actionable fix with example if possible>", "priority": "high|medium|low"}
  ],
  "redFlags": ["<thing that would cause immediate rejection: ATS failure, unexplained gap, red-flag formatting, lying indicators, etc.>"],
  "clichesFound": ["<overused buzzword found: e.g. 'team player', 'passionate', 'results-driven' with no numbers>"],
  "rewrittenBullets": [
    {"original": "<weak bullet copied verbatim from resume>", "rewritten": "<strong version with action verb + metric + impact>"}
  ],
  "jobMatches": [
    {"title": "<job title>", "matchScore": <1-100>, "reason": "<why this person qualifies or doesn't>"}
  ],
  "keywords_missing": ["<ATS keyword missing from resume>"],
  "name": "<candidate's name if visible, else null>"
}
Provide at least 3 strengths (only if genuine), 5 improvements, 3 red flags (or an empty list if truly clean), 3 rewritten bullets, and 8 job matches. Be specific, not generic. If the resume has no quantified achievements, say so directly.

RESUME TEXT:
${String(text ?? '').slice(0, TEXT_CHARS)}`;
}

/** The model's half: the text graded and the answer normalized; 422 without a text layer, before any call. */
export async function gradeResumeText(text, complete, log = console.error) {
  // A scanned (image-only) PDF has no text layer to grade.
  if (!hasReadableText(text)) return fail(422, UNREADABLE_PDF);
  let raw;
  try {
    raw = await complete(gradePrompt(text), GRADE_TOKENS);
  } catch (err) {
    log(`[resume grade] model call failed (${failureNote(err)})`);
    return aiFailure(err, { busy: GRADE_BUSY, failed: GRADE_FAILED });
  }
  let data = null;
  try {
    const cleaned = String(raw ?? '').trim().replace(/```json|```/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    data = JSON.parse(match ? match[0] : cleaned);
  } catch {
    data = null;
  }
  const grade = normalizeGrade(data);
  if (!grade) {
    log('[resume grade] the answer was not a grade');
    return fail(502, GRADE_UNREAD);
  }
  return { status: 200, body: grade };
}

/** POST /api/resume-grade, from the request to the answer. */
export async function handleGradeUpload(request, { complete, readPdf, log = console.error }) {
  // Refuse an oversized upload from its declared length, before buffering any of it.
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_RESUME_BYTES + FRAMING_BYTES) return fail(413, OVER_LIMIT);

  let file;
  try {
    file = (await request.formData()).get('resume');
  } catch {
    // Something on the way passed on only part of a body this large, so the form was cut off.
    if (Number.isFinite(declared) && declared > MAX_RESUME_BYTES) return fail(413, NOT_RECEIVED);
    return fail(400, BROKEN_UPLOAD);
  }
  if (!file || typeof file === 'string') return fail(400, NO_FILE);

  const check = validateResumeFile(file);
  if (!check.ok) return fail(STATUS_FOR[check.reason] ?? 400, check.error);

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_RESUME_BYTES) return fail(413, OVER_LIMIT);

  let text;
  try {
    text = await readPdf(buffer);
  } catch {
    log('[resume grade] unreadable PDF');
    return fail(422, NOT_OPENED);
  }
  return gradeResumeText(text, complete, log);
}
