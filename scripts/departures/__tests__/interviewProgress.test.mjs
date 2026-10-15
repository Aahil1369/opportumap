// /interview — the simulator (Task 10): the altimeter's progress, the takeoff verdict, stable
// question keys, the answers the page renders, the debrief preview, and the copy and motion
// rules on its files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as espree from 'espree';

const {
  CLEARED,
  CLEARED_AVG,
  GO_AROUND,
  MAX_QUESTIONS,
  averageScore,
  interviewProgress,
  nextOpen,
  normalizeFeedback,
  normalizeQuestions,
  previewText,
  questionKeys,
  scoreTone,
  scoresOf,
  simErrorFor,
  takeoffVerdict,
  tally,
} = await import(new URL('../../../lib/departures/interviewProgress.js', import.meta.url));

const answered = (score) => ({ status: 'answered', feedback: { score } });
const skipped = { status: 'skipped' };

// ── The altimeter ───────────────────────────────────────────────────────────────────────────

test('progress climbs from 0 and reaches 100 only when every question is done', () => {
  assert.equal(interviewProgress(0, 15), 0);
  assert.equal(interviewProgress(1, 15), 6);
  assert.equal(interviewProgress(7, 15), 46);
  assert.equal(interviewProgress(14, 15), 93);
  assert.equal(interviewProgress(15, 15), 100);
  // Never 100 one short of the end (rounding would say 100 at 199 of 200).
  assert.equal(interviewProgress(199, 200), 99);
  // One done always moves the needle.
  assert.equal(interviewProgress(1, 1000), 1);
  // More done than asked (a stale count) is still the top, never past it.
  assert.equal(interviewProgress(16, 15), 100);
});

test('progress is 0 for nothing to do or nonsense input', () => {
  for (const [a, t] of [
    [0, 0],
    [3, 0],
    [-2, 15],
    [NaN, 15],
    [5, NaN],
    [undefined, undefined],
    ['x', 15],
  ]) {
    assert.equal(interviewProgress(a, t), 0, `interviewProgress(${a}, ${t})`);
  }
  assert.equal(interviewProgress('15', '15'), 100);
});

test('answered and skipped both count as done: a mixed run reaches 100', () => {
  const keys = ['a', 'b', 'c', 'd', 'e'];
  const results = { a: answered(8), b: skipped, c: answered(6), d: skipped, e: answered(9) };
  assert.deepEqual(tally(keys, results), { answered: 3, skipped: 2, done: 5, open: 0, total: 5 });
  assert.equal(interviewProgress(tally(keys, results).done, keys.length), 100);

  const allSkipped = Object.fromEntries(keys.map((k) => [k, skipped]));
  assert.equal(interviewProgress(tally(keys, allSkipped).done, keys.length), 100);

  const partial = { a: answered(8), c: skipped };
  assert.deepEqual(tally(keys, partial), { answered: 1, skipped: 1, done: 2, open: 3, total: 5 });
  assert.equal(interviewProgress(tally(keys, partial).done, keys.length), 40);
});

test('results for keys no longer on the checklist are not counted', () => {
  const results = { a: answered(8), gone: answered(10), b: { status: 'scoring' } };
  assert.deepEqual(tally(['a', 'b'], results), { answered: 1, skipped: 0, done: 1, open: 1, total: 2 });
  assert.deepEqual(tally(undefined, undefined), { answered: 0, skipped: 0, done: 0, open: 0, total: 0 });
});

test('nextOpen goes forward to the next question not yet done, wrapping round', () => {
  const keys = ['a', 'b', 'c', 'd'];
  assert.equal(nextOpen(keys, {}, 0), 1);
  assert.equal(nextOpen(keys, { b: skipped }, 0), 2);
  assert.equal(nextOpen(keys, { c: answered(5), d: skipped }, 1), 0); // wraps past the end
  assert.equal(nextOpen(keys, { a: skipped, b: skipped, c: skipped, d: skipped }, 2), -1);
  // The current question itself is the last resort, when it is the only one left.
  assert.equal(nextOpen(keys, { a: skipped, b: skipped, d: skipped }, 2), 2);
  assert.equal(nextOpen([], {}, 0), -1);
});

// ── The verdict ─────────────────────────────────────────────────────────────────────────────

