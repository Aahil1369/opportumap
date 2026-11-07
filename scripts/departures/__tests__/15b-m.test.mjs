// Task 15b, group M: the map control tower, the saved itinerary and the jobs board (the wave 2
// review's carry-ins). Behaviour tests on the pure modules (visitorProfile, radarLoad, radarChip),
// then source guards for the wiring, the markup and the CSS of /jobs, /map and /saved.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as espree from 'espree';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

// ── T8-7: one "account, then device" profile loader (lib/departures/visitorProfile.js) ──────────

const { deviceProfile, inputOnArrival, loadVisitorProfile, searchOnArrival } = await import(
  new URL('../../../lib/departures/visitorProfile.js', import.meta.url)
);
const { PROFILE_KEY } = await import(new URL('../../../lib/saveProfile.js', import.meta.url));

/** A Storage stand-in: getItem only (what the loader reads); `broken` throws like blocked storage. */
function fakeStore(entries = {}, { broken = false } = {}) {
  const data = new Map(Object.entries(entries));
  return {
    getItem(key) {
      if (broken) throw new Error('SecurityError: storage is blocked');
      return data.has(key) ? data.get(key) : null;
    },
  };
}
const ON_DEVICE = fakeStore({ [PROFILE_KEY]: JSON.stringify({ skills: 'vue', jobTypes: ['Design'] }) });

test('T8-7 loadVisitorProfile: the account\'s profile comes first', async () => {
  const p = await loadVisitorProfile({ account: async () => ({ skills: 'react' }), storage: ON_DEVICE });
  assert.deepEqual(p, { skills: 'react' });
  const sync = await loadVisitorProfile({ account: () => ({ skills: 'go' }), storage: ON_DEVICE });
  assert.deepEqual(sync, { skills: 'go' }, 'an account answer that is not a promise works too');
});

test('T8-7 loadVisitorProfile: no account profile (signed out, none saved, request failed) -> the one on this device', async () => {
  const want = { skills: 'vue', jobTypes: ['Design'] };
  assert.deepEqual(await loadVisitorProfile({ account: async () => null, storage: ON_DEVICE }), want);
  assert.deepEqual(await loadVisitorProfile({ account: () => Promise.reject(new Error('offline')), storage: ON_DEVICE }), want);
  assert.deepEqual(
    await loadVisitorProfile({
      account: () => {
        throw new Error('no document');
      },
      storage: ON_DEVICE,
    }),
    want,
    'an account loader that throws is no profile, not a crash',
  );
  assert.deepEqual(await loadVisitorProfile({ account: async () => ['not', 'a', 'profile'], storage: ON_DEVICE }), want);
  assert.deepEqual(await loadVisitorProfile({ storage: ON_DEVICE }), want, 'no account loader at all');
});

test('T8-7 loadVisitorProfile / deviceProfile: nothing usable is null, never a throw', async () => {
  const none = async () => null;
  for (const raw of [undefined, 'not json', '[1,2]', '"text"', '42', 'null', '']) {
    const storage = fakeStore(raw === undefined ? {} : { [PROFILE_KEY]: raw });
    assert.equal(await loadVisitorProfile({ account: none, storage }), null, `stored: ${JSON.stringify(raw)}`);
    assert.equal(deviceProfile(storage), null, `deviceProfile, stored: ${JSON.stringify(raw)}`);
  }
  assert.equal(await loadVisitorProfile({ account: none, storage: fakeStore({}, { broken: true }) }), null, 'blocked storage');
  assert.equal(await loadVisitorProfile({ account: none, storage: null }), null, 'no storage (null) is no device copy');
  assert.deepEqual(deviceProfile(ON_DEVICE), { skills: 'vue', jobTypes: ['Design'] });
  const other = fakeStore({ opportumap_saved_v2: JSON.stringify({ skills: 'x' }) });
  assert.equal(deviceProfile(other), null, 'only the profile key is read');
});

test('T8-7: /jobs, /map and /saved load the profile through the one loader, not copies of their own', () => {
  for (const f of ['app/components/jobs/JobsBoard.js', 'app/components/map/ControlTower.js', 'app/saved/Itinerary.js']) {
    const src = read(f);
    assert.match(src, /from '(?:\.\.\/)+lib\/departures\/visitorProfile'/, `${f} imports lib/departures/visitorProfile`);
    assert.match(src, /loadVisitorProfile\(\{ account: loadHomeProfile \}\)\.then\(/, `${f}: the account's profile, then the device's`);
    assert.doesNotMatch(src, /function (?:loadProfile|readProfile|readJson)\b/, `${f} keeps no loader of its own`);
    assert.doesNotMatch(src, /\bPROFILE_KEY\b/, `${f} reads no profile key itself`);
  }
});

test('T7-5 searchOnArrival: a search the visitor already asked for stays; else the URL\'s ?q=', () => {
  const asked = { text: 'nurse', n: 1 };
  assert.equal(searchOnArrival(asked, 'tor'), asked, 'a submitted search is not replaced');
  const blank = { text: '', n: 2 };
  assert.equal(searchOnArrival(blank, 'tor'), blank, 'an empty search the visitor submitted stays too');
  assert.deepEqual(searchOnArrival(null, 'tor'), { text: 'tor', n: 0 }, 'nothing asked yet: the URL\'s');
  assert.deepEqual(searchOnArrival(null, ''), { text: '', n: 0 }, 'no ?q=: the profile\'s own search');
});

test('T7-5 inputOnArrival: what the visitor typed stays; else the URL\'s ?q=', () => {
  assert.equal(inputOnArrival('nur', 'tor'), 'nur');
  assert.equal(inputOnArrival('', 'tor'), 'tor');
  assert.equal(inputOnArrival('', ''), '');
});

// ── T7-5: a profile that lands late keeps the visitor's own search ──────────────────────────────

test('T7-5: /jobs and /map no longer overwrite the search box or the search when the profile lands', () => {
  for (const f of ['app/components/jobs/JobsBoard.js', 'app/components/map/ControlTower.js']) {
    const src = read(f);
    assert.match(src, /setInput\(\(v\) => inputOnArrival\(v, q\)\);/, `${f}: typed text stays`);
    assert.match(src, /setAsked\(\(a\) => searchOnArrival\(a, q\)\);/, `${f}: a submitted search stays`);
    assert.doesNotMatch(src, /setAsked\(\{ text: q, n: 0 \}\)/, `${f}: the profile no longer replaces the search`);
    assert.doesNotMatch(src, /setInput\(q\)/, `${f}: the profile no longer replaces the typed text`);
  }
});
