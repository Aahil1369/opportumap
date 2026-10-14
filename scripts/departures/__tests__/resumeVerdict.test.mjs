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
  MIN_RESUME_TEXT,
  UNREADABLE_PDF,
  normalizeScore,
  resumeVerdict,
  validateResumeFile,
  hasReadableText,
  normalizeGrade,
  jobsHref,
} = await import(new URL('../../../lib/departures/resumeVerdict.js', import.meta.url));

const MB = 1024 * 1024;
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

test('the limit is 10 MB (MiB, as the picker and Finder count it)', () => {
  assert.equal(MAX_RESUME_BYTES, 10 * MB);
});

test('a PDF up to 10 MB is accepted', () => {
  assert.deepEqual(validateResumeFile(pdf(200_000)), { ok: true });
  assert.deepEqual(validateResumeFile(pdf(10 * MB)), { ok: true });
});

test('over 10 MB is refused with its size and the limit', () => {
  const r = validateResumeFile(pdf(11 * MB));
  assert.equal(r.ok, false);
  assert.match(r.error, /11\.0 MB/);
  assert.match(r.error, /10 MB/);
  // One byte over still says more than 10 (rounded up, never "10.0 MB is over 10 MB").
  const edge = validateResumeFile(pdf(10 * MB + 1));
  assert.equal(edge.ok, false);
  assert.match(edge.error, /10\.1 MB/);
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
