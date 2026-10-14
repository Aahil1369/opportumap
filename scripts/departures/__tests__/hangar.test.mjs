// /startups — the hangar's pure parts: generated tail fins (deterministic from the name, a
// readable roundel letter on every hue), sector counts from the unfiltered list (never the
// filtered one), the filter/sort view, the post body, and the signed-in user's own state that
// GET /api/startups/[id] returns. The pages are scanned in hangar-pages.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const { tailFin, finPalette, finShape, finStripes, FIN_VIEWBOX } = await import(new URL('../../../lib/departures/tailFin.js', import.meta.url));
const hangar = await import(new URL('../../../lib/departures/hangar.js', import.meta.url));
const { viewerState } = await import(new URL('../../../lib/startupViewer.js', import.meta.url));

// ── contrast (WCAG 2.x) ─────────────────────────────────────────────────────────────────────
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
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// ── tailFin ─────────────────────────────────────────────────────────────────────────────────

test('tailFin is deterministic: the same name always paints the same fin', () => {
  for (const name of ['NeuralHire', 'Kora Health', 'a', '42labs', 'Ünïcode Ltd', '🚀 Rocket']) {
    const a = tailFin(name);
    const b = tailFin(String(name));
    assert.deepEqual(a, b, name);
    assert.deepEqual(Object.keys(a).sort(), ['hue', 'letter', 'stripes']);
  }
  // Pinned values: a change to the hash would repaint every founder's fin.
  assert.deepEqual(tailFin('NeuralHire'), tailFin('NeuralHire'));
  const pinned = tailFin('NeuralHire');
  assert.equal(pinned.letter, 'N');
  // Case and outer/inner whitespace do not repaint the fin (a founder fixing "neuralhire").
  assert.deepEqual(tailFin('  neuralhire  '), pinned);
  assert.deepEqual(tailFin('Kora   Health'), tailFin('kora health'));
});

test('tailFin: hue 0–359, 1–3 stripes, the first letter or digit of the name', () => {
  const names = Array.from({ length: 400 }, (_, i) => `Startup ${i} ${String.fromCharCode(65 + (i % 26))}`);
  const hues = new Set();
  const stripes = new Set();
  for (const n of names) {
    const f = tailFin(n);
    assert.ok(Number.isInteger(f.hue) && f.hue >= 0 && f.hue <= 359, `hue ${f.hue}`);
    assert.ok([1, 2, 3].includes(f.stripes), `stripes ${f.stripes}`);
    hues.add(f.hue);
    stripes.add(f.stripes);
  }
  assert.ok(hues.size >= 150, `only ${hues.size} distinct hues for 400 names`);
  assert.deepEqual([...stripes].sort(), [1, 2, 3]);
  assert.equal(tailFin('  42labs').letter, '4');
  assert.equal(tailFin('élan').letter, 'É');
  assert.equal(tailFin('🚀 Rocket').letter, 'R');
  assert.equal(tailFin('kora').letter, 'K');
  // Anything without a letter or digit, and non-strings, still get a fin.
  for (const odd of ['', '   ', '🚀🚀', null, undefined, 42, {}]) {
    const f = tailFin(odd);
    assert.equal(typeof f.letter, 'string');
    assert.equal(Array.from(f.letter).length, 1);
    assert.ok(Number.isInteger(f.hue) && [1, 2, 3].includes(f.stripes));
  }
  assert.equal(tailFin(42).letter, '4');
  assert.equal(tailFin('').letter, '#');
});

