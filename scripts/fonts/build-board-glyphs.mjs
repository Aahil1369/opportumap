// Builds app/fonts/om-board-glyphs-{400,700}.woff: the few board characters that the web subsets
// of JetBrains Mono (next/font/google) do not have, so the board never falls back to a system
// font (next/font's "JetBrains Mono Fallback" is Arial at 134% size; ✓ ₹ ₩ are not in JetBrains
// Mono at all). globals.css serves this font ahead of JetBrains Mono for exactly these code
// points (unicode-range), so it is only downloaded when one of them is on the page.
//
//   ← → ↗ ↘ ✕   from JetBrains Mono 2.211 (its own glyphs; Google's subsets drop them)
//   ✓ ₹ ₩       from IBM Plex Mono 2.3, scaled to JetBrains Mono's cap height (730 / 698)
//
// The output keeps JetBrains Mono's vertical metrics (1000 upm, ascender 1020, descender -300,
// 600 advance), so a fallback glyph never shifts a baseline or widens a monospace cell. Both
// sources are SIL OFL 1.1 (no Reserved Font Name is used: "Plex" is reserved). Outlines only:
// hinting, kerning and layout tables are dropped.
//
// Usage (sources are not in the repo; any copy of these releases works):
//   node scripts/fonts/build-board-glyphs.mjs <fonts dir with JetBrainsMono-{Regular,Bold}.ttf
//                                              and IBMPlexMono-{Regular,Bold}.ttf>

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const OUT_DIR = join(ROOT, 'app/fonts');
const FAMILY = 'OM Board Glyphs';
const VERSION = 'Version 1.000';

const FROM_JETBRAINS = ['←', '→', '↗', '↘', '✕'];
const FROM_PLEX = ['✓', '₹', '₩'];
const WEIGHTS = [
  { weight: 400, style: 'Regular', jb: 'JetBrainsMono-Regular.ttf', plex: 'IBMPlexMono-Regular.ttf' },
  { weight: 700, style: 'Bold', jb: 'JetBrainsMono-Bold.ttf', plex: 'IBMPlexMono-Bold.ttf' },
];

// ── Reading a TrueType font ───────────────────────────────────────────────────────────────────

function parseFont(buf) {
  const tables = {};
  const n = buf.readUInt16BE(4);
  for (let i = 0; i < n; i++) {
    const o = 12 + i * 16;
    const tag = buf.toString('latin1', o, o + 4);
    const off = buf.readUInt32BE(o + 8);
    tables[tag] = buf.subarray(off, off + buf.readUInt32BE(o + 12));
  }
  for (const t of ['head', 'hhea', 'hmtx', 'maxp', 'cmap', 'loca', 'glyf', 'OS/2', 'post']) {
    if (!tables[t]) throw new Error(`missing ${t} table`);
  }
  const long = tables.head.readInt16BE(50) === 1;
  const loca = (g) => (long ? tables.loca.readUInt32BE(g * 4) : tables.loca.readUInt16BE(g * 2) * 2);
  const numH = tables.hhea.readUInt16BE(34);
  return {
    tables,
    upm: tables.head.readUInt16BE(18),
    capHeight: tables['OS/2'].readInt16BE(88),
    cmap: readCmap(tables.cmap),
    glyph: (g) => tables.glyf.subarray(loca(g), loca(g + 1)),
    advance: (g) => tables.hmtx.readUInt16BE(Math.min(g, numH - 1) * 4),
  };
}

function readCmap(cmap) {
  const map = new Map();
  const n = cmap.readUInt16BE(2);
  const subs = [];
  for (let i = 0; i < n; i++) subs.push({ pid: cmap.readUInt16BE(4 + i * 8), eid: cmap.readUInt16BE(6 + i * 8), off: cmap.readUInt32BE(8 + i * 8) });
  for (const s of subs) {
    const fmt = cmap.readUInt16BE(s.off);
    if (fmt === 12) {
      const groups = cmap.readUInt32BE(s.off + 12);
      for (let g = 0; g < groups; g++) {
        const b = s.off + 16 + g * 12;
        const start = cmap.readUInt32BE(b);
        const end = cmap.readUInt32BE(b + 4);
        const gid = cmap.readUInt32BE(b + 8);
        for (let cp = start; cp <= end; cp++) map.set(cp, gid + cp - start);
      }
    } else if (fmt === 4) {
      const seg = cmap.readUInt16BE(s.off + 6) / 2;
      const ends = s.off + 14;
      const starts = ends + seg * 2 + 2;
      const deltas = starts + seg * 2;
      const ranges = deltas + seg * 2;
      for (let k = 0; k < seg; k++) {
        const end = cmap.readUInt16BE(ends + k * 2);
        const start = cmap.readUInt16BE(starts + k * 2);
        const delta = cmap.readInt16BE(deltas + k * 2);
        const ro = cmap.readUInt16BE(ranges + k * 2);
        for (let cp = start; cp <= end && cp !== 0xffff; cp++) {
          if (map.has(cp)) continue;
          let gid = ro ? cmap.readUInt16BE(ranges + k * 2 + ro + (cp - start) * 2) : (cp + delta) & 0xffff;
          if (ro && gid) gid = (gid + delta) & 0xffff;
          if (gid) map.set(cp, gid);
        }
      }
    }
  }
  return map;
}

