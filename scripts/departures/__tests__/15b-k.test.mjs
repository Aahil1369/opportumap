// Task 15b, group K: the kit and signs, the homepage, the information desk, the footer, the nav and
// the social image (briefs: .superpowers/sdd/15b/k-part1.md, k-part2.md, k-part3.md in the
// departures worktree). Each part adds its own section below.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as espree from 'espree';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const mod = (rel) => import(new URL(`../../../${rel}`, import.meta.url));
const show = (abs) => relative(ROOT, abs).split(sep).join('/');
const stripCss = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

function walk(rel) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) return [];
  if (!statSync(abs).isDirectory()) return [abs];
  return readdirSync(abs).flatMap((name) => walk(join(rel, name)));
}

// ── Part 1 · K4, T1-4, W1-m4: the split-flap canvases ─────────────────────────────────────────

// .catch: without the module every Part 1 test fails on its own, and the rest of the file still runs.
const FC = await mod('lib/departures/flapCanvas.js').catch(() => ({}));

test('K4 flapCanvas: the budgets', () => {
  assert.equal(FC.MAX_DPR, 2);
  assert.equal(FC.MAX_LAYER_PX, 2048 * 2048);
  assert.equal(FC.MAX_ATLAS_PX, 2048 * 1024);
  assert.equal(FC.ATLAS_COLS, 32);
  assert.equal(FC.ATLAS_MIN_ROWS, 4);
  assert.equal(FC.ATLAS_MAX_ROWS, 16);
});

test('K4 layerScale: at most 2 device pixels per CSS pixel; 1x and 1.25x screens unchanged', () => {
  assert.equal(FC.layerScale(358, 480, 3), 2, 'the iPhone 13 hero board: a 3x screen draws at 2x');
  assert.equal(FC.layerScale(358, 480, 2), 2);
  assert.equal(FC.layerScale(358, 480, 1.25), 1.25);
  assert.equal(FC.layerScale(358, 480, 1), 1);
  for (const bad of [0, -1, NaN, undefined, null, 'x']) assert.equal(FC.layerScale(358, 480, bad), 1, String(bad));
  assert.equal(FC.layerScale(0, 0, 3), 2, 'an unmeasured host gets the plain ratio (FlapText never fits one)');
});

test('K4 layerScale: no flip layer passes MAX_LAYER_PX, whatever the board size', () => {
  for (const [w, h] of [[358, 480], [900, 420], [980, 600], [1056, 2400], [358, 6800], [1056, 20000]]) {
    for (const ratio of [1, 2, 3]) {
      const s = FC.layerScale(w, h, ratio);
      const px = Math.round(w * s) * Math.round(h * s);
      assert.ok(px <= FC.MAX_LAYER_PX * 1.01, `${w}x${h} at ${ratio}x: ${px} px`);
      assert.ok(s <= Math.min(2, ratio), `${w}x${h} at ${ratio}x: scale ${s}`);
    }
  }
  // The boards the site shows keep the full 2x: no visible change at normal sizes.
  for (const [w, h] of [[358, 480], [900, 420], [980, 600]]) assert.equal(FC.layerScale(w, h, 3), 2, `${w}x${h}`);
});

