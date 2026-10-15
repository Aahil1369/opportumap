// The homepage boards (wave 1 review I2 + I3).
//
// I2: the homepage PAY column was 11 tiles while localPay writes up to 13 characters, so
// "₹12.5L–18.5L" read "₹12.5L–18.…" and beat 2's 23-tile plate cut its honest label
// ("₹12.5L–18.5L · PREDICT…"). Both widths now come from lib/departures/homeBoard.js and hold
// every pay in every currency whole.
//
// I3: beats 2 and 5 showed LOCAL as the page was built (ISR), the hero board the visitor's clock.
// All three now re-time their rows through the same retime(row, now).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const lib = (rel) => import(new URL(`../../../lib/departures/${rel}`, import.meta.url));

const { LAYOUT, FOUNDER_LAYOUT, PLATE_TILES, PREDICTED, plateText, clockIn, retime, withLayout } = await lib('homeBoard.js');
const { localPay, PAY_WIDTH, CURRENCY_BY_COUNTRY } = await lib('pay.js');
const { fitFlap } = await lib('flap.js');
const { BOARD_COLUMNS, FALLBACK_ROWS, FOUNDER_ROW, boardRowsFrom } = await lib('board.js');
const { localTime } = await lib('localTime.js');
const { PAY_TILES } = await lib('jobRows.js');

const len = (s) => Array.from(s).length;
const whole = (text, width) => len(text) <= width && !fitFlap(text, width).includes('…') && fitFlap(text, width).trimEnd() === text;

// Every currency a row can show: Adzuna's countries', USD/JPY, ISO codes localPay has no symbol
// for (the salary model can answer in one), and none at all. Yearly amounts at the widest each
// currency writes them (as jobsPay.test.mjs sweeps /jobs).
const CURRENCIES = [...new Set([...Object.values(CURRENCY_BY_COUNTRY), 'USD', 'JPY', 'SEK', 'AED', null])];
const YEARLY = [10_000, 12_500, 99_500, 120_000, 150_000, 455_000, 999_000];
// Senior roles in SEK, MXN, ZAR or CHF can pass a million a year ("CHF 120K–1.5M" is 13 too).
const MILLIONS = [999_500, 1_250_000, 1_500_000, 9_500_000];
const BIG = [1_250_000, 4_500_000, 9_500_000, 12_000_000, 45_000_000, 120_000_000];
const LAKH = [100_000, 1_250_000, 1_850_000, 9_950_000, 12_500_000, 95_000_000];
const amounts = (c) => (c === 'INR' ? LAKH : c === 'JPY' ? BIG : [...YEARLY, ...MILLIONS]);

function everyPay() {
  const out = [];
  for (const currency of CURRENCIES) {
    const xs = amounts(currency);
    for (const lo of xs) for (const hi of xs) if (hi >= lo) out.push(localPay({ salary_min: lo, salary_max: hi, currency }));
  }
  return [...new Set(out)];
}

// The pays the review found cut, on the default board (in) and on personal boards (ch, nz, mx, pl).
const REVIEW_PAYS = ['₹12.5L–18.5L', '₹1.2Cr–1.5Cr', 'CHF 120K–150K', 'NZ$125K–155K', 'MX$450K–800K', '180K–260K zł'];

// ── I2: the PAY column ────────────────────────────────────────────────────────────────────────

test('the homepage PAY column is PAY_WIDTH (13) tiles, the same as /jobs', () => {
  assert.equal(PAY_WIDTH, 13);
  assert.equal(LAYOUT.pay.width, PAY_WIDTH);
  assert.equal(PAY_TILES, PAY_WIDTH, '/jobs uses the same width');
  assert.equal(LAYOUT.pay.line, 2, 'phones still fold PAY under ROLE');
});

test('every currency\'s widest yearly range fits the homepage PAY column whole', () => {
  const pays = everyPay();
  assert.ok(pays.length > 150, `swept ${pays.length} pays`);
  assert.ok(pays.includes('CHF 120K–1.5M') && pays.includes('SEK 999K–9.5M'), 'million-plus ranges are in the sweep');
  const misses = pays.filter((pay) => !whole(pay, LAYOUT.pay.width)).map((pay) => `${pay} (${len(pay)})`);
  assert.deepEqual(misses, []);
});

test('the pays the review found cut now fit the PAY column whole', () => {
  for (const pay of REVIEW_PAYS) assert.ok(whole(pay, LAYOUT.pay.width), pay);
  assert.equal(localPay({ salary_min: 1_250_000, salary_max: 1_850_000, country: 'in' }), '₹12.5L–18.5L');
  assert.equal(fitFlap('₹12.5L–18.5L', 11), '₹12.5L–18.…', 'the old 11-tile column cut it');
});

