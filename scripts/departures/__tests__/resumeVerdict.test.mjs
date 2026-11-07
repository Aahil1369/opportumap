// /resume — security X-ray (Task 9): the verdict plate, the upload rules both sides enforce,
// the image-only PDF check, the grade the page renders, and the copy rules on its files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as espree from 'espree';

const {
  CLEARED_AT,
  MAX_RESUME_BYTES,
  MAX_RESUME_LABEL,
  MIN_RESUME_TEXT,
  UNREADABLE_PDF,
  normalizeScore,
  resumeVerdict,
  validateResumeFile,
  scanErrorFor,
  sizeLabel,
  hasReadableText,
  normalizeGrade,
  jobsHref,
} = await import(new URL('../../../lib/departures/resumeVerdict.js', import.meta.url));

const MB = 1_000_000; // decimal MB, as iPhone Files and macOS count sizes (Ruling R16)
const pdf = (size, extra = {}) => ({ name: 'resume.pdf', type: 'application/pdf', size, ...extra });

// ── Verdict ─────────────────────────────────────────────────────────────────────────────────

test('CLEARED from 60 up, BAG CHECK below', () => {
  assert.equal(CLEARED_AT, 60);
  assert.deepEqual(resumeVerdict(60), { label: 'CLEARED', tone: 'ok' });
  assert.deepEqual(resumeVerdict(81), { label: 'CLEARED', tone: 'ok' });
  assert.deepEqual(resumeVerdict(100), { label: 'CLEARED', tone: 'ok' });
  assert.deepEqual(resumeVerdict(59), { label: 'BAG CHECK', tone: 'amber' });
  assert.deepEqual(resumeVerdict(47), { label: 'BAG CHECK', tone: 'amber' });
  assert.deepEqual(resumeVerdict(0), { label: 'BAG CHECK', tone: 'amber' });
});

test('the verdict agrees with the number the plate shows (rounded, clamped)', () => {
  assert.equal(normalizeScore(59.5), 60);
  assert.equal(resumeVerdict(59.5).label, 'CLEARED'); // the plate reads 60
  assert.equal(normalizeScore(59.4), 59);
  assert.equal(resumeVerdict(59.4).label, 'BAG CHECK');
  assert.equal(normalizeScore('81'), 81);
  assert.equal(resumeVerdict('81').label, 'CLEARED');
  assert.equal(normalizeScore(140), 100);
  assert.equal(normalizeScore(-5), 0);
});

test('no usable score is never CLEARED', () => {
  for (const v of [undefined, null, NaN, 'abc', '', {}, Infinity]) {
    assert.equal(normalizeScore(v), null, `normalizeScore(${String(v)})`);
    assert.equal(resumeVerdict(v).label, 'BAG CHECK', `resumeVerdict(${String(v)})`);
  }
});

// ── Upload rules ────────────────────────────────────────────────────────────────────────────

// Netlify runs the API route as a Function: a buffered request body is at most 6 MB, and a binary
// body arrives Base64-encoded (4 bytes per 3), so a PDF much over 4.5 MB never reaches the route.
const NETLIFY_BUFFERED_BODY = 6_000_000;
const FRAMING_BYTES = 64 * 1024; // the route's allowance for the multipart framing around the file
const base64 = (bytes) => Math.ceil(bytes / 3) * 4;

test('the limit is 4 MB (4,000,000 bytes, decimal), small enough for the deploy platform to deliver', () => {
  assert.equal(MAX_RESUME_BYTES, 4_000_000);
  assert.equal(MAX_RESUME_LABEL, '4 MB');
  // The largest upload the page lets through still fits the platform's body ceiling once encoded.
  assert.ok(
    base64(MAX_RESUME_BYTES + FRAMING_BYTES) < NETLIFY_BUFFERED_BODY,
    `${base64(MAX_RESUME_BYTES + FRAMING_BYTES)} bytes encoded is over ${NETLIFY_BUFFERED_BODY}`,
  );
});

