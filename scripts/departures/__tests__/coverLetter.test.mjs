// /cover-letter — the airmail desk (Task 11): the text Copy and Download use (the edited
// letter), the letter's layout, the answer the page renders, what it says when an answer is not
// OK, the profile and the resume it sends, and the copy and motion rules on its files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const {
  DEFAULT_TONE,
  TONES,
  isEdited,
  letterErrorFor,
  letterText,
  normalizeLetter,
  normalizeLetterResult,
  profileForLetter,
  resumeAttachError,
  senderLine,
  toneOf,
  wordCount,
} = await import(new URL('../../../lib/departures/coverLetter.js', import.meta.url));

const MB = 1024 * 1024;

// ── The text Copy and Download use ──────────────────────────────────────────────────────────

test('letterText: the letter as edited when it was edited, else the letter as written', () => {
  const original = 'Dear team,\n\nI build things.';
  assert.equal(letterText(undefined, original), original);
  assert.equal(letterText(null, original), original);
  assert.equal(letterText('Dear team,\n\nI build useful things.', original), 'Dear team,\n\nI build useful things.');
  // Emptied on purpose: there is nothing to copy, and never the old text behind the user's back.
  assert.equal(letterText('', original), '');
  assert.equal(letterText('  \n\t ', original), '');
  // Not text is not an edit; no letter at all is empty.
  assert.equal(letterText(42, original), original);
  assert.equal(letterText(undefined, undefined), '');
  assert.equal(letterText(undefined, 42), '');
});

test('letterText: line ends become \\n and the ends are trimmed; the inside stays as typed', () => {
  assert.equal(letterText('\n  Dear team,\r\n\r\nLine  two \n', 'x'), 'Dear team,\n\nLine  two');
  assert.equal(letterText('A\rB', ''), 'A\nB');
  assert.equal(letterText(null, '\r\nDear team,\r\n'), 'Dear team,');
});

test('isEdited: only a real change to the letter counts', () => {
  const original = 'Dear team,\n\nI build things.';
  assert.equal(isEdited(null, original), false);
  assert.equal(isEdited(undefined, original), false);
  assert.equal(isEdited(original, original), false);
  assert.equal(isEdited(`${original}\n`, original), false); // a trailing newline is not an edit
  assert.equal(isEdited('Dear team,\r\n\r\nI build things.', original), false);
  assert.equal(isEdited('Dear team,\n\nI build useful things.', original), true);
  assert.equal(isEdited('', original), true);
});

// ── The letter as written ───────────────────────────────────────────────────────────────────

test('normalizeLetter: \\n line ends, no trailing spaces, at most one blank line', () => {
  assert.equal(normalizeLetter('Dear team,\r\n\r\n\r\n\r\nFirst.   \r\n\r\nSecond.\t'), 'Dear team,\n\nFirst.\n\nSecond.');
  assert.equal(normalizeLetter('  \n\nDear team,\n\nHi.\n\n  '), 'Dear team,\n\nHi.');
  // A model that escaped its line breaks twice still gives paragraphs.
  assert.equal(normalizeLetter('Dear team,\\n\\nFirst.\\n\\nSecond.'), 'Dear team,\n\nFirst.\n\nSecond.');
  for (const v of [undefined, null, 42, {}, []]) assert.equal(normalizeLetter(v), '');
});

test('normalizeLetter: single line breaks become paragraphs, but the sign-off stays together', () => {
  assert.equal(
    normalizeLetter('Dear Hiring Manager,\nPara one.\nPara two.\nSincerely,\nAda Lovelace'),
    'Dear Hiring Manager,\n\nPara one.\n\nPara two.\n\nSincerely,\nAda Lovelace',
  );
  assert.equal(
    normalizeLetter('Hello,\nOne.\nTwo.\nThree.\nBest regards,\nAda Lovelace\nada.dev'),
    'Hello,\n\nOne.\n\nTwo.\n\nThree.\n\nBest regards,\nAda Lovelace\nada.dev',
  );
  // A letter that already has blank lines is laid out as sent.
  const laid = 'Ada Lovelace\nLondon\n\nDear team,\n\nOne.\n\nWarm regards,\nAda';
  assert.equal(normalizeLetter(laid), laid);
  // One paragraph stays one paragraph.
  assert.equal(normalizeLetter('Just one line.'), 'Just one line.');
});

