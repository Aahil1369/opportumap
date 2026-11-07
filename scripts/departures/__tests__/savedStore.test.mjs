// lib/departures/savedStore.js: the saved roles behind /saved (the itinerary) and the save toggle
// on /jobs. Each save keeps a snapshot of the role under `opportumap_saved_v2`, so a role the feeds
// no longer return is still on the itinerary (review focus 5). Saves from before (`opportumap_saved`,
// ids only) are read as "pending" rows and looked up once; a role that cannot be found stays as a
// "details unavailable" row. Storage that is blocked, full or missing reads as [] and writes nothing.
// Then source guards over /saved (app/saved) and the /jobs save toggle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as espree from 'espree';

const store = await import(new URL('../../../lib/departures/savedStore.js', import.meta.url));
const { SAVED_KEY, LEGACY_KEY, SNAPSHOT_FIELDS, snapshot, readSaved, saveJob, removeJob, migrateSaved } = store;
const { trimJob, jobRow, BOARD_DESC_CHARS } = await import(new URL('../../../lib/departures/jobRows.js', import.meta.url));
const { gatePay } = await import(new URL('../../../lib/departures/gateInfo.js', import.meta.url));
const { boardDescription } = await import(new URL('../../../lib/departures/boardDescription.js', import.meta.url));

/** An in-memory Storage (getItem / setItem / removeItem), with the raw values for the asserts. */
function memory(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => void data.set(k, String(v)),
    removeItem: (k) => void data.delete(k),
  };
}

/** A Storage that throws on every call (Safari private mode, cookies blocked, a sandboxed frame). */
const blocked = () => ({
  getItem() {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  },
  setItem() {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  },
  removeItem() {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  },
});

const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

// A feed job as the live feeds give it: the snapshot keeps 14 fields of it (the description as at
// most BOARD_DESC_CHARS of plain text, as the /jobs server board keeps it), never the rest.
const JOB = {
  id: 'adzuna_5927958773',
  title: 'Software Engineer',
  company: 'Shopify',
  location: 'Toronto, Ontario',
  country: 'ca',
  url: 'https://www.adzuna.ca/details/5927958773',
  salary_min: 88000,
  salary_max: 102000,
  currency: 'CAD',
  posted_at: '2026-10-12T09:00:00Z',
  remote: false,
  source: 'adzuna',
  description: '<p>Build things.</p>'.repeat(200),
  lat: 43.65,
  lng: -79.38,
  salary_predicted: false,
  expires_at: null,
};

// Compute the expected description using BOARD_DESC_CHARS (the gate's ADVICE_DESC_CHARS, 500).
const expectedDescription = boardDescription('<p>Build things.</p>'.repeat(200));

const SNAP = {
  id: 'adzuna_5927958773',
  title: 'Software Engineer',
  company: 'Shopify',
  location: 'Toronto, Ontario',
  country: 'ca',
  url: 'https://www.adzuna.ca/details/5927958773',
  salary_min: 88000,
  salary_max: 102000,
  currency: 'CAD',
  posted_at: '2026-10-12T09:00:00Z',
  remote: false,
  source: 'adzuna',
  salary_predicted: false,
  // '<p>Build things.</p>' x 200 as plain text, cut at a word to at most BOARD_DESC_CHARS characters.
  description: expectedDescription,
};

test('the keys and the snapshot fields: the brief’s 12, then Adzuna’s estimate flag and a short description', () => {
  assert.equal(SAVED_KEY, 'opportumap_saved_v2');
  assert.equal(LEGACY_KEY, 'opportumap_saved');
  assert.deepEqual(
    [...SNAPSHOT_FIELDS],
    ['id', 'title', 'company', 'location', 'country', 'url', 'salary_min', 'salary_max', 'currency', 'posted_at', 'remote', 'source', 'salary_predicted', 'description'],
  );
});

test('snapshot round-trip: saveJob keeps the 14 fields under opportumap_saved_v2, readSaved gives them back', () => {
  const s = memory();
  assert.equal(saveJob(s, JOB), true);
  const raw = JSON.parse(s.data.get('opportumap_saved_v2'));
  assert.deepEqual(raw, [SNAP], 'only the snapshot is stored: no coordinates, no expiry, no full HTML description');
  assert.equal(raw[0].description, trimJob(JOB).description, 'the description /jobs’ server board keeps for the same role');
  assert.deepEqual(readSaved(s), [SNAP]);
  // A fresh read of the same storage (another page, another visit) is the same list.
  assert.deepEqual(readSaved(memory(Object.fromEntries(s.data))), [SNAP]);
});