/** A glyph's outline as contours of { x, y, on } points (composites flattened). */
function outline(font, gid, depth = 0) {
  if (depth > 8) throw new Error('composite glyph too deep');
  const g = font.glyph(gid);
  if (g.length === 0) return [];
  const nc = g.readInt16BE(0);
  if (nc >= 0) {
    const ends = [];
    for (let i = 0; i < nc; i++) ends.push(g.readUInt16BE(10 + i * 2));
    const nPts = nc ? ends[nc - 1] + 1 : 0;
    let p = 10 + nc * 2;
    p += 2 + g.readUInt16BE(p); // skip the instructions
    const flags = [];
    while (flags.length < nPts) {
      const f = g[p++];
      flags.push(f);
      if (f & 8) for (let r = g[p++]; r > 0; r--) flags.push(f);
    }
    const coord = (shortBit, sameBit) => {
      const out = [];
      let v = 0;
      for (const f of flags) {
        if (f & shortBit) {
          const d = g[p++];
          v += f & sameBit ? d : -d;
        } else if (!(f & sameBit)) {
          v += g.readInt16BE(p);
          p += 2;
        }
        out.push(v);
      }
      return out;
    };
    const xs = coord(2, 16);
    const ys = coord(4, 32);
    const contours = [];
    let start = 0;
    for (const end of ends) {
      const c = [];
      for (let i = start; i <= end; i++) c.push({ x: xs[i], y: ys[i], on: (flags[i] & 1) === 1 });
      contours.push(c);
      start = end + 1;
    }
    return contours;
  }
  // Composite: components with x/y offsets and an optional scale or 2x2 matrix.
  const contours = [];
  let p = 10;
  let more = true;
  while (more) {
    const flags = g.readUInt16BE(p);
    const child = g.readUInt16BE(p + 2);
    p += 4;
    let dx;
    let dy;
    if (flags & 1) {
      dx = g.readInt16BE(p);
      dy = g.readInt16BE(p + 2);
      p += 4;
    } else {
      dx = g.readInt8(p);
      dy = g.readInt8(p + 1);
      p += 2;
    }
    if (!(flags & 2)) throw new Error('composite with point-matched components is not supported');
    const f2 = (o) => g.readInt16BE(o) / 16384;
    let [a, b, c, d] = [1, 0, 0, 1];
    if (flags & 8) {
      a = d = f2(p);
      p += 2;
    } else if (flags & 0x40) {
      a = f2(p);
      d = f2(p + 2);
      p += 4;
    } else if (flags & 0x80) {
      [a, b, c, d] = [f2(p), f2(p + 2), f2(p + 4), f2(p + 6)];
      p += 8;
    }
    for (const cont of outline(font, child, depth + 1)) {
      contours.push(cont.map((pt) => ({ x: a * pt.x + c * pt.y + dx, y: b * pt.x + d * pt.y + dy, on: pt.on })));
    }
    more = (flags & 0x20) !== 0;
  }
  return contours;
}

// ── Writing ───────────────────────────────────────────────────────────────────────────────────

