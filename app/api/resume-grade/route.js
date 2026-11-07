// POST /api/resume-grade (multipart: resume=<PDF>) -> the grade /resume renders. The work is
// lib/resumeGrade.js: the upload rules (PDF only, at most MAX_RESUME_LABEL, refused from its
// declared length before any of it is read), a rate limit answers 429 "busy", and any other
// failure a friendly line (never the error's own text).
import { GROQ_OPTIONS } from '../../../lib/ai.js';
import { completer } from '../../../lib/aiRoute.js';
import { pdfText } from '../../../lib/pdfText.js';
import { handleGradeUpload } from '../../../lib/resumeGrade.js';

export const runtime = 'nodejs';

const complete = completer(GROQ_OPTIONS);

export async function POST(request) {
  const { status, body } = await handleGradeUpload(request, { complete, readPdf: pdfText });
  return Response.json(body, { status });
}
