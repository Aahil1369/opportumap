// The Departures foundation: the night-time palette (exact values, readable pairs), the board
// glyph font (→ ✓ ₹ ₩ … that JetBrains Mono's web subset does not have), the newest-request-wins
// helper, and source guards over the redesigned files: no CSS trig, no "flight"/"fare" in visible
// copy, no job/listing totals, transitions on transform/opacity only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import * as espree from 'espree';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const show = (abs) => relative(ROOT, abs).split(sep).join('/');
const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

// ── Contrast (WCAG 2.x relative luminance) ──────────────────────────────────────────────────

function channel(v) {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function luminance(hex) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  assert.ok(m, `not a #rrggbb colour: ${hex}`);
  const [r, g, b] = m.slice(1).map((h) => channel(parseInt(h, 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrastRatio(fg, bg) {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

const PALETTE = {
  hall: '#0a0b0d',
  'hall-2': '#111316',
  'hall-3': '#16181c',
  rule: '#22262c',
  ink: '#f4f1e6',
  'ink-dim': '#b9bdc4',
  'ink-sub': '#9aa0a8',
  sign: '#ffc531',
  'sign-ink': '#0a0b0d',
  amber: '#ffb547',
  ok: '#3ce08a',
  new: '#ffc531',
  info: '#9fc8ff',
  warn: '#ff6b4a',
};

/** Custom properties declared in the first `:root { … }` block of a stylesheet. */
function rootTokens(css) {
  const block = /:root\s*\{([^}]*)\}/.exec(stripCssComments(css));
  const out = {};
  if (!block) return out;
  for (const m of block[1].matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) out[m[1]] = m[2].trim();
  return out;
}

test('contrastRatio matches known WCAG values', () => {
  assert.equal(Math.round(contrastRatio('#000000', '#ffffff') * 100) / 100, 21);
  assert.equal(contrastRatio('#777777', '#777777'), 1);
  assert.ok(Math.abs(contrastRatio('#767676', '#ffffff') - 4.54) < 0.01);
});

test('globals.css defines the night palette exactly, in :root and in @theme', () => {
  const css = read('app/globals.css');
  const tokens = rootTokens(css);
  for (const [name, value] of Object.entries(PALETTE)) {
    assert.equal(tokens[name]?.toLowerCase(), value, `--${name} in :root`);
  }
  const theme = /@theme\s+inline\s*\{([^}]*)\}/.exec(stripCssComments(css));
  assert.ok(theme, '@theme inline block');
  for (const name of Object.keys(PALETTE)) {
    assert.match(theme[1], new RegExp(`--color-${name}\\s*:\\s*var\\(--${name}\\)\\s*;`), `--color-${name} in @theme`);
  }
});

test('kit.css no longer redefines the palette (globals.css owns it)', () => {
  const tokens = rootTokens(read('app/components/kit/kit.css'));
  for (const name of Object.keys(PALETTE)) assert.equal(tokens[name], undefined, `kit.css redefines --${name}`);
});

test('text/background pairs of the palette are readable (>= 4.5:1)', () => {
  const t = rootTokens(read('app/globals.css'));
  const pairs = [
    ['ink', 'hall'],
    ['ink-dim', 'hall-2'],
    ['ink-sub', 'hall'],
    ['sign-ink', 'sign'],
    ['ok', 'hall-2'],
    ['info', 'hall-2'],
    ['new', 'hall-2'],
    // Also used by the kit: rows/cards on --hall-3, signs and warnings on the board.
    ['ink-sub', 'hall-2'],
    ['ink-sub', 'hall-3'],
    ['ink-dim', 'hall-3'],
    ['sign', 'hall'],
    ['sign', 'hall-3'],
    ['ok', 'hall-3'],
    ['info', 'hall-3'],
    ['warn', 'hall-2'],
    ['amber', 'hall'],
  ];
  for (const [fg, bg] of pairs) {
    const r = contrastRatio(t[fg], t[bg]);
    assert.ok(r >= 4.5, `--${fg} on --${bg}: ${r.toFixed(2)}:1`);
  }
});

// ── createLatest ─────────────────────────────────────────────────────────────────────────────

const LATEST = await import(new URL('../../../lib/departures/createLatest.js', import.meta.url)).catch((error) => ({ error }));
function createLatest() {
  if (LATEST.error) throw LATEST.error;
  return LATEST.createLatest();
}

test('createLatest: each next() id invalidates the earlier ones', () => {
  const latest = createLatest();
  assert.equal(latest.isCurrent(0), false, 'nothing is current before the first next()');
  const a = latest.next();
  assert.equal(typeof a, 'number');
  assert.equal(latest.isCurrent(a), true);
  const b = latest.next();
  assert.ok(b > a);
  assert.equal(latest.isCurrent(a), false);
  assert.equal(latest.isCurrent(b), true);
  const c = latest.next();
  assert.equal(latest.isCurrent(b), false);
  assert.equal(latest.isCurrent(c), true);
  for (const junk of [undefined, null, '3', NaN, c + 1]) assert.equal(latest.isCurrent(junk), false);
});

test('createLatest: instances are independent', () => {
  const one = createLatest();
  const two = createLatest();
  const id = one.next();
  two.next();
  two.next();
  assert.equal(one.isCurrent(id), true);
});

test('createLatest: the newest response wins when answers arrive out of order', async () => {
  const latest = createLatest();
  const shown = [];
  const search = (q, ms) => {
    const id = latest.next();
    return new Promise((r) => setTimeout(r, ms)).then(() => {
      if (latest.isCurrent(id)) shown.push(q);
    });
  };
  await Promise.all([search('t', 30), search('to', 5), search('tor', 15)]);
  assert.deepEqual(shown, ['tor']);
});

// ── The board glyph font ─────────────────────────────────────────────────────────────────────

const BOARD_GLYPHS = ['→', '←', '↗', '↘', '✓', '✕', '₹', '₩'];

/** The sfnt tables of a WOFF 1.0 file, decompressed. */
function woffTables(buf) {
  assert.equal(buf.toString('latin1', 0, 4), 'wOFF', 'a WOFF 1.0 file');
  assert.equal(buf.readUInt32BE(8), buf.length, 'WOFF length field matches the file');
  const n = buf.readUInt16BE(12);
  const tables = {};
  for (let i = 0; i < n; i++) {
    const o = 44 + i * 20;
    const tag = buf.toString('latin1', o, o + 4);
    const off = buf.readUInt32BE(o + 4);
    const comp = buf.readUInt32BE(o + 8);
    const orig = buf.readUInt32BE(o + 12);
    const raw = buf.subarray(off, off + comp);
    tables[tag] = comp < orig ? inflateSync(raw) : Buffer.from(raw);
    assert.equal(tables[tag].length, orig, `${tag} inflates to its length`);
  }
  return tables;
}

/** Code point -> glyph id, from a cmap format 4 subtable. */
function cmap4(cmap) {
  const map = new Map();
  for (let i = 0; i < cmap.readUInt16BE(2); i++) {
    const so = cmap.readUInt32BE(8 + i * 8);
    if (cmap.readUInt16BE(so) !== 4) continue;
    const seg = cmap.readUInt16BE(so + 6) / 2;
    const ends = so + 14;
    const starts = ends + seg * 2 + 2;
    const deltas = starts + seg * 2;
    const ranges = deltas + seg * 2;
    for (let s = 0; s < seg; s++) {
      const end = cmap.readUInt16BE(ends + s * 2);
      const start = cmap.readUInt16BE(starts + s * 2);
      const delta = cmap.readInt16BE(deltas + s * 2);
      const ro = cmap.readUInt16BE(ranges + s * 2);
      for (let cp = start; cp <= end && cp !== 0xffff; cp++) {
        const gid = ro ? cmap.readUInt16BE(ranges + s * 2 + ro + (cp - start) * 2) : (cp + delta) & 0xffff;
        if (gid) map.set(cp, ro ? (gid + delta) & 0xffff : gid);
      }
    }
  }
  return map;
}

/** nameID -> string (Windows platform, UTF-16BE). */
function nameStrings(name) {
  const out = new Map();
  const count = name.readUInt16BE(2);
  const storage = name.readUInt16BE(4);
  for (let i = 0; i < count; i++) {
    const r = 6 + i * 12;
    if (name.readUInt16BE(r) !== 3) continue;
    const len = name.readUInt16BE(r + 8);
    const off = storage + name.readUInt16BE(r + 10);
    out.set(name.readUInt16BE(r + 6), Buffer.from(name.subarray(off, off + len)).swap16().toString('utf16le'));
  }
  return out;
}

for (const weight of [400, 700]) {
  test(`the board glyph font (${weight}) has → ✓ ₹ ₩ … at JetBrains Mono's metrics`, () => {
    const file = join(ROOT, `app/fonts/om-board-glyphs-${weight}.woff`);
    assert.ok(existsSync(file), `${show(file)} exists`);
    const buf = readFileSync(file);
    assert.ok(buf.length < 4096, `${buf.length} bytes`);
    const t = woffTables(buf);
    assert.equal(t.head.readUInt16BE(18), 1000, 'unitsPerEm');
    assert.equal(t.hhea.readInt16BE(4), 1020, 'hhea ascender (JetBrains Mono)');
    assert.equal(t.hhea.readInt16BE(6), -300, 'hhea descender (JetBrains Mono)');
    assert.equal(t['OS/2'].readInt16BE(68), 1020, 'typo ascender');
    assert.equal(t['OS/2'].readInt16BE(70), -300, 'typo descender');
    assert.equal(t['OS/2'].readUInt16BE(4), weight, 'usWeightClass');
    const numGlyphs = t.maxp.readUInt16BE(4);
    const longLoca = t.head.readInt16BE(50) === 1;
    const loca = (g) => (longLoca ? t.loca.readUInt32BE(g * 4) : t.loca.readUInt16BE(g * 2) * 2);
    const nh = t.hhea.readUInt16BE(34);
    const advance = (g) => t.hmtx.readUInt16BE(Math.min(g, nh - 1) * 4);
    const map = cmap4(t.cmap);
    for (const ch of BOARD_GLYPHS) {
      const gid = map.get(ch.codePointAt(0));
      assert.ok(gid > 0 && gid < numGlyphs, `${ch} is mapped`);
      assert.ok(loca(gid + 1) - loca(gid) > 0, `${ch} has an outline`);
      assert.equal(advance(gid), 600, `${ch} is one monospace cell wide`);
    }
    assert.equal(map.get(0x20), undefined, 'no space: the font never becomes the line\'s first available font');
    const names = nameStrings(t.name);
    assert.equal(names.get(1), 'OM Board Glyphs', 'family name');
    assert.match(names.get(0) ?? '', /JetBrains Mono/, 'copyright: JetBrains Mono');
    assert.match(names.get(0) ?? '', /IBM/, 'copyright: IBM Plex Mono');
    assert.match(names.get(13) ?? '', /Open Font License/, 'license');
    assert.ok(!/Plex/.test(`${names.get(1)} ${names.get(4)} ${names.get(6)}`), 'the Reserved Font Name "Plex" is not used');
  });
}

test('globals.css serves the board glyphs ahead of JetBrains Mono for exactly those code points', () => {
  const css = stripCssComments(read('app/globals.css'));
  const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]).filter((f) => /OM Board Glyphs/.test(f));
  assert.equal(faces.length, 2, 'one face per weight');
  for (const weight of [400, 700]) {
    const face = faces.find((f) => new RegExp(`font-weight:\\s*${weight}\\b`).test(f));
    assert.ok(face, `a ${weight} face`);
    assert.match(face, new RegExp(`url\\(["']?\\./fonts/om-board-glyphs-${weight}\\.woff["']?\\)`));
    const range = /unicode-range:\s*([^;]+);/.exec(face)?.[1] ?? '';
    const cps = new Set();
    for (const part of range.split(',')) {
      const [a, b] = part.trim().replace(/^U\+/i, '').split('-').map((h) => parseInt(h, 16));
      for (let cp = a; cp <= (b ?? a); cp++) cps.add(cp);
    }
    assert.deepEqual([...cps].sort((x, y) => x - y), BOARD_GLYPHS.map((c) => c.codePointAt(0)).sort((x, y) => x - y));
  }
  assert.match(rootTokens(css)['font-board'] ?? '', /^["']OM Board Glyphs["'],\s*var\(--font-jb-mono\)/);
  assert.match(css, /--font-mono:\s*var\(--font-board\)/, 'Tailwind font-mono uses the board stack');
  const kit = stripCssComments(read('app/components/kit/kit.css'));
  assert.ok(!/var\(--font-jb-mono\)/.test(kit), 'kit.css uses var(--font-board), not the bare JetBrains Mono stack');
});

// ── Source guards ───────────────────────────────────────────────────────────────────────────

function walk(rel) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) return [];
  if (!statSync(abs).isDirectory()) return [abs];
  return readdirSync(abs).flatMap((name) => walk(join(rel, name)));
}

test('no CSS trig (Safari) in any stylesheet under app/', () => {
  const sheets = walk('app').filter((f) => f.endsWith('.css'));
  assert.ok(sheets.some((f) => show(f) === 'app/globals.css'));
  for (const f of sheets) {
    const css = stripCssComments(readFileSync(f, 'utf8'));
    assert.ok(!/atan2|\b(?:a?sin|a?cos|a?tan)\(/i.test(css), `${show(f)} uses CSS trig`);
  }
});

// The redesigned surface: every file whose strings reach a visitor on a redesigned page.
const REDESIGNED = [
  'app/page.js',
  'app/layout.js',
  'app/jobs',
  'app/components/kit',
  'app/components/jobs',
  'app/components/home',
  'app/components/Navbar.js',
  'app/components/NavDrawer.js',
  'app/components/navParts.js',
  // The desk on /jobs: the AI assistant and the relocation guide.
  'app/components/ChatWidget.js',
  'app/components/RelocationModal.js',
  // The profile editor (/jobs "Set up profile", the navbar after a first sign-in).
  'app/components/ProfileModal.js',
  'app/lab',
  'lib/departures',
  ...readdirSync(join(ROOT, 'app/components')).filter((n) => /^Job.*\.js$/.test(n)).map((n) => `app/components/${n}`),
]
  .flatMap(walk)
  .filter((f) => /\.(?:js|jsx|mjs)$/.test(f));

/** Every string a file can show: string literals, template text, JSX text and attributes. */
function visibleStrings(src, file) {
  const ast = espree.parse(src, { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } });
  const out = [];
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'Literal' && typeof node.value === 'string') out.push(node.value);
    else if (node.type === 'TemplateElement') out.push(node.value.cooked ?? node.value.raw);
    else if (node.type === 'JSXText') out.push(node.value);
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const v = node[key];
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v === 'object') visit(v);
    }
  };
  try {
    visit(ast);
  } catch (e) {
    throw new Error(`${show(file)}: ${e.message}`);
  }
  return out;
}

