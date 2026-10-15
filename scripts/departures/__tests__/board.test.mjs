// lib/departures/board.js: the homepage departures board. Real roles become rows of
// LOCAL · TO · ROLE · PAY · STATUS (a varied set: distinct cities, at most two per country, jobs
// with pay first); when the live feeds give nothing usable at ISR time the board is the static
// FALLBACK_ROWS sample. Plus the founder's row and the night window's city lights.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { BOARD_COLUMNS, FALLBACK_ROWS, FOUNDER_ROW, boardRowsFrom } = await import(
  new URL('../../../lib/departures/board.js', import.meta.url)
);
const { CITY_LIGHTS, NIGHT_VIEW, nightPoint, nightLights } = await import(
  new URL('../../../lib/departures/cityLights.js', import.meta.url)
);
const { CITY_ROWS } = await import(new URL('../../../lib/departures/cityCodes.data.js', import.meta.url));

const NOW = new Date('2026-10-14T12:40:00Z');
const CELL_KEYS = ['code', 'pay', 'role', 'status', 'time'];
const COUNTRIES = {
  ca: { currency: 'CAD', cities: ['Toronto, Ontario', 'Vancouver, British Columbia', 'Montréal, Québec', 'Calgary, Alberta', 'Ottawa, Ontario', 'Halifax, Nova Scotia'] },
  gb: { currency: 'GBP', cities: ['London, UK', 'Manchester, Greater Manchester', 'Edinburgh, Scotland', 'Bristol', 'Leeds, West Yorkshire', 'Glasgow'] },
  de: { currency: 'EUR', cities: ['Berlin', 'München', 'Hamburg', 'Frankfurt am Main', 'Köln', 'Stuttgart'] },
  in: { currency: 'INR', cities: ['Bangalore, Karnataka', 'Mumbai, Maharashtra', 'New Delhi', 'Hyderabad, Telangana', 'Chennai, Tamil Nadu', 'Pune'] },
  au: { currency: 'AUD', cities: ['Sydney, New South Wales', 'Melbourne, Victoria', 'Brisbane, Queensland', 'Perth, Western Australia', 'Adelaide', 'Canberra'] },
};
const ROLES = ['Software Engineer', 'Data Engineer', 'Product Designer', 'Backend Developer', 'ML Engineer', 'QA Analyst'];

/** 30 Adzuna-shaped jobs: 6 per country, each in its own city; the even ones list pay. */
function stubJobs() {
  const jobs = [];
  for (const [iso2, { currency, cities }] of Object.entries(COUNTRIES)) {
    cities.forEach((location, i) => {
      jobs.push({
        id: `adzuna_${iso2}${i}`,
        title: ROLES[i],
        company: `Company ${iso2.toUpperCase()}${i}`,
        location,
        country: iso2,
        currency,
        source: 'adzuna',
        remote: false,
        salary_min: i % 2 === 0 ? 60000 + i * 5000 : null,
        salary_max: i % 2 === 0 ? 80000 + i * 5000 : null,
        posted_at: i === 0 ? '2026-10-14T08:00:00Z' : '2026-09-01T08:00:00Z',
      });
    });
  }
  return jobs;
}

const cellsOf = (rows) => rows.flatMap((r) => Object.values(r.cells));
const perCountry = (rows) => {
  const n = {};
  for (const r of rows) {
    const key = r.iso2 || r.cells.code;
    n[key] = (n[key] || 0) + 1;
  }
  return n;
};

test('BOARD_COLUMNS are LOCAL · TO · ROLE · PAY · STATUS', () => {
  assert.deepEqual(BOARD_COLUMNS, [
    { key: 'time', label: 'LOCAL' },
    { key: 'code', label: 'TO' },
    { key: 'role', label: 'ROLE' },
    { key: 'pay', label: 'PAY' },
    { key: 'status', label: 'STATUS' },
  ]);
});

test('no usable jobs (empty, missing, broken) gives the static FALLBACK_ROWS board', () => {
  assert.equal(FALLBACK_ROWS.length, 8);
  assert.ok(FALLBACK_ROWS.every((r) => r.fallback === true), 'every sample row is marked fallback');
  assert.ok(FALLBACK_ROWS.every((r) => r.href === '/jobs'), 'sample rows link to /jobs');
  assert.deepEqual(boardRowsFrom([], { now: NOW }), FALLBACK_ROWS);
  assert.deepEqual(boardRowsFrom(null, { now: NOW }), FALLBACK_ROWS);
  assert.deepEqual(boardRowsFrom(undefined), FALLBACK_ROWS);
  assert.deepEqual(boardRowsFrom([null, 42, 'job', {}, { title: '   ' }], { now: NOW }), FALLBACK_ROWS);
});