test('board rows built from live-shaped jobs fit the PAY column whole (in, ch, nz, mx, pl)', () => {
  const NOW = new Date('2026-10-14T12:40:00Z');
  const jobs = [
    { id: 'in1', title: 'Data Scientist', location: 'Bangalore, Karnataka', country: 'in', source: 'adzuna', salary_min: 1_250_000, salary_max: 1_850_000 },
    { id: 'ch1', title: 'Backend Engineer', location: 'Zürich', country: 'ch', source: 'adzuna', salary_min: 120_000, salary_max: 150_000 },
    { id: 'nz1', title: 'Cloud Engineer', location: 'Auckland', country: 'nz', source: 'adzuna', salary_min: 125_000, salary_max: 155_000 },
    { id: 'mx1', title: 'Software Engineer', location: 'Mexico City', country: 'mx', source: 'adzuna', salary_min: 450_000, salary_max: 800_000 },
    { id: 'pl1', title: 'DevOps Engineer', location: 'Warsaw', country: 'pl', source: 'adzuna', salary_min: 180_000, salary_max: 260_000 },
  ];
  const rows = boardRowsFrom(jobs, { now: NOW, fill: [] });
  assert.equal(rows.length, jobs.length);
  for (const row of rows) assert.ok(whole(row.cells.pay, LAYOUT.pay.width), `${row.id}: ${row.cells.pay}`);
  for (const row of FALLBACK_ROWS) assert.ok(whole(row.cells.pay, LAYOUT.pay.width), `${row.id}: ${row.cells.pay}`);
});

// ── I2: beat 2's plate ────────────────────────────────────────────────────────────────────────

test('beat 2\'s plate holds the widest pay and its whole PREDICTED label (25 tiles)', () => {
  assert.equal(PREDICTED, ' · PREDICTED');
  assert.equal(PLATE_TILES, PAY_WIDTH + len(PREDICTED));
  assert.ok(PLATE_TILES >= 25, `PLATE_TILES is ${PLATE_TILES}`);
  assert.equal(plateText('CHF 120K–150K'), 'CHF 120K–150K · PREDICTED');
  const misses = [];
  for (const pay of [...everyPay(), ...REVIEW_PAYS]) {
    const plate = plateText(pay);
    if (!whole(plate, PLATE_TILES) || !fitFlap(plate, PLATE_TILES).trimEnd().endsWith('PREDICTED')) misses.push(plate);
  }
  assert.deepEqual(misses, []);
  assert.equal(fitFlap(plateText('₹12.5L–18.5L'), 23), '₹12.5L–18.5L · PREDICT…', 'the old 23-tile plate cut the label');
});

test('home.css sizes the plate from PLATE_TILES (0.6em + 2.5px a tile, 1px apart)', () => {
  const css = read('app/components/home/home.css');
  const rule = /\.pb-pay\s*\{[^}]*font-size:\s*min\(\s*\d+px,\s*\(100cqi - (\d+)px\)\s*\/\s*([\d.]+)\s*\)/.exec(css);
  assert.ok(rule, '.pb-pay font-size formula');
  const [, px, em] = rule.map(Number);
  assert.equal(em, Math.round(0.6 * PLATE_TILES * 1000) / 1000, `divisor ${em} is 0.6 × ${PLATE_TILES}`);
  assert.ok(px >= 2.5 * PLATE_TILES + (PLATE_TILES - 1), `${px}px covers the tile padding and gaps`);
});