test('K4 atlasGrid: board tiles keep all 512 slots; plate tiles get fewer rows, within MAX_ATLAS_PX', () => {
  const px = (g, w, h) => g.cols * w * g.rows * h;
  // Board tiles at 2x (FlapBoard's phone and desktop font sizes): the full 32 x 16 grid.
  for (const [w, h] of [[20, 37], [33, 66]]) {
    assert.deepEqual(FC.atlasGrid(w, h), { cols: 32, rows: 16 }, `${w}x${h}`);
  }
  // Plate tiles at 2x: /resume at 64px (82x182) and 33px (45x94), /interview at 56px (72x159).
  for (const [w, h, rows] of [[82, 182, 4], [45, 94, 15], [72, 159, 5]]) {
    const g = FC.atlasGrid(w, h);
    assert.deepEqual(g, { cols: 32, rows }, `${w}x${h}`);
    assert.ok(px(g, w, h) <= FC.MAX_ATLAS_PX, `${w}x${h}: ${px(g, w, h)} px`);
  }
  // Never fewer than 128 slots, even for a tile bigger than any in the app; odd input is one pixel.
  assert.deepEqual(FC.atlasGrid(160, 360), { cols: 32, rows: 4 });
  assert.deepEqual(FC.atlasGrid(0, 0), { cols: 32, rows: 16 });
  assert.deepEqual(FC.atlasGrid(NaN, undefined), { cols: 32, rows: 16 });
  // Before the budget: the /resume plate's atlas at 3x was 32 x 16 tiles of 123 x 273 px, 17.2 Mpx,
  // over iOS Safari's 16,777,216-pixel limit for one canvas. Now: under an eighth of that limit.
  assert.ok(32 * 123 * 16 * 273 > 4096 * 4096);
  assert.ok(px(FC.atlasGrid(82, 182), 82, 182) < (4096 * 4096) / 8);
});