test('CLEARED FOR TAKEOFF from an average of 7, GO-AROUND below', () => {
  assert.equal(CLEARED_AVG, 7);
  assert.equal(CLEARED, 'CLEARED FOR TAKEOFF');
  assert.equal(GO_AROUND, 'GO-AROUND');
  assert.equal(takeoffVerdict([7]), CLEARED);
  assert.equal(takeoffVerdict([7, 7, 7]), CLEARED);
  assert.equal(takeoffVerdict([6, 8]), CLEARED); // exactly 7
  assert.equal(takeoffVerdict([10, 9, 4]), CLEARED); // 7.67
  assert.equal(takeoffVerdict([7, 6]), GO_AROUND); // 6.5
  assert.equal(takeoffVerdict([6.9]), GO_AROUND);
  assert.equal(takeoffVerdict([1, 2, 3]), GO_AROUND);
});

test('the verdict agrees with the average the plate shows (one decimal)', () => {
  assert.equal(averageScore([7, 6, 8]), 7);
  assert.equal(averageScore([8, 7, 7]), 7.3);
  assert.equal(averageScore([6.95]), 7); // shown as 7.0, so it is cleared
  assert.equal(takeoffVerdict([6.95]), CLEARED);
  assert.equal(averageScore([6.94]), 6.9);
  assert.equal(takeoffVerdict([6.94]), GO_AROUND);
});

test('nothing scored is never cleared; non-numbers are not scores', () => {
  assert.equal(averageScore([]), null);
  assert.equal(averageScore(undefined), null);
  assert.equal(takeoffVerdict([]), GO_AROUND);
  assert.equal(takeoffVerdict(undefined), GO_AROUND);
  assert.equal(takeoffVerdict([null, undefined, NaN, 'abc']), GO_AROUND);
  assert.equal(averageScore([9, null, 'x', 7]), 8);
  assert.equal(takeoffVerdict([9, null, NaN]), CLEARED);
});

test('scoresOf reads the answered scores in checklist order; skips are not scores', () => {
  const keys = ['a', 'b', 'c', 'd'];
  assert.deepEqual(scoresOf(keys, { d: answered(9), a: answered(6), b: skipped }), [6, 9]);
  assert.equal(takeoffVerdict(scoresOf(keys, { a: skipped, b: skipped })), GO_AROUND);
});

test('an answer is lit ok from 7, amber below', () => {
  assert.equal(scoreTone(7), 'ok');
  assert.equal(scoreTone(10), 'ok');
  assert.equal(scoreTone(6.9), 'amber');
  assert.equal(scoreTone(0), 'amber');
  assert.equal(scoreTone(undefined), 'amber');
});

// ── Stable keys ─────────────────────────────────────────────────────────────────────────────

test('a key comes from the question id, or its place when it has none', () => {
  const keys = questionKeys([{ id: 7 }, {}, { id: 'b3' }]);
  assert.match(keys[0], /7/);
  assert.match(keys[1], /1/);
  assert.match(keys[2], /b3/);
  // An id and a place with the same number are different questions.
  const mixed = questionKeys([{ id: 1 }, {}]);
  assert.notEqual(mixed[0], questionKeys([{}, {}])[1]);
  assert.equal(new Set(questionKeys([{ id: 1 }, { id: 0 }, {}])).size, 3);
});

test('keys stay unique with duplicate, missing, null and blank ids', () => {
  const qs = [{ id: 1 }, { id: 1 }, { id: 1 }, {}, { id: null }, { id: '' }, { id: '  ' }, { id: 3 }, null, { id: '1' }];
  const keys = questionKeys(qs);
  assert.equal(keys.length, qs.length);
  assert.equal(new Set(keys).size, qs.length, `unique: ${keys.join(' ')}`);
  for (const k of keys) assert.equal(typeof k, 'string');
});

