// routeChip(profile): the 'LHE → YYZ' chip a crew badge and the lounge show next to a name.
// From where the member is now (currentCountry, a city or a country, else their nationality)
// to the first preferred country that is somewhere else, each end a code from the city table
// (a country alone gives its main city, cityCode's country fallback). null when either end
// is unknown, so nothing ever shows a made-up code.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { routeChip, routeEnds } = await import(new URL('../../../lib/departures/routeChip.js', import.meta.url));

test('a city to a preferred country: the city code, then the country\'s main city', () => {
  assert.equal(routeChip({ currentCountry: 'Lahore, Pakistan', preferredCountries: ['ca'] }), 'LHE → YYZ');
  assert.equal(routeChip({ currentCountry: 'Lahore', preferredCountries: ['ca'] }), 'LHE → YYZ');
  assert.equal(routeChip({ currentCountry: 'Gilgit', preferredCountries: ['ug'] }), 'GIL → EBB');
});

test('a country name for where they live gives its main city', () => {
  assert.equal(routeChip({ currentCountry: 'Pakistan', preferredCountries: ['ca'] }), 'KHI → YYZ');
  assert.equal(routeChip({ currentCountry: 'United States', preferredCountries: ['gb'] }), 'JFK → LHR');
  assert.equal(routeChip({ currentCountry: 'USA', preferredCountries: ['de'] }), 'JFK → BER');
  assert.equal(routeChip({ currentCountry: 'uganda', preferredCountries: ['us'] }), 'EBB → JFK');
});

test('no current country: the nationality (an iso2 code) is the origin, via the country fallback', () => {
  assert.equal(routeChip({ nationality: 'pk', preferredCountries: ['ca'] }), 'KHI → YYZ');
  assert.equal(routeChip({ nationality: 'PK', currentCountry: '  ', preferredCountries: ['ca'] }), 'KHI → YYZ');
});

test('where they live wins over their nationality', () => {
  assert.equal(routeChip({ nationality: 'pk', currentCountry: 'Uganda', preferredCountries: ['us'] }), 'EBB → JFK');
});

test('a current country the table cannot place falls back to the nationality, never to three letters', () => {
  assert.equal(routeChip({ nationality: 'pk', currentCountry: 'Narnia', preferredCountries: ['gb'] }), 'KHI → LHR');
  assert.equal(routeChip({ currentCountry: 'Narnia', preferredCountries: ['gb'] }), null);
  // "Madagascar" is a real country the table has no city for: never Madrid's MAD.
  assert.equal(routeChip({ currentCountry: 'Madagascar', preferredCountries: ['gb'] }), null);
  // Remote is not a place to start from.
  assert.equal(routeChip({ nationality: 'in', currentCountry: 'Remote', preferredCountries: ['gb'] }), 'BLR → LHR');
});

test('a two-letter country code typed as the current country is read as that country', () => {
  assert.equal(routeChip({ currentCountry: 'pk', preferredCountries: ['ca'] }), 'KHI → YYZ');
  // A city alias still wins: "NY" is New York.
  assert.equal(routeChip({ currentCountry: 'NY', preferredCountries: ['ca'] }), 'JFK → YYZ');
});

test('the destination skips their own country and countries the table does not know', () => {
  assert.equal(routeChip({ currentCountry: 'Canada', preferredCountries: ['ca', 'gb'] }), 'YYZ → LHR');
  assert.equal(routeChip({ currentCountry: 'Vancouver', preferredCountries: ['ca', 'us'] }), 'YVR → JFK');
  assert.equal(routeChip({ nationality: 'pk', preferredCountries: ['zz', 'other', ' AE '] }), 'KHI → DXB');
});

test('null when there is no route to show', () => {
  assert.equal(routeChip(null), null);
  assert.equal(routeChip(undefined), null);
  assert.equal(routeChip('pk'), null);
  assert.equal(routeChip({}), null);
  assert.equal(routeChip({ nationality: 'pk' }), null, 'no destination');
  assert.equal(routeChip({ nationality: 'pk', preferredCountries: [] }), null, 'no destination');
  assert.equal(routeChip({ preferredCountries: ['ca'] }), null, 'no origin');
  assert.equal(routeChip({ nationality: 'other', preferredCountries: ['ca'] }), null, '"other" is not a country');
  assert.equal(routeChip({ currentCountry: 'Toronto', preferredCountries: ['ca'] }), null, 'only their own country');
  assert.equal(routeChip({ nationality: 'pk', preferredCountries: 'ca' }), null, 'preferredCountries must be a list');
  assert.equal(routeChip({ nationality: 42, currentCountry: {}, preferredCountries: [null, 7] }), null);
});

test('the chip is always CODE → CODE, two three-letter codes', () => {
  const chip = routeChip({ currentCountry: 'Lahore', preferredCountries: ['ca'] });
  assert.match(chip, /^[A-Z]{3} → [A-Z]{3}$/);
});

test('routeEnds gives the two codes (for a split-flap or screen-reader text)', () => {
  assert.deepEqual(routeEnds({ currentCountry: 'Lahore', preferredCountries: ['ca'] }), { from: 'LHE', to: 'YYZ' });
  assert.equal(routeEnds({ nationality: 'pk' }), null);
});

test('routeChip never mutates the profile', () => {
  const p = Object.freeze({ currentCountry: 'Lahore', nationality: 'pk', preferredCountries: Object.freeze(['ca']) });
  assert.equal(routeChip(p), 'LHE → YYZ');
});
