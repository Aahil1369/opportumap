// Task 7-12: site-wide hover guard. Every rule whose selector contains :hover must be inside an
// @media (hover: hover) block. Nesting inside other @media blocks is fine.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** Every .css file under rel as a repo path with forward slashes. */
function cssFiles(rel) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) return [];
  if (!statSync(abs).isDirectory()) return rel.endsWith('.css') ? [rel] : [];
  return readdirSync(abs)
    .filter((name) => name !== 'node_modules' && name !== '.next')
    .flatMap((name) => cssFiles(posix.join(rel, name)));
}

/**
 * The :hover selectors in css that sit outside every @media (hover: hover) block, as
 * { line, selector } (line in the original text). Comments are blanked first (same length, so
 * line numbers hold); any :hover left after the hover blocks are cut is an offender, whatever
 * follows it (` .child`, `::after`, `:not(…)`, `)`, `,` or `{`).
 */
export function unguardedHovers(source) {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
  let kept = '';
  let i = 0;
  while (i < css.length) {
    const at = css.indexOf('@media', i);
    if (at === -1) {
      kept += css.substring(i);
      break;
    }
    const open = css.indexOf('{', at);
    if (open === -1) {
      kept += css.substring(i);
      break;
    }
    if (/\(\s*hover\s*:\s*hover\s*\)/.test(css.substring(at, open))) {
      kept += css.substring(i, at);
      let depth = 1;
      let j = open + 1;
      while (j < css.length && depth > 0) {
        if (css[j] === '{') depth++;
        if (css[j] === '}') depth--;
        j++;
      }
      // Keep the cut block's line breaks so later line numbers stay right.
      kept += css.substring(at, j).replace(/[^\n]/g, ' ');
      i = j;
    } else {
      kept += css.substring(i, open + 1);
      i = open + 1;
    }
  }
  const found = [];
  for (const m of kept.matchAll(/:hover\b/g)) {
    const line = kept.slice(0, m.index).split('\n').length;
    const start = Math.max(kept.lastIndexOf('{', m.index), kept.lastIndexOf('}', m.index), kept.lastIndexOf(';', m.index)) + 1;
    const end = kept.indexOf('{', m.index);
    found.push({ line, selector: kept.slice(start, end === -1 ? undefined : end).replace(/\s+/g, ' ').trim() });
  }
  return found;
}

test('the hover guard itself: every unguarded :hover form is caught, guarded ones are not', () => {
  for (const css of [
    '.a:hover { color: red; }',
    '.a:hover .b { color: red; }',
    '.a:hover > .b { color: red; }',
    '.a:hover::after { opacity: 1; }',
    'button:hover:not(:disabled) { color: red; }',
    '.a:is(:focus-visible, :hover) { color: red; }',
    '.x, .a:hover { color: red; }',
    '@media (prefers-reduced-motion: reduce) { .a:hover .b { transform: none; } }',
  ]) {
    assert.equal(unguardedHovers(css).length, 1, css);
  }
  for (const css of [
    '@media (hover: hover) { .a:hover .b { color: red; } }',
    '@media (hover: hover) and (pointer: fine) { .a:hover::after { opacity: 1; } }',
    '@media (prefers-reduced-motion: reduce) { @media (hover: hover) { .a:hover { transform: none; } } }',
    '/* .a:hover { color: red; } */ .a { color: red; }',
  ]) {
    assert.deepEqual(unguardedHovers(css), [], css);
  }
});

test('every :hover rule is wrapped in @media (hover: hover)', () => {
  const files = cssFiles('app');
  assert.ok(files.length > 0, 'CSS files found');
  const offenders = files.flatMap((file) =>
    unguardedHovers(readFileSync(join(ROOT, file), 'utf8')).map((o) => `${file}:${o.line}: ${o.selector.slice(0, 70)}`),
  );
  assert.deepEqual(offenders, [], `${offenders.length} :hover rules not in @media (hover: hover)`);
});
