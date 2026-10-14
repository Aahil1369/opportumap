// Split-flap engine, pure core (no DOM, no React). The kit's FlapText/FlapBoard turn this into
// moving tiles; everything here is plain data so it is unit-tested in scripts/departures.
//
// A board cell is a fixed row of tiles. When its text changes, only the tiles whose character
// changes flip, left to right, and each one walks forward through the drum (FLAP_CHARS) from
// its old character to its new one, showing at most `maxSteps` characters on the way.

/** The drum: the order a tile's flaps come round in. */
export const FLAP_CHARS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·:$€£¥→✓-/.,';

const DRUM = Array.from(FLAP_CHARS);
const SLOT = new Map(DRUM.map((ch, i) => [ch, i]));

/** Characters (code points), so '✓' or '😀' is one tile, never two. */
const chars = (s) => Array.from(s == null ? '' : String(s));

/** A character's slot on the drum (letters match either case), or -1 when it has none. */
function slotOf(ch) {
  const exact = SLOT.get(ch);
  if (exact !== undefined) return exact;
  const upper = SLOT.get(ch.toUpperCase());
  return upper !== undefined ? upper : -1;
}

/**
 * Per-character diff of two strings. The shorter one is padded with spaces, so a longer text
 * flips its new tail in and a shorter one flips its old tail to blank.
 * @returns {Array<{ index: number, from: string, to: string, changed: boolean }>}
 */
export function flapDiff(from, to) {
  const a = chars(from);
  const b = chars(to);
  const out = [];
  for (let i = 0, n = Math.max(a.length, b.length); i < n; i++) {
    const f = a[i] ?? ' ';
    const t = b[i] ?? ' ';
    out.push({ index: i, from: f, to: t, changed: f !== t });
  }
  return out;
}

/**
 * The characters one tile shows going from `from` to `to`: a forward walk round the drum,
 * keeping only the last `maxSteps` (always at least the target). A lowercase target walks the
 * drum in lowercase; a character the drum lacks ('Ō', '–', '₹') is reached after a short walk on
 * from the old character, so every walk still ends exactly on its target.
 */
export function flapSteps(from, to, maxSteps = 6) {
  const max = Math.max(1, Math.floor(maxSteps) || 1);
  const n = DRUM.length;
  const start = Math.max(0, slotOf(from));
  const end = slotOf(to);
  const steps = [];
  if (end < 0) {
    for (let k = 1; k < max; k++) steps.push(DRUM[(start + k) % n]);
  } else {
    const distance = (end - start + n) % n || 1; // same slot, other case: one flap
    for (let k = Math.min(distance, max) - 1; k >= 1; k--) steps.push(DRUM[(end - k + n) % n]);
  }
  const lower = to !== to.toUpperCase();
  const walk = lower ? steps.map((ch) => ch.toLowerCase()) : steps;
  walk.push(to);
  return walk;
}

/**
 * When each changed tile flips, and through what. Unchanged tiles are left out; the delay grows
 * left to right (`rowDelayMs + index * stepMs`) so a row ripples like a real board.
 * @returns {Array<{ index: number, delayMs: number, steps: string[] }>}
 */
export function flapSchedule(diff, { stepMs = 45, rowDelayMs = 0, maxSteps = 6 } = {}) {
  const out = [];
  for (const cell of Array.isArray(diff) ? diff : []) {
    if (!cell || !cell.changed) continue;
    out.push({
      index: cell.index,
      delayMs: rowDelayMs + cell.index * stepMs,
      steps: flapSteps(cell.from, cell.to, maxSteps),
    });
  }
  return out;
}

/**
 * Fits text to a cell of exactly `width` tiles: pads with spaces, or cuts and ends on '…' so a
 * 200-character title can never push a board row wider than its columns.
 */
export function fitFlap(text, width) {
  const w = Math.max(0, Math.floor(width) || 0);
  const cs = chars(text);
  if (cs.length > w) return w ? cs.slice(0, w - 1).join('') + '…' : '';
  return cs.join('') + ' '.repeat(w - cs.length);
}

/**
 * Concurrency cap for flipping tiles. Jobs (`{ due, ... }`, due in ms) wait until they are due
 * AND a slot is free; `take(now)` hands out the jobs that may start, earliest due first (ties in
 * the order they were added), and never lets more than `maxActive` run at once.
 */
export function createFlapQueue({ maxActive = 120 } = {}) {
  const pending = []; // sorted by due
  const active = new Set();
  return {
    add(job) {
      let lo = 0;
      let hi = pending.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (pending[mid].due <= job.due) lo = mid + 1;
        else hi = mid;
      }
      pending.splice(lo, 0, job);
    },
    take(now) {
      const started = [];
      while (active.size < maxActive && pending.length && pending[0].due <= now) {
        const job = pending.shift();
        active.add(job);
        started.push(job);
      }
      return started;
    },
    done(job) {
      active.delete(job);
    },
    cancel(job) {
      if (active.delete(job)) return;
      const i = pending.indexOf(job);
      if (i >= 0) pending.splice(i, 1);
    },
    get active() {
      return active.size;
    },
    get pending() {
      return pending.length;
    },
  };
}
