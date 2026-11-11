// lib/jobsFeed.js: the live feeds behind /api/jobs (moved out of the route so the homepage can
// use them too). Adzuna jobs carry numeric pay and their currency, and a job Adzuna sends without
// coordinates still lands on the map (the old code read COUNTRY_COORDS[c].lng off an [lng, lat]
// array and produced NaN).
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const { fetchLiveJobs, fetchDbJobs, COUNTRY_COORDS, ALL_COUNTRIES, ADZUNA_COUNTRIES } = await import(
  new URL('../../../lib/jobsFeed.js', import.meta.url)
);
const { GET } = await import(new URL('../../../app/api/jobs/route.js', import.meta.url));

const ADZUNA = {
  ca: [
    {
      id: '5012345678',
      title: 'Software Engineer &amp; Team Lead',
      company: { display_name: 'Maple &amp; Co' },
      location: { display_name: 'Toronto, Ontario', area: ['Canada', 'Ontario', 'Toronto'] },
      salary_min: 88000,
      salary_max: 102000,
      salary_is_predicted: '0',
      redirect_url: 'https://www.adzuna.ca/details/5012345678',
      created: '2026-10-13T09:00:00Z',
      description: 'Build things.',
    },
    {
      id: '5012345679',
      title: 'Data Engineer',
      company: { display_name: 'Prairie Data' },
      location: { display_name: 'Calgary, Alberta' },
      latitude: 51.05,
      longitude: -114.07,
      salary_min: 95000,
      salary_is_predicted: '1',
      redirect_url: 'https://www.adzuna.ca/details/5012345679',
      created: '2026-10-01T09:00:00Z',
      description: '',
    },
    {
      id: '5012345680',
      title: 'QA Analyst',
      company: { display_name: 'Nowhere Inc' },
      location: { display_name: 'Canada' },
      redirect_url: 'https://www.adzuna.ca/details/5012345680',
      created: '2026-10-01T09:00:00Z',
    },
  ],
  gb: [
    {
      id: '777',
      title: 'Backend Engineer',
      company: { display_name: 'Thames Ltd' },
      location: { display_name: 'London, UK' },
      salary_min: 65000,
      salary_max: 80000,
      redirect_url: 'https://www.adzuna.co.uk/details/777',
      created: '2026-10-12T09:00:00Z',
    },
  ],
};