test('keys are stable: the same list gives the same keys, appending keeps the earlier ones', () => {
  const qs = [{ id: 2 }, { id: 2 }, {}, { id: 5 }];
  assert.deepEqual(questionKeys(qs), questionKeys(qs.map((q) => ({ ...q }))));
  const longer = questionKeys([...qs, { id: 2 }, {}, { id: 5 }]);
  assert.deepEqual(longer.slice(0, qs.length), questionKeys(qs));
  assert.equal(new Set(longer).size, longer.length);
  // A key that a duplicate would be renamed to cannot collide with a real id either.
  const tricky = questionKeys([{ id: 1 }, { id: 1 }, { id: `${questionKeys([{ id: 1 }, { id: 1 }])[1].replace(/^\D*/, '')}` }]);
  assert.equal(new Set(tricky).size, 3);
  assert.deepEqual(questionKeys(undefined), []);
});

// ── The checklist the page renders ──────────────────────────────────────────────────────────

test('normalizeQuestions keeps real questions, with keys, categories and trimmed text', () => {
  const qs = normalizeQuestions({
    questions: [
      { id: 1, category: 'Behavioral', question: '  Tell me about a time you failed. ', why: ' Ownership ', howToAnswer: 'STAR', exampleAnswer: 'I…' },
      { id: 2, category: 'technical/role-specific', question: 'Design a rate limiter.' },
      { id: 2, category: 'culture fit', question: 'Why us?' },
      { id: 4, category: 'behavioural', question: 'Describe a conflict.' },
      { id: 5, category: 'astrology', question: 'What is your sign?' },
      { id: 6, category: 'technical', question: '   ' },
      { id: 7, question: 42 },
      'not a question',
      null,
      { id: 8, category: 'culture', question: 'why us?' }, // the same question again
    ],
  });
  assert.deepEqual(
    qs.map((q) => [q.category, q.question]),
    [
      ['behavioral', 'Tell me about a time you failed.'],
      ['technical', 'Design a rate limiter.'],
      ['culture', 'Why us?'],
      ['behavioral', 'Describe a conflict.'],
      ['general', 'What is your sign?'],
    ],
  );
  assert.equal(qs[0].why, 'Ownership');
  assert.equal(qs[0].howToAnswer, 'STAR');
  assert.equal(qs[1].why, '');
  assert.equal(new Set(qs.map((q) => q.key)).size, qs.length, 'keys unique even with the duplicate id 2');
  // Keys come from the answer as sent, so they do not shift when a blank question is dropped.
  assert.deepEqual(
    qs.map((q) => q.key),
    questionKeys([{ id: 1 }, { id: 2 }, { id: 2 }, { id: 4 }, { id: 5 }]),
  );
});

test('normalizeQuestions takes a bare list, caps the checklist, and refuses junk', () => {
  const many = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, category: 'technical', question: `Question ${i + 1}?` }));
  assert.equal(MAX_QUESTIONS, 15);
  assert.equal(normalizeQuestions(many).length, 15);
  assert.equal(normalizeQuestions({ questions: many }).length, 15);
  for (const junk of [null, undefined, 'x', 42, {}, { questions: 'no' }]) {
    assert.deepEqual(normalizeQuestions(junk), [], String(junk));
  }
  const long = normalizeQuestions([{ question: 'x'.repeat(5000), why: 'y'.repeat(5000) }])[0];
  assert.ok(long.question.length <= 600 && long.why.length <= 1200, 'capped');
});

test('normalizeFeedback: a score out of 10 and the lists, or null without a score', () => {
  const fb = normalizeFeedback({
    score: '8',
    verdict: '  Solid, specific answer. ',
    whatWorked: ['Clear structure', '', 7, null, 'Clear structure'],
    whatToImprove: 'not a list',
    strongerVersion: ' Better. ',
    tips: ['Lead with the result'],
  });
  assert.deepEqual(fb, {
    score: 8,
    verdict: 'Solid, specific answer.',
    whatWorked: ['Clear structure'],
    whatToImprove: [],
    strongerVersion: 'Better.',
    tips: ['Lead with the result'],
  });
  assert.equal(normalizeFeedback({ score: 12 }).score, 10);
  assert.equal(normalizeFeedback({ score: -1 }).score, 0);
  assert.equal(normalizeFeedback({ score: 7.46 }).score, 7.5);
  for (const v of [null, undefined, 'x', {}, { score: 'abc' }, { score: null }, { score: '' }, { verdict: 'ok' }]) {
    assert.equal(normalizeFeedback(v), null, JSON.stringify(v));
  }
});