test('FALLBACK_ROWS read like a real board: 5 cells, 3-letter codes, distinct cities, ≤ 2 per country', () => {
  const codes = new Set();
  for (const r of FALLBACK_ROWS) {
    assert.deepEqual(Object.keys(r.cells).sort(), CELL_KEYS);
    assert.match(r.cells.code, /^[A-Z]{3}$/);
    assert.match(r.cells.time, /^\d{2}:\d{2}$/);
    assert.ok(['ON TIME', 'ANY GATE', 'NEW'].includes(r.cells.status), r.cells.status);
    assert.ok(typeof r.tz === 'string' && r.tz, `${r.id} has a time zone for the live clock`);
    codes.add(r.cells.code);
  }
  assert.equal(codes.size, 8);
  assert.ok(Object.values(perCountry(FALLBACK_ROWS)).every((n) => n <= 2));
  const known = new Set(CITY_ROWS.map((row) => row[2]));
  for (const r of FALLBACK_ROWS) if (r.cells.code !== 'ANY') assert.ok(known.has(r.cells.code), `${r.cells.code} is in the city table`);
});

test('30 jobs across 5 countries: at most 8 rows, at most 2 per country, well-formed cells', () => {
  const rows = boardRowsFrom(stubJobs(), { now: NOW });
  assert.ok(rows.length <= 8 && rows.length >= 5, `${rows.length} rows`);
  assert.ok(rows.every((r) => !r.fallback), 'enough real jobs: no sample rows');
  const counts = perCountry(rows);
  assert.ok(Object.values(counts).every((n) => n <= 2), JSON.stringify(counts));
  assert.equal(Object.keys(counts).length, 5, 'every country gets a row before any gets a second');
  for (const r of rows) {
    assert.deepEqual(Object.keys(r.cells).sort(), CELL_KEYS);
    assert.match(r.cells.code, /^[A-Z]{3}$/);
    assert.match(r.cells.time, /^\d{2}:\d{2}$/);
    assert.ok(r.cells.role.length > 0);
    assert.equal(r.href, `/jobs?job=${encodeURIComponent(r.id)}`);
  }
  assert.equal(new Set(rows.map((r) => r.cells.code)).size, rows.length, 'distinct cities');
});

test('rows map through the Task 2 helpers: local time, code, local pay, status', () => {
  const rows = boardRowsFrom(stubJobs(), { now: NOW });
  const toronto = rows.find((r) => r.id === 'adzuna_ca0');
  assert.ok(toronto, 'the Toronto role with listed pay is on the board');
  assert.deepEqual(toronto.cells, { time: '08:40', code: 'YYZ', role: 'Software Engineer', pay: 'C$60K–80K', status: 'NEW' });
  assert.equal(toronto.tz, 'America/Toronto');
  assert.equal(toronto.iso2, 'ca');
  assert.equal(toronto.city, 'Toronto');
  const bangalore = rows.find((r) => r.id === 'adzuna_in0');
  assert.deepEqual(bangalore.cells, { time: '18:10', code: 'BLR', role: 'Software Engineer', pay: '₹60K–80K', status: 'NEW' });
  assert.equal(bangalore.tz, 'Asia/Kolkata');
});

test('jobs with listed pay come first; pay-less roles only fill what is left', () => {
  const rows = boardRowsFrom(stubJobs(), { now: NOW });
  const withPay = rows.filter((r) => r.cells.pay !== 'NOT LISTED');
  // 15 stub jobs list pay (3 per country, 2 allowed per country): all 8 rows have pay.
  assert.equal(withPay.length, rows.length);
});

test('a role without pay reads NOT LISTED (it fits the 13-tile PAY column)', () => {
  const rows = boardRowsFrom(
    [{ id: 'x1', title: 'Support Engineer', location: 'Lisbon', country: 'pt', source: 'arbeitnow' }],
    { now: NOW, fill: [] },
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].cells.pay, 'NOT LISTED');
  assert.equal(rows[0].cells.code, 'LIS');
  assert.equal(rows[0].cells.status, 'ON TIME');
});