let realFetch;
let calls;
beforeEach(() => {
  realFetch = globalThis.fetch;
  calls = [];
  globalThis.fetch = async (url) => {
    const u = String(url);
    calls.push(u);
    const m = u.match(/api\.adzuna\.com\/v1\/api\/jobs\/([a-z]{2})\//);
    if (m) return Response.json({ results: ADZUNA[m[1]] || [] });
    return new Response('unavailable', { status: 503 });
  };
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

const adzuna = (jobs) => jobs.filter((j) => j.source === 'adzuna');

test('Adzuna jobs carry numeric pay and the country\'s currency', async () => {
  const jobs = adzuna(await fetchLiveJobs({ query: 'engineer', countries: ['ca'] }));
  assert.equal(jobs.length, 3);
  const [lead, data, qa] = jobs;
  assert.equal(lead.salary_min, 88000);
  assert.equal(lead.salary_max, 102000);
  assert.equal(lead.currency, 'CAD');
  assert.equal(lead.salary_predicted, false);
  assert.equal(data.salary_min, 95000);
  assert.equal(data.salary_max, null);
  assert.equal(data.salary_predicted, true);
  assert.equal(qa.salary_min, null);
  assert.equal(qa.salary_max, null);
  assert.equal(qa.currency, 'CAD');
});

test('every Adzuna job has finite coordinates, with or without Adzuna\'s own', async () => {
  const jobs = adzuna(await fetchLiveJobs({ query: 'engineer', countries: ['ca', 'gb'] }));
  assert.equal(jobs.length, 4);
  for (const j of jobs) {
    assert.ok(Number.isFinite(j.lng) && Number.isFinite(j.lat), `${j.id}: ${j.lng},${j.lat}`);
  }
  const lead = jobs.find((j) => j.id === 'adzuna_5012345678');
  const [cLng, cLat] = COUNTRY_COORDS.ca;
  assert.ok(Math.abs(lead.lng - cLng) <= 4 && Math.abs(lead.lat - cLat) <= 4, `${lead.lng},${lead.lat}`);
  const data = jobs.find((j) => j.id === 'adzuna_5012345679');
  assert.equal(data.lng, -114.07);
  assert.equal(data.lat, 51.05);
  assert.equal(jobs.find((j) => j.country === 'gb').currency, 'GBP');
});

test('the old fields and behaviour are kept: decoded text, $ salary string, dedupe', async () => {
  const jobs = adzuna(await fetchLiveJobs({ query: 'engineer', countries: ['ca', 'ca'] }));
  const lead = jobs.find((j) => j.id === 'adzuna_5012345678');
  assert.equal(lead.title, 'Software Engineer & Team Lead');
  assert.equal(lead.company, 'Maple & Co');
  assert.equal(lead.location, 'Toronto, Ontario');
  assert.equal(lead.salary, '$88,000 – $102,000');
  assert.equal(lead.url, 'https://www.adzuna.ca/details/5012345678');
  assert.equal(lead.country, 'ca');
  assert.equal(lead.remote, false);
  assert.equal(lead.posted_at, '2026-10-13T09:00:00Z');
  assert.equal(lead.expires_at, '2026-12-12T09:00:00.000Z');
  assert.equal(jobs.find((j) => j.id === 'adzuna_5012345680').salary, 'Salary not listed');
  assert.equal(jobs.length, 3, 'same title+company twice is listed once');
});

test('Adzuna is only asked about the countries it supports', async () => {
  await fetchLiveJobs({ query: 'engineer', countries: ['ca', 'pk', 'ng'] });
  const asked = calls.filter((u) => u.includes('api.adzuna.com')).map((u) => u.match(/jobs\/([a-z]{2})\//)[1]);
  assert.deepEqual(asked, ['ca']);
  assert.ok(ADZUNA_COUNTRIES.every((c) => ALL_COUNTRIES.includes(c)));
});

test('a feed that is down gives no jobs instead of an error', async () => {
  globalThis.fetch = async () => {
    throw new Error('network down');
  };
  assert.deepEqual(await fetchLiveJobs({ query: 'engineer', countries: ['ca'] }), []);
});

test('fetchDbJobs gives null when Supabase is not configured', async () => {
  assert.equal(await fetchDbJobs({ query: 'engineer', countries: ['ca'] }), null);
});

test('GET /api/jobs keeps its { jobs, total, source } shape', async () => {
  const res = await GET(new Request('http://localhost/api/jobs?q=engineer&countries=ca,zz'));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(Object.keys(body).sort(), ['jobs', 'source', 'total']);
  assert.equal(body.source, 'live');
  assert.equal(body.total, body.jobs.length);
  const lead = body.jobs.find((j) => j.id === 'adzuna_5012345678');
  assert.equal(lead.currency, 'CAD');
  assert.ok(Number.isFinite(lead.lng) && Number.isFinite(lead.lat));
  assert.ok(!calls.some((u) => /jobs\/zz\//.test(u)), 'unknown countries are dropped');
});

test('timeoutMs: a feed that has not answered in time adds nothing, the others still count', { timeout: 5000 }, async () => {
  globalThis.fetch = async (url) => {
    const u = String(url);
    const m = u.match(/api\.adzuna\.com\/v1\/api\/jobs\/([a-z]{2})\//);
    if (m) return Response.json({ results: ADZUNA[m[1]] || [] });
    return new Promise(() => {}); // the remote feeds never answer
  };
  const started = Date.now();
  const jobs = await fetchLiveJobs({ query: 'engineer', countries: ['ca'], timeoutMs: 150 });
  assert.ok(Date.now() - started < 1500, `${Date.now() - started} ms`);
  assert.equal(adzuna(jobs).length, 3);
  assert.equal(jobs.length, 3);
});

test('revalidate: the homepage caches every feed for its own 10 minutes; Adzuna keeps its 6 hours by default', async () => {
  const inits = [];
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    // Arbeitnow's page is over Next's 2 MB fetch-cache entry: it is fetched outside the fetch
    // cache and its trimmed roles are cached for the same 600 s instead (chrome.test.mjs).
    if (u.includes('arbeitnow.com')) return new Response('unavailable', { status: 503 });
    inits.push([u.includes('api.adzuna.com') ? 'adzuna' : 'remote', init?.next?.revalidate]);
    const m = u.match(/api\.adzuna\.com\/v1\/api\/jobs\/([a-z]{2})\//);
    if (m) return Response.json({ results: ADZUNA[m[1]] || [] });
    return new Response('unavailable', { status: 503 });
  };
  await fetchLiveJobs({ query: 'engineer', countries: ['ca', 'gb'], revalidate: 600 });
  assert.ok(inits.length > 2, `${inits.length} requests`);
  // A route's ISR window is the shortest one among its fetches, so none may be under the page's.
  assert.deepEqual(inits.filter(([, r]) => r !== 600), [], 'every feed request is cached for 600 s');
  inits.length = 0;
  await fetchLiveJobs({ query: 'engineer', countries: ['ca'] });
  assert.deepEqual(inits.filter(([k]) => k === 'adzuna').map(([, r]) => r), [21600], 'the default is 6 h (ADZUNA_REVALIDATE)');
});