test('K4 FlapText: canvases sized by flapCanvas.js, freed on unmount, and a refused context never throws', () => {
  const src = read('app/components/kit/FlapText.js');
  assert.match(src, /import \{ atlasGrid, layerScale \} from '\.\.\/\.\.\/\.\.\/lib\/departures\/flapCanvas';/);
  assert.match(src, /const dpr = layerScale\(hostRect\.width, hostRect\.height, window\.devicePixelRatio\);/);
  assert.doesNotMatch(src, /Math\.min\(3, window\.devicePixelRatio/);
  assert.match(src, /const \{ cols, rows \} = atlasGrid\(st\.w, st\.h\);/);
  assert.doesNotMatch(src, /ATLAS_ROWS|ATLAS_COLS/);
  // Pixels freed now (WebKit frees a dropped canvas only at its next collection): W1-m4.
  assert.match(src, /function freeCanvas\(canvas\) \{\s*canvas\.width = 0;\s*canvas\.height = 0;\s*\}/);
  assert.match(src, /function resetAtlases\(\) \{\s*for \(const a of atlases\.values\(\)\) freeCanvas\(a\.canvas\);/);
  assert.match(src, /stopAll\(el\);\s*releaseStrip\(el\);/);
  assert.match(
    src,
    /function dropLayer\(layer\) \{[\s\S]*?layer\.ro\?\.disconnect\(\);[\s\S]*?freeCanvas\(layer\.canvas\);[\s\S]*?if \(!live\.size\) resetAtlases\(\);/,
  );
  // W1-m4 wiring: a FlapText that flips joins its layer, the layer is live from birth, and only the
  // last FlapText to unmount (or a canvas that left the page) drops it.
  assert.match(src, /layers\.set\(host, layer\);\s*live\.add\(layer\);/);
  assert.match(
    src,
    /if \(strip\.__flapLayer !== layer\) \{\s*strip\.__flapLayer\?\.strips\.delete\(strip\);\s*layer\.strips\.add\(strip\);\s*strip\.__flapLayer = layer;\s*\}/,
  );
  assert.match(src, /layer\.strips\.delete\(strip\);\s*if \(!layer\.strips\.size\) dropLayer\(layer\);/);
  assert.match(src, /function dropLayer\(layer\) \{\s*if \(!live\.delete\(layer\)\) return;\s*landLayer\(layer\);/);
  assert.match(src, /layer\.canvas\.remove\(\);\s*freeCanvas\(layer\.canvas\);/);
  assert.match(src, /if \(layer\) dropLayer\(layer\); \/\/ its canvas left the page under it/);
  assert.match(src, /if \(atlases\.size >= MAX_ATLASES\) resetAtlases\(\);/);
  // A 2D context the browser refuses (out of canvas memory) means no flip, not a TypeError.
  assert.equal(src.match(/if \(!ctx\)/g)?.length, 2, 'atlasFor and layerFor');
  assert.match(src, /if \(!a\) return;/);
  assert.match(src, /const layer = hostRect\.width && stripRect\.width \? layerFor\(host\) : null;/);
  // T1-4: room for a frame's three tiles before fetching any (no eviction mid-draw).
  assert.match(src, /if \(a\.slots\.size > a\.cap - 3\) clearAtlas\(a\);\s*const atlas = a\.canvas;\s*const o = glyph\(a, st, oldCh, color\);/);
});

// ── Part 2 · K3, K1, K5, T4-5: the social image, the desk's sign, /contact, board row names ─────

const SOCIAL = await mod('lib/socialImage.js');
const HASHED = {
  url: 'https://opportumap.netlify.app/opengraph-image?f84a9ec957474c29',
  width: 1200,
  height: 630,
  type: 'image/png',
  alt: SOCIAL.SOCIAL_IMAGE_ALT,
};

test("K3 socialImages: the parent segment's resolved image (hash included), else SOCIAL_IMAGE", () => {
  const got = SOCIAL.socialImages({ openGraph: { images: [HASHED] } });
  assert.deepEqual(got, [HASHED]);
  assert.notEqual(got[0], HASHED, 'a copy (Next freezes the parent metadata in development)');
  for (const parent of [undefined, null, {}, { openGraph: null }, { openGraph: { images: [] } }, { openGraph: { images: 'x' } }]) {
    assert.deepEqual(SOCIAL.socialImages(parent), [SOCIAL.SOCIAL_IMAGE], JSON.stringify(parent));
  }
});

test('K3 /jobs: generateMetadata names the root image Next resolved, hash included', async () => {
  const jobs = await mod('app/jobs/layout.js');
  assert.equal(jobs.metadata, undefined, 'no static metadata object: it could not carry the hash');
  assert.equal(typeof jobs.generateMetadata, 'function');
  const meta = await jobs.generateMetadata({ params: Promise.resolve({}) }, Promise.resolve({ openGraph: { images: [HASHED] } }));
  assert.deepEqual(meta.openGraph.images, [HASHED]);
  assert.deepEqual(meta.twitter.images, [HASHED]);
  assert.equal(meta.title, 'Jobs: where to next? · OpportuMap');
  assert.equal(meta.openGraph.url, 'https://opportumap.netlify.app/jobs');
  assert.equal(meta.twitter.card, 'summary_large_image');
  const bare = await jobs.generateMetadata({ params: Promise.resolve({}) }, Promise.resolve({}));
  assert.deepEqual(bare.openGraph.images, [SOCIAL.SOCIAL_IMAGE], 'nothing resolved above it: the unhashed URL');
});

test('K1 GateSign: a letter that is not a gate is not read as "Gate i"; only /contact opts out', () => {
  const src = read('app/components/kit/GateSign.js');
  assert.match(src, /export default function GateSign\(\{ letter, label, href, gate = true, className, \.\.\.rest \}\)/);
  assert.match(src, /<span className="gs-l" aria-hidden=\{gate \? undefined : 'true'\}>/);
  assert.match(src, /\{gate && <span className="sr-only">Gate <\/span>\}/);
  assert.equal(src.match(/<span className="sr-only">Gate <\/span>/g)?.length, 1, 'one prefix, and it is conditional');
  assert.match(read('app/components/kit/PageShell.js'), /<GateSign letter=\{sign\.letter\} label=\{sign\.label\} gate=\{sign\.gate\} \/>/);
  assert.match(read('app/contact/page.js'), /sign=\{\{ letter: 'i', label: 'INFORMATION', gate: false \}\}/);
  // Every other sign keeps its "Gate " (A–F) or has no letter: only the desk opts out.
  const optOut = walk('app')
    .filter((f) => /\.js$/.test(f) && !show(f).startsWith('app/components/kit/'))
    .filter((f) => /gate:\s*false|gate=\{false\}/.test(readFileSync(f, 'utf8')))
    .map(show);
  assert.deepEqual(optOut, ['app/contact/page.js']);
});

test('K5 (R17) /contact: no Twitter or LinkedIn handle the owner has not confirmed', () => {
  const src = read('app/contact/page.js');
  assert.doesNotMatch(src, /twitter|linkedin|@opportumap/i);
  assert.doesNotMatch(src, /const DESK\b|DESK\.map|<dl\b/);
  assert.match(src, /DESK OPEN · REPLIES BY EMAIL/, 'the desk still says how replies come back');
});

test('T4-5 a row without pay names it "Pay not listed" for its link; its tiles keep NOT LISTED', async () => {
  const { boardRowsFrom } = await mod('lib/departures/board.js');
  const now = new Date('2026-10-14T12:40:00Z');
  const [none] = boardRowsFrom([{ id: 'x1', title: 'Support Engineer', location: 'Lisbon', country: 'pt', source: 'arbeitnow' }], {
    now,
    fill: [],
  });
  assert.equal(none.cells.pay, 'NOT LISTED');
  assert.deepEqual(none.spoken, { pay: 'Pay not listed' });
  const [paid] = boardRowsFrom(
    [{ id: 'p1', title: 'Data Engineer', company: 'C', location: 'Toronto, Ontario', country: 'ca', currency: 'CAD', source: 'adzuna', salary_min: 90000, salary_max: 110000 }],
    { now, fill: [] },
  );
  assert.notEqual(paid.cells.pay, 'NOT LISTED');
  assert.equal('spoken' in paid, false, 'a row with pay is named by its tiles');
  assert.match(
    read('app/components/kit/FlapBoard.js'),
    /aria-label=\{columns\.map\(\(col\) => row\.spoken\?\.\[col\.key\] \?\? row\.cells\?\.\[col\.key\]\)\.filter\(Boolean\)\.join\(' · '\)\}/,
  );
});

// ── Part 3 · T3-2, T3-4, T7-12, K2: the nav's focus ring, hover-only CSS, kit.css's header ─────

/** <a>, <button> and <Link> elements in a file whose className carries none of `rings`. */
function unringed(rel, rings) {
  const src = read(rel);
  const ast = espree.parse(src, { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true }, range: true, loc: true });
  const missing = [];
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'JSXOpeningElement' && ['a', 'button', 'Link'].includes(node.name?.name)) {
      const cls = node.attributes.find((a) => a.type === 'JSXAttribute' && a.name?.name === 'className');
      const text = cls ? src.slice(cls.range[0], cls.range[1]) : '';
      if (!rings.some((r) => text.includes(r))) missing.push(`${rel}:${node.loc.start.line}`);
    }
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const v = node[key];
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v === 'object') visit(v);
    }
  };
  visit(ast);
  return missing;
}

