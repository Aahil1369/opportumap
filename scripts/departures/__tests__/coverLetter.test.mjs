// /cover-letter — the airmail desk (Task 11): the text Copy and Download use (the edited
// letter), the letter's layout, the answer the page renders, what it says when an answer is not
// OK, the profile and the resume it sends, and the copy and motion rules on its files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as espree from 'espree';

const {
  DEFAULT_TONE,
  TONES,
  fitToText,
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

// ── The letter fits its text without moving the page ────────────────────────────────────────

/**
 * Enough of a browser to show the jump: a page with `above` px before the letter and `below` px
 * after it. Every geometry read lays the page out, and laying out a page that is shorter than
 * scrollY + the viewport clamps scrollY, as browsers do. At height:auto the letter falls back to
 * its rows (autoHeight). With a classic scrollbar (scrollbar > 0) a letter that overflows while
 * measured wraps narrower, so its text is taller.
 */
function fakePage({ above = 600, below = 700, vh = 844, text = 2000, height = '', y = 0, autoHeight = 415, scrollbar = 0 } = {}) {
  const log = { clamps: 0, scrollTo: [], shortest: Infinity };
  const el = { text, style: { height, marginBottom: '', overflowY: '' } };
  const px = (v) => parseFloat(v) || 0;
  const box = () => (el.style.height === '' || el.style.height === 'auto' ? autoHeight : px(el.style.height));
  const win = {
    _x: 0,
    _y: y,
    scrollTo(x, to) {
      log.scrollTo.push([x, to]);
      win._y = Math.max(0, Math.min(to, layout()));
    },
  };
  function layout() {
    const page = above + box() + px(el.style.marginBottom) + below;
    log.shortest = Math.min(log.shortest, page);
    const max = Math.max(0, page - vh);
    if (win._y > max) {
      win._y = max;
      log.clamps += 1;
    }
    return max;
  }
  Object.defineProperties(win, {
    scrollX: { get: () => (layout(), win._x) },
    scrollY: { get: () => (layout(), win._y) },
  });
  Object.defineProperties(el, {
    offsetHeight: { get: () => (layout(), box()) },
    clientHeight: { get: () => (layout(), box() - 2) }, // 1px borders
    clientWidth: { get: () => (layout(), 352) },
    scrollHeight: {
      get() {
        layout();
        const client = box() - 2;
        const wraps = el.style.overflowY !== 'hidden' && el.text > client ? scrollbar : 0;
        return Math.max(el.text + wraps, client);
      },
    },
  });
  return { el, win, log };
}

/** The fit this page shipped with: collapse to auto, read, set. */
function collapsingFit(el) {
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight + 2}px`;
}

test('the fake page shows the jump: collapsing the letter to measure it clamps scrollY', () => {
  // A 2000 px letter whose end is mid-screen, 700 px of page below it.
  const start = 600 + 2002 - 422;
  const { el, win, log } = fakePage({ height: '2002px', y: start });
  el.text = 2027; // one more line
  collapsingFit(el);
  assert.ok(log.clamps > 0);
  assert.ok(win.scrollY < start - 1000, `thrown up the page: ${win.scrollY}`);
});

test('fitToText: the letter grows and shrinks to its text, borders included, and leaves nothing behind', () => {
  const { el, win } = fakePage();
  assert.equal(fitToText(el), 352, 'the width it was fitted at');
  assert.equal(el.style.height, '2002px');
  el.text = 1600;
  fitToText(el);
  assert.equal(el.style.height, '1602px');
  el.text = 120; // shorter than its rows: it keeps its own height
  fitToText(el);
  assert.equal(el.style.height, '415px');
  assert.equal(el.style.marginBottom, '');
  assert.equal(el.style.overflowY, '');
});

test('fitToText: typing near the end of a long letter never moves the page', () => {
  const start = 600 + 2002 - 422;
  const { el, win, log } = fakePage({ height: '2002px', y: start });
  for (const text of [2000, 2027, 2054, 2027, 1973, 2081]) {
    el.text = text;
    fitToText(el);
    assert.equal(win.scrollY, start, `after a ${text} px letter`);
    assert.equal(el.style.height, `${text + 2}px`);
  }
  assert.equal(log.clamps, 0, 'the page was never shorter than where it is scrolled to');
  assert.ok(log.shortest >= 600 + 1975 + 700, `the page never got shorter than the letter's text: ${log.shortest}`);
  assert.deepEqual(log.scrollTo, []);
});

