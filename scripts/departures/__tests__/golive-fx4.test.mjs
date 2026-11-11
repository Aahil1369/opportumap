// Go-live fix wave, FX4. Adzuna's answers are cached for 6 hours, one window for every caller
// (Ruling R46): the pages rebuild every 10 minutes and reuse the cached answers. A rate-limited or
// refused Adzuna answer is logged by its status, never by its URL (the URL holds the keys). A rate
// limit reaches a visitor at once: no SDK retries in the two AI routes that call Groq directly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const feed = await import(new URL('../../../lib/jobsFeed.js', import.meta.url));

/** Every fetchLiveJobs({ ... }) call in a source file, from its opening to its closing `})`. */
function fetchLiveJobsCalls(rel) {
  return read(rel).match(/fetchLiveJobs\(\{[\s\S]*?\}\)/g) ?? [];
}

/** Replaces globalThis.fetch with `handler`, recording every [url, init] asked. */
function stubFetch(handler) {
  const real = globalThis.fetch;
  const seen = [];
  globalThis.fetch = async (url, init) => {
    seen.push([String(url), init]);
    return handler(String(url));
  };
  return { seen, restore: () => { globalThis.fetch = real; } };
}

const ADZUNA_ONLY = (url) =>
  url.includes('api.adzuna.com') ? Response.json({ results: [] }) : new Response('unavailable', { status: 503 });

test('ADZUNA_REVALIDATE is exported from lib/jobsFeed.js and equals 21600 (6 hours)', () => {
  assert.equal(feed.ADZUNA_REVALIDATE, 21600);
});

test('fetchAdzunaJobs defaults to ADZUNA_REVALIDATE, not a per-caller window', () => {
  assert.match(
    read('lib/jobsFeed.js'),
    /async function fetchAdzunaJobs\(query, countries, revalidate = ADZUNA_REVALIDATE, fail = noop\) \{/,
  );
});

for (const rel of ['app/page.js', 'app/jobs/page.js', 'app/api/jobs/route.js']) {
  test(`${rel}: no fetchLiveJobs call passes a revalidate window`, () => {
    const calls = fetchLiveJobsCalls(rel);
    assert.ok(calls.length >= 1, `${rel} has a fetchLiveJobs call`);
    for (const call of calls) assert.doesNotMatch(call, /\brevalidate\b/, call);
  });
}

for (const rel of ['app/page.js', 'app/jobs/page.js']) {
  test(`${rel} still rebuilds every 10 minutes`, () => {
    assert.match(read(rel), /^export const revalidate = 600;$/m);
  });
}

test('fetchLiveJobs with no revalidate asks Adzuna for a 6-hour data cache', async () => {
  const stub = stubFetch(ADZUNA_ONLY);
  try {
    await feed.fetchLiveJobs({ query: 'engineer', countries: ['ca'] });
  } finally {
    stub.restore();
  }
  const adzuna = stub.seen.filter(([u]) => u.includes('api.adzuna.com'));
  assert.equal(adzuna.length, 1, 'one Adzuna request for one country');
  assert.equal(adzuna[0][1]?.next?.revalidate, 21600);
});

test('an Adzuna 429 logs one warning per country, naming the status and never the keys', async () => {
  const realWarn = console.warn;
  const warns = [];
  console.warn = (...args) => warns.push(args.map(String).join(' '));
  const stub = stubFetch((url) =>
    url.includes('api.adzuna.com') ? new Response('rate limited', { status: 429 }) : new Response('unavailable', { status: 503 }),
  );
  try {
    await feed.fetchLiveJobs({ query: 'engineer', countries: ['ca', 'gb'] });
  } finally {
    console.warn = realWarn;
    stub.restore();
  }
  const adzunaWarns = warns.filter((m) => m.includes('Adzuna')).sort();
  assert.deepEqual(adzunaWarns, ['[jobsFeed] Adzuna ca answered 429', '[jobsFeed] Adzuna gb answered 429']);
  for (const m of adzunaWarns) assert.doesNotMatch(m, /app_key/);
});
