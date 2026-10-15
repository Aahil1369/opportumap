// POST /api/resume (multipart: resume=<PDF>) -> { skills, experience, summary }: the profile
// editor's resume scan (ProfileModal). The upload rules are /api/resume-grade's (PDF only, at most
// 4 MB, refused from its declared length before any of it is read; lib/departures/resumeVerdict.js);
// the model's half is lib/resumeScan.js. Every failure is a friendly line, never an error's text.
import { GROQ_FAST_OPTIONS } from '../../../lib/ai.js';
import { completer } from '../../../lib/aiRoute.js';
import { scanResumeText } from '../../../lib/resumeScan.js';
import { MAX_RESUME_BYTES, OVER_LIMIT, validateResumeFile } from '../../../lib/departures/resumeVerdict.js';

export const runtime = 'nodejs';

const complete = completer(GROQ_FAST_OPTIONS);
// The multipart framing around the file (boundaries, part headers) stays far below this.
const FRAMING_BYTES = 64 * 1024;
const STATUS_FOR = { size: 413, type: 415, empty: 400, missing: 400 };
const NOT_RECEIVED = 'That PDF was too large to receive. Export a lighter copy (fewer images), then try again.';

const fail = (status, error) => Response.json({ error }, { status });

export async function POST(request) {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_RESUME_BYTES + FRAMING_BYTES) return fail(413, OVER_LIMIT);

  let file;
  try {
    file = (await request.formData()).get('resume');
  } catch {
    if (Number.isFinite(declared) && declared > MAX_RESUME_BYTES) return fail(413, NOT_RECEIVED);
    return fail(400, 'The upload didn’t arrive in one piece. Try again.');
  }
  if (!file || typeof file === 'string') return fail(400, 'Choose a PDF of your resume to scan.');

  const check = validateResumeFile(file);
  if (!check.ok) return fail(STATUS_FOR[check.reason] ?? 400, check.error);

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_RESUME_BYTES) return fail(413, OVER_LIMIT);

  let text;
  try {
    const pdfParseModule = await import('pdf-parse/lib/pdf-parse.js');
    const pdfParse = pdfParseModule.default ?? pdfParseModule;
    text = (await pdfParse(buffer)).text;
  } catch {
    console.error('[resume scan] unreadable PDF');
    return fail(422, 'We couldn’t open this PDF. Export it again as a PDF, then try again.');
  }

  const { status, body } = await scanResumeText(text, complete);
  return Response.json(body, { status });
}
