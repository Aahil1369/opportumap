'use client';

// One split-flap cell. Renders the final text twice: as real text (screen readers, SEO, copy)
// and as aria-hidden DOM tiles (server-rendered, so the board is readable at first paint). Once
// hydrated and `play` is true, the tiles whose character changes flip left to right
// (lib/departures/flap.js decides which and through what); when `text` changes later, the board
// re-flaps from what it showed. Reduced motion: plain text, no tiles.
//
// How a flip is drawn: the tiles mid-flip are painted on one canvas laid over the board (or
// over a standalone FlapText), from an atlas of pre-rendered tiles. Each flap is two half-tiles
// scaled vertically about the split: the old top folds down over the new character while the
// old bottom holds, then the new bottom lands. When a tile lands, its DOM character is set (one
// character of text in a fixed-size, absolutely placed box) and its canvas square is cleared.
// Measured at 4x CPU throttling on an emulated iPhone 13 board (12 rows, 120 tiles mid-flip):
// CSS scaleY on DOM half-tiles never got p95 under ~85 ms per frame (style/layout/paint/
// layerization per element), the canvas holds ~12 ms. Nothing in the DOM moves while it flips.

import { useEffect, useRef, useState } from 'react';
import { createFlapQueue, fitFlap, flapDiff, flapSchedule } from '../../../lib/departures/flap';
import { usePrefersReducedMotion } from './useReducedMotion';
import './kit.css';

const MAX_ACTIVE = 120; // tiles flipping at once, page-wide; the rest wait their turn
const FLIP_MS = 76; // one flap: the top half falls, the bottom half lands
const SETTLE_MS = 70; // the last flap bounces once on its stop
const BOUNCE = 0.1;

const queue = createFlapQueue({ maxActive: MAX_ACTIVE });
const running = new Set();
let raf = 0;

if (typeof window !== 'undefined') {
  // Read by the ?fps=1 overlay (public/om-fps.js).
  window.__omFlapStats = () => ({ active: queue.active, queued: queue.pending });
}

// ── Atlas: whole tiles (background, edges, glyph) per style + character + colour ─────────────

const ATLAS_COLS = 32;
const ATLAS_ROWS = 16;
const atlases = new Map(); // style key -> atlas

function resetAtlases() {
  atlases.clear();
}
if (typeof document !== 'undefined' && document.fonts) {
  // Glyphs drawn before the web font arrived are fallback glyphs: redraw them once it has.
  document.fonts.addEventListener?.('loadingdone', resetAtlases);
  // The drum walks through → and ✓ (FLAP_CHARS), which only the board glyph face has
  // (globals.css): fetch it now, before the first flip paints them on the canvas.
  document.fonts.load?.('500 16px "OM Board Glyphs"', '→✓')?.catch?.(() => {});
}

function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function atlasFor(st) {
  let a = atlases.get(st.key);
  if (a) return a;
  if (atlases.size >= 4) atlases.clear(); // tile sizes seen on this page (phone/desktop, resizes)
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLS * st.w;
  canvas.height = ATLAS_ROWS * st.h;
  const ctx = canvas.getContext('2d');
  ctx.font = st.font;
  const m = ctx.measureText('M');
  const ascent = m.fontBoundingBoxAscent ?? st.h * 0.4;
  const descent = m.fontBoundingBoxDescent ?? st.h * 0.1;
  a = {
    canvas,
    ctx,
    slots: new Map(),
    base: Math.round((st.h - (ascent + descent)) / 2 + ascent), // the line box centres the font
    colors: {
      hi: cssVar('--flap-hi', '#1d2026'),
      mid: cssVar('--hall-3', '#16181c'),
      lo: cssVar('--flap-lo', '#111316'),
      foot: cssVar('--flap-foot', '#0d0f12'),
      edge: cssVar('--flap-edge', '#2a2e35'),
    },
  };
  atlases.set(st.key, a);
  return a;
}