// ── The debrief preview ─────────────────────────────────────────────────────────────────────

test('a short question is shown whole, with no stray ellipsis', () => {
  assert.equal(previewText('Why us?', 60), 'Why us?');
  assert.equal(previewText('Tell me about yourself.'), 'Tell me about yourself.');
  const exact = 'x'.repeat(60);
  assert.equal(previewText(exact, 60), exact);
  assert.equal(previewText('  Why   this\n team? ', 60), 'Why this team?');
  assert.equal(previewText(undefined), '');
  assert.equal(previewText(null, 10), '');
});

test('a long question is cut at a word, and only then gets the ellipsis', () => {
  const q = 'Tell me about a time you had to deliver difficult feedback to a senior colleague, and what happened next.';
  const p = previewText(q, 60);
  assert.ok(p.endsWith('…'), p);
  assert.ok(Array.from(p).length <= 60, `${p} is at most 60`);
  assert.ok(q.startsWith(p.slice(0, -1)), 'a prefix of the question');
  assert.doesNotMatch(p, /[\s,;:.—-]…$/, 'no space or punctuation before the ellipsis');
  const word = p.slice(0, -1).split(' ').pop();
  assert.ok(q.split(/[\s,]+/).includes(word), `"${word}" is a whole word`);
  // A cut that lands on a word end keeps that word.
  assert.equal(previewText('aaa bbb ccc', 8), 'aaa bbb…');
  // One long unbroken word is cut hard rather than shown as just "…".
  assert.equal(previewText('x'.repeat(100), 10), `${'x'.repeat(9)}…`);
});

// ── What the page says when an answer is not OK ─────────────────────────────────────────────

test('simErrorFor words a failed answer; raw server errors never reach the page', () => {
  assert.equal(simErrorFor(400, 'Job title and company are required', 'questions'), 'Job title and company are required');
  assert.equal(simErrorFor(400, 'Question and answer required', 'feedback'), 'Question and answer required');
  for (const status of [429, 503]) {
    assert.match(simErrorFor(status, undefined, 'feedback'), /busy/);
    assert.match(simErrorFor(status, 'whatever', 'questions'), /busy/);
  }
  // The routes answer 500 with the raw error text; that is never shown.
  const raw = '429 {"error":{"message":"Rate limit reached for model openai/gpt-oss-120b"}}';
  assert.match(simErrorFor(500, raw, 'feedback'), /busy/);
  const leak = simErrorFor(500, 'TypeError: Cannot read properties of undefined (reading "0")', 'feedback');
  assert.doesNotMatch(leak, /TypeError|undefined/);
  assert.match(leak, /score/i);
  assert.match(simErrorFor(500, undefined, 'questions'), /checklist/i);
  assert.match(simErrorFor(502, 42, 'questions'), /checklist/i);
  assert.match(simErrorFor(404, undefined, 'feedback'), /score/i);
  // A 400 without its own text still says something useful.
  assert.match(simErrorFor(400, undefined, 'questions'), /title/i);
  assert.match(simErrorFor(400, '', 'feedback'), /answer/i);
});

// ── Copy and motion rules on the /interview files ───────────────────────────────────────────

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const show = (f) => relative(ROOT, f).split(sep).join('/');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
function walk(rel) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) return [];
  if (!statSync(abs).isDirectory()) return [abs];
  return readdirSync(abs).flatMap((name) => walk(join(rel, name)));
}
const SURFACE = ['app/interview', 'app/components/interview', 'lib/departures/interviewProgress.js']
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

test('the /interview surface is scanned', () => {
  const names = SURFACE.map(show);
  for (const f of [
    'app/interview/page.js',
    'app/components/interview/Simulator.js',
    'app/components/interview/Altimeter.js',
    'lib/departures/interviewProgress.js',
  ]) {
    assert.ok(names.includes(f), `${f} is scanned`);
  }
  assert.ok(existsSync(join(ROOT, 'app/components/interview/interview.css')), 'interview.css');
});