test('finPalette: the roundel letter reads on every hue (≥ 4.5:1) and stripes show on the fin', () => {
  for (let hue = 0; hue < 360; hue++) {
    const p = finPalette(hue);
    for (const k of ['body', 'light', 'roundel', 'ink']) assert.match(p[k], /^#[0-9a-f]{6}$/, `${k} @${hue}`);
    assert.ok(contrast(p.light, p.roundel) >= 4.5, `letter on roundel @${hue}: ${contrast(p.light, p.roundel).toFixed(2)}`);
    assert.ok(contrast(p.light, p.body) >= 2, `stripe on fin @${hue}: ${contrast(p.light, p.body).toFixed(2)}`);
    assert.ok(contrast(p.ink, p.body) >= 2, `ink stripe on fin @${hue}`);
  }
  assert.equal(finPalette(-30).body, finPalette(330).body, 'hue wraps');
  assert.equal(finPalette(390).body, finPalette(30).body, 'hue wraps');
});

test('finStripes: n bands, every corner inside the fin outline', () => {
  const [, , W, H] = FIN_VIEWBOX.split(' ').map(Number);
  assert.match(finShape(), /^M[\d.\s,LZ]+$/);
  for (const n of [1, 2, 3]) {
    const bands = finStripes(n);
    assert.equal(bands.length, n);
    for (const pts of bands) {
      const corners = pts.split(' ').map((p) => p.split(',').map(Number));
      assert.equal(corners.length, 4);
      for (const [x, y] of corners) assert.ok(x >= 0 && x <= W && y >= 0 && y <= H, `${x},${y}`);
    }
  }
  assert.equal(finStripes(0).length, 1, 'at least one band');
  assert.equal(finStripes(9).length, 3, 'at most three bands');
});

// ── the hangar view ─────────────────────────────────────────────────────────────────────────

const S = (id, sector, stage, upvotes, day) => ({
  id, name: `S${id}`, sector, stage, upvote_count: upvotes, created_at: `2026-10-${String(day).padStart(2, '0')}T10:00:00Z`,
});
const ALL = [
  S('a', 'AI', 'seed', 3, 12),
  S('b', 'Fintech', 'idea', 9, 11),
  S('c', 'AI', 'pre-seed', 0, 10),
  S('d', 'EdTech', 'seed', 5, 9),
  S('e', 'Quantum', 'seed', 1, 8), // not one of the sectors the form offers
  S('f', 'Other', 'series-a', 2, 7),
  { id: 'g', name: 'Sg', stage: 'idea', created_at: '2026-10-06T10:00:00Z' }, // no sector, no count
];

test('sectorCounts: every offered sector in order, counted from the list it is given', () => {
  const counts = hangar.sectorCounts(ALL);
  assert.deepEqual(Object.keys(counts), hangar.SECTORS);
  assert.deepEqual(counts, { AI: 2, Fintech: 1, HealthTech: 0, CleanTech: 0, SaaS: 0, EdTech: 1, Other: 1 });
  assert.deepEqual(hangar.sectorCounts([]), Object.fromEntries(hangar.SECTORS.map((s) => [s, 0])));
  assert.deepEqual(hangar.sectorCounts(null), hangar.sectorCounts([]));
  const copy = structuredClone(ALL);
  hangar.sectorCounts(copy);
  assert.deepEqual(copy, ALL, 'does not mutate');
});

test('sector counts are unaffected by the active filter (they come from the unfiltered list)', () => {
  const none = hangar.hangarView(ALL, hangar.DEFAULT_FILTERS);
  for (const filters of [
    { sector: 'AI' },
    { sector: 'HealthTech' },
    { stage: 'seed' },
    { stage: 'idea', sector: 'Fintech', sort: 'trending' },
  ]) {
    const view = hangar.hangarView(ALL, { ...hangar.DEFAULT_FILTERS, ...filters });
    assert.deepEqual(view.counts, none.counts, JSON.stringify(filters));
    assert.ok(view.shown.length < ALL.length, 'the filter did filter');
  }
  assert.deepEqual(none.counts, hangar.sectorCounts(ALL));
});

test('hangarView: filters by stage and sector, sorts newest or trending, never mutates', () => {
  const ids = (f) => hangar.hangarView(ALL, { ...hangar.DEFAULT_FILTERS, ...f }).shown.map((s) => s.id);
  assert.deepEqual(ids({}), ['a', 'b', 'c', 'd', 'e', 'f', 'g']);
  assert.deepEqual(ids({ sector: 'AI' }), ['a', 'c']);
  assert.deepEqual(ids({ stage: 'seed' }), ['a', 'd', 'e']);
  assert.deepEqual(ids({ stage: 'seed', sector: 'AI' }), ['a']);
  assert.deepEqual(ids({ sector: 'HealthTech' }), []);
  // Trending: most passengers first; ties (and missing counts) keep newest first.
  assert.deepEqual(ids({ sort: 'trending' }), ['b', 'd', 'a', 'f', 'e', 'c', 'g']);
  const unsorted = [ALL[3], ALL[0], ALL[1]];
  assert.deepEqual(hangar.hangarView(unsorted, hangar.DEFAULT_FILTERS).shown.map((s) => s.id), ['a', 'b', 'd']);
  assert.deepEqual(unsorted.map((s) => s.id), ['d', 'a', 'b'], 'input order untouched');
  assert.deepEqual(hangar.hangarView(null, hangar.DEFAULT_FILTERS), { shown: [], counts: hangar.sectorCounts([]) });
});

test('filtering stays local until the API page may be cut off, then the API filters', () => {
  assert.equal(hangar.HANGAR_PAGE, 50, 'matches .limit(50) in app/api/startups/route.js');
  assert.match(read('app/api/startups/route.js'), new RegExp(`\\.limit\\(${hangar.HANGAR_PAGE}\\)`));
  assert.equal(hangar.filtersLocally([]), true);
  assert.equal(hangar.filtersLocally(Array(49).fill({})), true);
  assert.equal(hangar.filtersLocally(Array(50).fill({})), false, 'a full page may be missing older startups');
  assert.equal(hangar.filtersLocally(null), false);
  assert.equal(hangar.isDefaultFilters(hangar.DEFAULT_FILTERS), true);
  assert.equal(hangar.isDefaultFilters({ stage: '', sector: '', sort: 'trending' }), false);
  assert.equal(hangar.startupQuery(hangar.DEFAULT_FILTERS), 'sort=newest');
  assert.equal(hangar.startupQuery({ stage: 'series-b+', sector: 'AI', sort: 'trending' }), 'stage=series-b%2B&sector=AI&sort=trending');
});

test('withPosted: a new startup goes first, once', () => {
  const s = S('n', 'AI', 'idea', 0, 13);
  assert.deepEqual(hangar.withPosted(ALL, s).map((x) => x.id).slice(0, 2), ['n', 'a']);
  assert.equal(hangar.withPosted(hangar.withPosted(ALL, s), s).filter((x) => x.id === 'n').length, 1);
  assert.deepEqual(hangar.withPosted(null, s), [s]);
});

test('postPayload: only the startup\'s own columns (never the founder name, counters or owner)', async () => {
  const { STARTUP_INSERT_COLUMNS, buildStartupInsert } = await import(new URL('../../../lib/startups.js', import.meta.url));
  const draft = {
    ...hangar.EMPTY_DRAFT,
    name: 'NeuralHire', tagline: 'AI recruiting', description: 'We hire.', stage: 'seed', sector: 'AI',
    raise_amount: '500000', equity_offered: '', team_size: '3', location: 'Toronto', website: 'https://neuralhire.example',
    deck_name: 'deck.pdf', user_name: 'Spoofed', upvote_count: 99, interest_count: 99, user_id: 'someone-else',
  };
  const p = hangar.postPayload(draft);
  for (const k of Object.keys(p)) assert.ok(STARTUP_INSERT_COLUMNS.includes(k) && k !== 'user_id', `sends ${k}`);
  assert.equal(p.raise_amount, 500000);
  assert.equal(p.equity_offered, null);
  assert.equal(p.team_size, 3);
  assert.equal(p.pitch_deck_url, '');
  assert.equal(buildStartupInsert(p, 'uid').error, undefined, 'the API accepts it');
  assert.deepEqual(Object.keys(hangar.EMPTY_DRAFT).sort(), [...STARTUP_INSERT_COLUMNS.filter((c) => c !== 'user_id'), 'deck_name'].sort());
});

test('formatRaise, standFor and passengerTiles', () => {
  assert.equal(hangar.formatRaise(null), null);
  assert.equal(hangar.formatRaise(0), null);
  assert.equal(hangar.formatRaise(750), '$750');
  assert.equal(hangar.formatRaise(500000), '$500K');
  assert.equal(hangar.formatRaise(1500000), '$1.5M');
  assert.equal(hangar.formatRaise(2000000), '$2M');
  const stand = hangar.standFor('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
  assert.match(stand, /^E\d{2}$/);
  assert.equal(hangar.standFor('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'), stand, 'stable');
  assert.notEqual(new Set(['1', '2', '3', '4', '5', '6', '7', '8'].map(hangar.standFor)).size, 1);
  assert.equal(hangar.passengerTiles(0), '000');
  assert.equal(hangar.passengerTiles(12), '012');
  assert.equal(hangar.passengerTiles(999), '999');
  assert.equal(hangar.passengerTiles(1500), '999+');
  assert.equal(hangar.passengerTiles(undefined), '000');
  assert.equal(hangar.passengerLabel(0), 'No passengers yet');
  assert.equal(hangar.passengerLabel(1), '1 passenger');
  assert.equal(hangar.passengerLabel(12), '12 passengers');
});

// ── the signed-in user's own state (GET /api/startups/[id] → mine) ──────────────────────────

function fakeDb(rows, { failOn } = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      const q = { table, filters: {} };
      calls.push(q);
      const chain = {
        select(cols) { q.cols = cols; return chain; },
        eq(col, v) { q.filters[col] = v; return chain; },
        async maybeSingle() {
          if (failOn === table) return { data: null, error: { code: 'XX000' } };
          const hit = (rows[table] ?? []).find((r) => r.startup_id === q.filters.startup_id && r.user_id === q.filters.user_id);
          return { data: hit ? { startup_id: hit.startup_id } : null, error: null };
        },
      };
      return chain;
    },
  };
}
const SID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const ME = '3c60e96c-18e0-4990-91b4-834acd70579e';
const YOU = '11111111-2222-4333-8444-555555555555';

