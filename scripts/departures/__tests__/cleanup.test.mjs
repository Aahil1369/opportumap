// Task 15b, group P: the Field Notes leftovers stay gone. The editorial/terminal UI primitives with
// their hooks and glyphs, the old job card and detail panel and the create-next-app images had no
// importer left; the paper/terminal colour registers, the Field Notes accents and Instrument Serif
// had no user left. No file, no import, no token, no font comes back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const SELF = 'scripts/departures/__tests__/cleanup.test.mjs';
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** Every file under `rel` as a repo path with forward slashes (node_modules and .next skipped). */
function files(rel) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) return [];
  if (!statSync(abs).isDirectory()) return [rel];
  return readdirSync(abs)
    .filter((name) => name !== 'node_modules' && name !== '.next')
    .flatMap((name) => files(posix.join(rel, name)));
}

const GLYPHS = ['bookmark', 'chat', 'compass', 'document', 'envelope', 'globe-wire', 'map-pin', 'microphone', 'passport', 'rocket', 'spark', 'suitcase'];
const DELETED = [
  'app/components/JobCard.js',
  'app/components/JobDetailPanel.js',
  ...['Btn', 'EditorialHero', 'Footnote', 'Glyph', 'Kicker', 'MonoRow', 'NoiseSurface', 'SectionHead', 'Tag', 'TerminalPanel'].map((n) => `app/components/ui/${n}.js`),
  ...GLYPHS.map((n) => `app/components/ui/glyphs/${n}.js`),
  ...['useItalicReveal', 'useMagnetic', 'useScrollReveal'].map((n) => `app/components/ui/hooks/${n}.js`),
];
const DELETED_IMAGES = ['file', 'globe', 'next', 'vercel', 'window'].map((n) => `public/${n}.svg`);

test('the dead Field Notes modules, the old job card and panel and the template images are deleted', () => {
  assert.equal(DELETED.length, 27);
  for (const f of [...DELETED, ...DELETED_IMAGES]) assert.equal(existsSync(join(ROOT, f)), false, `${f} still exists`);
  // The one live module left in app/components/ui: the layout's page-transition bar.
  assert.deepEqual(readdirSync(join(ROOT, 'app/components/ui')), ['PageTransition.js']);
  const layout = read('app/layout.js');
  assert.match(layout, /^import PageTransition from '\.\/components\/ui\/PageTransition';$/m);
  assert.match(layout, /<PageTransition \/>/);
});

const noExt = (p) => p.replace(/\.(?:m?js|jsx|cjs)$/, '');
const GONE = new Set(DELETED.map(noExt));

/** The module specifiers a source names: import/export … from, import '…', import(), require(), new URL(). */
function specifiers(src) {
  const out = [];
  for (const re of [
    /\bfrom\s*['"]([^'"\n]+)['"]/g,
    /\bimport\s*['"]([^'"\n]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"\n]+)['"]/g,
    /\brequire\s*\(\s*['"]([^'"\n]+)['"]/g,
    /\bnew URL\(\s*['"]([^'"\n]+)['"]/g,
  ]) {
    for (const m of src.matchAll(re)) out.push(m[1]);
  }
  return out;
}

/** A specifier seen from the file `from`, as a repo path without extension; null for a package. */
function target(from, spec) {
  if (spec.startsWith('@/')) return noExt(spec.slice(2));
  if (spec.startsWith('.')) return noExt(posix.normalize(posix.join(posix.dirname(from), spec)));
  if (/^(?:app|lib|scripts|public)\//.test(spec)) return noExt(spec);
  return null;
}

const CODE = /\.(?:m?js|jsx|cjs|css)$/;
const CONFIG = ['next.config.mjs', 'proxy.js', 'eslint.config.mjs', 'postcss.config.mjs', 'netlify.toml', 'vercel.json', 'package.json', 'jsconfig.json'];

test('nothing imports, reads or names a deleted module or image', () => {
  const scanned = [
    ...['app', 'lib', 'scripts', 'netlify'].flatMap((d) => files(d)).filter((f) => CODE.test(f)),
    ...CONFIG.filter((f) => existsSync(join(ROOT, f))),
  ].filter((f) => f !== SELF);
  assert.ok(scanned.includes('app/layout.js') && scanned.includes('scripts/departures/__tests__/chrome.test.mjs'), 'the scan covers app/ and the tests');
  const found = [];
  for (const f of scanned) {
    const src = read(f);
    for (const spec of specifiers(src)) {
      if (GONE.has(target(f, spec))) found.push(`${f} imports ${spec}`);
    }
    for (const p of GONE) {
      if (new RegExp(`${p}(?![\\w-])`).test(src)) found.push(`${f} names ${p}`);
    }
    for (const img of DELETED_IMAGES) {
      if (src.includes(img.slice('public'.length))) found.push(`${f} names ${img}`);
    }
  }
  assert.deepEqual(found, []);
});

const stripCss = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

test('the paper/terminal registers and the Field Notes accents are gone: no token, class or var() left in app/', () => {
  const css = stripCss(read('app/globals.css'));
  const root = /:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  const theme = /@theme\s+inline\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  assert.match(root, /--hall:\s*#0a0b0d;/, ':root is still there');
  assert.match(theme, /--color-hall:\s*var\(--hall\);/, '@theme inline is still there');
  for (const block of [root, theme]) {
    assert.doesNotMatch(block, /--(?:color-)?(?:paper|term|accent|data)\b/);
  }
  const users = files('app')
    .filter((f) => /\.(?:m?js|jsx|css)$/.test(f))
    .filter((f) => /\b(?:paper|term)-(?:bg|ink|rule)\b|\b(?:bg|text|border)-(?:accent|data)\b|var\(--(?:paper|term|accent|data)\b/.test(read(f)));
  assert.deepEqual(users, []);
});

test('Instrument Serif is gone: not loaded by the layout, no CSS variable, no font-display utility', () => {
  const layout = read('app/layout.js');
  assert.match(layout, /^import \{ Inter, JetBrains_Mono \} from 'next\/font\/google';$/m);
  assert.doesNotMatch(layout, /Instrument_Serif|instrumentSerif|--font-instrument-serif/);
  assert.match(layout, /className=\{`\$\{inter\.variable\} \$\{jbMono\.variable\} h-full antialiased`\}/);
  assert.doesNotMatch(stripCss(read('app/globals.css')), /--font-display\b|--font-instrument-serif/);
  // `font-display: swap` inside @font-face is a descriptor, not the utility: a colon follows it.
  const users = files('app')
    .filter((f) => /\.(?:m?js|jsx|css)$/.test(f))
    .filter((f) => /\bfont-display\b(?!\s*:)|--font-instrument-serif|Instrument[ _]Serif/.test(read(f)));
  assert.deepEqual(users, []);
});
