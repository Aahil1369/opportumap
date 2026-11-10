// Go-live fixes for the tool pages: the resume X-ray (/resume), the interview simulator
// (/interview) and the airmail desk (/cover-letter). Source tests for the CSS; the simulator's
// focus effect is run against stand-in elements.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

const RESUME_CSS = 'app/components/resume/resume.css';
const INTERVIEW_CSS = 'app/components/interview/interview.css';
const COVER_CSS = 'app/components/coverLetter/coverLetter.css';
const SIMULATOR = 'app/components/interview/Simulator.js';

/**
 * Every style rule of a stylesheet, comments removed, in source order:
 * { selectors: ['.a', '.b:hover'], body: 'color: red;', at: ['@media (hover: hover)', …] },
 * `at` being the @-rules it sits in, outermost first. Keyframe steps are not rules.
 */
function cssRules(css) {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  const open = [];
  let buf = '';
  for (const ch of src) {
    if (ch === '{') {
      open.push(buf.trim());
      buf = '';
    } else if (ch === '}') {
      const prelude = open.pop() ?? '';
      if (!prelude.startsWith('@') && !open.some((p) => p.startsWith('@keyframes'))) {
        rules.push({ selectors: prelude.split(',').map((s) => s.trim()), body: buf.trim(), at: [...open] });
      }
      buf = '';
    } else {
      buf += ch;
    }
  }
  return rules;
}

/** The body of the one top-level rule whose only selector is `selector` (not a rule inside @media). */
function ruleBody(file, selector) {
  const found = cssRules(read(file)).filter((r) => r.at.length === 0 && r.selectors.length === 1 && r.selectors[0] === selector);
  assert.equal(found.length, 1, `${file}: one top-level ${selector} rule`);
  return found[0].body;
}

// ── tools-s1: a long file name must not widen the /resume result past a phone screen ──────────

test('tools-s1 resume.css: the .rs column cannot grow past the page', () => {
  assert.match(ruleBody(RESUME_CSS, '.rs'), /(?:^|;)\s*grid-template-columns:\s*minmax\(0, 1fr\);/);
});

// ── R25 (tools-s2, experience-s1): the interview lands under the sticky navbar ────────────────

test('R25 interview.css: what the simulator scrolls to or focuses lands clear of the 61px navbar', () => {
  const rules = cssRules(read(INTERVIEW_CSS)).filter((r) => r.at.length === 0);
  for (const group of [
    ['.iv-instruments', '.iv-cockpit', '.iv-plate'],
    ['.iv-h', '.iv-status', '.iv-score-n'],
  ]) {
    const rule = rules.find((r) => r.selectors.join(', ') === group.join(', '));
    assert.ok(rule, `a "${group.join(', ')}" rule`);
    assert.match(rule.body, /^scroll-margin-top:\s*72px;$/, group.join(', '));
  }
});

/**
 * The simulator's focus effect, cut from Simulator.js and run against stand-ins. It answers the
 * calls in order, each with the page's inline scroll-behavior at that moment.
 */
function runFocusEffect(target, { bottom = 300, innerHeight = 844, dial = true } = {}) {
  const src = /\n  useEffect\(\(\) => \{\n(    const target = focusNext\.current;\n[\s\S]*?)\n  \}\);\n/.exec(read(SIMULATOR));
  assert.ok(src, 'the focus effect in Simulator.js');
  const effect = new Function('focusNext', 'refs', 'document', 'window', src[1]);
  const html = { style: { scrollBehavior: 'smooth' } };
  const calls = [];
  const note = (what, arg) => calls.push(`${what}(${arg === undefined ? '' : JSON.stringify(arg)}) scroll-behavior=${html.style.scrollBehavior}`);
  const box = (name) => ({ scrollIntoView: (arg) => note(`${name}.scrollIntoView`, arg) });
  const card = box('card');
  const panel = { querySelector: (sel) => (dial && sel === '.iv-instruments' ? box('dial') : null) };
  const el = {
    closest: (sel) => ({ '.iv-cockpit, .iv-plate': card, '.iv-panel': panel })[sel] ?? null,
    getBoundingClientRect: () => ({ bottom }),
    focus: (arg) => note('focus', arg),
  };
  const focusNext = { current: target };
  effect(focusNext, { [target]: { current: el } }, { documentElement: html }, { innerHeight });
  assert.equal(focusNext.current, null, 'the request is used up');
  assert.equal(html.style.scrollBehavior, 'smooth', 'scroll-behavior is put back');
  return calls;
}