test('T3-2 every link and button in the night navbar and its drawer shows the sign-yellow focus ring', () => {
  assert.deepEqual(unringed('app/components/Navbar.js', ['FOCUS', 'menuItem']), []);
  assert.deepEqual(unringed('app/components/NavDrawer.js', ['FOCUS', 'account']), []);
  assert.deepEqual(unringed('app/components/navParts.js', ['FOCUS']), []);
  // The shared class strings carry the ring themselves.
  assert.match(read('app/components/Navbar.js'), /const menuItem = `[^`]*\$\{FOCUS\}`;/);
  assert.match(read('app/components/NavDrawer.js'), /const account = `[^`]*\$\{FOCUS\}`;/);
  assert.match(
    read('app/components/navParts.js'),
    /export const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sign';/,
  );
});

test('T3-4 the desktop menus name their panel in aria-controls only while it exists', () => {
  const src = read('app/components/Navbar.js');
  assert.match(src, /aria-controls=\{toolsOpen \? 'nav-tools' : undefined\}/);
  assert.match(src, /aria-controls=\{userMenuOpen \? 'nav-account' : undefined\}/);
  assert.doesNotMatch(src, /aria-controls="nav-(?:tools|account)"/);
  // The panels with those ids render only while open.
  assert.match(src, /\{toolsOpen && \(\s*<div id="nav-tools"/);
  assert.match(src, /\{userMenuOpen && \(\s*<div id="nav-account"/);
});

/** Every style rule in a stylesheet: its selector and body (spaces collapsed) and the at-rules around it. */
function cssRules(css) {
  const rules = [];
  const open = [];
  let text = '';
  for (const ch of stripCss(css)) {
    if (ch === '{') {
      open.push(text.trim().replace(/\s+/g, ' '));
      text = '';
    } else if (ch === '}') {
      const head = open.pop();
      const body = text.trim().replace(/\s+/g, ' ');
      if (head && !head.startsWith('@')) rules.push({ selector: head, body, within: open.filter((h) => h.startsWith('@')) });
      text = '';
    } else {
      text += ch;
    }
  }
  return rules;
}

const HOVER_MEDIA = /^@media \(hover: ?hover\)$/;
const HOVER_RULES = {
  'app/components/kit/kit.css': [
    ['a.gs:hover', 'transform: translateY(-1px);'],
    ['a.gs:hover', 'transform: none;'],
  ],
  'app/components/desk.css': [
    ['.desk-x:hover', 'background: var(--hall-3); color: var(--ink);'],
    ['.desk-sugg button:hover', 'border-color: var(--ink-sub); color: var(--ink);'],
  ],
  'app/components/footer.css': [
    ['.sf-gate:hover .gs', 'transform: translateY(-1px);'],
    ['.sf-gate:hover .sf-sub', 'color: var(--ink);'],
    ['.sf-desk:hover', 'border-color: var(--ink-sub);'],
    ['.sf-gate:hover .gs', 'transform: none;'],
  ],
  'app/components/home/home.css': [
    ['.hp-more:hover', 'text-decoration: underline; text-underline-offset: 3px;'],
    ['.gw-link:hover .gw-go', 'transform: translateX(3px);'],
    ['.wt-go:hover', 'transform: translateY(-1px);'],
    ['.gw-link:hover .gw-go, .wt-go:hover', 'transform: none;'],
  ],
  'app/components/AuthModal.css': [],
};

test('T7-12 every :hover rule in group K CSS sits in @media (hover: hover); nothing else does', () => {
  for (const [file, expected] of Object.entries(HOVER_RULES)) {
    const rules = cssRules(read(file));
    const hovers = rules.filter((r) => /:hover\b/.test(r.selector));
    assert.deepEqual(hovers.map((r) => [r.selector, r.body]), expected, `${file}: the :hover rules, in order, unchanged`);
    for (const r of hovers) {
      assert.ok(r.within.some((w) => HOVER_MEDIA.test(w)), `${file}: "${r.selector}" is outside @media (hover: hover)`);
      assert.doesNotMatch(r.selector, /:focus|:active/, `${file}: "${r.selector}" also names :focus or :active`);
    }
    for (const r of rules.filter((x) => !/:hover\b/.test(x.selector))) {
      assert.ok(!r.within.some((w) => HOVER_MEDIA.test(w)), `${file}: "${r.selector}" has no :hover but sits in @media (hover: hover)`);
    }
  }
  // The reduced-motion overrides are still under reduced motion (and still after the lifts they undo).
  for (const [file, selector] of [
    ['app/components/kit/kit.css', 'a.gs:hover'],
    ['app/components/footer.css', '.sf-gate:hover .gs'],
    ['app/components/home/home.css', '.gw-link:hover .gw-go, .wt-go:hover'],
  ]) {
    const last = cssRules(read(file)).filter((r) => r.selector === selector).at(-1);
    assert.ok(last.within.some((w) => /^@media \(prefers-reduced-motion: ?reduce\)$/.test(w)), `${file}: the last "${selector}"`);
    assert.equal(last.body, 'transform: none;');
  }
});

test('K2 kit.css says where it ships: every page (SiteFooter imports it from the root layout)', () => {
  const css = read('app/components/kit/kit.css');
  assert.doesNotMatch(css, /only ships on pages that use them/);
  assert.match(css, /by SiteFooter, which the root layout renders on every page, so it is in every page's CSS\./);
  assert.match(read('app/components/SiteFooter.js'), /^import '\.\/kit\/kit\.css';$/m);
  assert.match(read('app/layout.js'), /<SiteFooter \/>/);
});