test('Adzuna-estimated pay ranks below listed pay', () => {
  const base = { company: 'C', country: 'ca', currency: 'CAD', source: 'adzuna', salary_min: 90000, salary_max: 110000 };
  const rows = boardRowsFrom(
    [
      { ...base, id: 'est', title: 'Estimated Role', location: 'Toronto', salary_predicted: true },
      { ...base, id: 'listed', title: 'Listed Role', location: 'Vancouver' },
    ],
    { now: NOW, limit: 1, fill: [] },
  );
  assert.deepEqual(rows.map((r) => r.id), ['listed']);
});

test('pay that cannot be a year\'s pay (₹438, S$1.8K) ranks with roles that list none', () => {
  const rows = boardRowsFrom(
    [
      { id: 'hourly', title: 'Site Engineer', location: 'Bengaluru', country: 'in', currency: 'INR', source: 'adzuna', salary_min: 438 },
      { id: 'monthly', title: 'Developer', location: 'Singapore', country: 'sg', currency: 'SGD', source: 'adzuna', salary_min: 1300, salary_max: 1800 },
      { id: 'none', title: 'QA Engineer', location: 'Toronto', country: 'ca', source: 'adzuna' },
      { id: 'year', title: 'Data Engineer', location: 'Berlin', country: 'de', currency: 'EUR', source: 'adzuna', salary_min: 62000, salary_max: 75000 },
    ],
    { now: NOW, limit: 4, fill: [] },
  );
  assert.equal(rows[0].id, 'year');
  assert.equal(rows.find((r) => r.id === 'hourly').cells.pay, '₹438', 'the listed amount is still shown as listed');
});

test('among equals, fresh (NEW) roles come first', () => {
  const base = { company: 'C', currency: 'CAD', country: 'ca', source: 'adzuna', salary_min: 9e4, salary_max: 1e5 };
  const rows = boardRowsFrom(
    [
      { ...base, id: 'old', title: 'Old Role', location: 'Toronto', posted_at: '2026-09-01T00:00:00Z' },
      { ...base, id: 'fresh', title: 'Fresh Role', location: 'Vancouver', posted_at: '2026-10-14T06:00:00Z' },
    ],
    { now: NOW, limit: 1, fill: [] },
  );
  assert.deepEqual(rows.map((r) => r.id), ['fresh']);
});

test('a city the table does not know (a made-up code) only fills what known cities cannot', () => {
  const jobs = [
    { id: 'u1', title: 'Platform Engineer', location: 'Europe', source: 'arbeitnow' },
    { id: 'u2', title: 'Systems Engineer', location: 'Ryze Digital, Somewhere', source: 'arbeitnow' },
    { id: 'b1', title: 'Data Engineer', location: 'Berlin', source: 'arbeitnow' },
    { id: 'm1', title: 'Backend Engineer', location: 'Munich', source: 'arbeitnow' },
    { id: 'l1', title: 'Frontend Engineer', location: 'London', source: 'arbeitnow' },
    { id: 'l2', title: 'QA Engineer', location: 'Manchester', source: 'arbeitnow' },
  ];
  const four = boardRowsFrom(jobs, { now: NOW, limit: 4, fill: [] });
  assert.deepEqual(four.map((r) => r.id).sort(), ['b1', 'l1', 'l2', 'm1']);
  const six = boardRowsFrom(jobs, { now: NOW, limit: 6, fill: [] });
  assert.equal(six.length, 6, 'still used when nothing better is left');
});

test('remote roles are ANY / ANY GATE on UTC, and at most one city row per code', () => {
  const rows = boardRowsFrom(
    [
      { id: 'r1', title: 'Frontend Developer', location: 'Remote', remote: true, country: 'de', source: 'remotive' },
      { id: 'r2', title: 'Backend Developer', location: 'Worldwide', remote: true, country: 'us', source: 'remoteok' },
      { id: 'b1', title: 'Data Engineer', location: 'Berlin', source: 'arbeitnow', country: 'fr' },
      { id: 'b2', title: 'Platform Engineer', location: 'Berlin, Germany', source: 'arbeitnow', country: 'nl' },
    ],
    { now: NOW, fill: [] },
  );
  const any = rows.filter((r) => r.cells.code === 'ANY');
  assert.equal(any.length, 1, 'one ANY row (distinct codes)');
  assert.equal(any[0].cells.status, 'ANY GATE');
  assert.equal(any[0].cells.time, '12:40');
  assert.equal(any[0].tz, 'UTC');
  const berlin = rows.filter((r) => r.cells.code === 'BER');
  assert.equal(berlin.length, 1, 'one Berlin row');
  assert.equal(berlin[0].cells.time, '14:40', 'a placement country is never the job\'s clock: Berlin time');
  assert.equal(berlin[0].iso2, 'de');
});