test('R25 Simulator.js: a new question or the verdict is scrolled at once, then focused without a second scroll', () => {
  for (const target of ['question', 'verdict']) {
    assert.deepEqual(
      runFocusEffect(target),
      ['dial.scrollIntoView({"block":"start"}) scroll-behavior=auto', 'focus({"preventScroll":true}) scroll-behavior=smooth'],
      `${target}: the altimeter goes under the navbar, the card below it`,
    );
    assert.deepEqual(
      runFocusEffect(target, { bottom: 900 }),
      [
        'dial.scrollIntoView({"block":"start"}) scroll-behavior=auto',
        'card.scrollIntoView({"block":"start"}) scroll-behavior=auto',
        'focus({"preventScroll":true}) scroll-behavior=smooth',
      ],
      `${target}: on a short screen the card itself goes under the navbar`,
    );
    assert.deepEqual(
      runFocusEffect(target, { dial: false }),
      ['card.scrollIntoView({"block":"start"}) scroll-behavior=auto', 'focus({"preventScroll":true}) scroll-behavior=smooth'],
      `${target}: no altimeter, the card`,
    );
  }
});

test('R25 Simulator.js: every other focus target is focused as before', () => {
  for (const target of ['checklist', 'title', 'change', 'status', 'score', 'answer']) {
    assert.deepEqual(runFocusEffect(target), ['focus() scroll-behavior=smooth'], target);
  }
});

// ── R26 (tools-s3): the edges of text fields and ghost buttons are 3:1 ────────────────────────

/** A rule body's declarations: { border: '1px solid var(--rule)', … }. */
function declarations(body) {
  const pairs = body.split(';').map((d) => d.trim()).filter(Boolean);
  return Object.fromEntries(pairs.map((d) => [d.slice(0, d.indexOf(':')).trim(), d.slice(d.indexOf(':') + 1).trim()]));
}

/** A palette colour from app/globals.css, as #rrggbb. */
function palette(token) {
  const found = new RegExp(`--${token}:\\s*(#[0-9a-f]{6});`, 'i').exec(read('app/globals.css'));
  assert.ok(found, `--${token} in globals.css`);
  return found[1];
}

/** WCAG 2.x contrast of two #rrggbb colours. */
function contrast(a, b) {
  const lum = (hex) => {
    const [r, g, b2] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const c = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b2);
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** color-mix(in srgb, a p, b): #rrggbb. */
function mix(a, b, p) {
  const ch = (hex, i) => parseInt(hex.slice(i, i + 2), 16);
  return `#${[1, 3, 5].map((i) => Math.round(ch(a, i) * p + ch(b, i) * (1 - p)).toString(16).padStart(2, '0')).join('')}`;
}

test('R26 text fields and ghost buttons on the tool pages rest on a page-local 3:1 edge', () => {
  for (const page of [
    { file: INTERVIEW_CSS, root: '.iv', token: '--iv-field', field: '.iv-field', ghost: '.iv-btn-2' },
    { file: COVER_CSS, root: '.cl', token: '--cl-field', field: '.cl-field', ghost: '.cl-btn-2' },
    { file: RESUME_CSS, root: '.rs', token: '--rs-field', ghost: '.rs-btn-2' },
  ]) {
    assert.equal(
      declarations(ruleBody(page.file, page.root))[page.token],
      'color-mix(in srgb, var(--ink-sub) 60%, var(--hall-2))',
      `${page.root} defines ${page.token} as the mix the other pages use`,
    );
    if (page.field) {
      const field = ruleBody(page.file, page.field);
      assert.equal(declarations(field).border, `1px solid var(${page.token})`, `${page.field} border`);
      assert.doesNotMatch(field, /var\(--rule\)/, `${page.field} no longer rests on --rule`);
    }
    const ghost = ruleBody(page.file, page.ghost);
    assert.equal(declarations(ghost)['box-shadow'], `inset 0 0 0 1px var(${page.token})`, `${page.ghost} edge`);
    assert.doesNotMatch(ghost, /var\(--rule\)/, `${page.ghost} no longer rests on --rule`);
  }
  // The mix, from the palette: 3:1 or better on the hall, on the cards and on the field fill.
  const edge = mix(palette('ink-sub'), palette('hall-2'), 0.6);
  for (const bg of ['hall', 'hall-2', 'hall-3']) {
    const ratio = contrast(edge, palette(bg));
    assert.ok(ratio >= 3, `${edge} on --${bg}: ${ratio.toFixed(2)}:1`);
  }
});

// ── tools-s4: a long unbroken URL in an AI answer wraps instead of widening the page ──────────

test('tools-s4 the resume report and the interview feedback wrap long unbroken text', () => {
  for (const [file, selector] of [
    [RESUME_CSS, '.rs-result'],
    [INTERVIEW_CSS, '.iv-fb'],
  ]) {
    assert.equal(declarations(ruleBody(file, selector))['overflow-wrap'], 'anywhere', `${selector} in ${file}`);
  }
});
