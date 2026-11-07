// POST /api/cover-letter (multipart: jobDescription, tone?, profile? (JSON), resume? (PDF)) ->
// { coverLetter, subjectLine, keywordsUsed, tailoringNotes }: the airmail desk's letter. The work
// is lib/coverLetterApi.js: the resume is checked like /resume's (PDF only, at most
// MAX_RESUME_LABEL, a real text layer), the job description is read up to the length the page
// sends, a rate limit answers 429 "busy", and any other failure a friendly line (never the
// error's own text).
import { GROQ_OPTIONS } from '../../../lib/ai.js';
import { completer } from '../../../lib/aiRoute.js';
import { handleLetterUpload } from '../../../lib/coverLetterApi.js';
import { pdfText } from '../../../lib/pdfText.js';

export const runtime = 'nodejs';

const complete = completer(GROQ_OPTIONS);

export async function POST(request) {
  const { status, body } = await handleLetterUpload(request, { complete, readPdf: pdfText });
  return Response.json(body, { status });
}