test('fitToText: a real cut at the very end of the page clamps like any shorter page, and no further', () => {
  const page = { above: 600, below: 700, vh: 844 };
  const max = page.above + 2002 + page.below - page.vh;
  const { el, win } = fakePage({ ...page, height: '2002px', y: max });
  el.text = 1700; // a paragraph cut
  fitToText(el);
  assert.equal(el.style.height, '1702px');
  assert.equal(win.scrollY, max - 300);
});

test('fitToText: measured without a scrollbar, so a classic one does not over-measure the letter', () => {
  const { el, win } = fakePage({ height: '1802px', scrollbar: 48 });
  fitToText(el);
  assert.equal(el.style.height, '2002px');
});

// ── Copy and motion rules on the /cover-letter files ────────────────────────────────────────

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const show = (f) => relative(ROOT, f).split(sep).join('/');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
function walk(rel) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) return [];
  if (!statSync(abs).isDirectory()) return [abs];
  return readdirSync(abs).flatMap((name) => walk(join(rel, name)));
}
const SURFACE = ['app/cover-letter', 'app/components/coverLetter', 'lib/departures/coverLetter.js']
  .flatMap(walk)
  .filter((f) => /\.(?:js|mjs)$/.test(f));
const DESK = 'app/components/coverLetter/AirmailDesk.js';

const parse = (src, file) => {
  try {
    return espree.parse(src, { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true }, range: true });
  } catch (e) {
    throw new Error(`${file}: ${e.message}`);
  }
};
function eachNode(node, fn) {
  if (!node || typeof node.type !== 'string') return;
  fn(node);
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue;
    const v = node[key];
    if (Array.isArray(v)) v.forEach((c) => eachNode(c, fn));
    else if (v && typeof v === 'object') eachNode(v, fn);
  }
}
function visibleStrings(src, file) {
  const out = [];
  eachNode(parse(src, show(file)), (node) => {
    if (node.type === 'Literal' && typeof node.value === 'string') out.push(node.value);
    else if (node.type === 'TemplateElement') out.push(node.value.cooked ?? node.value.raw);
    else if (node.type === 'JSXText') out.push(node.value);
  });
  return out;
}
const attrs = (el) =>
  Object.fromEntries(
    el.openingElement.attributes
      .filter((a) => a.type === 'JSXAttribute')
      .map((a) => [a.name.name, a.value?.type === 'Literal' ? a.value.value : a.value ? 'expr' : true]),
  );
const tagName = (el) => el.openingElement.name.name;
/** The source of the function declared (const name = …, or function name) in `src`. */
function fnSource(src, name) {
  let found = null;
  eachNode(parse(src, name), (node) => {
    if (found) return;
    if (node.type === 'VariableDeclarator' && node.id?.name === name && node.init) found = node.init;
    else if (node.type === 'FunctionDeclaration' && node.id?.name === name) found = node;
  });
  assert.ok(found, `${name} is defined`);
  return { node: found, text: src.slice(found.range[0], found.range[1]) };
}

test('the /cover-letter surface is scanned', () => {
  const names = SURFACE.map(show);
  for (const f of ['app/cover-letter/page.js', DESK, 'app/components/coverLetter/Envelope.js', 'lib/departures/coverLetter.js']) {
    assert.ok(names.includes(f), `${f} is scanned`);
  }
  assert.ok(existsSync(join(ROOT, 'app/components/coverLetter/coverLetter.css')), 'coverLetter.css');
});