test('the redesigned surface is scanned (sanity)', () => {
  const names = REDESIGNED.map(show);
  for (const f of ['app/page.js', 'app/components/Navbar.js', 'app/components/kit/FlapText.js', 'lib/departures/status.js']) {
    assert.ok(names.includes(f), `${f} is scanned`);
  }
  // The scanner sees strings, not identifiers: gateFor's { flight } key is code, not copy.
  const probe = visibleStrings("const g = gateFor(1); export const A = () => <p title=\"Gate\">{g.flight} pay</p>;", 'probe.js');
  assert.deepEqual(probe.map((s) => s.trim()).filter(Boolean), ['Gate', 'pay']);
});

test('no "flight" or "fare" in the visible copy of redesigned files', () => {
  const found = [];
  for (const f of REDESIGNED) {
    for (const s of visibleStrings(readFileSync(f, 'utf8'), f)) {
      if (/\b(?:flights?|fares?)\b/i.test(s)) found.push(`${show(f)}: ${JSON.stringify(s.trim().slice(0, 80))}`);
    }
  }
  assert.deepEqual(found, []);
});

test('no job/listing totals in redesigned files', () => {
  const found = [];
  for (const f of REDESIGNED) {
    const src = readFileSync(f, 'utf8');
    if (/\b\d{1,3},\d{3}\s*(?:jobs|roles|departures)\b/i.test(src)) found.push(`${show(f)}: a job total in the source`);
    for (const s of visibleStrings(src, f)) {
      if (/\b\d[\d,.]*\s*[kKmM]?\+?\s*(?:countries|jobs|roles|listings|openings|departures)\b/i.test(s)) {
        found.push(`${show(f)}: ${JSON.stringify(s.trim().slice(0, 80))}`);
      }
    }
  }
  assert.deepEqual(found, []);
});

