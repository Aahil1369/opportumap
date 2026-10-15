// /jobs fix round 1: the PAY column holds every pay localPay writes, listed or estimated.
//
// PAY_TILES (lib/departures/jobRows.js) is the column's tile count; FlapText cuts longer text
// with "…" (fitFlap). It must hold the longest realistic yearly range in every currency the feeds
// and the salary model use ("CHF 120K–150K" and "SEK 450K–550K" are 13). An estimate is the same
// text as listed pay (no "~" tile): payCell marks it, and the row shows it in amber, underlined.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');

const { PAY_TILES, STATUS_TILES, payCell, jobRow } = await import(new URL('../../../lib/departures/jobRows.js', import.meta.url));
const { localPay, CURRENCY_BY_COUNTRY } = await import(new URL('../../../lib/departures/pay.js', import.meta.url));
const { fitFlap } = await import(new URL('../../../lib/departures/flap.js', import.meta.url));

const len = (s) => Array.from(s).length;

// Every currency a row can show: Adzuna's countries', USD/JPY, an ISO code localPay has no symbol
// for (the salary model can answer in one), and no currency at all.
const CURRENCIES = [...new Set([...Object.values(CURRENCY_BY_COUNTRY), 'USD', 'JPY', 'SEK', 'AED', null])];

// Yearly amounts at the widest each currency writes them: 4-character thousands ("999K", "9.5K"
// never: under 10K is not yearly pay), millions for JPY/KRW-sized currencies, and INR in lakhs up
// to 99.5L, then crore.
const YEARLY = [10_000, 12_500, 99_500, 120_000, 150_000, 455_000, 999_000];
const BIG = [1_250_000, 4_500_000, 9_500_000, 12_000_000, 45_000_000, 120_000_000];
const LAKH = [100_000, 1_250_000, 1_850_000, 9_950_000, 12_500_000, 95_000_000];

function amounts(currency) {
  if (currency === 'INR') return LAKH;
  if (currency === 'JPY') return BIG;
  return YEARLY;
}

test('PAY_TILES holds every currency\'s widest yearly range (no "…" in the pay column)', () => {
  assert.ok(Number.isInteger(PAY_TILES) && PAY_TILES > 0, `PAY_TILES is ${PAY_TILES}`);
  const misses = [];
  for (const currency of CURRENCIES) {
    const xs = amounts(currency);
    for (const lo of xs) {
      for (const hi of xs) {
        if (hi < lo) continue;
        const pay = localPay({ salary_min: lo, salary_max: hi, currency });
        if (len(pay) > PAY_TILES || fitFlap(pay, PAY_TILES).includes('…')) misses.push(`${currency}: ${pay} (${len(pay)})`);
      }
    }
  }
  assert.deepEqual(misses, []);
});

test('the pays the review found cut now fit whole', () => {
  for (const pay of ['CHF 120K–150K', 'NZ$125K–155K', 'MX$450K–800K', '180K–260K zł', '₹12.5L–18.5L', 'SEK 450K–550K']) {
    assert.ok(len(pay) <= PAY_TILES, pay);
    assert.equal(fitFlap(pay, PAY_TILES).trimEnd(), pay);
  }
  assert.equal(localPay({ salary_min: 120000, salary_max: 150000, currency: 'CHF' }), 'CHF 120K–150K');
});

test('PAY_TILES stays as narrow as it can be: 13 tiles', () => {
  assert.equal(PAY_TILES, 13);
  assert.equal(STATUS_TILES, 8);
});

test('payCell: listed pay as it is; an estimate is the same text, marked, never with a "~" tile', () => {
  assert.deepEqual(payCell('C$88K–102K', null), { text: 'C$88K–102K', estimate: false });
  assert.deepEqual(payCell(null, 'NZ$125K–155K'), { text: 'NZ$125K–155K', estimate: true });
  assert.deepEqual(payCell('C$88K–102K', 'C$70K–90K'), { text: 'C$88K–102K', estimate: false }, 'listed pay wins');
  assert.deepEqual(payCell(null, null), { text: null, estimate: false });
  const row = jobRow({ id: 'a', title: 'Engineer', country: 'ch', salary_min: 120000, salary_max: 150000, currency: 'CHF', source: 'adzuna' });
  assert.equal(payCell(row.pay, null).text, 'CHF 120K–150K');
});

test('the row uses PAY_TILES and payCell, with no "~" prefix', () => {
  const src = read('app/components/jobs/JobRow.js');
  assert.match(src, /import \{[^}]*\bPAY_TILES\b[^}]*\} from '[./]+lib\/departures\/jobRows'/);
  assert.match(src, /payCell\(/);
  assert.doesNotMatch(src, /`~\$\{/, 'no "~" tile in front of an estimate');
  assert.doesNotMatch(src, /export const PAY_TILES/, 'one PAY_TILES, in lib/departures/jobRows.js');
});

test('jobs.css sizes the pay and status columns from the same tile counts', () => {
  const css = read('app/components/jobs/jobs.css');
  const pay = /--pay-w:\s*calc\((\d+)\s*\*/.exec(css);
  const status = /--status-w:\s*calc\((\d+)\s*\*/.exec(css);
  assert.ok(pay && status, 'both column widths are set');
  assert.equal(Number(pay[1]), PAY_TILES);
  assert.equal(Number(status[1]), STATUS_TILES);
  assert.match(css, /\.jr-pay\[data-est\]/, 'an estimate has its own look');
});

test('the footnote explains the estimate by its look, not by a "~"', () => {
  const src = read('app/components/jobs/JobsBoard.js');
  assert.doesNotMatch(src, /marked ~/);
  assert.match(src, /Pay in amber/);
});
