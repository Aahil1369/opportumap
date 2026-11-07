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
  // A 2D context the browser refuses (out of canvas memory) means no flip, not a TypeError.
  assert.equal(src.match(/if \(!ctx\)/g)?.length, 2, 'atlasFor and layerFor');
  assert.match(src, /if \(!a\) return;/);
  assert.match(src, /const layer = hostRect\.width && stripRect\.width \? layerFor\(host\) : null;/);
  // T1-4: room for a frame's three tiles before fetching any (no eviction mid-draw).
  assert.match(src, /if \(a\.slots\.size > a\.cap - 3\) clearAtlas\(a\);\s*const atlas = a\.canvas;\s*const o = glyph\(a, st, oldCh, color\);/);
});
