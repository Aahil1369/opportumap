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