test('snapshot: missing fields are null, ids are strings, odd values are cleaned', () => {
  assert.deepEqual(snapshot({ id: 42, title: '  Data   Engineer ' }), {
    id: '42',
    title: 'Data Engineer',
    company: null,
    location: null,
    country: null,
    url: null,
    salary_min: null,
    salary_max: null,
    currency: null,
    posted_at: null,
    remote: false,
    source: null,
    salary_predicted: false,
    description: null,
  });
  const odd = snapshot({ id: 'x_1', title: 'Nurse', salary_min: '61000', salary_max: 'lots', remote: 'yes', currency: 'dollars', posted_at: 'never' });
  assert.equal(odd.salary_min, 61000, 'a numeric string is a number');
  assert.equal(odd.salary_max, null);
  assert.equal(odd.remote, false, 'remote only when it is true');
  assert.equal(odd.currency, null, 'a currency is a 3-letter code');
  assert.equal(odd.posted_at, null, 'not a date');
  assert.equal(snapshot({ id: 'x', posted_at: 1760259600000 }).posted_at, '2025-10-12T09:00:00.000Z', 'a time stamp becomes ISO');
  assert.equal(snapshot({ id: 'x', title: 'A'.repeat(1000) }).title.length, 300, 'text is capped');
  assert.equal(snapshot({ id: 'x', remote: true }).remote, true);
  for (const bad of [null, undefined, 'adzuna_1', 7, {}, { id: '' }, { id: '   ' }, { id: {} }, { id: NaN }]) {
    assert.equal(snapshot(bad), null, `${JSON.stringify(bad)} has no id`);
  }
});

test('snapshot: Adzuna’s estimate flag only when it is true; the description as short plain text, as /jobs keeps it', () => {
  assert.equal(snapshot({ id: 'x', salary_predicted: true }).salary_predicted, true);
  for (const v of [false, 'true', 1, '1', null, undefined, {}]) {
    assert.equal(snapshot({ id: 'x', salary_predicted: v }).salary_predicted, false, `${JSON.stringify(v)} is not Adzuna’s estimate`);
  }
  const long = `<div><h2>About us</h2><p>We build <b>maps</b> for people moving abroad .</p>${'<li>Ship features weekly</li>'.repeat(80)}</div>`;
  const d = snapshot({ id: 'x', description: long }).description;
  assert.ok(d.length <= BOARD_DESC_CHARS, `at most ${BOARD_DESC_CHARS} characters (${d.length})`);
  assert.equal(/[<>]/.test(d), false, 'no HTML');
  assert.ok(d.startsWith('About us We build maps for people moving abroad.'), d.slice(0, 60));
  assert.ok(d.endsWith('…'), 'cut at a word');
  assert.equal(d, trimJob({ id: 'x', description: long }).description, 'the same text the /jobs server board keeps');
  // A board role is trimmed already: its snapshot keeps that description as it is.
  const board = trimJob({ ...JOB, description: long });
  assert.equal(snapshot(board).description, board.description);
  assert.equal(snapshot({ id: 'x', description: 'Short and plain.' }).description, 'Short and plain.');
  for (const v of ['', '   ', '<p> </p>', 42, {}, ['a'], null]) {
    assert.equal(snapshot({ id: 'x', description: v }).description, null, `${JSON.stringify(v)} is no description`);
  }
});

test('a role opened from /saved reads as it does on /jobs: Adzuna’s estimate in the gate, the same status and match', () => {
  const s = memory();
  // Not new, not remote; the profile's skills and the role type are only in the description.
  const feed = {
    ...JOB,
    id: 'adzuna_77',
    title: 'Software Developer',
    posted_at: '2026-01-05T09:00:00Z',
    salary_predicted: true,
    description: `<p>Our stack: python, kubernetes, terraform and postgres.</p>${'<p>More about the team and the office.</p>'.repeat(20)}`,
  };
  const onJobs = trimJob(feed); // the /jobs server board's copy, which the heart saves
  saveJob(s, onJobs);
  const saved = readSaved(s)[0]; // what /saved hands JobGate
  assert.equal(gatePay(onJobs, null).label, "PAY · ADZUNA'S ESTIMATE FOR THIS ROLE");
  assert.equal(gatePay(saved, null).label, "PAY · ADZUNA'S ESTIMATE FOR THIS ROLE", 'never "listed" for Adzuna’s estimate');
  assert.equal(gatePay(snapshot({ ...feed, salary_predicted: false }), null).label, 'PAY · LISTED FOR THIS ROLE');

  const now = new Date('2026-10-15T12:00:00Z');
  const profile = { skills: 'python, kubernetes, terraform, postgres, golang', experience: '3-5', jobTypes: ['DevOps / Cloud'] };
  const there = jobRow(onJobs, { now, profile });
  const here = jobRow(saved, { now, profile });
  assert.equal(there.status, 'BOARDING', 'the test role boards on /jobs');
  assert.equal(here.status, there.status);
  assert.deepEqual(here.match, there.match);
  assert.equal(jobRow({ ...saved, description: null }, { now, profile }).status, 'ON TIME', 'without the description it would not board');
});

