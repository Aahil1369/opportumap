// lib/departures/payQueue.js: the salary predictions behind the board's pay column. One request
// per role and country (title|country), at most `concurrency` (3) in flight, every answer kept
// for the session: a failure resolves null and is never asked again (no retry storm on a 429).
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { createPayQueue, payKey } = await import(new URL('../../../lib/departures/payQueue.js', import.meta.url));

const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

/** A fetcher that counts calls and how many are in flight at once; answers after `ms`. */
function instrumented({ ms = 5, answer = (job) => `pay:${job.title}|${job.country}`, fail = () => false } = {}) {
  const stats = { calls: 0, inFlight: 0, maxInFlight: 0, keys: [] };
  const fetcher = async (job) => {
    stats.calls += 1;
    stats.keys.push(payKey(job));
    stats.inFlight += 1;
    stats.maxInFlight = Math.max(stats.maxInFlight, stats.inFlight);
    await tick(ms);
    stats.inFlight -= 1;
    if (fail(job)) throw new Error('429 Too Many Requests');
    return answer(job);
  };
  return { fetcher, stats };
}

const JOBS = [
  { title: 'Software Engineer', country: 'ca', company: 'A' },
  { title: 'Software Engineer', country: 'gb', company: 'B' },
  { title: 'Data Engineer', country: 'ca', company: 'C' },
  { title: 'Nurse', country: 'au', company: 'D' },
];

test('payKey is title|country', () => {
  assert.equal(payKey({ title: 'Software Engineer', country: 'ca' }), 'Software Engineer|ca');
  assert.equal(payKey({ title: 'Nurse' }), 'Nurse|');
});

test('10 requests for 4 distinct title|country keys call the fetcher 4 times', async () => {
  const { fetcher, stats } = instrumented();
  const queue = createPayQueue({ fetcher });
  const asks = Array.from({ length: 10 }, (_, i) => {
    const base = JOBS[i % JOBS.length];
    return { ...base, company: `${base.company}${i}` }; // same role and country, another company
  });
  const pays = await Promise.all(asks.map((job) => queue.request(job)));
  assert.equal(stats.calls, 4);
  assert.deepEqual(new Set(stats.keys), new Set(JOBS.map(payKey)));
  pays.forEach((pay, i) => assert.equal(pay, `pay:${payKey(asks[i])}`));
  assert.equal(queue.size(), 4);
});

test('never more than 3 in flight (and it does run 3 at once)', async () => {
  const { fetcher, stats } = instrumented({ ms: 8 });
  const queue = createPayQueue({ fetcher });
  const many = Array.from({ length: 12 }, (_, i) => ({ title: `Role ${i}`, country: 'de' }));
  const pays = await Promise.all(many.map((job) => queue.request(job)));
  assert.equal(stats.calls, 12);
  assert.equal(stats.maxInFlight, 3);
  assert.deepEqual(pays, many.map((job) => `pay:${payKey(job)}`));
});

test('concurrency is configurable', async () => {
  const { fetcher, stats } = instrumented({ ms: 4 });
  const queue = createPayQueue({ fetcher, concurrency: 1 });
  await Promise.all(JOBS.map((job) => queue.request(job)));
  assert.equal(stats.maxInFlight, 1);
  assert.equal(stats.calls, 4);
});

test('a rejecting fetcher resolves null, and the same key is never asked again', async () => {
  const { fetcher, stats } = instrumented({ fail: () => true });
  const queue = createPayQueue({ fetcher });
  assert.equal(await queue.request(JOBS[0]), null);
  assert.equal(stats.calls, 1);
  assert.equal(await queue.request({ ...JOBS[0], company: 'Another' }), null);
  assert.equal(stats.calls, 1, 'the failure is kept: no second call for the same title|country');
});

test('failures free their slot: every key still gets its one try', async () => {
  const { fetcher, stats } = instrumented({ ms: 3, fail: (job) => job.title.endsWith('odd') });
  const queue = createPayQueue({ fetcher });
  const jobs = Array.from({ length: 8 }, (_, i) => ({ title: `Role ${i} ${i % 2 ? 'odd' : 'even'}`, country: 'in' }));
  const pays = await Promise.all(jobs.map((job) => queue.request(job)));
  assert.equal(stats.calls, 8);
  assert.ok(stats.maxInFlight <= 3);
  pays.forEach((pay, i) => assert.equal(pay, i % 2 ? null : `pay:${payKey(jobs[i])}`));
});

test('a fetcher that throws synchronously, or answers nothing, gives null', async () => {
  let calls = 0;
  const queue = createPayQueue({
    fetcher: (job) => {
      calls += 1;
      if (job.title === 'boom') throw new Error('sync');
      if (job.title === 'empty') return '';
      if (job.title === 'undefined') return undefined;
      return null;
    },
  });
  for (const title of ['boom', 'empty', 'undefined', 'null']) {
    assert.equal(await queue.request({ title, country: 'us' }), null, title);
  }
  assert.equal(calls, 4);
  assert.equal(await queue.request({ title: 'boom', country: 'us' }), null);
  assert.equal(calls, 4);
});

test('answers already in the cache are not fetched', async () => {
  const { fetcher, stats } = instrumented();
  const cache = new Map([['Nurse|au', 'A$80K–95K']]);
  const queue = createPayQueue({ fetcher, cache });
  assert.equal(await queue.request(JOBS[3]), 'A$80K–95K');
  assert.equal(stats.calls, 0);
  assert.equal(await queue.request(JOBS[0]), `pay:${payKey(JOBS[0])}`);
  assert.equal(stats.calls, 1);
  assert.ok(cache.has(payKey(JOBS[0])), 'the given cache keeps new answers');
});

test('a request made while the same key is in flight shares that one call', async () => {
  const { fetcher, stats } = instrumented({ ms: 10 });
  const queue = createPayQueue({ fetcher });
  const first = queue.request(JOBS[1]);
  await tick(2);
  const second = queue.request(JOBS[1]);
  assert.equal(await first, await second);
  assert.equal(stats.calls, 1);
});