test('no "flight"/"fare" and no job totals in the /interview copy', () => {
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

test('the page is a server page with its own title and the D · SIMULATOR sign, without the retired hero', () => {
  const page = read('app/interview/page.js');
  assert.ok(!/^\s*['"]use client['"]/.test(page), 'page.js is a server component');
  assert.match(page, /export const metadata\s*=\s*\{[\s\S]*?title:\s*'[^']+ — OpportuMap'/);
  assert.match(page, /sign=\{\{\s*letter:\s*'D',\s*label:\s*'Simulator'\s*\}\}/);
  for (const f of SURFACE) {
    const src = readFileSync(f, 'utf8');
    assert.ok(!/EditorialHero|useScrollReveal/.test(src), `${show(f)} uses a retired hero`);
  }
});

test('every fetch checks res.ok before reading the answer; the inputs are labelled', () => {
  const src = read('app/components/interview/Simulator.js');
  const fetches = [...src.matchAll(/await fetch\(/g)].map((m) => m.index);
  assert.ok(fetches.length >= 2, 'questions + feedback');
  for (const at of fetches) {
    const json = src.indexOf('.json()', at);
    const ok = src.indexOf('res.ok', at);
    assert.ok(ok > -1 && json > ok, `res.ok before .json() after the fetch at ${at}`);
  }
  assert.match(src, /simErrorFor\(/, 'non-OK answers are worded by simErrorFor');
  const ids = [...src.matchAll(/<(?:input|textarea)\b[^>]*\bid=(?:"([^"]+)"|\{`([^`]+)`\})/g)].map((m) => m[1] ?? m[2]);
  assert.ok(ids.length >= 4, `title, company, description, answer: ${ids.join(', ')}`);
  for (const id of ids) {
    const lit = id.includes('${') ? id.split('${')[0] : id;
    assert.ok(src.includes(`htmlFor="${id}"`) || src.includes(`htmlFor={\`${lit}`), `a <label htmlFor> for ${id}`);
  }
  assert.match(src, />\s*Skip\b/, 'a Skip button');
});

test('the altimeter is a real progressbar that moves by transform', () => {
  const src = read('app/components/interview/Altimeter.js');
  assert.match(src, /role="progressbar"/);
  assert.match(src, /aria-valuenow=\{/);
  assert.match(src, /aria-valuemin=\{0\}/);
  assert.match(src, /aria-valuemax=\{100\}/);
  assert.match(src, /transform:\s*`rotate\(/, 'the needle turns by transform');
});

test('interview.css moves only transform and opacity (and a short stroke-dashoffset)', () => {
  const css = read('app/components/interview/interview.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const allowed = ['transform', 'opacity', 'stroke-dashoffset', 'none'];
  const topLevel = (v) => {
    let flat = v;
    while (/\([^()]*\)/.test(flat)) flat = flat.replace(/\([^()]*\)/g, '');
    return flat.split(',');
  };
  for (const m of css.matchAll(/transition(?:-property)?\s*:\s*([^;}]+)/g)) {
    for (const part of topLevel(m[1])) {
      const prop = part.trim().split(/\s+/)[0];
      assert.ok(allowed.includes(prop), `transition on ${prop}`);
    }
  }
  for (const m of css.matchAll(/@keyframes\s+[\w-]+\s*\{((?:[^{}]*\{[^{}]*\})*)[^{}]*\}/g)) {
    for (const d of m[1].matchAll(/([\w-]+)\s*:/g)) {
      assert.ok(['transform', 'opacity'].includes(d[1]), `keyframes animate ${d[1]}`);
    }
  }
  assert.ok(!/backdrop-filter|\bfilter\s*:/.test(css), 'no filters');
  assert.ok(!/\b\d+(?:\.\d+)?vh\b/.test(css), 'svh/dvh, not vh');
  assert.ok(!/atan2|\b(?:a?sin|a?cos|a?tan)\(/i.test(css), 'no CSS trig');
  // Phones: what you type is 16px (no iOS zoom), and so is the text you read.
  const field = /\.iv-field\s*\{([^}]*)\}/.exec(css);
  assert.ok(field && /font:[^;]*\b16px\b|font-size:\s*16px/.test(field[1]), '.iv-field is 16px');
  for (const m of css.matchAll(/font(?:-size)?\s*:\s*[^;]*?\b(1[0-5]|\d)px[^;]*?var\(--font-inter\)/g)) {
    assert.fail(`Inter text under 16px: ${m[0]}`);
  }
});
