// Pay on the board is shown in the job's own currency (the old feed put "$" on everything).
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { CURRENCY_BY_COUNTRY, localPay } = await import(
  new URL('../../../lib/departures/pay.js', import.meta.url)
);

test('CURRENCY_BY_COUNTRY covers the Adzuna countries', () => {
  assert.deepEqual(CURRENCY_BY_COUNTRY, {
    gb: 'GBP', us: 'USD', ca: 'CAD', au: 'AUD',
    de: 'EUR', fr: 'EUR', nl: 'EUR', at: 'EUR', be: 'EUR', es: 'EUR', it: 'EUR',
    in: 'INR', nz: 'NZD', pl: 'PLN', sg: 'SGD', za: 'ZAR', br: 'BRL', ch: 'CHF', mx: 'MXN',
  });
});

test('a numeric range becomes a compact range in the local currency', () => {
  assert.equal(localPay({ salary_min: 88000, salary_max: 102000, currency: 'CAD' }), 'C$88K–102K');
  assert.equal(localPay({ salary_min: 62000, salary_max: 75000, currency: 'EUR' }), '€62K–75K');
  assert.equal(localPay({ salary_min: 150000, salary_max: 175000, currency: 'AUD' }), 'A$150K–175K');
  assert.equal(localPay({ salary_min: 650000, salary_max: 780000, currency: 'ZAR' }), 'R650K–780K');
  assert.equal(localPay({ salary_min: 120000, salary_max: 140000, currency: 'CHF' }), 'CHF 120K–140K');
});

test('one value gives a single amount', () => {
  assert.equal(localPay({ salary_min: 45000, currency: 'GBP' }), '£45K');
  assert.equal(localPay({ salary_max: 88000, currency: 'CAD' }), 'C$88K');
  assert.equal(localPay({ salary_min: 88000, salary_max: 88000, currency: 'CAD' }), 'C$88K');
});

test('nothing usable reads "Pay not listed"', () => {
  assert.equal(localPay({}), 'Pay not listed');
  assert.equal(localPay(null), 'Pay not listed');
  assert.equal(localPay({ salary: 'Salary not listed' }), 'Pay not listed');
  assert.equal(localPay({ salary_min: 0, salary_max: 0, currency: 'USD' }), 'Pay not listed');
  assert.equal(localPay({ salary_min: NaN, salary_max: 'abc', currency: 'USD' }), 'Pay not listed');
  assert.equal(localPay({ salary_min: -5, currency: 'USD' }), 'Pay not listed');
});

test('$ alone means USD; other dollars carry their prefix', () => {
  assert.ok(localPay({ salary_min: 120000, salary_max: 145000, currency: 'USD' }).startsWith('$'));
  for (const currency of ['CAD', 'AUD', 'NZD', 'SGD', 'MXN']) {
    const s = localPay({ salary_min: 88000, salary_max: 102000, currency });
    assert.ok(!s.startsWith('$'), `${currency}: ${s}`);
  }
  assert.ok(localPay({ salary_min: 70000, currency: 'NZD' }).startsWith('NZ$'));
  assert.ok(localPay({ salary_min: 70000, currency: 'SGD' }).startsWith('S$'));
  assert.ok(localPay({ salary_min: 400000, currency: 'MXN' }).startsWith('MX$'));
  assert.ok(localPay({ salary_min: 90000, currency: 'BRL' }).startsWith('R$'));
});

test('the currency comes from the country when the job has none', () => {
  assert.equal(localPay({ salary_min: 88000, salary_max: 102000, country: 'ca' }), 'C$88K–102K');
  assert.equal(localPay({ salary_min: 45000, country: 'gb' }), '£45K');
  // A remote job's country is only where the map scatters it, so it says nothing about currency.
  assert.equal(localPay({ salary_min: 45000, country: 'gb', remote: true }), '45K');
});

test('INR reads in lakhs, PLN puts zł after the amount, others use the ISO code', () => {
  assert.equal(localPay({ salary_min: 1800000, salary_max: 2600000, currency: 'INR' }), '₹18L–26L');
  assert.equal(localPay({ salary_min: 1250000, currency: 'INR' }), '₹12.5L');
  assert.equal(localPay({ salary_min: 15000000, currency: 'INR' }), '₹1.5Cr');
  assert.equal(localPay({ salary_min: 12000, salary_max: 15000, currency: 'PLN' }), '12K–15K zł');
  assert.equal(localPay({ salary_min: 45000, currency: 'SEK' }), 'SEK 45K');
});

test('amounts are compact and rounded', () => {
  assert.equal(localPay({ salary_min: 88412.5, salary_max: 101990, currency: 'CAD' }), 'C$88K–102K');
  assert.equal(localPay({ salary_min: 3500, currency: 'USD' }), '$3.5K');
  assert.equal(localPay({ salary_min: 25, salary_max: 35, currency: 'USD' }), '$25–35');
  assert.equal(localPay({ salary_min: 999600, currency: 'USD' }), '$1M');
  assert.equal(localPay({ salary_min: 7000000, salary_max: 9500000, currency: 'JPY' }), '¥7M–9.5M');
  assert.equal(localPay({ salary_min: '88000', salary_max: '102000', currency: 'CAD' }), 'C$88K–102K');
  assert.equal(localPay({ salary_min: 102000, salary_max: 88000, currency: 'CAD' }), 'C$88K–102K');
});