test('too few real rows are topped up from the fill rows, keeping codes distinct and ≤ 2 per country', () => {
  const rows = boardRowsFrom(
    [
      { id: 'a', title: 'Software Engineer', location: 'Toronto', country: 'ca', currency: 'CAD', source: 'adzuna', salary_min: 1e5 },
      { id: 'b', title: 'Data Engineer', location: 'Vancouver', country: 'ca', currency: 'CAD', source: 'adzuna', salary_min: 9e4 },
    ],
    { now: NOW },
  );
  assert.equal(rows.length, 8);
  assert.deepEqual(rows.slice(0, 2).map((r) => r.id), ['a', 'b']);
  assert.ok(rows.slice(2).every((r) => r.fallback));
  assert.ok(!rows.slice(2).some((r) => r.cells.code === 'YYZ'), 'the sample Toronto row is skipped: its city is taken');
  assert.ok(Object.values(perCountry(rows)).every((n) => n <= 2), JSON.stringify(perCountry(rows)));
});

test('perCountry: a personal board can give the visitor\'s countries more rows', () => {
  const jobs = stubJobs().filter((j) => j.country === 'ca' || j.country === 'gb');
  const varied = boardRowsFrom(jobs, { now: NOW, fill: [] });
  assert.equal(varied.length, 4, 'two countries x two rows');
  const mine = boardRowsFrom(jobs, { now: NOW, fill: [], perCountry: 4 });
  assert.equal(mine.length, 8);
  assert.deepEqual(perCountry(mine), { ca: 4, gb: 4 });
});

test('a profile marks strong matches BOARDING (jobStatus)', () => {
  const profile = { skills: 'react, typescript, node', experience: '3-5', jobTypes: ['Software Engineering'] };
  const rows = boardRowsFrom(
    [{ id: 'm', title: 'React TypeScript Node Engineer', location: 'Toronto', country: 'ca', currency: 'CAD', source: 'adzuna', salary_min: 1e5, posted_at: '2026-09-01T00:00:00Z' }],
    { now: NOW, profile, fill: [] },
  );
  assert.equal(rows[0].cells.status, 'BOARDING');
});

test('odd jobs never break the board: long or non-Latin titles, unknown places, no dates', () => {
  const long = 'Senior Principal Staff Software Engineering Manager for Distributed Cloud Infrastructure '.repeat(3);
  const rows = boardRowsFrom(
    [
      { id: 1, title: long, location: 'Some Village', country: 'de', source: 'adzuna' },
      { id: 2, title: 'ソフトウェアエンジニア', location: '東京都 港区', country: 'jp', source: 'adzuna' },
      { id: 3, title: 'Werkstudent (m/w/d) Data', location: 'Ōsaka!!' },
      { id: 4, title: 'Engineer', location: null, posted_at: 'not a date' },
    ],
    { now: NOW, fill: [] },
  );
  assert.equal(rows.length, 4);
  for (const r of rows) {
    assert.match(r.cells.code, /^[A-Z]{3}$/);
    assert.ok(Array.from(r.cells.role).length <= 90, `${r.cells.role.length} chars`);
    assert.ok(['ON TIME', 'NEW', 'ANY GATE', 'BOARDING'].includes(r.cells.status));
  }
  assert.equal(rows.find((r) => r.id === '3').cells.role, 'Werkstudent Data', 'gender tags are dropped');
  assert.equal(rows.find((r) => r.id === '1').cells.code, 'BER', 'unknown town: the country\'s main city');
});

test('the founder row is exact', () => {
  assert.equal(FOUNDER_ROW.id, 'founder');
  assert.deepEqual(FOUNDER_ROW.cells, {
    time: 'NOW',
    code: 'DFW',
    role: 'GIL → EBB → DFW · FOUNDER, 16',
    pay: '',
    status: 'ARRIVED ✓',
  });
  assert.equal(`${FOUNDER_ROW.cells.role} · ${FOUNDER_ROW.cells.status}`, 'GIL → EBB → DFW · FOUNDER, 16 · ARRIVED ✓');
});