/** A simple glyph (no instructions) from contours of integer points. */
function encodeGlyph(contours) {
  if (!contours.length) return { data: Buffer.alloc(0), bbox: null, points: 0 };
  const pts = contours.flat();
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const bbox = { xMin: Math.min(...xs), yMin: Math.min(...ys), xMax: Math.max(...xs), yMax: Math.max(...ys) };
  const head = Buffer.alloc(10 + contours.length * 2 + 2);
  head.writeInt16BE(contours.length, 0);
  head.writeInt16BE(bbox.xMin, 2);
  head.writeInt16BE(bbox.yMin, 4);
  head.writeInt16BE(bbox.xMax, 6);
  head.writeInt16BE(bbox.yMax, 8);
  let end = -1;
  contours.forEach((c, i) => head.writeUInt16BE((end += c.length), 10 + i * 2));
  head.writeUInt16BE(0, 10 + contours.length * 2); // no instructions
  const flags = [];
  const xb = [];
  const yb = [];
  let px = 0;
  let py = 0;
  for (const p of pts) {
    let f = p.on ? 1 : 0;
    const dx = p.x - px;
    const dy = p.y - py;
    if (dx === 0) f |= 16;
    else if (Math.abs(dx) < 256) {
      f |= 2 | (dx > 0 ? 16 : 0);
      xb.push(Math.abs(dx));
    } else xb.push((dx >> 8) & 0xff, dx & 0xff);
    if (dy === 0) f |= 32;
    else if (Math.abs(dy) < 256) {
      f |= 4 | (dy > 0 ? 32 : 0);
      yb.push(Math.abs(dy));
    } else yb.push((dy >> 8) & 0xff, dy & 0xff);
    flags.push(f);
    px = p.x;
    py = p.y;
  }
  const data = Buffer.concat([head, Buffer.from(flags), Buffer.from(xb), Buffer.from(yb)]);
  return { data, bbox, points: pts.length };
}

const pad4 = (b) => (b.length % 4 ? Buffer.concat([b, Buffer.alloc(4 - (b.length % 4))]) : b);

function checksum(b) {
  const p = pad4(b);
  let sum = 0;
  for (let i = 0; i < p.length; i += 4) sum = (sum + p.readUInt32BE(i)) >>> 0;
  return sum;
}

function cmapTable(pairs) {
  // pairs: [codePoint, glyphId] sorted by code point; one segment per run of consecutive pairs.
  const segs = [];
  for (const [cp, gid] of pairs) {
    const last = segs.at(-1);
    if (last && cp === last.end + 1 && gid - cp === last.delta) last.end = cp;
    else segs.push({ start: cp, end: cp, delta: gid - cp });
  }
  segs.push({ start: 0xffff, end: 0xffff, delta: 1 });
  const n = segs.length;
  const sub = Buffer.alloc(16 + n * 8);
  const log = Math.floor(Math.log2(n));
  sub.writeUInt16BE(4, 0);
  sub.writeUInt16BE(sub.length, 2);
  sub.writeUInt16BE(0, 4);
  sub.writeUInt16BE(n * 2, 6);
  sub.writeUInt16BE(2 * 2 ** log, 8);
  sub.writeUInt16BE(log, 10);
  sub.writeUInt16BE(n * 2 - 2 * 2 ** log, 12);
  segs.forEach((s, i) => {
    sub.writeUInt16BE(s.end, 14 + i * 2);
    sub.writeUInt16BE(s.start, 16 + n * 2 + i * 2);
    sub.writeUInt16BE((s.delta + 0x10000) & 0xffff, 16 + n * 4 + i * 2);
    sub.writeUInt16BE(0, 16 + n * 6 + i * 2);
  });
  const head = Buffer.alloc(4 + 2 * 8);
  head.writeUInt16BE(0, 0);
  head.writeUInt16BE(2, 2);
  [[0, 3], [3, 1]].forEach(([pid, eid], i) => {
    head.writeUInt16BE(pid, 4 + i * 8);
    head.writeUInt16BE(eid, 6 + i * 8);
    head.writeUInt32BE(head.length, 8 + i * 8);
  });
  return Buffer.concat([head, sub]);
}

function nameTable(entries) {
  const records = Object.entries(entries).map(([id, text]) => ({ id: Number(id), data: Buffer.from(text, 'utf16le').swap16() }));
  records.sort((a, b) => a.id - b.id);
  const head = Buffer.alloc(6 + records.length * 12);
  head.writeUInt16BE(0, 0);
  head.writeUInt16BE(records.length, 2);
  head.writeUInt16BE(head.length, 4);
  let off = 0;
  records.forEach((r, i) => {
    const o = 6 + i * 12;
    head.writeUInt16BE(3, o); // Windows
    head.writeUInt16BE(1, o + 2); // Unicode BMP
    head.writeUInt16BE(0x409, o + 4); // en-US
    head.writeUInt16BE(r.id, o + 6);
    head.writeUInt16BE(r.data.length, o + 8);
    head.writeUInt16BE(off, o + 10);
    off += r.data.length;
  });
  return Buffer.concat([head, ...records.map((r) => r.data)]);
}