test('saveJob: newest first; saving again moves it to the top without a second copy; ids compare as strings', () => {
  const s = memory();
  saveJob(s, { ...JOB, id: 'a_1', title: 'One' });
  saveJob(s, { ...JOB, id: 'a_2', title: 'Two' });
  saveJob(s, { ...JOB, id: 3, title: 'Three' });
  assert.deepEqual(readSaved(s).map((j) => j.id), ['3', 'a_2', 'a_1']);
  saveJob(s, { ...JOB, id: 'a_1', title: 'One, again' });
  assert.deepEqual(readSaved(s).map((j) => [j.id, j.title]), [['a_1', 'One, again'], ['3', 'Three'], ['a_2', 'Two']]);
  assert.equal(saveJob(s, { title: 'No id' }), false, 'a job with no id is not saved');
  assert.equal(readSaved(s).length, 3);
});

test('removeJob takes the role off (string or number id) and leaves the rest', () => {
  const s = memory();
  saveJob(s, { ...JOB, id: 'a_1' });
  saveJob(s, { ...JOB, id: 7 });
  assert.equal(removeJob(s, 'a_1'), true);
  assert.deepEqual(readSaved(s).map((j) => j.id), ['7']);
  assert.equal(removeJob(s, 7), true);
  assert.deepEqual(readSaved(s), []);
  assert.equal(removeJob(s, 'not-there'), true, 'removing a role that is not saved is fine');
  assert.deepEqual(readSaved(s), []);
});

test('id-only data from before: read as pending rows, after the saved snapshots, once each', () => {
  const s = memory({
    opportumap_saved_v2: JSON.stringify([SNAP]),
    opportumap_saved: JSON.stringify(['adzuna_1', 7, 'adzuna_1', SNAP.id, null, { id: 'obj' }, '', 'remotive_2']),
  });
  assert.deepEqual(readSaved(s), [SNAP, { id: 'adzuna_1', pending: true }, { id: '7', pending: true }, { id: 'remotive_2', pending: true }]);
  // Reading writes nothing.
  assert.ok(s.data.has('opportumap_saved'));
  assert.equal(JSON.parse(s.data.get('opportumap_saved_v2')).length, 1);
});

test('migration: found ids become snapshots, unknown ones "details unavailable", the old key goes', async () => {
  const s = memory({ opportumap_saved: JSON.stringify(['adzuna_1', 'gone_2', 'adzuna_3']) });
  const asked = [];
  const lookup = async (id) => {
    asked.push(id);
    await tick(2);
    if (id === 'gone_2') return null;
    return { ...JOB, id, title: `Role ${id}`, description: '<b>Kept</b> as plain text', salary_predicted: true };
  };
  const after = await migrateSaved(s, lookup);
  assert.deepEqual(asked.sort(), ['adzuna_1', 'adzuna_3', 'gone_2']);
  assert.deepEqual(after.map((j) => (j.unavailable ? `${j.id}:unavailable` : `${j.id}:${j.title}`)), [
    'adzuna_1:Role adzuna_1',
    'gone_2:unavailable',
    'adzuna_3:Role adzuna_3',
  ]);
  assert.deepEqual(after[1], { id: 'gone_2', unavailable: true });
  assert.deepEqual(Object.keys(after[0]), [...SNAPSHOT_FIELDS], 'a looked-up role is stored as a snapshot');
  assert.equal(after[0].description, 'Kept as plain text');
  assert.equal(after[0].salary_predicted, true, 'Adzuna’s estimate stays Adzuna’s estimate');
  assert.equal(s.data.has('opportumap_saved'), false, 'the id-only key is gone');
  assert.deepEqual(readSaved(s), after, 'stored under opportumap_saved_v2');
  // Once: nothing is pending now, so a second visit asks nothing.
  asked.length = 0;
  assert.deepEqual(await migrateSaved(s, lookup), after);
  assert.deepEqual(asked, []);
});

