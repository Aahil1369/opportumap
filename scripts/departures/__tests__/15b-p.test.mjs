// Task 15b, group P (platform cleanup). globals.css keeps only what the site uses: the Field Notes
// utilities and the old map popup/marker rules are gone, any :hover rule sits behind
// @media (hover: hover) (the T7-12 hover recipe), and one Mapbox popup rule stays because the /map
// beacon label inherits its board font from it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ESLint } from 'eslint';

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

// ── Part 2: the page bar's lint error, dead exports, a quiet test script, the 4 MB docs ─────

const SELF = 'scripts/departures/__tests__/15b-p.test.mjs';

/** Every file under `rel` as a repo path with forward slashes (node_modules and .next skipped). */
function files(rel) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) return [];
  if (!statSync(abs).isDirectory()) return [rel];
  return readdirSync(abs)
    .filter((name) => name !== 'node_modules' && name !== '.next')
    .flatMap((name) => files(posix.join(rel, name)));
}

/** The text of every .js/.mjs file under app/ and scripts/, except this test and `skip`. */
const sources = (skip) =>
  [...files('app'), ...files('scripts')]
    .filter((f) => /\.m?js$/.test(f) && f !== SELF && f !== skip)
    .map(read)
    .join('\n');

test('PageTransition: no lint error; the grow starts on the next frame and schedules its own shrink (P9)', async () => {
  const [res] = await new ESLint({ cwd: ROOT }).lintFiles(['app/components/ui/PageTransition.js']);
  assert.deepEqual(res.messages.filter((m) => m.severity === 2).map((m) => `${m.line}: ${m.ruleId} ${m.message}`), []);
  const src = read('app/components/ui/PageTransition.js');
  assert.match(src, /const start = requestAnimationFrame\(\(\) => \{\s*setRunning\(true\);\s*stop = setTimeout\(\(\) => setRunning\(false\), 260\);\s*\}\);/);
  assert.match(src, /return \(\) => \{\s*cancelAnimationFrame\(start\);\s*clearTimeout\(stop\);\s*\};/);
  assert.match(src, /\}, \[pathname\]\);/);
  assert.match(src, /<div className=\{`page-transition-bar\$\{running \? ' running' : ''\}`\} \/>/);
});

const visa = await import(new URL('../../../app/data/visaData.js', import.meta.url));

test('visaData.js exports only the two tables the relocation guide reads (P2)', () => {
  assert.deepEqual(Object.keys(visa).sort(), ['SETTLEMENT_INFO', 'VISA_INFO']);
  const others = sources('app/data/visaData.js');
  for (const name of Object.keys(visa)) assert.match(others, new RegExp(String.raw`\b${name}\b`), `${name} is read somewhere`);
  for (const gone of ['VISA_DATA', 'getVisaStatus', 'VISA_COLORS']) assert.doesNotMatch(others, new RegExp(String.raw`\b${gone}\b`), `${gone} is still named`);
  for (const [code, v] of Object.entries(visa.VISA_INFO)) {
    for (const k of ['workVisa', 'applyAt', 'processingTime', 'tips']) assert.ok(typeof v[k] === 'string' && v[k], `VISA_INFO.${code}.${k}`);
  }
  for (const [code, s] of Object.entries(visa.SETTLEMENT_INFO)) {
    for (const k of ['avgRent', 'safety', 'healthcare', 'legal']) assert.ok(typeof s[k] === 'string' && s[k], `SETTLEMENT_INFO.${code}.${k}`);
  }
});

const copy = await import(new URL('../../../app/lib/pageCopy.js', import.meta.url));

test('pageCopy.js keeps only the footnotes something reads, and no HERO_COPY (P3)', () => {
  assert.deepEqual(Object.keys(copy), ['FOOTNOTES']);
  assert.deepEqual(Object.keys(copy.FOOTNOTES), ['community', 'admin', 'contact']);
  const others = sources('app/lib/pageCopy.js');
  for (const key of Object.keys(copy.FOOTNOTES)) assert.match(others, new RegExp(String.raw`FOOTNOTES\.${key}\b`), `FOOTNOTES.${key} is read`);
  assert.doesNotMatch(others, /\bHERO_COPY\b/);
  assert.equal(copy.FOOTNOTES.admin, 'You’re looking at a live snapshot: totals since launch, live users active in the last 5 minutes.');
});

test('npm test silences MODULE_TYPELESS_PACKAGE_JSON with a node flag, never "type": "module" (P6, Ruling R18)', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.type, undefined, 'package.json has no "type" (Next would treat the app .js files as strict ESM)');
  assert.equal(pkg.scripts.test, 'node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test "scripts/**/__tests__/*.test.mjs"');
  // Behaviour: the script's flag silences the warning a typeless ESM file (lib/uuid.js) raises.
  const flags = pkg.scripts.test.split(' ').filter((a) => a.startsWith('--disable-warning='));
  const load = (args) =>
    spawnSync(process.execPath, [...args, '--input-type=module', '-e', `await import(${JSON.stringify(pathToFileURL(join(ROOT, 'lib/uuid.js')).href)});`], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, NODE_OPTIONS: undefined, NODE_TEST_CONTEXT: undefined },
    });
  const plain = load([]);
  assert.equal(plain.status, 0, plain.stderr);
  assert.match(plain.stderr, /MODULE_TYPELESS_PACKAGE_JSON/, 'control: without the flag the import warns');
  const quiet = load(flags);
  assert.equal(quiet.status, 0, quiet.stderr);
  assert.doesNotMatch(quiet.stderr, /MODULE_TYPELESS_PACKAGE_JSON/);
});

test('the spec and the plans give the resume upload limit as 4 MB, with the reason (P7)', () => {
  const SPEC = 'docs/superpowers/specs/2026-10-13-departures-redesign-design.md';
  const PLAN = 'docs/superpowers/plans/2026-10-14-departures-waves2-5.md';
  const WAVE1 = 'docs/superpowers/plans/2026-10-13-departures-wave1.md';
  for (const f of [SPEC, PLAN, WAVE1]) assert.doesNotMatch(read(f), /\b1[01] ?MB\b/, `${f} still says 10 MB`);
  assert.match(read(SPEC), /enforce a 4 MB limit \(4,000,000 bytes, `MAX_RESUME_BYTES` in `lib\/departures\/resumeVerdict\.js`: the route runs as a Netlify Function, which takes at most 6 MB of request body, and a PDF arrives Base64-encoded, about a third larger\);/);
  const plan = read(PLAN);
  assert.match(plan, /\(resume > 4 MB, image-only PDF, non-PDF\)/);
  assert.match(plan, /The limit is 4 MB on purpose: the route runs as a Netlify Function/);
  assert.match(plan, /\(PDF only, ≤ 4 MB = 4,000,000 bytes, `MAX_RESUME_BYTES`; why 4 MB: Review Focus 3\)/);
  assert.match(plan, /Server: reject > 4 MB \(413\)/);
  assert.match(plan, /a 5 MB file shows the error without uploading\./);
  assert.match(plan, /^- Deviation \(wave 3 fix round\): the limit is 4 MB, down from the first plan's figure/m);
});
