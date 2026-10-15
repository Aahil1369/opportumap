// /jobs fix round 1: the board's text is server-rendered, and a ?job= deep link resolves outside
// the visitor's own search.
//
// - HOME_SEARCH (lib/departures/homeSearch.js) is the homepage's board search; app/page.js and
//   app/jobs/page.js both fetch it, so they share one data-cache entry (no extra Adzuna calls)
//   and the ids the homepage links to are on /jobs' server board.
// - boardJobs: what the server sends the board: roles still open, trimmed to the fields the rows,
//   the chips and the gate read (description as short plain text), in the feed's order.
// - findJob / deepLink: a ?job= id opens from any board the page has (the server's, the search's);
//   a miss is only called once the visitor's own search has settled.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');

const { HOME_SEARCH } = await import(new URL('../../../lib/departures/homeSearch.js', import.meta.url));
const { boardJobs, trimJob, BOARD_DESC_CHARS, findJob, deepLink, isJobId, jobRow, filterJobs } = await import(
  new URL('../../../lib/departures/jobRows.js', import.meta.url)
);

const NOW = new Date('2026-10-14T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const ago = (ms) => new Date(NOW.getTime() - ms).toISOString();

const LONG_HTML = `<p>We are <b>hiring</b> a Software Engineer.</p>\n<ul><li>React</li><li>Node</li></ul> ${'Build things people use. '.repeat(40)}`;
const JOB = {
  id: 'adzuna_42',
  title: 'Software Engineer',
  company: 'Shopify',
  location: 'Toronto, Ontario',
  country: 'ca',
  remote: false,
  source: 'adzuna',
  salary: '$88,000 – $102,000',
  salary_min: 88000,
  salary_max: 102000,
  salary_predicted: false,
  currency: 'CAD',
  url: 'https://www.adzuna.ca/land/ad/42',
  lng: -79.38,
  lat: 43.65,
  description: LONG_HTML,
  posted_at: ago(2 * DAY),
  expires_at: new Date(NOW.getTime() + 30 * DAY).toISOString(),
  last_seen: ago(DAY),
};

// ── HOME_SEARCH ─────────────────────────────────────────────────────────────────────────────

test('HOME_SEARCH is the homepage board search: software, in eight countries', () => {
  assert.equal(HOME_SEARCH.query, 'software');
  assert.deepEqual([...HOME_SEARCH.countries], ['ca', 'gb', 'de', 'in', 'sg', 'au', 'nl', 'us']);
  assert.ok(Object.isFrozen(HOME_SEARCH) && Object.isFrozen(HOME_SEARCH.countries), 'one search, never edited in place');
});

test('the homepage and /jobs fetch the same search (one data-cache entry)', () => {
  const home = read('app/page.js');
  const jobs = read('app/jobs/page.js');
  for (const [name, src] of [['app/page.js', home], ['app/jobs/page.js', jobs]]) {
    assert.match(src, /import \{[^}]*\bHOME_SEARCH\b[^}]*\} from '[./]+lib\/departures\/homeSearch'/, `${name} imports HOME_SEARCH`);
    assert.match(src, /fetchLiveJobs\(\{\s*query: HOME_SEARCH\.query,\s*countries: \[\.\.\.HOME_SEARCH\.countries\]/, `${name} fetches HOME_SEARCH`);
    assert.match(src, /^export const revalidate = 600;$/m, `${name} rebuilds every 10 minutes`);
  }
  assert.doesNotMatch(home, /query: 'software'/, 'the homepage has no second copy of the search');
});

test('/jobs renders its board on the server and hands it to JobsBoard', () => {
  const page = read('app/jobs/page.js');
  assert.match(page, /export default async function JobsPage\(\)/);
  assert.match(page, /boardJobs\(/, 'the server trims the jobs it sends');
  assert.match(page, /<JobsBoard initial=\{[^}]+\} \/>/);
  const board = read('app/components/jobs/JobsBoard.js');
  assert.match(board, /export default function JobsBoard\(\{ initial/);
  assert.doesNotMatch(board, /has left the board/, 'a miss never claims the role is gone');
});

// ── boardJobs ───────────────────────────────────────────────────────────────────────────────

test('boardJobs keeps what the rows, chips and gate read, and drops the rest', () => {
  const [j] = boardJobs([JOB], { now: NOW });
  assert.deepEqual(Object.keys(j).sort(), [
    'company', 'country', 'currency', 'description', 'expires_at', 'id', 'location', 'posted_at', 'remote',
    'salary', 'salary_max', 'salary_min', 'salary_predicted', 'source', 'title', 'url',
  ]);
  assert.equal(j.id, 'adzuna_42');
  assert.equal(j.url, JOB.url);
  // The row the board shows is the same as from the full job.
  assert.deepEqual(jobRow(j, { now: NOW }), jobRow(JOB, { now: NOW }));
});

test('boardJobs: the description is short plain text, cut at a word with an ellipsis', () => {
  const [j] = boardJobs([JOB], { now: NOW });
  assert.ok(BOARD_DESC_CHARS >= 200 && BOARD_DESC_CHARS <= 500, `BOARD_DESC_CHARS ${BOARD_DESC_CHARS}`);
  assert.ok(j.description.length <= BOARD_DESC_CHARS, `${j.description.length} chars`);
  assert.doesNotMatch(j.description, /[<>]/, 'no HTML');
  assert.doesNotMatch(j.description, /\s{2}/, 'whitespace collapsed');
  assert.match(j.description, /^We are hiring a Software Engineer\. React Node Build/);
  assert.match(j.description, /\S…$/, 'ends on a word, then …');
  const [short] = boardJobs([{ ...JOB, description: '<p>Short and <i>sweet</i>.</p>' }], { now: NOW });
  assert.equal(short.description, 'Short and sweet.', 'a short text is kept whole');
  const [none] = boardJobs([{ ...JOB, description: '' }], { now: NOW });
  assert.equal('description' in none, false);
});

test('boardJobs: closed and stale roles stay off, the order is the feed\'s, odd items are skipped', () => {
  const closed = { ...JOB, id: 'closed', expires_at: ago(DAY) };
  const stale = { ...JOB, id: 'stale', posted_at: ago(90 * DAY), expires_at: null };
  const undated = { id: 'remotive_1', title: 'Frontend Developer', company: 'Remote Co', remote: true, source: 'remotive' };
  const out = boardJobs([JOB, closed, null, 'x', stale, undated, { ...JOB, id: 'b' }], { now: NOW });
  assert.deepEqual(out.map((j) => j.id), ['adzuna_42', 'remotive_1', 'b']);
  assert.deepEqual(boardJobs(null, { now: NOW }), []);
  assert.deepEqual(filterJobs(out, { now: NOW }).map((j) => j.id), ['adzuna_42', 'remotive_1', 'b']);
});

test('boardJobs is far smaller than the feed it trims', () => {
  const feed = Array.from({ length: 200 }, (_, i) => ({ ...JOB, id: `adzuna_${i}` }));
  const before = JSON.stringify(feed).length;
  const after = JSON.stringify(boardJobs(feed, { now: NOW })).length;
  assert.ok(after < before * 0.6, `${after} vs ${before}`);
});

// ── Deep links ──────────────────────────────────────────────────────────────────────────────

test('findJob finds an id in a list (ids compare as strings)', () => {
  const list = [{ id: 7 }, { id: 'adzuna_42' }];
  assert.deepEqual(findJob(list, '7'), { id: 7 });
  assert.deepEqual(findJob(list, 'adzuna_42'), { id: 'adzuna_42' });
  assert.equal(findJob(list, 'nope'), null);
  assert.equal(findJob(null, '7'), null);
  assert.equal(findJob([null, undefined], '7'), null);
});

test('deepLink: a homepage row opens from the server board before the visitor\'s search lands', () => {
  const server = [{ id: 'adzuna_42' }];
  assert.equal(deepLink('adzuna_42', { lists: [server, null], settled: false }), 'open');
  assert.equal(deepLink('adzuna_42', { lists: [null, server], settled: true }), 'open');
});

test('deepLink: an id on neither board waits for the visitor\'s search, is looked up once, then is a miss', () => {
  const server = [{ id: 'a' }];
  const search = [{ id: 'b' }];
  assert.equal(deepLink('c', { lists: [server, search], settled: false }), 'wait');
  assert.equal(deepLink('c', { lists: [server, search], settled: true }), 'lookup');
  assert.equal(deepLink('c', { lists: [server, search], settled: true, looked: true }), 'miss');
  assert.equal(deepLink('c', { lists: [server, search, [{ id: 'c' }]], settled: true, looked: true }), 'open', 'the lookup found it');
  assert.equal(deepLink('b', { lists: [server, search], settled: true }), 'open');
  assert.equal(deepLink('', { lists: [server], settled: true }), 'none');
  assert.equal(deepLink(null, { lists: [server], settled: true }), 'none');
});

test('deepLink: an id that is not job-id shaped is never looked up', () => {
  assert.equal(deepLink('<script>', { lists: [], settled: true }), 'miss');
  assert.equal(deepLink('x'.repeat(201), { lists: [], settled: true }), 'miss');
  assert.equal(deepLink('arbeitnow_senior-dev-berlin-123', { lists: [], settled: true }), 'lookup');
});

test('isJobId: the feeds\' ids, nothing else', () => {
  for (const id of ['adzuna_5927958773', 'remoteok_1137508', 'remotive_42', 'arbeitnow_senior-dev-berlin-123', 'himalayas_a1b2.c3', '7']) {
    assert.equal(isJobId(id), true, id);
  }
  for (const id of ['', ' ', 'a b', '<x>', 'a/b', 'a?b', 'x'.repeat(201), null, undefined, 42]) {
    assert.equal(isJobId(id), false, String(id));
  }
});

test('/api/jobs?id= looks one role up in the homepage\'s search (the same data cache), trimmed', () => {
  const src = read('app/api/jobs/route.js');
  assert.match(src, /searchParams\.get\('id'\)/);
  assert.match(src, /isJobId\(id\)/, 'a bad id is refused before any feed call');
  assert.match(src, /status: 400/);
  assert.match(src, /fetchLiveJobs\(\{\s*query: HOME_SEARCH\.query,\s*countries: \[\.\.\.HOME_SEARCH\.countries\]/);
  // Any role the homepage can list, however old (its board keeps roles /jobs' list drops).
  assert.match(src, /trimJob\(findJob\(jobs, id\)\)/);
  assert.doesNotMatch(src, /boardJobs\(/);
  const board = read('app/components/jobs/JobsBoard.js');
  assert.match(board, /\/api\/jobs\?\$\{new URLSearchParams\(\{ id \}\)\}/, 'the board asks for one id only on a miss');
});

test('trimJob: one job as the server board keeps it, whatever its age', () => {
  const old = { ...JOB, posted_at: '2021-12-19T04:17:23Z', expires_at: '2022-02-17T04:17:23Z' };
  const t = trimJob(old);
  assert.equal(t.id, 'adzuna_42');
  assert.equal(t.posted_at, old.posted_at);
  assert.equal('lng' in t || 'last_seen' in t, false);
  assert.ok(t.description.length <= BOARD_DESC_CHARS);
  assert.deepEqual(boardJobs([JOB], { now: NOW })[0], trimJob(JOB), 'boardJobs trims with trimJob');
  assert.deepEqual(boardJobs([old], { now: NOW }), [], 'the board itself still drops it');
  assert.equal(trimJob(null), null);
});