/** Atlas square for `ch` in `color` (drawn on first use). */
function glyph(st, ch, color) {
  const a = atlasFor(st);
  const key = `${ch}\u0000${color}`;
  let s = a.slots.get(key);
  if (s) return s;
  if (a.slots.size >= ATLAS_COLS * ATLAS_ROWS) {
    a.slots.clear();
    a.ctx.clearRect(0, 0, a.canvas.width, a.canvas.height);
  }
  const i = a.slots.size;
  s = { x: (i % ATLAS_COLS) * st.w, y: Math.floor(i / ATLAS_COLS) * st.h };
  a.slots.set(key, s);
  const { ctx, colors } = a;
  const { w, h, half, px } = st;
  const { x, y } = s;
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, 2 * px);
  else ctx.rect(x, y, w, h);
  ctx.clip();
  const top = ctx.createLinearGradient(0, y, 0, y + half);
  top.addColorStop(0, colors.hi);
  top.addColorStop(1, colors.mid);
  ctx.fillStyle = top;
  ctx.fillRect(x, y, w, half);
  const bottom = ctx.createLinearGradient(0, y + half, 0, y + h);
  bottom.addColorStop(0, colors.lo);
  bottom.addColorStop(1, colors.foot);
  ctx.fillStyle = bottom;
  ctx.fillRect(x, y + half, w, h - half);
  ctx.fillStyle = colors.edge;
  ctx.fillRect(x, y, w, px);
  ctx.fillStyle = '#000';
  ctx.fillRect(x, y + h - px, w, px);
  if (ch !== ' ') {
    ctx.font = st.font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = color;
    ctx.fillText(ch, x + w / 2, y + a.base);
  }
  ctx.restore();
  return s;
}

// ── Layers: one canvas per board (or standalone FlapText), over its tiles ─────────────────────

const layers = new WeakMap(); // host element -> layer

function layerFor(strip) {
  const host = strip.closest('.fb-table') || strip.parentElement;
  let layer = layers.get(host);
  if (layer && layer.canvas.isConnected) return layer;
  const canvas = document.createElement('canvas');
  canvas.className = 'flap-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);
  layer = {
    host,
    canvas,
    ctx: canvas.getContext('2d'),
    jobs: new Set(), // flipping now
    queued: new Set(), // waiting for their turn, placed on the geometry they were queued on
    w: 0,
    h: 0,
    dpr: 1,
    cssW: 0,
    cssH: 0,
  };
  layers.set(host, layer);
  if (typeof ResizeObserver !== 'undefined') {
    // The board changed size under the canvas (rotation, resize): every flip on it ends now;
    // the canvas is re-fitted on the next flip. Sizes the last flip already fitted are not a change.
    new ResizeObserver(([entry]) => {
      const box = entry.borderBoxSize?.[0];
      const w = box ? box.inlineSize : entry.contentRect.width;
      const h = box ? box.blockSize : entry.contentRect.height;
      if (Math.abs(w - layer.cssW) < 0.5 && Math.abs(h - layer.cssH) < 0.5) return;
      landLayer(layer);
      layer.w = 0;
    }).observe(host);
  }
  return layer;
}

/**
 * Ends every flip on a layer, flipping or queued, on its final character. Not where a flip is:
 * the cell's text already says the target (the next diff starts from it), so a tile left on a
 * character of its walk would stay wrong until that cell's text next changed. Queued flips go
 * too: they were placed on the old geometry.
 */
function landLayer(layer) {
  for (const job of [...layer.jobs, ...layer.queued]) land(job, job.walk.at(-1));
}

/** Sizes the canvas to its host (a resize clears it, so every flip on it lands first). */
function fitLayer(layer, hostRect) {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const w = Math.round(hostRect.width * dpr);
  const h = Math.round(hostRect.height * dpr);
  layer.cssW = hostRect.width;
  layer.cssH = hostRect.height;
  if (w === layer.w && h === layer.h && dpr === layer.dpr) return;
  landLayer(layer);
  layer.canvas.width = w;
  layer.canvas.height = h;
  layer.w = w;
  layer.h = h;
  layer.dpr = dpr;
}

/** Tile size, font and colour of a strip, in device pixels. */
function styleOf(strip, dpr) {
  const tile = strip.firstElementChild;
  const cs = getComputedStyle(tile);
  const w = Math.round(parseFloat(cs.width) * dpr);
  const h = Math.round(parseFloat(cs.height) * dpr);
  const font = `${cs.fontWeight} ${parseFloat(cs.fontSize) * dpr}px ${cs.fontFamily}`;
  return {
    key: `${font}|${w}x${h}`,
    w,
    h,
    half: Math.round(h / 2),
    px: Math.max(1, Math.round(dpr)),
    font,
    color: cs.color,
    pitch: (parseFloat(cs.width) + 1) * dpr, // 1px between tiles (kit.css)
  };
}