test('the kit animates only transform and opacity', () => {
  const kit = stripCssComments(read('app/components/kit/kit.css'));
  for (const m of kit.matchAll(/transition(?:-property)?\s*:\s*([^;]+);/g)) {
    for (const part of m[1].replace(/\([^)]*\)/g, '').split(',')) {
      const prop = part.trim().split(/\s+/)[0];
      assert.ok(['transform', 'opacity', 'none'].includes(prop), `kit.css transitions ${prop}`);
    }
  }
});

test('the unused useTheme hook is gone', () => {
  assert.equal(existsSync(join(ROOT, 'app/hooks/useTheme.js')), false);
  const users = walk('app').filter((f) => /\.js$/.test(f) && /useTheme/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(users.map(show), []);
});

test('the Navbar drawer is a labelled Dialog loaded on demand; admin by id and no email stay', () => {
  const nav = read('app/components/Navbar.js');
  const drawer = read('app/components/NavDrawer.js');
  assert.match(nav, /dynamic\(\(\) => import\(['"]\.\/NavDrawer['"]\)/, 'the drawer is not in first-load JS');
  assert.match(drawer, /from ['"]\.\/kit\/Dialog['"]/);
  assert.match(drawer, /<Dialog\b[^>]*\blabel=/s, 'the drawer has an accessible name');
  assert.match(drawer, /data-autofocus/, 'focus starts on Close');
  assert.match(nav, /returnFocusRef=\{menuButton\}/, 'focus returns to the menu button');
  assert.match(nav, /isAdminUser\(user\)/);
  assert.match(nav, /displayName\(/);
  for (const src of [nav, drawer, read('app/components/navParts.js')]) {
    assert.ok(!/\.email\b/.test(src), 'the navbar never reads an email');
    assert.ok(!/transition-all|bg-paper|text-paper|border-paper/.test(src), 'night style only');
  }
});