test('no board cell says "flight" or "fare"; such roles are left off the board', () => {
  const jobs = [
    ...stubJobs(),
    { id: 'f1', title: 'Flight Attendant', location: 'Dubai', source: 'adzuna', country: 'ae', salary_min: 5e4 },
    { id: 'f2', title: 'Welfare Officer', location: 'Leeds', source: 'adzuna', country: 'gb', currency: 'GBP', salary_min: 9e4 },
    { id: 'f3', title: 'Fares Analyst', location: 'Lisbon', source: 'arbeitnow' },
  ];
  const rows = boardRowsFrom(jobs, { now: NOW, limit: 30 });
  assert.ok(!rows.some((r) => ['f1', 'f2', 'f3'].includes(r.id)));
  for (const s of [...cellsOf(rows), ...cellsOf(FALLBACK_ROWS), ...Object.values(FOUNDER_ROW.cells)]) {
    assert.doesNotMatch(s, /flight|fare/i);
  }
});

// ── The night window: city lights at static positions from the city table ─────────────────────

test('every city light is a code from the city table, inside the window', () => {
  const known = new Set(CITY_ROWS.map((row) => row[2]));
  assert.ok(CITY_LIGHTS.length >= 100, `${CITY_LIGHTS.length} lights`);
  const seen = new Set();
  for (const [code, lng, lat] of CITY_LIGHTS) {
    assert.ok(known.has(code), `${code} is in the city table`);
    assert.ok(!seen.has(code), `${code} once`);
    seen.add(code);
    const [x, y] = nightPoint(lng, lat);
    assert.ok(x >= 0 && x <= NIGHT_VIEW.w && y >= 0 && y <= NIGHT_VIEW.h, `${code} at ${x},${y}`);
  }
});

test('nightLights gives one dot per light and a hub (main city) per country', () => {
  const { dots, hubs } = nightLights();
  assert.equal((dots.match(/M/g) || []).length, CITY_LIGHTS.length);
  assert.deepEqual(hubs.ca.slice(0, 1), ['YYZ']);
  assert.deepEqual(hubs.ae.slice(0, 1), ['DXB']);
  assert.deepEqual(hubs.pk.slice(0, 1), ['KHI']);
  for (const [iso2, [code, x, y]] of Object.entries(hubs)) {
    assert.match(iso2, /^[a-z]{2}$/);
    assert.match(code, /^[A-Z]{3}$/);
    assert.ok(Number.isFinite(x) && Number.isFinite(y));
  }
  // Toronto is left of Berlin, Berlin above Johannesburg.
  const [yyz] = [nightPoint(-79.4, 43.7)];
  const ber = nightPoint(13.4, 52.5);
  const jnb = nightPoint(28.0, -26.2);
  assert.ok(yyz[0] < ber[0] && ber[1] < jnb[1]);
});

// ── Beat 5: the board dims (opacity) and must stay readable ───────────────────────────────────

test('the dimmed rows of beat 5 still read >= 4.5:1 in every colour they use', async () => {
  const { readFileSync } = await import('node:fs');
  const read = (rel) => readFileSync(new URL(`../../../${rel}`, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const tokens = {};
  for (const css of [read('app/globals.css'), read('app/components/kit/kit.css')]) {
    for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-f]{6})\b/gi)) tokens[m[1]] ??= m[2];
  }
  const home = read('app/components/home/home.css');
  const rule = home.match(/\.fd \.fb-row\[data-tone='off'\]\s*\{\s*opacity:\s*([\d.]+)/);
  assert.ok(rule, 'the off rows are dimmed with opacity (the property the beat animates)');
  const alpha = Number(rule[1]);
  assert.ok(alpha < 1, `opacity ${alpha} dims`);

  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const over = (fg, bg) => fg.map((c, i) => alpha * c + (1 - alpha) * bg[i]); // the row, composited
  const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  const board = rgb(tokens['--hall-2']);
  // Text sits on a tile; its lightest part (--flap-hi) is the worst case.
  const tile = over(rgb(tokens['--flap-hi']), board);
  for (const name of ['--ink', '--sign', '--info', '--ok', '--new']) {
    const r = ratio(over(rgb(tokens[name]), board), tile);
    assert.ok(r >= 4.5, `${name} at opacity ${alpha}: ${r.toFixed(2)}:1`);
  }
});
