// Task 15b, group P (platform cleanup). globals.css keeps only what the site uses: the Field Notes
// utilities and the old map popup/marker rules are gone, any :hover rule sits behind
// @media (hover: hover) (the T7-12 hover recipe), and one Mapbox popup rule stays because the /map
// beacon label inherits its board font from it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const stripCss = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Selector lists with :hover that sit outside an @media (hover: hover) block. */
function unguardedHover(css) {
  const src = stripCss(css);
  const found = [];
  const open = []; // one entry per open brace: true when that brace opens @media (hover: hover)
  let start = 0;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') {
      const prelude = src.slice(start, i).trim();
      const guard = /^@media\s*\(\s*hover\s*:\s*hover\s*\)$/.test(prelude);
      if (!guard && prelude.includes(':hover') && !open.includes(true)) found.push(prelude);
      open.push(guard);
      start = i + 1;
    } else if (ch === '}') {
      open.pop();
      start = i + 1;
    } else if (ch === ';') {
      start = i + 1;
    }
  }
  return found;
}

test('unguardedHover: a bare :hover rule is found, a guarded one is not (the T7-12 recipe)', () => {
  assert.deepEqual(unguardedHover('.a:hover { color: red; } .b { color: blue; }'), ['.a:hover']);
  assert.deepEqual(unguardedHover('.a { color: red; }\n@media (hover: hover) { .a:hover { color: blue; } }'), []);
  assert.deepEqual(unguardedHover('.a:focus-visible, .a:active { outline: 0; }'), []);
  assert.deepEqual(unguardedHover('@media (prefers-reduced-motion: reduce) { .a:hover { color: red; } }'), ['.a:hover']);
});

test('globals.css: every :hover rule sits behind @media (hover: hover) (T7-12)', () => {
  assert.deepEqual(unguardedHover(read('app/globals.css')), []);
});

test('globals.css: the Field Notes utilities and the old map popup and marker rules are gone; the page bar stays', () => {
  const css = stripCss(read('app/globals.css'));
  for (const sel of ['.reveal', '.hero-anim', '.italic-draw', '.noise-overlay', '.glyph-strokes', '.tool-card-underline', '.visa-stamp', '.job-marker', '.popup-', '.mapboxgl-popup-tip']) {
    assert.ok(!css.includes(sel), `${sel} is still in globals.css`);
  }
  assert.doesNotMatch(css, /@keyframes\s+(?:hero-rise|redraw)\b/);
  // PageTransition (rendered by app/layout.js) still draws the bar.
  assert.match(read('app/components/ui/PageTransition.js'), /page-transition-bar/);
  assert.match(css, /\.page-transition-bar\s*\{[^}]*transform:\s*scaleX\(0\);[^}]*transition:\s*transform 0\.22s var\(--ease\);/);
  assert.match(css, /\.page-transition-bar\.running\s*\{\s*transform:\s*scaleX\(1\);\s*\}/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.page-transition-bar\s*\{\s*transition:\s*none !important;\s*animation:\s*none !important;\s*\}\s*\}/);
});

test('globals.css: one Mapbox popup rule stays, for the font the /map beacon label inherits', () => {
  const css = stripCss(read('app/globals.css'));
  const rules = [...css.matchAll(/([^{}]*)\{([^{}]*)\}/g)]
    .filter((m) => m[1].includes('mapboxgl-'))
    .map((m) => [m[1].trim(), m[2].trim()]);
  assert.deepEqual(rules, [['.mapboxgl-popup-content', 'font-family: var(--font-board);']]);
});
