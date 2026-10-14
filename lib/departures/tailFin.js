// The hangar's tail fins: every startup gets an airline-style livery painted from its name, so
// the same name always gets the same fin (and a founder fixing "neuralhire" → "NeuralHire"
// keeps theirs). Pure: no DOM; app/components/startups/TailFin.js draws it as an SVG.
//
//   tailFin('NeuralHire') -> { hue: 0-359, stripes: 1-3, letter: 'N' }

// FNV-1a over UTF-16 units with a final avalanche, so near names ("Kora", "Korb") get far hues.
function hash(text, seed = 0x811c9dc5) {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

const asText = (name) => (typeof name === 'string' || typeof name === 'number' ? String(name) : '');

/** { hue, stripes, letter } for a startup name; deterministic, case- and spacing-insensitive. */
export function tailFin(name) {
  const text = asText(name);
  const key = text.trim().replace(/\s+/g, ' ').toLowerCase();
  const h = hash(key);
  const first = /[\p{L}\p{N}]/u.exec(text);
  return {
    hue: h % 360,
    stripes: 1 + (hash(key, h ^ 0x9e3779b9) % 3),
    letter: first ? first[0].toUpperCase() : '#',
  };
}

// ── Livery colours ──────────────────────────────────────────────────────────────────────────

function hslToHex(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * The fin's colours for a hue: `body` (the fin), `light` (the roundel letter and the first
 * stripe), `roundel` (the hall black disc the letter sits on) and `ink` (the other stripes).
 * The letter reads on its roundel at every hue (≥ 4.5:1, tested) and both stripes show on the fin.
 */
export function finPalette(hue) {
  const h = ((Math.round(Number(hue) || 0) % 360) + 360) % 360;
  return {
    body: hslToHex(h, 0.6, 0.36),
    light: hslToHex(h, 0.9, 0.74),
    roundel: '#0a0b0d',
    ink: '#f4f1e6',
  };
}

// ── Geometry (one viewBox, fin seen from the side; the root sits on the stand's floor) ─────

export const FIN_VIEWBOX = '0 0 64 64';
// Leading edge (6,60) → (36,6) swept back; tip (36,6)–(52,6); trailing edge (52,6) → (58,60).
const ROOT_Y = 60;
const TIP_Y = 6;
const leading = (y) => 6 + ((ROOT_Y - y) * 30) / (ROOT_Y - TIP_Y);
const trailing = (y) => 58 - ((ROOT_Y - y) * 6) / (ROOT_Y - TIP_Y);
const r1 = (x) => Math.round(x * 10) / 10;

/** The fin outline as an SVG path. */
export function finShape() {
  return `M6 ${ROOT_Y} L36 ${TIP_Y} L52 ${TIP_Y} L58 ${ROOT_Y} Z`;
}

/** The roundel (letter disc) centre and radius, inside the fin's upper half. */
export const FIN_ROUNDEL = { cx: 41, cy: 23, r: 9 };

/** 1–3 cheat-line bands across the lower fin, as polygon point lists, each inside the outline. */
export function finStripes(n) {
  const count = Math.min(3, Math.max(1, Math.floor(Number(n)) || 1));
  const height = 4;
  const gap = 3;
  const bands = [];
  for (let i = 0; i < count; i++) {
    const bottom = 54 - i * (height + gap);
    const top = bottom - height;
    bands.push(
      [
        [leading(top), top],
        [trailing(top), top],
        [trailing(bottom), bottom],
        [leading(bottom), bottom],
      ]
        .map(([x, y]) => `${r1(x)},${r1(y)}`)
        .join(' '),
    );
  }
  return bands;
}
