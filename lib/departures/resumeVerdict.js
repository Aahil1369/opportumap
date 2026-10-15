// /resume — security X-ray. The verdict plate (CLEARED from 60, BAG CHECK below), the upload
// rules the page and the API both enforce (PDF only, at most 4 MB), the image-only PDF check,
// what the page says when a scan answer is not OK, and the shape of the grade the page renders.
// Pure: no DOM, no fetch.
//
//   resumeVerdict(81)                    -> { label: 'CLEARED', tone: 'ok' }
//   resumeVerdict(47)                    -> { label: 'BAG CHECK', tone: 'amber' }
//   validateResumeFile(file)             -> { ok: true } | { ok: false, error }
//   scanErrorFor(413, body.error, size)  -> "That PDF (3.6 MB) was too large for the scanner…"
//   hasReadableText(pdfText)             -> false for scans (fewer than 200 characters)
//   normalizeGrade(modelAnswer)          -> the grade, or null without a usable score
//   jobsHref('Data Analyst')             -> '/jobs?q=Data%20Analyst'

const MB = 1024 * 1024;

export const CLEARED_AT = 60;
// 4 MB (MiB, as the file picker shows it). The site runs the API route as a Netlify Function: a
// buffered request body is at most 6 MB there, and a binary body arrives Base64-encoded (+33%),
// so about 4.5 MB of PDF is the most that can reach the route. Every file the page lets through
// must arrive; raise this only after an upload of that size works on the deployed site.
export const MAX_RESUME_BYTES = 4 * MB;
export const MAX_RESUME_LABEL = `${MAX_RESUME_BYTES / MB} MB`;
export const MIN_RESUME_TEXT = 200;
export const UNREADABLE_PDF = "We couldn't read text in this PDF — export it as a text PDF.";
export const OVER_LIMIT = `That PDF is over the ${MAX_RESUME_LABEL} limit. Export a lighter copy (fewer images), then scan it.`;

const PDF_TYPES = new Set(['application/pdf', 'application/x-pdf']);
const UNTYPED = new Set(['', 'application/octet-stream']);

/** A score as the plate shows it: an integer 0–100, or null when there is none. */
export function normalizeScore(score) {
  if (score == null || score === '' || typeof score === 'boolean' || typeof score === 'object') return null;
  const n = Number(score);
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** CLEARED (≥ 60) or BAG CHECK, judged on the number the plate shows. No score is never CLEARED. */
export function resumeVerdict(score) {
  const s = normalizeScore(score);
  return s != null && s >= CLEARED_AT ? { label: 'CLEARED', tone: 'ok' } : { label: 'BAG CHECK', tone: 'amber' };
}

/** One decimal, rounded up, so a file just over the limit never reads "10.0 MB". */
function megabytes(bytes) {
  return (Math.ceil((bytes / MB) * 10) / 10).toFixed(1);
}

/**
 * The upload rules, for a File (browser) or a { name, type, size } (server). PDF by its type, or
 * by a .pdf name when the browser sends no useful type; at most 4 MB; not empty. A refusal also
 * says which rule it broke (`reason`: missing · type · empty · size), so the API can pick a status.
 */
export function validateResumeFile(file) {
  if (!file || typeof file !== 'object') {
    return { ok: false, reason: 'missing', error: 'Choose a PDF of your resume to scan.' };
  }
  const type = String(file.type ?? '').toLowerCase().trim();
  const name = String(file.name ?? '');
  const isPdf = PDF_TYPES.has(type) || (UNTYPED.has(type) && /\.pdf$/i.test(name.trim()));
  if (!isPdf) {
    return { ok: false, reason: 'type', error: 'That isn’t a PDF. Export your resume as a PDF, then scan it.' };
  }
  const size = Number(file.size);
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, reason: 'empty', error: 'That PDF is empty. Export it again, then scan it.' };
  }
  if (size > MAX_RESUME_BYTES) {
    return {
      ok: false,
      reason: 'size',
      error: `That PDF is ${megabytes(size)} MB — the limit is ${MAX_RESUME_LABEL}. Export a lighter copy (fewer images), then scan it.`,
    };
  }
  return { ok: true };
}

const SCAN_FALLBACK = {
  415: 'That isn’t a PDF. Export your resume as a PDF, then scan it.',
  422: UNREADABLE_PDF,
  429: 'The scanner is busy right now. Try again in a minute.',
  503: 'The scanner is busy right now. Try again in a minute.',
};