function sfnt(tables) {
  const tags = Object.keys(tables).sort();
  const n = tags.length;
  const log = Math.floor(Math.log2(n));
  const dir = Buffer.alloc(12 + n * 16);
  dir.writeUInt32BE(0x00010000, 0);
  dir.writeUInt16BE(n, 4);
  dir.writeUInt16BE(16 * 2 ** log, 6);
  dir.writeUInt16BE(log, 8);
  dir.writeUInt16BE(n * 16 - 16 * 2 ** log, 10);
  let off = dir.length;
  const bodies = [];
  tags.forEach((tag, i) => {
    const t = tables[tag];
    const o = 12 + i * 16;
    dir.write(tag, o, 4, 'latin1');
    dir.writeUInt32BE(checksum(t), o + 4);
    dir.writeUInt32BE(off, o + 8);
    dir.writeUInt32BE(t.length, o + 12);
    bodies.push(pad4(t));
    off += pad4(t).length;
  });
  const font = Buffer.concat([dir, ...bodies]);
  const headAt = font.readUInt32BE(12 + tags.indexOf('head') * 16 + 8);
  font.writeUInt32BE((0xb1b0afba - checksum(font)) >>> 0, headAt + 8); // checkSumAdjustment
  return { font, tags };
}

function woff(font, tags) {
  const n = tags.length;
  const dir = Buffer.alloc(44 + n * 20);
  let off = dir.length;
  const bodies = [];
  tags.forEach((tag, i) => {
    const rec = 12 + i * 16;
    const origOff = font.readUInt32BE(rec + 8);
    const orig = font.subarray(origOff, origOff + font.readUInt32BE(rec + 12));
    const z = deflateSync(orig, { level: 9 });
    const data = z.length < orig.length ? z : orig;
    const o = 44 + i * 20;
    dir.write(tag, o, 4, 'latin1');
    dir.writeUInt32BE(off, o + 4);
    dir.writeUInt32BE(data.length, o + 8);
    dir.writeUInt32BE(orig.length, o + 12);
    dir.writeUInt32BE(font.readUInt32BE(rec + 4), o + 16);
    bodies.push(pad4(data));
    off += pad4(data).length;
  });
  dir.write('wOFF', 0, 4, 'latin1');
  dir.writeUInt32BE(0x00010000, 4);
  dir.writeUInt32BE(off, 8);
  dir.writeUInt16BE(n, 12);
  dir.writeUInt32BE(font.length, 16); // totalSfntSize: the sfnt above, tables padded
  dir.writeUInt16BE(1, 20);
  return Buffer.concat([dir, ...bodies]);
}

// ── Build ─────────────────────────────────────────────────────────────────────────────────────