test('a PDF up to 4 MB is accepted', () => {
  assert.deepEqual(validateResumeFile(pdf(200_000)), { ok: true });
  assert.deepEqual(validateResumeFile(pdf(3.5 * MB)), { ok: true });
  assert.deepEqual(validateResumeFile(pdf(4 * MB)), { ok: true });
});

test('over 4 MB is refused with its size and the limit', () => {
  for (const [size, shown] of [
    [5 * MB, '5.0 MB'],
    [8 * MB, '8.0 MB'], // the 6–10 MB band the platform would have refused after a full upload
    [11 * MB, '11.0 MB'],
  ]) {
    const r = validateResumeFile(pdf(size));
    assert.equal(r.ok, false, shown);
    assert.equal(r.reason, 'size', shown);
    assert.ok(r.error.includes(shown), `${r.error} names ${shown}`);
    assert.match(r.error, /the limit is 4 MB/);
    assert.doesNotMatch(r.error, /10 MB/);
  }
  // One byte over still says more than 4 (rounded up, never "4.0 MB is over 4 MB").
  const edge = validateResumeFile(pdf(4 * MB + 1));
  assert.equal(edge.ok, false);
  assert.match(edge.error, /4\.1 MB/);
});

// ── What the page says when the scan answer is not OK ──────────────────────────────────────

test('a 413 says the file was too large to receive, never a limit the file is under', () => {
  // The page only uploads files within the limit, so a 413 means something between the page and
  // the route refused it (the platform's body ceiling): its answer is not ours to quote.
  const size = 3.6 * MB;
  for (const body of [
    undefined, // the platform's own HTML page
    '',
    'That PDF is over the 10 MB limit. Export a lighter copy (fewer images), then scan it.',
    'Request Entity Too Large',
  ]) {
    const msg = scanErrorFor(413, body, size);
    assert.match(msg, /too large for the scanner to receive/, String(body));
    assert.match(msg, /3\.6 MB/, 'names the file’s real size');
    assert.doesNotMatch(msg, /limit|\b10 MB|\b4 MB/, `${msg} quotes a limit`);
    assert.match(msg, /lighter copy/);
  }
  // The same size the scan's status line showed for the file (nearest tenth; KB under 1 MB).
  assert.equal(sizeLabel(3_640_000), '3.6 MB');
  assert.match(scanErrorFor(413, undefined, 3_640_000), /\(3\.6 MB\)/);
  assert.equal(sizeLabel(300_000), '300 KB');
  assert.match(scanErrorFor(413, undefined, 300_000), /\(300 KB\)/);
  const unsized = scanErrorFor(413, undefined, undefined);
  assert.match(unsized, /too large for the scanner to receive/);
  assert.doesNotMatch(unsized, /\d/, 'no made-up size');
});

test('other answers keep the route’s own message, or a plain one for the status', () => {
  assert.equal(scanErrorFor(422, UNREADABLE_PDF, 5000), UNREADABLE_PDF);
  assert.equal(scanErrorFor(422, undefined, 5000), UNREADABLE_PDF);
  assert.equal(scanErrorFor(415, ' That isn’t a PDF. ', 5000), 'That isn’t a PDF.');
  assert.match(scanErrorFor(415, undefined, 5000), /isn’t a PDF/);
  assert.match(scanErrorFor(429, undefined, 5000), /busy/);
  assert.match(scanErrorFor(503, undefined, 5000), /busy/);
  assert.match(scanErrorFor(500, undefined, 5000), /scanner hit a problem/);
  assert.match(scanErrorFor(502, 42, 5000), /scanner hit a problem/); // not a string: ignored
});

