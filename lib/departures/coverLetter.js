// /cover-letter — the airmail desk. The text the page copies and downloads (the letter as edited,
// else as written), the letter's layout, the answer the page renders, what it says when an answer
// is not OK, the profile it sends and the resume it attaches. Pure: no DOM, no fetch.
//
//   letterText(edited, original)      -> the text Copy and Download use
//   normalizeLetterResult(apiAnswer)  -> { letter, subject, keywords, notes } | null
//   letterErrorFor(500, raw)          -> "Couldn't write the letter…" (never the raw text)
//   profileForLetter(profile)         -> { name, currentCountry, jobTypes, skills, experienceLevel } | null
//   resumeAttachError(file)           -> '' when the PDF can go, else what is wrong with it

import { MAX_RESUME_LABEL, sizeLabel, validateResumeFile } from './resumeVerdict.js';

/** The tones the route writes in, as luggage tags: a three-letter code, a name, a line. */
export const TONES = [
  { id: 'professional', code: 'PRO', label: 'Professional', desc: 'Formal and polished' },
  { id: 'enthusiastic', code: 'WRM', label: 'Enthusiastic', desc: 'Warm, with personality' },
  { id: 'concise', code: 'BRF', label: 'Concise', desc: 'Short and punchy' },
];
export const DEFAULT_TONE = 'professional';

export function toneOf(id) {
  return TONES.find((t) => t.id === id) ?? TONES.find((t) => t.id === DEFAULT_TONE);
}

const lineEnds = (s) => s.replace(/\r\n?/g, '\n');

/**
 * The text Copy and Download use: the letter as edited when it was edited (even emptied: then
 * there is nothing to copy), else the letter as written. Line ends are \n, the ends are trimmed,
 * the inside is kept as typed.
 */
export function letterText(edited, original) {
  const s = typeof edited === 'string' ? edited : typeof original === 'string' ? original : '';
  return lineEnds(s).trim();
}

/** The letter was really changed (not just a trailing newline or Windows line ends). */
export function isEdited(edited, original) {
  return typeof edited === 'string' && letterText(edited) !== letterText(null, original);
}

const SIGN_OFF = /^[^.!?]{1,40},$/;

/**
 * The letter as written, laid out for the textarea and an email: \n line ends, no spaces at line
 * ends, at most one blank line in a row. A letter sent with single line breaks between its
 * paragraphs gets a blank line between them, except inside the sign-off ("Sincerely,\nAda").
 */
export function normalizeLetter(raw) {
  if (typeof raw !== 'string') return '';
  const s = lineEnds(raw)
    .replace(/\\n/g, '\n') // line breaks the model escaped twice
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (s.includes('\n\n') || !s.includes('\n')) return s;
  const lines = s.split('\n');
  let out = lines[0];
  let signedOff = false;
  for (let i = 1; i < lines.length; i += 1) {
    out += signedOff ? '\n' : '\n\n';
    out += lines[i];
    // A short line ending in a comma near the end (not the greeting) starts the sign-off: the
    // name and anything after it stay on the lines right below.
    if (!signedOff && i >= lines.length - 4 && SIGN_OFF.test(lines[i].trim())) signedOff = true;
  }
  return out;
}

/** One line of text, at most `max` characters (cut with "…"). '' for anything that is not text. */
function oneLine(v, max) {
  if (typeof v !== 'string') return '';
  const s = v.replace(/\s+/g, ' ').trim();
  const chars = Array.from(s);
  return chars.length > max ? `${chars.slice(0, max - 1).join('').trimEnd()}…` : s;
}