// ── Engine: one requestAnimationFrame loop for every flipping tile on the page ────────────────

/** The tile's own character (its first child text node). */
function faceOf(tile) {
  let node = tile.firstChild;
  if (!node || node.nodeType !== 3) {
    node = document.createTextNode(' ');
    tile.insertBefore(node, tile.firstChild);
  }
  return node;
}

function draw(job, oldCh, newCh, top, bottom, blankUnder = false) {
  const { ctx } = job.layer;
  const { st, x, y, color } = job;
  const { w, h, half, px } = st;
  const atlas = atlasFor(st).canvas;
  const o = glyph(st, oldCh, color);
  const n = glyph(st, newCh, color);
  const under = blankUnder ? glyph(st, ' ', color) : o;
  ctx.clearRect(x, y, w, h);
  ctx.drawImage(atlas, n.x, n.y, w, half, x, y, w, half); // new top, revealed as the flap falls
  ctx.drawImage(atlas, under.x, under.y + half, w, h - half, x, y + half, w, h - half); // old bottom
  if (top > 0.002) {
    const fh = half * top;
    ctx.drawImage(atlas, o.x, o.y, w, half, x, y + half - fh, w, fh); // old top, folding down
  }
  if (bottom > 0.002) {
    const fh = (h - half) * bottom;
    ctx.drawImage(atlas, n.x, n.y + half, w, h - half, x, y + half, w, fh); // new bottom, landing
  }
  ctx.fillStyle = '#000';
  ctx.fillRect(x, y + half - Math.floor(px / 2), w, px); // the split
}

function begin(job, now) {
  job.start = now;
  job.k = 0;
  job.layer.queued.delete(job);
  job.layer.jobs.add(job);
  running.add(job);
}

/**
 * Ends a job, by default where it is (a flip interrupted by the cell's next text walks on from
 * there): the canvas square clears and the tile shows the character it is on.
 */
function land(job, ch = job.walk[job.k ?? 0]) {
  if (job.layer.jobs.delete(job)) job.layer.ctx.clearRect(job.x, job.y, job.st.w, job.st.h);
  job.layer.queued.delete(job);
  running.delete(job);
  queue.cancel(job);
  faceOf(job.tile).nodeValue = ch;
  if (job.tile.__flap === job) job.tile.__flap = null;
}

function advance(job, now) {
  const n = job.steps.length;
  const t = now - job.start;
  const k = Math.min(n, Math.floor(t / FLIP_MS) + 1);
  if (t >= n * FLIP_MS) {
    const u = (t - n * FLIP_MS) / SETTLE_MS;
    if (u >= 1) return land(job, job.walk[n]);
    job.k = n;
    // Settled: the flap bounces once on its stop (a blank edge shows under it as it lifts).
    return draw(job, job.walk[n], job.walk[n], 0, 1 - BOUNCE * Math.sin(Math.PI * u), true);
  }
  job.k = k - 1;
  // The flap's angle grows with the square of time (it falls), so the top folds slowly and the
  // bottom slaps down; each half's height is |cos(angle)|, the split is at 90°.
  const p = (t - (k - 1) * FLIP_MS) / FLIP_MS;
  const c = Math.cos(Math.PI * p * p);
  draw(job, job.walk[k - 1], job.walk[k], c > 0 ? c : 0, c < 0 ? -c : 0);
}

function frame(now) {
  raf = 0;
  for (const job of queue.take(now)) begin(job, now);
  for (const job of running) advance(job, now);
  if (running.size || queue.pending) raf = requestAnimationFrame(frame);
}

function stopTile(tile) {
  const job = tile.__flap;
  if (!job) return;
  if (running.has(job)) land(job);
  else {
    queue.cancel(job);
    job.layer.queued.delete(job);
    tile.__flap = null;
  }
}

/** A longer text than the strip was rendered for: add blank tiles (the strip only grows). */
function ensureTiles(strip, n) {
  if (strip.children.length >= n) return;
  while (strip.children.length < n) {
    const tile = document.createElement('span');
    tile.className = 'flap-t';
    tile.style.setProperty('--i', String(strip.children.length));
    tile.textContent = ' ';
    strip.appendChild(tile);
  }
  strip.style.setProperty('--n', String(n));
}