test('only PDFs: by type, or by .pdf name when the browser gives no type', () => {
  assert.deepEqual(validateResumeFile(pdf(5000, { type: '' })), { ok: true });
  assert.deepEqual(validateResumeFile(pdf(5000, { type: 'application/octet-stream' })), { ok: true });
  assert.deepEqual(validateResumeFile(pdf(5000, { type: 'application/x-pdf' })), { ok: true });
  assert.deepEqual(validateResumeFile(pdf(5000, { name: 'CV.PDF', type: '' })), { ok: true });
  assert.deepEqual(validateResumeFile(pdf(5000, { name: 'resume' })), { ok: true });
  for (const f of [
    pdf(5000, { name: 'resume.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
    pdf(5000, { name: 'scan.png', type: 'image/png' }),
    pdf(5000, { name: 'scan.pdf', type: 'image/png' }),
    pdf(5000, { name: 'notes.txt', type: '' }),
  ]) {
    const r = validateResumeFile(f);
    assert.equal(r.ok, false, f.name);
    assert.match(r.error, /PDF/);
  }
});

test('no file or an empty file is refused', () => {
  for (const f of [undefined, null]) {
    const r = validateResumeFile(f);
    assert.equal(r.ok, false);
    assert.match(r.error, /PDF/);
  }
  const empty = validateResumeFile(pdf(0));
  assert.equal(empty.ok, false);
  assert.match(empty.error, /empty/i);
});

test('a refusal names the rule it broke, so the API can answer 413 / 415 / 400', () => {
  assert.equal(validateResumeFile(pdf(11 * MB)).reason, 'size');
  assert.equal(validateResumeFile(pdf(5000, { name: 'a.png', type: 'image/png' })).reason, 'type');
  assert.equal(validateResumeFile(pdf(0)).reason, 'empty');
  assert.equal(validateResumeFile(null).reason, 'missing');
});

// ── Image-only PDFs ─────────────────────────────────────────────────────────────────────────

test('fewer than 200 characters of text means an image-only PDF', () => {
  assert.equal(MIN_RESUME_TEXT, 200);
  assert.equal(UNREADABLE_PDF, "We couldn't read text in this PDF — export it as a text PDF.");
  assert.equal(hasReadableText('x'.repeat(199)), false);
  assert.equal(hasReadableText('x'.repeat(200)), true);
  // Whitespace runs count once: a scan's page breaks are not text.
  assert.equal(hasReadableText(`${'\n'.repeat(500)}${' \t'.repeat(300)}`), false);
  assert.equal(hasReadableText('a '.repeat(100)), false); // "a a … a" is 199
  assert.equal(hasReadableText('a '.repeat(101)), true);
  assert.equal(hasReadableText(undefined), false);
});

// ── The grade the page renders ──────────────────────────────────────────────────────────────

test('normalizeGrade turns the model answer into the shape the page renders', () => {
  const g = normalizeGrade({
    score: '72.6',
    grade: ' B+ ',
    summary: '  Solid but vague.  ',
    name: null,
    sectionScores: { formatting: 80, impact: '41', ats_compatibility: 130, junk: 'n/a' },
    strengths: ['Clear layout', '', 42, null],
    improvements: [
      { issue: 'No metrics', fix: 'Add numbers', priority: 'HIGH' },
      { issue: 'Long summary', fix: 'Cut it', priority: 'whenever' },
      { fix: 'no issue' },
    ],
    redFlags: ['None'],
    clichesFound: ['team player', 'team player', 'passionate'],
    rewrittenBullets: [{ original: 'Did stuff', rewritten: 'Cut costs 12%' }, { original: 'x' }],
    jobMatches: [{ title: 'Data Analyst', matchScore: 74.4, reason: 'SQL' }, { matchScore: 50 }],
    keywords_missing: ['SQL'],
  });
  assert.equal(g.score, 73);
  assert.equal(g.grade, 'B+');
  assert.equal(g.summary, 'Solid but vague.');
  assert.equal(g.name, null);
  assert.deepEqual(g.sectionScores, { formatting: 80, impact: 41, ats_compatibility: 100 });
  assert.deepEqual(g.strengths, ['Clear layout']);
  assert.deepEqual(g.improvements, [
    { issue: 'No metrics', fix: 'Add numbers', priority: 'high' },
    { issue: 'Long summary', fix: 'Cut it', priority: 'medium' },
  ]);
  assert.deepEqual(g.redFlags, []); // "None" is not an alarm
  assert.deepEqual(g.clichesFound, ['team player', 'passionate']);
  assert.deepEqual(g.rewrittenBullets, [{ original: 'Did stuff', rewritten: 'Cut costs 12%' }]);
  assert.deepEqual(g.jobMatches, [{ title: 'Data Analyst', matchScore: 74, reason: 'SQL' }]);
  assert.deepEqual(g.keywords_missing, ['SQL']);
});

test('normalizeGrade refuses an answer without a score', () => {
  assert.equal(normalizeGrade(null), null);
  assert.equal(normalizeGrade('{"score":80}'), null);
  assert.equal(normalizeGrade({ summary: 'x' }), null);
  const bare = normalizeGrade({ score: 47 });
  assert.equal(bare.score, 47);
  for (const k of ['strengths', 'improvements', 'redFlags', 'clichesFound', 'rewrittenBullets', 'jobMatches', 'keywords_missing']) {
    assert.deepEqual(bare[k], [], k);
  }
  assert.deepEqual(bare.sectionScores, {});
});

test('job matches search the board by role', () => {
  assert.equal(jobsHref('Data Analyst'), '/jobs?q=Data%20Analyst');
  assert.equal(jobsHref('  C++ / Qt Developer '), '/jobs?q=C%2B%2B%20%2F%20Qt%20Developer');
  assert.equal(jobsHref(''), '/jobs');
  assert.equal(jobsHref(undefined), '/jobs');
});

// ── Copy and motion rules on the /resume files ──────────────────────────────────────────────

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const show = (f) => relative(ROOT, f).split(sep).join('/');
function walk(rel) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) return [];
  if (!statSync(abs).isDirectory()) return [abs];
  return readdirSync(abs).flatMap((name) => walk(join(rel, name)));
}
const SURFACE = ['app/resume', 'app/components/resume', 'app/api/resume-grade', 'lib/departures/resumeVerdict.js']
  .flatMap(walk)
  .filter((f) => /\.(?:js|mjs)$/.test(f));