/** Strings from a list: trimmed, no blanks, no repeats (any case), at most `limit`. */
function list(v, limit, max) {
  if (!Array.isArray(v)) return [];
  const out = [];
  const seen = new Set();
  for (const item of v) {
    const s = oneLine(item, max);
    if (!s || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    out.push(s);
    if (out.length === limit) break;
  }
  return out;
}

const MAX_LETTER = 8000;
const MIN_LETTER = 40; // letters and digits: anything shorter is not a letter

/** The route's answer in the shape the page renders; null without a usable letter. */
export function normalizeLetterResult(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const letter = normalizeLetter(raw.coverLetter).slice(0, MAX_LETTER).trim();
  if (letter.replace(/[^\p{L}\p{N}]/gu, '').length < MIN_LETTER) return null;
  return {
    letter,
    subject: oneLine(raw.subjectLine, 160),
    keywords: list(raw.keywordsUsed, 16, 40),
    notes: list(raw.tailoringNotes, 8, 400),
  };
}

/** Words in the letter (for the readout over it). */
export function wordCount(text) {
  if (typeof text !== 'string') return 0;
  return (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length;
}

const BUSY = 'The airmail desk is busy right now. Try again in a minute.';
const RATE_LIMITED = /rate.?limit|too many requests|\b429\b|quota/i;
const PDF_TROUBLE = /\bpdf\b|xref|bad stream|invalid (?:or corrupted )?(?:pdf|stream)/i;

/**
 * What the page says when the letter answer is not OK. A 400 keeps the route's own words; a
 * rate limit (429, 503, or a 500 whose text says so) is "busy"; a broken resume PDF says so when
 * one was attached; a 413 gives the file's real size. Anything else gets a plain line: the
 * route answers 500 with its raw error text, and that never reaches the page.
 */
export function letterErrorFor(status, bodyError, { size, hasResume = false } = {}) {
  const text = typeof bodyError === 'string' ? bodyError.trim() : '';
  if (status === 400) return text || 'Paste the job description first.';
  if (status === 413) {
    const bytes = Number(size);
    const sized = Number.isFinite(bytes) && bytes > 0 ? ` (${sizeLabel(bytes)})` : '';
    return `That resume PDF${sized} was too large to send. Export a lighter copy, or write the letter without it.`;
  }
  if (status === 429 || status === 503 || RATE_LIMITED.test(text)) return BUSY;
  if (hasResume && PDF_TROUBLE.test(text)) {
    return 'Couldn’t read that resume PDF. Export it again, or write the letter without it.';
  }
  return 'Couldn’t write the letter. Try again in a minute.';
}

const EXPERIENCE = {
  student: 'Student / no experience',
  '0-2': '0–2 years',
  '3-5': '3–5 years',
  '5-10': '5–10 years',
  '10+': '10+ years',
};

/**
 * The profile as the letter route reads it, and only that: name, where they are, the work they
 * want, skills, experience (the profile stores `experience` as a code; the route reads
 * `experienceLevel` in words). Null when there is nothing to use.
 */
export function profileForLetter(profile) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return null;
  const level = oneLine(profile.experienceLevel ?? profile.experience, 40);
  const skills = Array.isArray(profile.skills) ? list(profile.skills, 40, 60).join(', ') : profile.skills;
  const out = {
    name: oneLine(profile.name, 80),
    currentCountry: oneLine(profile.currentCountry, 80),
    jobTypes: list(profile.jobTypes, 8, 60),
    skills: oneLine(skills, 600),
    experienceLevel: EXPERIENCE[level] ?? level,
  };
  return Object.values(out).some((v) => v.length > 0) ? out : null;
}

/** Who the letter is from, in one line: "Ada · 3–5 years · React, Node, SQL". */
export function senderLine(p) {
  if (!p) return '';
  const skills = (p.skills ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(', ');
  return [p.name, p.experienceLevel, skills].filter(Boolean).join(' · ');
}

/**
 * The resume rules (the scanner's: PDF only, at most 4 MB, not empty), worded for the letter.
 * '' when the file can go.
 */
export function resumeAttachError(file) {
  const check = validateResumeFile(file);
  if (check.ok) return '';
  if (check.reason === 'type') return 'That isn’t a PDF. Export your resume as a PDF, or write the letter without it.';
  if (check.reason === 'empty') return 'That PDF is empty. Export it again, or write the letter without it.';
  if (check.reason === 'size') {
    const mb = (Math.ceil((Number(file.size) / (1024 * 1024)) * 10) / 10).toFixed(1);
    return `That PDF is ${mb} MB — the limit is ${MAX_RESUME_LABEL}. Export a lighter copy, or write the letter without it.`;
  }
  return 'Choose a PDF of your resume, or write the letter without it.';
}