test('migration: a lookup that fails (network, 5xx) leaves that id pending for the next visit; nothing is asked twice per run', async () => {
  const s = memory({ opportumap_saved: JSON.stringify(['ok_1', 'down_2']) });
  let calls = 0;
  const lookup = async (id) => {
    calls += 1;
    if (id === 'down_2') throw new Error('jobs 503');
    return { ...JOB, id };
  };
  const after = await migrateSaved(s, lookup);
  assert.equal(calls, 2);
  assert.deepEqual(after.map((j) => [j.id, !!j.pending, !!j.unavailable]), [['ok_1', false, false], ['down_2', true, false]]);
  // Next visit: only the one that failed is asked again; this time it is not found.
  const again = await migrateSaved(s, async (id) => {
    assert.equal(id, 'down_2');
    return null;
  });
  assert.deepEqual(again[1], { id: 'down_2', unavailable: true });
});

test('migration: a lookup answering another id, or a sync throw, is not taken for the role', async () => {
  const s = memory({ opportumap_saved: JSON.stringify(['want_1', 'boom_2']) });
  const after = await migrateSaved(s, (id) => {
    if (id === 'boom_2') throw new Error('sync');
    return { ...JOB, id: 'other_9' };
  });
  assert.deepEqual(after, [{ id: 'want_1', unavailable: true }, { id: 'boom_2', pending: true }]);
});

test('migration: at most `concurrency` lookups at once (default 2)', async () => {
  const ids = Array.from({ length: 7 }, (_, i) => `adzuna_${i}`);
  const s = memory({ opportumap_saved: JSON.stringify(ids) });
  let live = 0;
  let peak = 0;
  const lookup = async (id) => {
    live += 1;
    peak = Math.max(peak, live);
    await tick(3);
    live -= 1;
    return { ...JOB, id };
  };
  await migrateSaved(s, lookup);
  assert.equal(peak, 2);
  const t = memory({ opportumap_saved: JSON.stringify(ids) });
  peak = 0;
  await migrateSaved(t, lookup, { concurrency: 3 });
  assert.equal(peak, 3);
});

test('migration: a role removed (or saved) while the lookups run stays that way', async () => {
  const s = memory({ opportumap_saved: JSON.stringify(['keep_1', 'drop_2']) });
  const after = await migrateSaved(s, async (id) => {
    await tick(5);
    if (id === 'drop_2') {
      removeJob(s, 'drop_2'); // the visitor pressed Remove meanwhile
      saveJob(s, { ...JOB, id: 'new_3', title: 'Saved meanwhile' });
    }
    return { ...JOB, id };
  });
  assert.deepEqual(after.map((j) => j.id), ['new_3', 'keep_1']);
  assert.deepEqual(readSaved(s).map((j) => j.id), ['new_3', 'keep_1']);
});

test('saving or removing with id-only data present folds it into opportumap_saved_v2 (still pending)', () => {
  const s = memory({ opportumap_saved: JSON.stringify(['old_1', 'old_2']) });
  saveJob(s, JOB);
  assert.equal(s.data.has('opportumap_saved'), false);
  assert.deepEqual(readSaved(s), [SNAP, { id: 'old_1', pending: true }, { id: 'old_2', pending: true }]);
  removeJob(s, 'old_1');
  assert.deepEqual(readSaved(s).map((j) => j.id), [SNAP.id, 'old_2']);
  // Saving a role that was saved id-only replaces its pending row with the snapshot.
  saveJob(s, { ...JOB, id: 'old_2', title: 'Now with details' });
  assert.deepEqual(readSaved(s).map((j) => [j.id, j.title ?? null, !!j.pending]), [['old_2', 'Now with details', false], [SNAP.id, 'Software Engineer', false]]);
});

test('blocked storage: readSaved is [], saveJob / removeJob write nothing and never throw, migration asks nothing', async () => {
  for (const s of [blocked(), null, undefined, {}]) {
    assert.deepEqual(readSaved(s), []);
    assert.equal(saveJob(s, JOB), false);
    assert.equal(removeJob(s, JOB.id), false);
    let asked = 0;
    assert.deepEqual(await migrateSaved(s, async () => (asked++, JOB)), []);
    assert.equal(asked, 0);
  }
});