function visibleStrings(src, file) {
  let ast;
  try {
    ast = espree.parse(src, { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } });
  } catch (e) {
    throw new Error(`${show(file)}: ${e.message}`);
  }
  const out = [];
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'Literal' && typeof node.value === 'string') out.push(node.value);
    else if (node.type === 'TemplateElement') out.push(node.value.cooked ?? node.value.raw);
    else if (node.type === 'JSXText') out.push(node.value);
    for (const key of Object.keys(node)) {
      const v = node[key];
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v === 'object') visit(v);
    }
  };
  visit(ast);
  return out;
}

test('the /resume surface is scanned', () => {
  const names = SURFACE.map(show);
  for (const f of ['app/resume/page.js', 'app/components/resume/Scanner.js', 'app/api/resume-grade/route.js']) {
    assert.ok(names.includes(f), `${f} is scanned`);
  }
});

test('no "flight"/"fare" and no job totals in the /resume copy', () => {
  const found = [];
  for (const f of SURFACE) {
    const src = readFileSync(f, 'utf8');
    if (/\b\d{1,3},\d{3}\s*(?:jobs|roles|departures)\b/i.test(src)) found.push(`${show(f)}: a job total`);
    for (const s of visibleStrings(src, f)) {
      if (/\b(?:flights?|fares?)\b/i.test(s)) found.push(`${show(f)}: ${JSON.stringify(s.trim().slice(0, 80))}`);
      if (/\b\d[\d,.]*\s*[kKmM]?\+?\s*(?:countries|jobs|roles|listings|openings|departures)\b/i.test(s)) {
        found.push(`${show(f)}: ${JSON.stringify(s.trim().slice(0, 80))}`);
      }
    }
  }
  assert.deepEqual(found, []);
});

