import Groq from 'groq-sdk';
import { GROQ_OPTIONS } from '../../../lib/ai.js';
import {
  MAX_RESUME_BYTES,
  OVER_LIMIT,
  UNREADABLE_PDF,
  hasReadableText,
  normalizeGrade,
  validateResumeFile,
} from '../../../lib/departures/resumeVerdict.js';

export const runtime = 'nodejs';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// OVER_LIMIT is said only when the file is known to be over the limit (from its declared length,
// its size or its bytes). A form cut off in transit was too large to arrive, but the file itself
// may be just under the limit, so that answer names no limit.
const NOT_RECEIVED = 'That PDF was too large for the scanner to receive. Export a lighter copy (fewer images), then scan it.';
// The multipart framing around the file (boundaries, part headers) stays far below this.
const FRAMING_BYTES = 64 * 1024;
const STATUS_FOR = { size: 413, type: 415, empty: 400, missing: 400 };

const fail = (status, error) => Response.json({ error }, { status });

export async function POST(request) {
  // Refuse an oversized upload from its declared length, before buffering any of it.
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_RESUME_BYTES + FRAMING_BYTES) return fail(413, OVER_LIMIT);

  let file;
  try {
    file = (await request.formData()).get('resume');
  } catch {
    // Something on the way passed on only part of a body this large, so the form was cut off.
    if (Number.isFinite(declared) && declared > MAX_RESUME_BYTES) return fail(413, NOT_RECEIVED);
    return fail(400, 'The upload didn’t arrive in one piece. Try again.');
  }
  if (!file || typeof file === 'string') return fail(400, 'Choose a PDF of your resume to scan.');

  const check = validateResumeFile(file);
  if (!check.ok) return fail(STATUS_FOR[check.reason] ?? 400, check.error);

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_RESUME_BYTES) return fail(413, OVER_LIMIT);

  let resumeText;
  try {
    const pdfParseModule = await import('pdf-parse/lib/pdf-parse.js');
    const pdfParse = pdfParseModule.default ?? pdfParseModule;
    resumeText = (await pdfParse(buffer)).text;
  } catch (err) {
    console.error('Resume grade: unreadable PDF', err?.message);
    return fail(422, 'We couldn’t open this PDF. Export it again as a PDF, then scan it.');
  }
  // A scanned (image-only) PDF has no text layer to grade.
  if (!hasReadableText(resumeText)) return fail(422, UNREADABLE_PDF);

  let completion;
  try {
    completion = await groq.chat.completions.create({
      ...GROQ_OPTIONS,
      messages: [
        {
          role: 'user',
          content: `You are a brutally honest senior recruiter who has reviewed over 10,000 resumes. You do not sugarcoat. You do not inflate scores to make people feel good. Your job is to tell the truth so candidates actually improve.

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
${resumeText.slice(0, 6000)}`,
        },
      ],
      max_tokens: 3000,
    });
  } catch (err) {
    console.error('Resume grade: Groq error', err?.status, err?.message);
    if (err?.status === 429) return fail(503, 'The scanner is busy right now. Try again in a minute.');
    return fail(502, 'The grader is unavailable right now. Try again in a minute.');
  }

  let raw = null;
  try {
    let text = String(completion.choices?.[0]?.message?.content ?? '')
      .trim()
      .replace(/```json|```/g, '')
      .trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) text = jsonMatch[0];
    raw = JSON.parse(text);
  } catch {
    raw = null;
  }
  const grade = normalizeGrade(raw);
  if (!grade) {
    console.error('Resume grade: unreadable model answer');
    return fail(502, 'The grader sent back an unreadable answer. Try again.');
  }
  return Response.json(grade);
}