test('a full storage (setItem throws) is a no-op that reports false and keeps what was there', () => {
  const s = memory({ opportumap_saved: JSON.stringify(['old_1']) });
  s.setItem = () => {
    throw new DOMException('quota', 'QuotaExceededError');
  };
  assert.equal(saveJob(s, JOB), false);
  assert.equal(removeJob(s, 'old_1'), false);
  assert.equal(s.data.get('opportumap_saved'), JSON.stringify(['old_1']), 'the id-only key is kept when the new one could not be written');
});

test('corrupt or tampered data: unreadable JSON is ignored, entries are cleaned, ids de-duplicated', () => {
  assert.deepEqual(readSaved(memory({ opportumap_saved_v2: '{nope', opportumap_saved: 'also nope' })), []);
  assert.deepEqual(readSaved(memory({ opportumap_saved_v2: JSON.stringify({ id: 'x' }) })), [], 'not a list');
  const s = memory({
    opportumap_saved_v2: JSON.stringify([
      { ...SNAP, description: `<img src=x onerror=alert(1)>${'word '.repeat(2000)}`, salary_predicted: 'yes', salary_min: 'abc', title: 123 },
      { ...SNAP, title: 'Duplicate' },
      { title: 'No id' },
      'adzuna_7',
      null,
      { id: 'u_1', unavailable: true, title: 'ignored' },
      { id: 'p_1', pending: true },
    ]),
  });
  const list = readSaved(s);
  assert.deepEqual(list.map((j) => j.id), [SNAP.id, 'u_1', 'p_1']);
  assert.equal(list[0].salary_min, null);
  assert.equal(list[0].title, '123');
  assert.ok(list[0].description.length <= BOARD_DESC_CHARS, 'a stored description is capped again on read');
  assert.equal(/[<>]/.test(list[0].description), false, 'and kept as plain text');
  assert.equal(list[0].salary_predicted, false, 'Adzuna’s estimate only when it is true');
  assert.deepEqual(list[1], { id: 'u_1', unavailable: true });
  assert.deepEqual(list[2], { id: 'p_1', pending: true });
});

// ── Source guards: /saved and the save toggle ────────────────────────────────────────────────

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const SAVED_FILES = [...readdirSync(join(ROOT, 'app/saved')).filter((n) => n.endsWith('.js')).map((n) => `app/saved/${n}`), 'lib/departures/savedStore.js'];

/** Every string a file can show: string literals, template text, JSX text and attributes. */
function visibleStrings(src) {
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
  visit(ast);
  return out;
}

