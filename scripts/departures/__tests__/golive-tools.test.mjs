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