test('normalizeLetterResult: the letter, its subject, the keywords and the notes', () => {
  const body = `Dear team,\n\n${'I ship accessible interfaces. '.repeat(4).trim()}`;
  const r = normalizeLetterResult({
    coverLetter: body,
    subjectLine: '  Application:\n Software Engineer ',
    keywordsUsed: ['React', ' react ', '', 7, null, 'CI/CD', 'x'.repeat(80)],
    tailoringNotes: 'not a list',
  });
  assert.equal(r.letter, body);
  assert.equal(r.subject, 'Application: Software Engineer');
  assert.deepEqual(r.keywords.slice(0, 2), ['React', 'CI/CD']);
  assert.equal(r.keywords.length, 3);
  assert.ok(Array.from(r.keywords[2]).length <= 40 && r.keywords[2].endsWith('…'), r.keywords[2]);
  assert.deepEqual(r.notes, []);

  const many = normalizeLetterResult({
    coverLetter: body,
    keywordsUsed: Array.from({ length: 40 }, (_, i) => `kw${i}`),
    tailoringNotes: Array.from({ length: 20 }, (_, i) => ` note ${i} `),
  });
  assert.equal(many.subject, '');
  assert.equal(many.keywords.length, 16);
  assert.equal(many.notes.length, 8);
  assert.equal(many.notes[0], 'note 0');
  assert.ok(normalizeLetterResult({ coverLetter: `Dear team,\n\n${'word '.repeat(5000)}` }).letter.length <= 8000);
});

test('normalizeLetterResult: no usable letter is no result', () => {
  for (const v of [null, undefined, 'x', 42, [], {}, { coverLetter: '' }, { coverLetter: '   ' }, { coverLetter: 'Hi.' }, { coverLetter: 42 }, { subjectLine: 'Hello' }]) {
    assert.equal(normalizeLetterResult(v), null, JSON.stringify(v));
  }
});

test('wordCount counts words, not punctuation', () => {
  assert.equal(wordCount(''), 0);
  assert.equal(wordCount(undefined), 0);
  assert.equal(wordCount('Dear team,\n\nI build things.'), 5);
  assert.equal(wordCount("I'm here — don’t worry, it's 2026."), 6);
  assert.equal(wordCount('Zürich · São Paulo'), 3);
});

// ── What the page says when an answer is not OK ─────────────────────────────────────────────

test('letterErrorFor words a failed answer; raw server errors never reach the page', () => {
  assert.equal(letterErrorFor(400, 'Job description is required'), 'Job description is required');
  assert.match(letterErrorFor(400, undefined), /job description/i);
  for (const status of [429, 503]) assert.match(letterErrorFor(status, undefined), /busy/);
  // The route answers 500 with the raw error text; it is read, never shown.
  const raw = '429 {"error":{"message":"Rate limit reached for model openai/gpt-oss-120b"}}';
  assert.match(letterErrorFor(500, raw), /busy/);
  assert.doesNotMatch(letterErrorFor(500, raw), /gpt|model|429/);
  const leak = letterErrorFor(500, 'TypeError: Cannot read properties of undefined (reading "0")');
  assert.doesNotMatch(leak, /TypeError|undefined/);
  assert.match(leak, /letter/i);
  assert.match(letterErrorFor(502, '<html>Bad gateway</html>'), /letter/i);
  assert.match(letterErrorFor(404, 42), /letter/i);
  // A broken resume PDF says so (when one was attached), without the parser's words.
  const pdf = letterErrorFor(500, 'Invalid PDF structure', { hasResume: true });
  assert.match(pdf, /resume/i);
  assert.doesNotMatch(pdf, /Invalid PDF structure/);
  assert.doesNotMatch(letterErrorFor(500, 'Invalid PDF structure'), /resume/i);
  // Too large for the platform: the file's real size, never a limit it is under.
  const big = letterErrorFor(413, 'Payload too large', { size: 4.6 * MB, hasResume: true });
  assert.match(big, /4\.6 MB/);
  assert.match(big, /too large/);
  assert.doesNotMatch(big, /Payload/);
});