/** A file's size as the page shows it: "3.6 MB" (nearest tenth), "49 KB" under 1 MB. */
export function sizeLabel(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  return bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * What the page says when the scan answer is not OK: the route's own message when it sent one,
 * else a plain one for the status. A 413 is never taken at its word. The page only uploads files
 * within the limit and the route counts the same bytes, so a 413 means something between them
 * (the platform's body ceiling) refused the upload. Its message gives the file's real size and
 * never quotes a limit the file is under.
 */
export function scanErrorFor(status, bodyError, size) {
  if (status === 413) {
    const bytes = Number(size);
    const sized = Number.isFinite(bytes) && bytes > 0 ? ` (${sizeLabel(bytes)})` : '';
    return `That PDF${sized} was too large for the scanner to receive. Export a lighter copy (fewer images), then scan it.`;
  }
  if (typeof bodyError === 'string' && bodyError.trim()) return bodyError.trim();
  return SCAN_FALLBACK[status] ?? 'The scanner hit a problem. Try again in a minute.';
}

/** At least 200 characters of text once whitespace runs count as one: a scan has none. */
export function hasReadableText(text) {
  if (typeof text !== 'string') return false;
  return text.replace(/\s+/g, ' ').trim().length >= MIN_RESUME_TEXT;
}

// ── The grade ───────────────────────────────────────────────────────────────────────────────

const MAX_TEXT = 800;
const NOTHING = /^(?:none|n\/a|nil|nothing|no (?:red flags|issues|clichés|cliches)(?: (?:found|detected))?)\.?$/i;
const PRIORITIES = new Set(['high', 'medium', 'low']);

function str(v, max = MAX_TEXT) {
  if (typeof v !== 'string') return '';
  const s = v.replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function strings(list, limit = 12) {
  if (!Array.isArray(list)) return [];
  const out = [];
  const seen = new Set();
  for (const item of list) {
    const s = str(item);
    if (!s || NOTHING.test(s) || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    out.push(s);
    if (out.length === limit) break;
  }
  return out;
}

function records(list, limit, pick) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const r = pick(item);
    if (r) out.push(r);
    if (out.length === limit) break;
  }
  return out;
}

/**
 * The model's answer in the shape the page renders: a 0–100 integer score, trimmed strings,
 * arrays that are always arrays (no "None" alarms, no repeats), section scores that are numbers.
 * Null when the answer has no usable score.
 */
export function normalizeGrade(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const score = normalizeScore(raw.score);
  if (score == null) return null;

  const sectionScores = {};
  if (raw.sectionScores && typeof raw.sectionScores === 'object') {
    for (const [key, value] of Object.entries(raw.sectionScores)) {
      const s = normalizeScore(value);
      if (s != null && /^[a-z][a-z0-9_]{0,31}$/i.test(key)) sectionScores[key] = s;
    }
  }

  return {
    score,
    grade: str(raw.grade, 3) || null,
    summary: str(raw.summary),
    name: str(raw.name, 80) || null,
    sectionScores,
    strengths: strings(raw.strengths),
    improvements: records(raw.improvements, 8, (i) => {
      const issue = str(i.issue);
      if (!issue) return null;
      const p = str(i.priority, 12).toLowerCase();
      return { issue, fix: str(i.fix), priority: PRIORITIES.has(p) ? p : 'medium' };
    }),
    redFlags: strings(raw.redFlags, 8),
    clichesFound: strings(raw.clichesFound, 16),
    rewrittenBullets: records(raw.rewrittenBullets, 6, (b) => {
      const original = str(b.original);
      const rewritten = str(b.rewritten);
      return original && rewritten ? { original, rewritten } : null;
    }),
    jobMatches: records(raw.jobMatches, 8, (j) => {
      const title = str(j.title, 80);
      if (!title) return null;
      return { title, matchScore: normalizeScore(j.matchScore) ?? 0, reason: str(j.reason) };
    }),
    keywords_missing: strings(raw.keywords_missing, 16),
  };
}

/** The board, searched for a role. */
export function jobsHref(role) {
  const q = typeof role === 'string' ? role.trim() : '';
  return q ? `/jobs?q=${encodeURIComponent(q)}` : '/jobs';
}