test('viewerState: the user\'s own upvote and interest, filtered by startup AND user', async () => {
  const db = fakeDb({
    startup_upvotes: [{ startup_id: SID, user_id: ME }, { startup_id: SID, user_id: YOU }],
    startup_interests: [{ startup_id: SID, user_id: YOU }],
  });
  assert.deepEqual(await viewerState(db, SID, ME), { mine: { upvoted: true, interested: false } });
  assert.deepEqual(await viewerState(fakeDb({ startup_interests: [{ startup_id: SID, user_id: YOU }] }), SID, YOU), {
    mine: { upvoted: false, interested: true },
  });
  assert.deepEqual(db.calls.map((c) => c.table).sort(), ['startup_interests', 'startup_upvotes']);
  for (const c of db.calls) assert.deepEqual(c.filters, { startup_id: SID, user_id: ME });
});

test('viewerState: a failed lookup is an error, never a guessed "not upvoted"', async () => {
  const r = await viewerState(fakeDb({}, { failOn: 'startup_interests' }), SID, ME);
  assert.ok(r.error);
  assert.equal(r.mine, undefined);
});

test('GET /api/startups/[id] returns mine for the signed-in user and null when signed out', () => {
  const src = read('app/api/startups/[id]/route.js');
  assert.match(src, /viewerState\(db, id, user\.id\)/);
  assert.match(src, /mine:\s*null|mine = null/);
  assert.match(src, /auth\.getUser\(\)/);
  assert.ok(!/user_name|upvote_count\s*:|interest_count\s*:/.test(src));
});