/** Shows `text` at once (no flips), stopping anything mid-flip. */
function snapTo(strip, text) {
  const cs = Array.from(text);
  ensureTiles(strip, cs.length);
  Array.from(strip.children).forEach((tile, i) => {
    stopTile(tile);
    faceOf(tile).nodeValue = cs[i] ?? ' ';
  });
}

/** Queues the flips that take `strip` from showing `from` to showing `to`. */
function flapTo(strip, from, to, rowDelayMs) {
  const diff = flapDiff(from, to);
  ensureTiles(strip, diff.length);
  const layer = layerFor(strip);
  const hostRect = layer.host.getBoundingClientRect();
  const stripRect = strip.getBoundingClientRect();
  if (!hostRect.width || !stripRect.width) return snapTo(strip, to); // not on the page: no motion
  fitLayer(layer, hostRect);
  const st = styleOf(strip, layer.dpr);
  const x0 = (stripRect.left - hostRect.left) * layer.dpr;
  const y = Math.round((stripRect.top - hostRect.top) * layer.dpr);
  const t0 = performance.now();
  for (const cell of flapSchedule(diff, { rowDelayMs })) {
    const tile = strip.children[cell.index];
    stopTile(tile);
    const job = {
      tile,
      layer,
      st,
      color: st.color,
      x: Math.round(x0 + cell.index * st.pitch),
      y,
      steps: cell.steps,
      walk: [faceOf(tile).nodeValue, ...cell.steps],
      due: t0 + cell.delayMs,
    };
    tile.__flap = job;
    queue.add(job);
    layer.queued.add(job);
  }
  if (!raf) raf = requestAnimationFrame(frame);
}

function stopAll(strip) {
  for (const tile of Array.from(strip.children)) stopTile(tile);
}

// ── Reduced motion: plain text (the server renders tiles; CSS hides them under reduce) ────────

export { usePrefersReducedMotion };

/** What the tiles show for `text`: board capitals, fitted to `width` tiles when given. */
function tileText(text, width, upper = true) {
  const s = text == null ? '' : String(text);
  const t = upper ? s.toUpperCase() : s;
  return width ? fitFlap(t, width) : t;
}

/**
 * The aria-hidden tile strip. React renders its characters once, when it mounts; from then on
 * the engine owns them, so a re-render never fights a flip in motion.
 */
function FlapTiles({ target, start, play, delayMs }) {
  const strip = useRef(null);
  const shown = useRef(target); // what the tiles show (or are flipping to)
  const played = useRef(false);
  const [tiles] = useState(() =>
    Array.from(target, (ch, i) => (
      <span key={i} className="flap-t" style={{ '--i': i }}>
        {ch}
      </span>
    )),
  );
  const [size] = useState(() => ({ '--n': tiles.length }));

  useEffect(() => {
    const el = strip.current;
    if (!play) {
      if (shown.current !== target) {
        snapTo(el, target);
        shown.current = target;
      }
      return;
    }
    // First play: flip from `from` over the final text already on screen; later, from what it showed.
    const prev = played.current ? shown.current : start;
    played.current = true;
    shown.current = target;
    if (prev !== target) flapTo(el, prev, target, delayMs);
  }, [target, start, play, delayMs]);

  // Nothing keeps flipping on tiles that are gone.
  useEffect(() => {
    const el = strip.current;
    return () => stopAll(el);
  }, []);

  return (
    <span className="flap-tiles" aria-hidden="true" ref={strip} style={size}>
      {tiles}
    </span>
  );
}

export default function FlapText({ text, from = '', play = true, className, width, delayMs = 0, upper = true }) {
  const reduced = usePrefersReducedMotion();
  const label = text == null ? '' : String(text);
  if (reduced) return <span className={className ? `flap-plain ${className}` : 'flap-plain'}>{label}</span>;
  return (
    <span className={className ? `flap ${className}` : 'flap'}>
      <span className="flap-sr">{label}</span>
      <FlapTiles
        target={tileText(text, width, upper)}
        start={tileText(from, width, upper)}
        play={play}
        delayMs={delayMs}
      />
    </span>
  );
}