test('the page is a server page with its own title, without the retired hero', () => {
  const page = readFileSync(join(ROOT, 'app/resume/page.js'), 'utf8');
  assert.ok(!/^\s*['"]use client['"]/.test(page), 'page.js is a server component');
  assert.match(page, /export const metadata\s*=\s*\{[\s\S]*?title:\s*'[^']+ — OpportuMap'/);
  for (const f of SURFACE) {
    const src = readFileSync(f, 'utf8');
    assert.ok(!/EditorialHero|useScrollReveal/.test(src), `${show(f)} uses a retired hero`);
  }
});

test('the scanner checks res.ok before reading the answer, and the picker is a real button', () => {
  const src = readFileSync(join(ROOT, 'app/components/resume/Scanner.js'), 'utf8');
  const ok = src.indexOf('res.ok');
  const json = src.indexOf('res.json()');
  assert.ok(ok > -1 && json > ok, 'res.ok is checked before res.json()');
  assert.match(src, /<button[^>]*type="button"/);
  assert.match(src, /type="file"/);
  assert.match(src, /\.value = ''/); // the same file can be picked again
  assert.match(src, /validateResumeFile\(/);
});

test('the limit is stated from one constant, and the page words a 413 with scanErrorFor', () => {
  for (const f of SURFACE) {
    for (const s of visibleStrings(readFileSync(f, 'utf8'), f)) {
      assert.ok(!/\b\d+(?:\.\d+)?\s*MB\b/.test(s), `${show(f)} hard-codes a size: ${JSON.stringify(s.trim().slice(0, 80))}`);
    }
  }
  const scanner = readFileSync(join(ROOT, 'app/components/resume/Scanner.js'), 'utf8');
  assert.match(scanner, /up to \{MAX_RESUME_LABEL\}/, 'the hint quotes the shared limit');
  assert.match(scanner, /scanErrorFor\(/, 'non-OK answers are worded by scanErrorFor');
  assert.doesNotMatch(scanner, /\b413\s*:/, 'no page-local 413 message');
  assert.doesNotMatch(scanner, /function sizeLabel/, 'the status line and the 413 message share sizeLabel');
});

test('resume.css moves only transform and opacity', () => {
  const css = readFileSync(join(ROOT, 'app/components/resume/resume.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  // Split a transition list on its top-level commas only (cubic-bezier() has its own).
  const topLevel = (v) => {
    let flat = v;
    while (/\([^()]*\)/.test(flat)) flat = flat.replace(/\([^()]*\)/g, '');
    return flat.split(',');
  };
  for (const m of css.matchAll(/transition(?:-property)?\s*:\s*([^;}]+)/g)) {
    for (const part of topLevel(m[1])) {
      const prop = part.trim().split(/\s+/)[0];
      assert.ok(['transform', 'opacity', 'none'].includes(prop), `transition on ${prop}`);
    }
  }
  for (const m of css.matchAll(/@keyframes\s+[\w-]+\s*\{((?:[^{}]*\{[^{}]*\})*)[^{}]*\}/g)) {
    for (const d of m[1].matchAll(/([\w-]+)\s*:/g)) {
      assert.ok(['transform', 'opacity'].includes(d[1]), `keyframes animate ${d[1]}`);
    }
  }
  assert.ok(!/backdrop-filter|\bfilter\s*:/.test(css), 'no filters');
  assert.ok(!/\b\d+(?:\.\d+)?vh\b/.test(css), 'svh/dvh, not vh');
});

test('resume.css: text you read is 16px on phones; the heading notes sit on their own line', () => {
  const css = readFileSync(join(ROOT, 'app/components/resume/resume.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of css.matchAll(/font(?:-size)?\s*:\s*[^;]*?\b(1[0-5]|\d)px[^;]*?var\(--font-inter\)/g)) {
    assert.fail(`Inter text under 16px: ${m[0]}`);
  }
  // The sub-labels match /interview's .iv-h-note and /cover-letter's .cl-h-note: a 16px block
  // under the 12px mono heading, never wrapping beside it.
  const sub = /\.rs-h-sub\s*\{([^}]*)\}/.exec(css);
  assert.ok(sub, '.rs-h-sub');
  assert.match(sub[1], /display:\s*block/);
  assert.match(sub[1], /font:[^;]*\b16px\b/);
  const chip = /\.rs-chip\s*\{([^}]*)\}/.exec(css);
  assert.ok(chip && /font:[^;]*\b16px\b/.test(chip[1]), '.rs-chip is 16px');
  for (const m of css.matchAll(/\.rs-(?:h-sub|chip)\b[^{]*\{([^}]*)\}/g)) {
    assert.doesNotMatch(m[1], /font-size:\s*(?:1[0-5]|\d)px/, 'no rule shrinks them again');
  }
});