function build(srcDir, { weight, style, jb, plex }) {
  const J = parseFont(readFileSync(join(srcDir, jb)));
  const P = parseFont(readFileSync(join(srcDir, plex)));
  if (J.upm !== 1000 || P.upm !== 1000) throw new Error('expected 1000 upm sources');
  const scale = J.capHeight / P.capHeight; // Plex glyphs grow to JetBrains Mono's cap height
  const glyphs = [{ cp: null, contours: [] }]; // .notdef: empty
  const take = (font, chars, s) => {
    for (const ch of chars) {
      const cp = ch.codePointAt(0);
      const gid = font.cmap.get(cp);
      if (!gid) throw new Error(`${ch} is not in the source font`);
      if (font.advance(gid) !== 600) throw new Error(`${ch} is not 600 units wide`);
      const contours = outline(font, gid).map((c) =>
        c.map((p) => ({ x: Math.round(300 + (p.x - 300) * s), y: Math.round(p.y * s), on: p.on })),
      );
      glyphs.push({ cp, contours });
    }
  };
  take(J, FROM_JETBRAINS, 1);
  take(P, FROM_PLEX, scale);

  const encoded = glyphs.map((g) => encodeGlyph(g.contours));
  const glyf = Buffer.concat(encoded.map((e) => pad4(e.data)));
  const loca = Buffer.alloc((encoded.length + 1) * 2);
  let at = 0;
  encoded.forEach((e, i) => {
    loca.writeUInt16BE(at / 2, i * 2);
    at += pad4(e.data).length;
  });
  loca.writeUInt16BE(at / 2, encoded.length * 2);

  const boxes = encoded.map((e) => e.bbox).filter(Boolean);
  const xMin = Math.min(...boxes.map((b) => b.xMin));
  const yMin = Math.min(...boxes.map((b) => b.yMin));
  const xMax = Math.max(...boxes.map((b) => b.xMax));
  const yMax = Math.max(...boxes.map((b) => b.yMax));

  const hmtx = Buffer.alloc(encoded.length * 4);
  encoded.forEach((e, i) => {
    hmtx.writeUInt16BE(600, i * 4);
    hmtx.writeInt16BE(e.bbox ? e.bbox.xMin : 0, i * 4 + 2);
  });

  const head = Buffer.from(J.tables.head);
  head.writeUInt32BE(0x00010000, 4); // fontRevision 1.0
  head.writeUInt32BE(0, 8);
  head.writeInt16BE(xMin, 36);
  head.writeInt16BE(yMin, 38);
  head.writeInt16BE(xMax, 40);
  head.writeInt16BE(yMax, 42);
  head.writeUInt16BE(weight >= 700 ? 1 : 0, 44); // macStyle
  head.writeInt16BE(0, 50); // short loca

  const hhea = Buffer.from(J.tables.hhea.subarray(0, 36));
  hhea.writeUInt16BE(600, 10);
  hhea.writeInt16BE(Math.min(...boxes.map((b) => b.xMin)), 12);
  hhea.writeInt16BE(Math.min(...boxes.map((b) => 600 - b.xMax)), 14);
  hhea.writeInt16BE(xMax, 16);
  hhea.writeUInt16BE(encoded.length, 34);

  const maxp = Buffer.alloc(32);
  maxp.writeUInt32BE(0x00010000, 0);
  maxp.writeUInt16BE(encoded.length, 4);
  maxp.writeUInt16BE(Math.max(...encoded.map((e) => e.points)), 6);
  maxp.writeUInt16BE(Math.max(...glyphs.map((g) => g.contours.length)), 8);
  maxp.writeUInt16BE(1, 14); // maxZones: no twilight zone

  const cps = glyphs.filter((g) => g.cp != null).map((g) => g.cp);
  const os2 = Buffer.from(J.tables['OS/2']);
  os2.writeInt16BE(600, 2); // xAvgCharWidth
  os2.writeUInt16BE(weight, 4);
  os2.writeUInt16BE((os2.readUInt16BE(62) & 0x80) | (weight >= 700 ? 0x20 : 0x40), 62); // keep USE_TYPO_METRICS
  os2.writeUInt16BE(Math.min(...cps), 64);
  os2.writeUInt16BE(Math.max(...cps), 66);
  if (os2.length >= 96) {
    os2.writeUInt16BE(0, 90); // usDefaultChar
    os2.writeUInt16BE(0, 94); // usMaxContext
  }

  const post = Buffer.from(J.tables.post.subarray(0, 32));
  post.writeUInt32BE(0x00030000, 0); // no glyph names
  post.writeUInt32BE(1, 12); // isFixedPitch

  const ps = `OMBoardGlyphs-${style}`;
  const name = nameTable({
    0: 'Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono). Copyright 2017 IBM Corp. (IBM Plex Mono, with Reserved Font Name "Plex").',
    1: FAMILY,
    2: style,
    3: `${VERSION};${ps}`,
    4: `${FAMILY} ${style}`,
    5: VERSION,
    6: ps,
    13: 'This Font Software is licensed under the SIL Open Font License, Version 1.1. This license is available with a FAQ at: https://openfontlicense.org',
    14: 'https://openfontlicense.org',
  });

  const cmap = cmapTable(glyphs.map((g, i) => [g.cp, i]).filter(([cp]) => cp != null).sort((a, b) => a[0] - b[0]));
  const { font, tags } = sfnt({ 'OS/2': os2, cmap, glyf, head, hhea, hmtx, loca, maxp, name, post });
  return woff(font, tags);
}

const srcDir = process.argv[2];
if (!srcDir) {
  console.error('usage: node scripts/fonts/build-board-glyphs.mjs <dir with the source .ttf files>');
  process.exit(2);
}
mkdirSync(OUT_DIR, { recursive: true });
for (const w of WEIGHTS) {
  const out = build(srcDir, w);
  const file = join(OUT_DIR, `om-board-glyphs-${w.weight}.woff`);
  writeFileSync(file, out);
  console.log(`${file}: ${out.length} bytes`);
}