test('HomeBoard takes its widths and the plate text from lib/departures/homeBoard.js', () => {
  const src = read('app/components/home/HomeBoard.js');
  assert.match(src, /import \{[^}]*\bLAYOUT\b[^}]*\bPLATE_TILES\b[^}]*\} from '[./]+lib\/departures\/homeBoard'/);
  assert.doesNotMatch(src, /const (?:LAYOUT|FOUNDER_LAYOUT|PAY_TILES)\s*=/, 'no second copy of the widths');
  assert.doesNotMatch(src, /width:\s*11\b/, 'no 11-tile PAY column');
  assert.match(src, /plateText\(predicted\)/);
  assert.match(src, /width=\{PLATE_TILES\}/);
  assert.doesNotMatch(src, /· PREDICTED`/, 'the label is built in one place');
});

test('the boards\' tile lines: 48 on desktop; phones 27 + 29 (FlapBoard fits the wider)', () => {
  const cols = withLayout(BOARD_COLUMNS, LAYOUT);
  const sum = (keys) => keys.reduce((s, k) => s + LAYOUT[k].width, 0);
  assert.equal(cols.reduce((s, c) => s + c.width, 0), 48);
  assert.equal(sum(['time', 'code', 'role']), 27);
  assert.equal(sum(['time', 'code', 'pay', 'status']), 29);
  assert.deepEqual(withLayout(BOARD_COLUMNS, FOUNDER_LAYOUT).map((c) => c.key), ['time', 'code', 'role', 'status']);
  assert.ok(len(FOUNDER_ROW.cells.role) <= FOUNDER_LAYOUT.role.width, 'the founder route is whole');
});

// ── I3: LOCAL on the visitor's clock, on every board ──────────────────────────────────────────

const LATER = new Date('2026-10-15T03:05:00Z'); // hours after the 12:40 UTC sample clocks

test('retime puts a row\'s LOCAL on `now` in its own zone (the sample rows too)', () => {
  const at = (id) => retime(FALLBACK_ROWS.find((r) => r.id === id), LATER).cells.time;
  assert.equal(at('sample-1'), '23:05', 'Toronto');
  assert.equal(at('sample-2'), '05:05', 'Berlin');
  assert.equal(at('sample-3'), '08:35', 'Bengaluru');
  assert.equal(at('sample-4'), '04:05', 'London');
  assert.equal(at('sample-6'), '03:05', 'ANY reads UTC');
  assert.equal(at('sample-7'), '14:05', 'Sydney');
  for (const row of FALLBACK_ROWS) assert.equal(retime(row, LATER).cells.time, clockIn(row.tz, LATER), row.id);
});

test('retime leaves a row alone without a clock or a zone (server render, the founder\'s NOW)', () => {
  const row = FALLBACK_ROWS[0];
  assert.equal(retime(row, null), row, 'hydration: the server\'s text');
  assert.equal(retime(FOUNDER_ROW, LATER), FOUNDER_ROW);
  assert.equal(retime(FOUNDER_ROW, LATER).cells.time, 'NOW');
  assert.equal(retime({ ...row, tz: 'Not/AZone' }, LATER).cells.time, row.cells.time, 'an unknown zone keeps the server text');
  assert.equal(clockIn('Asia/Kolkata', new Date('nope')), null);
  assert.notEqual(retime(row, LATER), row, 'a new row object when the time moves');
  assert.equal(row.cells.time, '08:40', 'the input row is not changed');
});

test('retime agrees with the server\'s LOCAL for live rows (same zone, later clock)', () => {
  const NOW = new Date('2026-10-14T12:40:00Z');
  const jobs = [
    { id: 'a', title: 'Software Engineer', location: 'Vancouver, British Columbia', country: 'ca', source: 'adzuna', salary_min: 90000, salary_max: 110000 },
    { id: 'b', title: 'Data Engineer', location: 'Munich', country: 'de', source: 'adzuna', salary_min: 60000, salary_max: 80000 },
    { id: 'c', title: 'ML Engineer', location: 'Remote', source: 'remotive' },
    { id: 'd', title: 'Platform Engineer', location: 'Perth', country: 'au', source: 'adzuna', salary_min: 130000, salary_max: 150000 },
  ];
  const rows = boardRowsFrom(jobs, { now: NOW, fill: [] });
  assert.equal(rows.length, jobs.length);
  for (const row of rows) {
    assert.equal(retime(row, NOW).cells.time, row.cells.time, `${row.id}: the server's own clock`);
    const code = row.cells.code === 'ANY' ? undefined : row.cells.code;
    assert.equal(retime(row, LATER).cells.time, localTime(row.iso2, LATER, code), `${row.id}: re-timed in the same zone`);
  }
});

test('beats 2 and 5 run their rows through the board\'s clock, like the hero board', () => {
  const src = read('app/components/home/HomeBoard.js');
  const body = (name) => {
    const start = src.indexOf(`function ${name}(`);
    assert.ok(start >= 0, `${name} exists`);
    const next = src.indexOf('\nexport ', start + 1);
    return src.slice(start, next < 0 ? undefined : next);
  };
  assert.match(src, /function useBoardClock\(ref\)/);
  assert.match(src, /IntersectionObserver/, 'the clock pauses off screen');
  for (const name of ['HomeBoard', 'PredictionBeat', 'FounderBeat']) {
    const b = body(name);
    assert.match(b, /useBoardClock\(ref\)/, `${name} uses the board clock`);
  }
  assert.match(body('HomeBoard'), /slotted\(rows, now\)/);
  assert.match(body('PredictionBeat'), /retime\(row, now\)/);
  assert.doesNotMatch(body('PredictionBeat'), /text=\{row\.cells\.time\}/, 'beat 2 does not show the server time');
  assert.match(body('FounderBeat'), /retime\(row, now\)\.cells/);
  assert.doesNotMatch(body('FounderBeat'), /cells: row\.cells\b/, 'beat 5 does not show the server time');
  assert.doesNotMatch(src, /function clockIn\(/, 'one clockIn, in lib/departures/homeBoard.js');
});

test('the homepage boards module stays light (no city table on the homepage\'s first load)', () => {
  const src = read('lib/departures/homeBoard.js');
  const imports = [...src.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1]);
  assert.deepEqual(imports, ['./pay.js']);
  assert.doesNotMatch(read('lib/departures/pay.js'), /^import /m);
});