// ── What the page sends ─────────────────────────────────────────────────────────────────────

test('profileForLetter sends only what the letter uses, with the experience in words', () => {
  const p = profileForLetter({
    name: ' Ada ',
    currentCountry: 'Canada',
    experience: '3-5',
    jobTypes: ['Software Engineering', '', 5],
    skills: 'React, Node',
    nationality: 'PK',
    preferredCountries: ['ca'],
    email: 'someone@example.test',
    resumeSummary: 'x',
  });
  assert.deepEqual(p, {
    name: 'Ada',
    currentCountry: 'Canada',
    jobTypes: ['Software Engineering'],
    skills: 'React, Node',
    experienceLevel: '3–5 years',
  });
  assert.equal(profileForLetter({ experience: 'student' }).experienceLevel, 'Student / no experience');
  assert.equal(profileForLetter({ experienceLevel: 'Senior' }).experienceLevel, 'Senior');
  assert.equal(profileForLetter({ skills: ['Go', 'SQL', ''] }).skills, 'Go, SQL');
  assert.ok(profileForLetter({ skills: 'a, '.repeat(800) }).skills.length <= 600);
  for (const v of [null, undefined, 'x', 42, [], {}, { name: '  ' }, { jobTypes: [] }, { email: 'someone@example.test' }]) {
    assert.equal(profileForLetter(v), null, JSON.stringify(v));
  }
});

test('senderLine: who the letter is from, in a line', () => {
  const p = profileForLetter({ name: 'Ada', experience: '3-5', skills: 'React, Node, SQL, Go' });
  assert.equal(senderLine(p), 'Ada · 3–5 years · React, Node, SQL');
  assert.equal(senderLine(profileForLetter({ skills: 'Go' })), 'Go');
  assert.equal(senderLine(null), '');
});

test('resumeAttachError: a PDF up to 4 MB, worded for the letter (not the scanner)', () => {
  assert.equal(resumeAttachError({ name: 'cv.pdf', type: 'application/pdf', size: 200_000 }), '');
  assert.equal(resumeAttachError({ name: 'cv.PDF', type: '', size: 200_000 }), '');
  const type = resumeAttachError({ name: 'cv.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 9_000 });
  assert.match(type, /PDF/);
  const size = resumeAttachError({ name: 'cv.pdf', type: 'application/pdf', size: 5 * MB });
  assert.match(size, /5\.0 MB/);
  assert.match(size, /4 MB/);
  assert.match(resumeAttachError({ name: 'cv.pdf', type: 'application/pdf', size: 0 }), /empty/i);
  for (const msg of [type, size]) {
    assert.doesNotMatch(msg, /scan/i);
    assert.match(msg, /without it|leave it out/i);
  }
});

test('three tones, each one the route knows', () => {
  const route = readFileSync(new URL('../../../app/api/cover-letter/route.js', import.meta.url), 'utf8');
  assert.equal(TONES.length, 3);
  assert.equal(DEFAULT_TONE, 'professional');
  for (const t of TONES) {
    assert.match(route, new RegExp(`\\b${t.id}:`), `the route has a ${t.id} tone`);
    assert.match(t.code, /^[A-Z]{3}$/);
    assert.ok(t.label && t.desc, t.id);
  }
  assert.equal(new Set(TONES.map((t) => t.code)).size, 3);
  assert.equal(toneOf('concise').id, 'concise');
  assert.equal(toneOf('shouty').id, DEFAULT_TONE);
  assert.equal(toneOf(undefined).id, DEFAULT_TONE);
});