test('/saved: a server page with metadata, the ITINERARY sign, "Your itinerary." and no old editorial parts', () => {
  const page = read('app/saved/page.js');
  assert.doesNotMatch(page, /^\s*['"]use client['"]/m, 'the hall header renders on the server');
  assert.match(page, /export const metadata\b/);
  assert.match(page, /'Saved — OpportuMap'/);
  assert.match(page, /sign=\{\{ label: 'ITINERARY' \}\}/);
  assert.doesNotMatch(page, /letter:\s*'—'/);
  assert.match(page, /title="Your"/);
  assert.match(page, /accent="itinerary\."/);
  for (const f of SAVED_FILES) {
    const src = read(f);
    assert.doesNotMatch(src, /useScrollReveal|EditorialHero|JobCard|JobDetailPanel|Footnote|paper-|font-display/, `${f}: no old editorial parts`);
  }
});

test('/saved: the empty state, the board of saved roles from the store, rows that open JobGate', () => {
  const island = read('app/saved/Itinerary.js');
  assert.ok(visibleStrings(island).includes('No roles saved yet — pick one on the board.'));
  assert.match(island, /from '\.\.\/\.\.\/lib\/departures\/savedStore'/);
  assert.match(island, /readSaved\(/);
  assert.match(island, /migrateSaved\(/);
  assert.match(island, /removeJob\(/);
  assert.match(island, /dynamic\(\(\) => import\('\.\.\/components\/jobs\/JobGate'\)/, 'JobGate, loaded on first open');
  assert.match(island, /if \(!res\.ok\) throw[\s\S]*?res\.json\(\)/, 'res.ok before res.json()');
  assert.match(island, /if \(reducedNow\(\)\) \{\s*drop\(\);/, 'reduced motion: the row goes at once');
  assert.doesNotMatch(island, /localStorage\.(?:get|set)Item\(['"]opportumap_saved/, 'saved roles only through the store');
});

test('/saved rows: CANCELLED fits the status column, Remove sits beside the link and is never hidden', () => {
  const row = read('app/saved/ItineraryRow.js');
  const tiles = Number(/export const STATUS_TILES = (\d+)/.exec(row)?.[1]);
  assert.ok(tiles >= 'CANCELLED'.length, `STATUS_TILES ${tiles}`);
  assert.match(row, /stage \? 'CANCELLED'/);
  assert.match(row, /usePredictedPay\(row\?\.ask \?\? null, \{ visible: on && !stage \}\)/, 'pay asked only while on screen');
  for (const link of row.match(/<a\b[\s\S]*?<\/a>/g) ?? []) assert.doesNotMatch(link, /<button\b/, 'no button inside the row link');
  const css = stripCssComments(read('app/saved/saved.css'));
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/\.it-x(?![-\w])/.test(selector)) continue;
    assert.doesNotMatch(body, /opacity:\s*0(?![.\d])|visibility:\s*hidden|display:\s*none/, `Remove hidden by ${selector.trim()}`);
  }
});

test('saved.css: only opacity and transform move; no CSS trig, no backdrop-filter, no vh', () => {
  const css = stripCssComments(read('app/saved/saved.css'));
  for (const m of css.matchAll(/transition(?:-property)?\s*:\s*([^;]+);/g)) {
    for (const part of m[1].replace(/\([^)]*\)/g, '').split(',')) {
      const prop = part.trim().split(/\s+/)[0];
      assert.ok(['transform', 'opacity', 'none'].includes(prop), `saved.css transitions ${prop}`);
    }
  }
  assert.doesNotMatch(css, /atan2|\b(?:a?sin|a?cos|a?tan)\(/i);
  assert.doesNotMatch(css, /backdrop-filter/);
  assert.doesNotMatch(css, /\d(?:vh)\b/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test('the /jobs save toggle stores a snapshot through the store (no raw id list)', () => {
  const board = read('app/components/jobs/JobsBoard.js');
  assert.match(board, /from '\.\.\/\.\.\/\.\.\/lib\/departures\/savedStore'/);
  assert.match(board, /readSaved\(deviceStorage\(\)\)/);
  assert.match(board, /saveJob\(store, job\)/);
  assert.match(board, /removeJob\(store, id\)/);
  assert.doesNotMatch(board, /opportumap_saved|SAVED_KEY/);
});

test('/saved copy: no "flight" or "fare", no totals', () => {
  for (const f of SAVED_FILES) {
    const src = read(f);
    for (const str of visibleStrings(src)) {
      assert.doesNotMatch(str, /\b(?:flights?|fares?)\b/i, `${f}: ${JSON.stringify(str)}`);
      assert.doesNotMatch(str, /\b\d[\d,.]*\s*[kKmM]?\+?\s*(?:countries|jobs|roles|listings|openings|departures|saved)\b/i, `${f}: ${JSON.stringify(str)}`);
    }
    assert.doesNotMatch(src, /\{\s*(?:list|shown|rows|saved)(?:\?)?\.(?:length|size)\s*\}/, `${f}: a count rendered`);
  }
});

test('ItineraryRow: no-details rows use honest copy "Couldn\'t find its details", not "No longer on the board"', () => {
  const row = read('app/saved/ItineraryRow.js');
  assert.match(row, /Couldn\\?'t find its details/, 'uses "Couldn\'t find its details"');
  assert.doesNotMatch(row, /No longer on the board/, 'old copy is gone');
});

test('ItineraryRow: each no-details row\'s Remove has a distinct, position-based name and no total; rows with details keep theirs', () => {
  const row = read('app/saved/ItineraryRow.js');
  const island = read('app/saved/Itinerary.js');
  assert.match(island, /\bposition=\{i \+ 1\}/, 'the board passes each row its 1-based position');
  assert.match(row, /\? `Remove \$\{name\} from your itinerary`/, 'rows with details: unchanged');
  assert.match(row, /: `Remove the saved role in row \$\{position\} \(details unavailable\) from your itinerary`;/, 'no-details rows: their position, no total');
  assert.match(row, /aria-label=\{removeLabel\}/, 'the Remove button carries that name');
});
