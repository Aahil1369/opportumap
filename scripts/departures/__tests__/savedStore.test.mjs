// lib/departures/savedStore.js: the saved roles behind /saved (the itinerary) and the save toggle
// on /jobs. Each save keeps a snapshot of the role under `opportumap_saved_v2`, so a role the feeds
// no longer return is still on the itinerary (review focus 5). Saves from before (`opportumap_saved`,
// ids only) are read as "pending" rows and looked up once; a role that cannot be found stays as a
// "details unavailable" row. Storage that is blocked, full or missing reads as [] and writes nothing.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const store = await import(new URL('../../../lib/departures/savedStore.js', import.meta.url));
const { SAVED_KEY, LEGACY_KEY, SNAPSHOT_FIELDS, snapshot, readSaved, saveJob, removeJob, migrateSaved } = store;

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

// A feed job as /api/jobs returns it: the snapshot keeps 12 fields of it, never the rest.
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
};

test('the keys and the snapshot fields are the brief’s', () => {
  assert.equal(SAVED_KEY, 'opportumap_saved_v2');
  assert.equal(LEGACY_KEY, 'opportumap_saved');
  assert.deepEqual(
    [...SNAPSHOT_FIELDS],
    ['id', 'title', 'company', 'location', 'country', 'url', 'salary_min', 'salary_max', 'currency', 'posted_at', 'remote', 'source'],
  );
});

test('snapshot round-trip: saveJob keeps the 12 fields under opportumap_saved_v2, readSaved gives them back', () => {
  const s = memory();
  assert.equal(saveJob(s, JOB), true);
  const raw = JSON.parse(s.data.get('opportumap_saved_v2'));
  assert.deepEqual(raw, [SNAP], 'only the snapshot is stored: no description, coordinates or other fields');
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
    return { ...JOB, id, title: `Role ${id}`, description: 'not kept' };
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
      { ...SNAP, description: 'x', salary_min: 'abc', title: 123 },
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
  assert.equal('description' in list[0], false);
  assert.deepEqual(list[1], { id: 'u_1', unavailable: true });
  assert.deepEqual(list[2], { id: 'p_1', pending: true });
});
