// lib/departures/jobRows.js (+ jobPlace.js): what the /jobs board does with the feed's jobs.
// placeOf: a job's city code (the same one the homepage board shows). jobRow: one row's text
// (code, role, company and city, pay, status, match) and, without listed pay, what to ask the
// salary model. searchPlan: free text, where a place ("tor", "YYZ", "... in Berlin") becomes a
// place filter (codeSearch aliases) and the rest is the role search. filterJobs / sortJobs: the
// gate chips (role type, ANY GATE, country, saved) and the order.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { placeOf, cleanTitle } = await import(new URL('../../../lib/departures/jobPlace.js', import.meta.url));
const {
  jobRow, searchPlan, filterJobs, sortJobs, countriesOf, profileQuery, ROLE_TYPES, isExpired,
} = await import(new URL('../../../lib/departures/jobRows.js', import.meta.url));
const { matchBadge, rankJobs } = await import(new URL('../../../app/data/matchJobs.js', import.meta.url));

const NOW = new Date('2026-10-14T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const ago = (ms) => new Date(NOW.getTime() - ms).toISOString();

const adzuna = (id, title, location, country, extra = {}) => ({
  id: `adzuna_${id}`, title, company: `Co ${id}`, location, country, source: 'adzuna', remote: false,
  posted_at: ago(10 * DAY), description: '', ...extra,
});
const remote = (id, title, extra = {}) => ({
  id: `remotive_${id}`, title, company: `Remote Co ${id}`, location: 'Worldwide', country: 'ca', source: 'remotive', remote: true,
  description: '', ...extra,
});

const TORONTO = adzuna('1', 'Software Engineer', 'Toronto, Ontario', 'ca', { salary_min: 88000, salary_max: 102000, currency: 'CAD' });
const VANCOUVER = adzuna('2', 'Registered Nurse', 'Vancouver, British Columbia', 'ca');
const LONDON = adzuna('3', 'Data Scientist', 'London, UK', 'gb', { salary_min: 65000, salary_max: 80000, currency: 'GBP' });
const BERLIN = { id: 'arbeitnow_x', title: 'Backend Entwickler (m/w/d)', company: 'Berlin GmbH', location: 'Berlin', country: 'fr', source: 'arbeitnow', remote: false };
const ANYWHERE = remote('9', 'Frontend Developer');
const TURIN = adzuna('4', 'Mechanical Engineer', 'Torino, Piemonte', 'it');
const JOBS = [TORONTO, VANCOUVER, LONDON, BERLIN, ANYWHERE, TURIN];

// ── placeOf / cleanTitle ────────────────────────────────────────────────────────────────────

test('placeOf: an Adzuna city in its own country', () => {
  const p = placeOf(TORONTO);
  assert.equal(p.code, 'YYZ');
  assert.equal(p.iso2, 'ca');
  assert.equal(p.city, 'Toronto');
  assert.equal(p.remote, false);
});

test('placeOf: remote roles are ANY, with no country', () => {
  for (const j of [ANYWHERE, { title: 'x', location: 'Remote' }, { title: 'x', location: 'Anywhere in the world' }]) {
    const p = placeOf(j);
    assert.equal(p.code, 'ANY');
    assert.equal(p.iso2, '');
    assert.equal(p.remote, true);
  }
});

test('placeOf: a feed\'s map placement is not the job\'s country (the city table decides)', () => {
  const p = placeOf(BERLIN);
  assert.equal(p.code, 'BER');
  assert.equal(p.iso2, 'de');
});

test('placeOf: odd locations still give three capitals', () => {
  for (const j of [{}, { location: null }, { location: 'Ōsaka!!' }, { location: 'Some Village', country: 'de', source: 'adzuna' }, { location: 'x'.repeat(300) }]) {
    assert.match(placeOf(j).code, /^[A-Z]{3}$/, JSON.stringify(j).slice(0, 60));
  }
  assert.equal(placeOf({ location: 'Some Village', country: 'de', source: 'adzuna' }).iso2, 'de');
});

test('cleanTitle drops gender tags and runs of spaces', () => {
  assert.equal(cleanTitle('Backend Entwickler (m/w/d)'), 'Backend Entwickler');
  assert.equal(cleanTitle('  Data   Engineer  [f/m/x] '), 'Data Engineer');
  assert.equal(cleanTitle(null), '');
});

// ── jobRow ──────────────────────────────────────────────────────────────────────────────────

test('jobRow: a role with listed pay', () => {
  const r = jobRow(TORONTO, { now: NOW });
  assert.equal(r.id, 'adzuna_1');
  assert.equal(r.code, 'YYZ');
  assert.equal(r.role, 'Software Engineer');
  assert.equal(r.where, 'Co 1 · Toronto');
  assert.equal(r.pay, 'C$88K–102K');
  assert.equal(r.ask, null, 'listed pay is never sent to the salary model');
  assert.equal(r.status, 'ON TIME');
  assert.equal(r.match, null, 'no profile, no badge');
});

test('jobRow: no listed pay asks the model for this role in its own country', () => {
  const r = jobRow(VANCOUVER, { now: NOW });
  assert.equal(r.pay, null);
  assert.deepEqual(r.ask, { title: 'Registered Nurse', country: 'ca', company: 'Co 2', location: 'Vancouver, British Columbia' });
  const any = jobRow(ANYWHERE, { now: NOW });
  assert.equal(any.code, 'ANY');
  assert.equal(any.status, 'ANY GATE');
  assert.equal(any.where, 'Remote Co 9 · Remote');
  assert.equal(any.ask.country, '', 'a remote role is not priced in its random map country');
});

test('jobRow: the match badge is matchBadge (the score the board sorts by)', () => {
  const profile = { skills: 'python, sql, machine learning', experience: '3-5', jobTypes: ['Data Science / ML'] };
  const r = jobRow(LONDON, { now: NOW, profile });
  assert.deepEqual(r.match, matchBadge(LONDON, profile));
  assert.ok(r.match.value > 0);
});

test('jobRow: odd data never throws and stays board-shaped', () => {
  const odd = [
    {},
    { id: 7, title: 'x'.repeat(200), location: 'Nowhere', posted_at: 'not a date' },
    { id: 'n', title: '데이터 엔지니어', company: null, location: '서울', salary_min: 'abc' },
    { id: 'r', title: '   ', location: 'Remote', remote: true },
  ];
  for (const j of odd) {
    const r = jobRow(j, { now: NOW });
    assert.match(r.code, /^[A-Z]{3}$/);
    assert.ok(r.role.length > 0);
    assert.equal(r.pay, null);
    assert.ok(['ON TIME', 'ANY GATE'].includes(r.status), r.status);
    assert.equal(typeof r.where, 'string');
  }
  assert.equal(jobRow({ title: '' }, { now: NOW }).role, 'Untitled role');
});

// ── searchPlan ──────────────────────────────────────────────────────────────────────────────

const BASE = 'software engineer';

test('searchPlan: empty text is the base search', () => {
  assert.deepEqual(searchPlan('', { base: BASE }), { text: '', query: BASE, place: null, countries: null, fallback: null });
  assert.equal(searchPlan('   ', { base: BASE }).query, BASE);
});

test('searchPlan: "tor" is a place (Toronto / YYZ), searched with the base role', () => {
  const p = searchPlan('tor', { base: BASE });
  assert.equal(p.query, BASE);
  assert.ok(p.place.codes.includes('YYZ'));
  assert.ok(p.place.cities.includes('Toronto'));
  assert.equal(p.place.codes[0], 'YYZ');
  assert.ok(p.countries.includes('ca'));
  assert.equal(p.fallback, 'tor', 'if no role there, it is searched as words');
});

test('searchPlan: a code or a city name is a place', () => {
  assert.deepEqual(searchPlan('YYZ', { base: BASE }).place.codes, ['YYZ']);
  assert.deepEqual(searchPlan('yyz', { base: BASE }).place.cities, ['Toronto']);
  assert.ok(searchPlan('New York', { base: BASE }).place.codes.includes('JFK'));
});

test('searchPlan: role words are the search', () => {
  const p = searchPlan('data scientist', { base: BASE });
  assert.equal(p.query, 'data scientist');
  assert.equal(p.place, null);
  assert.equal(p.countries, null);
  assert.equal(searchPlan('react native', { base: BASE }).place, null);
});

test('searchPlan: a trailing place splits off ("data scientist toronto", "designer in berlin")', () => {
  const a = searchPlan('data scientist toronto', { base: BASE });
  assert.equal(a.query, 'data scientist');
  assert.deepEqual(a.place.codes, ['YYZ']);
  assert.deepEqual(a.countries, ['ca']);
  const b = searchPlan('designer in Berlin', { base: BASE });
  assert.equal(b.query, 'designer');
  assert.deepEqual(b.place.codes, ['BER']);
  const c = searchPlan('nurse new york', { base: BASE });
  assert.equal(c.query, 'nurse');
  assert.ok(c.place.codes.includes('JFK'));
});

// ── filterJobs / sortJobs ───────────────────────────────────────────────────────────────────

test('filterJobs: a place keeps its city\'s roles, best code first', () => {
  const place = searchPlan('tor', { base: BASE }).place;
  const out = filterJobs(JOBS, { place, now: NOW });
  assert.deepEqual(out.map((j) => j.id), ['adzuna_1', 'adzuna_4']);
  const yyz = filterJobs([TURIN, TORONTO], { place, now: NOW });
  assert.deepEqual(yyz.map((j) => j.id), ['adzuna_1', 'adzuna_4'], 'Toronto (YYZ) before Turin (TRN)');
});

test('filterJobs: a country-wide role is not in that country\'s main city', () => {
  // "Canada" gets Canada's main code (YYZ) on the board, but it is not a Toronto role.
  const canada = adzuna('5', 'Analyst', 'Canada', 'ca');
  const ontario = adzuna('6', 'Analyst', 'Toronto, Ontario', 'ca');
  assert.equal(placeOf(canada).code, 'YYZ');
  const place = searchPlan('tor', { base: BASE }).place;
  assert.deepEqual(filterJobs([canada, ontario], { place, now: NOW }).map((j) => j.id), ['adzuna_6']);
});

test('filterJobs: role type, ANY GATE, country and saved', () => {
  assert.ok(ROLE_TYPES.some((t) => t.value === 'tech') && ROLE_TYPES.some((t) => t.value === 'healthcare'));
  assert.deepEqual(filterJobs(JOBS, { type: 'healthcare', now: NOW }).map((j) => j.id), ['adzuna_2']);
  assert.ok(filterJobs(JOBS, { type: 'tech', now: NOW }).some((j) => j.id === 'adzuna_1'));
  assert.deepEqual(filterJobs(JOBS, { remote: true, now: NOW }).map((j) => j.id), ['remotive_9']);
  assert.deepEqual(filterJobs(JOBS, { country: 'ca', now: NOW }).map((j) => j.id), ['adzuna_1', 'adzuna_2'], 'not the remote role placed in ca');
  assert.deepEqual(filterJobs(JOBS, { country: 'de', now: NOW }).map((j) => j.id), ['arbeitnow_x']);
  assert.deepEqual(filterJobs(JOBS, { saved: new Set(['adzuna_3', 'nope']), now: NOW }).map((j) => j.id), ['adzuna_3']);
  assert.equal(filterJobs(JOBS, { now: NOW }).length, JOBS.length);
});

test('filterJobs: expired roles leave the board', () => {
  const stale = adzuna('old', 'Old Role', 'Toronto', 'ca', { posted_at: ago(90 * DAY) });
  const closed = adzuna('closed', 'Closed Role', 'Toronto', 'ca', { expires_at: ago(DAY) });
  assert.equal(isExpired(stale, NOW), true);
  assert.equal(isExpired(closed, NOW), true);
  assert.equal(isExpired(TORONTO, NOW), false);
  assert.equal(isExpired(BERLIN, NOW), false, 'no dates: kept');
  assert.deepEqual(filterJobs([stale, TORONTO, closed], { now: NOW }).map((j) => j.id), ['adzuna_1']);
});

test('sortJobs: best match is rankJobs; newest by posted date; otherwise the feed order', () => {
  const profile = { skills: 'python, sql', experience: '3-5', jobTypes: ['Data Science / ML'] };
  assert.deepEqual(sortJobs(JOBS, 'match', profile).map((j) => j.id), rankJobs(JOBS, profile).map((j) => j.id));
  const dated = [
    adzuna('a', 'A', 'Toronto', 'ca', { posted_at: ago(5 * DAY) }),
    adzuna('b', 'B', 'Toronto', 'ca', { posted_at: undefined }),
    adzuna('c', 'C', 'Toronto', 'ca', { posted_at: ago(1 * DAY) }),
  ];
  assert.deepEqual(sortJobs(dated, 'newest').map((j) => j.id), ['adzuna_c', 'adzuna_a', 'adzuna_b']);
  assert.deepEqual(sortJobs(dated, 'feed').map((j) => j.id), ['adzuna_a', 'adzuna_b', 'adzuna_c']);
  assert.deepEqual(sortJobs(JOBS, 'match', null).map((j) => j.id), JOBS.map((j) => j.id));
});

test('countriesOf: the own countries on the board, not remote placements', () => {
  assert.deepEqual(countriesOf(JOBS), ['ca', 'de', 'gb', 'it']);
});

test('profileQuery: the profile\'s first job type, then up to three skills', () => {
  assert.equal(profileQuery(null), 'software engineer');
  assert.equal(
    profileQuery({ jobTypes: ['Data Science / ML'], skills: 'python, sql, spark, aws' }),
    'data scientist machine learning python sql spark',
  );
  assert.equal(profileQuery({ jobTypes: ['Other'], skills: '' }), 'software engineer');
});