test('no "flight"/"fare" and no job totals in the /cover-letter copy', () => {
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

test('the page is a server page with its own title and the F · AIRMAIL sign, without the retired hero', () => {
  const page = read('app/cover-letter/page.js');
  assert.ok(!/^\s*['"]use client['"]/.test(page), 'page.js is a server component');
  assert.match(page, /export const metadata\s*=\s*\{[\s\S]*?title:\s*'[^']+ — OpportuMap'/);
  assert.match(page, /sign=\{\{\s*letter:\s*'F',\s*label:\s*'Airmail'\s*\}\}/);
  for (const f of SURFACE) {
    const src = readFileSync(f, 'utf8');
    assert.ok(!/EditorialHero|useScrollReveal/.test(src), `${show(f)} uses a retired hero`);
  }
});

test('the letter is an editable <textarea>, labelled, and nothing else holds it', () => {
  const src = read(DESK);
  const letters = [];
  let editable = false;
  eachNode(parse(src, DESK), (node) => {
    if (node.type !== 'JSXElement') return;
    const a = attrs(node);
    if (a.id === 'cl-letter') letters.push(tagName(node));
    if ('contentEditable' in a || 'contenteditable' in a) editable = true;
  });
  assert.deepEqual(letters, ['textarea'], 'the element with id cl-letter is one textarea');
  assert.equal(editable, false, 'no contentEditable stand-in');
  assert.match(src, /htmlFor="cl-letter"/, 'a <label htmlFor="cl-letter">');
  assert.match(src, /onChange=\{onLetterChange\}/, 'edits are kept');
});

test('the letter is fitted by fitToText, and a resize re-fits it only when its width changed', () => {
  const src = read(DESK);
  assert.match(src, /fitToText\(/, 'the desk fits the letter with fitToText');
  assert.doesNotMatch(src, /style\.height\s*=/, 'nothing in the desk collapses the letter to measure it');
  // Every resize listener's handler compares the letter's width before it re-fits (on a phone the
  // toolbars showing and hiding resize the window, never the letter's lines).
  const handlers = [];
  eachNode(parse(src, DESK), (node) => {
    if (node.type !== 'CallExpression' || node.callee.property?.name !== 'addEventListener') return;
    if (node.arguments[0]?.value !== 'resize') return;
    handlers.push(node.arguments[1]);
  });
  assert.ok(handlers.length >= 1, 'a resize listener');
  for (const h of handlers) {
    const fn = h.type === 'Identifier' ? fnSource(src, h.name).text : src.slice(h.range[0], h.range[1]);
    assert.match(fn, /clientWidth\s*!==|!==\s*[\w.]*clientWidth/, 'the handler checks the width first');
    assert.match(fn, /fitToText\(/);
  }
});

test('while the letter is typed in, no scroll anchoring moves the page, and the caret stays clear of the bars', () => {
  const css = read('app/components/coverLetter/coverLetter.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [...css.matchAll(/html:has\(#cl-letter:focus\)\s*\{([^}]*)\}/g)].map((m) => m[1]);
  assert.ok(rules.length >= 1, 'an html:has(#cl-letter:focus) rule');
  const all = rules.join(';');
  assert.match(all, /overflow-anchor:\s*none/, 'no scroll anchoring while typing');
  assert.match(all, /scroll-padding-bottom:/, 'the caret is kept above the sticky action bar');
  assert.match(all, /scroll-padding-top:/, 'and below the sticky navbar');
});

/** The ids of the elements in `rel` that carry data-lenis-prevent (and how many carry it). */
function lenisPrevented(rel) {
  const ids = [];
  let count = 0;
  eachNode(parse(read(rel), rel), (node) => {
    if (node.type !== 'JSXElement') return;
    const a = attrs(node);
    if (!('data-lenis-prevent' in a)) return;
    count += 1;
    if (typeof a.id === 'string') ids.push(a.id);
  });
  return { ids, count };
}

test('data-lenis-prevent only on panels that really scroll: never on the letter, which grows to fit', () => {
  // Lenis skips wheel events under the attribute, so a letter carrying it would scroll the page
  // natively (or fight Lenis) while everything around it scrolls smoothly.
  const desk = lenisPrevented(DESK);
  assert.ok(!desk.ids.includes('cl-letter'), '#cl-letter carries no data-lenis-prevent');
  assert.deepEqual(desk.ids, ['cl-jd'], 'only the job description, which scrolls inside itself');
  assert.equal(desk.count, desk.ids.length, 'every prevented element is a named panel');
  const sim = lenisPrevented('app/components/interview/Simulator.js');
  assert.deepEqual([...sim.ids].sort(), ['iv-answer', 'iv-desc'], 'the interview answer and description keep it');
});

test('Lenis re-measures when the page grows, so a wheel over the letter is never clamped to the first page height', () => {
  // <html> is h-full: Lenis's own ResizeObserver (on <html>) never fires when a letter is written
  // and the page grows, so its scroll limit would stay at the empty page's.
  assert.match(read('app/layout.js'), /<html\b[^>]*\bh-full\b/, 'the reason: <html> is h-full');
  const src = read('app/components/motion/SmoothScroll.js');
  assert.match(src, /new ResizeObserver\(\s*\(\)\s*=>\s*lenis\.dimensions\.resize\(\)\s*\)/, 're-measures sizes only');
  assert.match(src, /\.observe\(\s*document\.body\s*\)/, 'watches the body, which grows with the page');
  assert.match(src, /\.disconnect\(\)/, 'and lets go on unmount');
  assert.doesNotMatch(src, /lenis\.resize\(\)/, 'lenis.resize() would stop a smooth scroll in progress');
});

test('the keyword chips are 16px, like the ones on /resume', () => {
  const css = read('app/components/coverLetter/coverLetter.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const chip = /\.cl-chip\s*\{([^}]*)\}/.exec(css);
  assert.ok(chip, '.cl-chip');
  assert.match(chip[1], /font:[^;]*\b16px\b/, '.cl-chip is 16px');
  const note = /\.cl-h-note\s*\{([^}]*)\}/.exec(css);
  assert.ok(note && /display:\s*block/.test(note[1]) && /\b16px\b/.test(note[1]), '.cl-h-note is a 16px block');
  for (const m of css.matchAll(/\.cl-chip\b[^{]*\{([^}]*)\}/g)) {
    assert.doesNotMatch(m[1], /font-size:\s*(?:1[0-5]|\d)px/, 'no rule shrinks the chips again');
  }
});

test('Copy and Download use letterText (the edited text); the clipboard sits in try/catch with a fallback', () => {
  const src = read(DESK);
  const copy = fnSource(src, 'copyLetter');
  const download = fnSource(src, 'downloadLetter');
  for (const fn of [copy, download]) assert.match(fn.text, /letterText\(\s*edited\s*,/, 'reads letterText(edited, …)');

  // writeText is called inside a try block, and the catch path says what to do instead.
  let guarded = false;
  eachNode(copy.node, (node) => {
    if (node.type !== 'TryStatement') return;
    const block = src.slice(node.block.range[0], node.block.range[1]);
    if (/clipboard\.writeText\(/.test(block) && node.handler) guarded = true;
  });
  assert.ok(guarded, 'navigator.clipboard.writeText is inside try { } catch');
  assert.match(copy.text, /COPY_FALLBACK/, 'a fallback message when the clipboard says no');
  assert.match(src, /const COPY_FALLBACK\s*=\s*'[^']*(?:Ctrl|⌘)[^']*'/);
  assert.match(download.text, /new Blob\(\[\s*text\s*\]/, 'the download is the same text');
});

test('every fetch checks res.ok before reading the answer; every field is labelled', () => {
  const src = read(DESK);
  const fetches = [...src.matchAll(/await fetch\(/g)].map((m) => m.index);
  assert.ok(fetches.length >= 2, 'the profile + the letter');
  for (const at of fetches) {
    const json = src.indexOf('.json()', at);
    const ok = src.indexOf('res.ok', at);
    assert.ok(ok > -1 && json > ok, `res.ok before .json() after the fetch at ${at}`);
  }
  assert.match(src, /letterErrorFor\(/, 'non-OK answers are worded by letterErrorFor');
  const ids = [];
  eachNode(parse(src, DESK), (node) => {
    if (node.type !== 'JSXElement') return;
    const tag = tagName(node);
    const a = attrs(node);
    if ((tag === 'textarea' || (tag === 'input' && a.type !== 'radio')) && typeof a.id === 'string') ids.push(a.id);
  });
  for (const id of ['cl-jd', 'cl-resume', 'cl-letter']) assert.ok(ids.includes(id), `#${id}`);
  for (const id of ids) assert.ok(src.includes(`htmlFor="${id}"`), `a <label htmlFor> for #${id}`);
});

test('the tone picker is a set of radio luggage tags with a legend', () => {
  const src = read(DESK);
  assert.match(src, /<fieldset\b/);
  assert.match(src, /<legend\b/);
  assert.match(src, /type="radio"/);
  assert.match(src, /name="cl-tone"/);
  assert.match(src, /TONES\.map\(/);
});

test('the envelope is art (aria-hidden) that plays only when asked, and reports when it is done', () => {
  const src = read('app/components/coverLetter/Envelope.js');
  assert.match(src, /aria-hidden="true"/);
  assert.match(src, /data-play=\{play \? '' : undefined\}/);
  assert.match(src, /onAnimationEnd=/);
  assert.match(src, /PAR AVION/);
});

test('coverLetter.css moves only transform and opacity, under no-preference only', () => {
  const css = read('app/components/coverLetter/coverLetter.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const allowed = ['transform', 'opacity', 'none'];
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
  const frames = [...css.matchAll(/@keyframes\s+[\w-]+\s*\{((?:[^{}]*\{[^{}]*\})*)[^{}]*\}/g)];
  assert.ok(frames.length >= 3, 'the fold, the flap and the stamp are keyframes');
  for (const m of frames) {
    for (const d of m[1].matchAll(/([\w-]+)\s*:/g)) {
      assert.ok(['transform', 'opacity'].includes(d[1]), `keyframes animate ${d[1]}`);
    }
  }
  // Every animation is declared inside the no-preference block: reduced motion gets the end state.
  const motion = /@media\s*\(prefers-reduced-motion:\s*no-preference\)\s*\{([\s\S]*?)\n\}/.exec(css);
  assert.ok(motion, 'a prefers-reduced-motion: no-preference block');
  const outside = css.replace(motion[0], '');
  assert.ok(!/\banimation(?:-name)?\s*:\s*(?!none)[\w-]/.test(outside), 'no animation outside no-preference');
  assert.ok(!/backdrop-filter|\bfilter\s*:/.test(css), 'no filters');
  assert.ok(!/\b\d+(?:\.\d+)?vh\b/.test(css), 'svh/dvh, not vh');
  assert.ok(!/atan2|\b(?:a?sin|a?cos|a?tan)\(/i.test(css), 'no CSS trig');
  const field = /\.cl-field\s*\{([^}]*)\}/.exec(css);
  assert.ok(field && /font:[^;]*\b16px\b|font-size:\s*16px/.test(field[1]), '.cl-field is 16px');
  for (const m of css.matchAll(/font(?:-size)?\s*:\s*[^;]*?\b(1[0-5]|\d)px[^;]*?var\(--font-inter\)/g)) {
    assert.fail(`Inter text under 16px: ${m[0]}`);
  }
});
