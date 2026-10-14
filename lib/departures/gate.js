// The job-detail gate: "OM 4127 · GATE A12", derived from the job id so a role always opens at
// the same gate. Not a real number of anything; just a stable, board-shaped label.

function fnv1a(text, seed = 0x811c9dc5) {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // final avalanche so neighbouring ids ("x_1", "x_2") spread across the whole range
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** gateFor('adzuna_123') -> { flight: 'OM 4127', gate: 'A12' } (1000-9999; A-F + 1-30). */
export function gateFor(jobId) {
  const id = String(jobId ?? '');
  const n = fnv1a(id);
  const g = fnv1a(id, n ^ 0x9e3779b9);
  return {
    flight: `OM ${1000 + (n % 9000)}`,
    gate: `${'ABCDEF'[g % 6]}${1 + (Math.floor(g / 6) % 30)}`,
  };
}
