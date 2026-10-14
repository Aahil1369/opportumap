// City codes for the board: a job's location becomes an IATA-style 3-letter code from a static
// table (exact name/alias match on the city part), remote words become ANY, unknown cities fall
// back to the country's main city, then to the first three letters. codeSearch lets people type a
// code or the start of a city name; localTime gives the LOCAL column.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const lib = (p) => new URL(`../../../lib/${p}`, import.meta.url);
const { CITY_ROWS } = await import(lib('departures/cityCodes.data.js'));
const cityIndexModule = await import(lib('departures/cityCode.js'));
const { cityCode } = cityIndexModule;
const { codeSearch } = await import(lib('departures/codeSearch.js'));
const { localTime } = await import(lib('departures/localTime.js'));
const { ALL_COUNTRIES, ADZUNA_COUNTRIES } = await import(lib('jobsFeed.js'));

const CODE = /^[A-Z]{3}$/;

test('cityCode matches the city part of the location', () => {
  assert.deepEqual(cityCode('Toronto, Ontario', 'ca'), { code: 'YYZ', city: 'Toronto', matched: true });
  assert.equal(cityCode('Lahore, Punjab', 'pk').code, 'LHE');
  assert.equal(cityCode('Lahore, Punjab', 'pk').matched, true);
});

test('cityCode matches aliases, accents and case', () => {
  assert.equal(cityCode('Bangalore, Karnataka', 'in').code, 'BLR');
  assert.equal(cityCode('MÜNCHEN', 'de').code, 'MUC');
  assert.equal(cityCode('Manhattan, New York County', 'us').code, 'JFK');
  assert.equal(cityCode('Mississauga, Peel Region', 'ca').code, 'YYZ');
  assert.equal(cityCode('Wrocław', 'pl').code, 'WRO');
});

test('cityCode prefers the job\'s country when two cities share a name', () => {
  assert.equal(cityCode('London', 'gb').code, 'LHR');
  assert.equal(cityCode('London, Ontario', 'ca').code, 'YXU');
  assert.equal(cityCode('London').code, 'LHR');
  assert.equal(cityCode('Hyderabad, Sindh', 'pk').code, 'HDD');
  assert.equal(cityCode('Hyderabad, Telangana', 'in').code, 'HYD');
});

test('remote words become ANY', () => {
  assert.equal(cityCode('Remote').code, 'ANY');
  assert.equal(cityCode('Remote, US', 'us').code, 'ANY');
  assert.equal(cityCode('Anywhere').code, 'ANY');
  assert.equal(cityCode('Worldwide', 'gb').code, 'ANY');
});

test('an unknown city falls back to the country\'s main city, unmatched', () => {
  const r = cityCode('Some Village', 'de');
  assert.equal(r.code, 'BER');
  assert.equal(r.matched, false);
  assert.equal(r.city, null);
});

test('a country name in the location uses that country\'s main city', () => {
  assert.equal(cityCode('United States', 'ng').code, 'JFK');
  assert.equal(cityCode('USA').code, 'JFK');
  assert.equal(cityCode('Canada').code, 'YYZ');
});

test('odd input still gives exactly three capital letters', () => {
  assert.match(cityCode('Ōsaka!!').code, CODE);
  assert.match(cityCode('').code, CODE);
  assert.match(cityCode(null).code, CODE);
  assert.match(cityCode(undefined, 'zz').code, CODE);
  assert.match(cityCode('東京都 港区').code, CODE);
  assert.match(cityCode('Ныжний', 'xx').code, CODE);
  assert.match(cityCode('Q').code, CODE);
  assert.match(cityCode('x'.repeat(200) + ', Nowhere').code, CODE);
  assert.equal(cityCode('Qy').code, 'QYX');
});

test('codeSearch finds codes and cities by prefix or code', () => {
  const tor = codeSearch('tor');
  assert.ok(tor.codes.includes('YYZ'), tor.codes.join(','));
  assert.ok(tor.cities.includes('Toronto'));
  assert.ok(codeSearch('yyz').cities.includes('Toronto'));
  assert.ok(codeSearch('YYZ').codes.includes('YYZ'));
  assert.ok(codeSearch('  Tor ').codes.includes('YYZ'));
  assert.ok(codeSearch('york').codes.includes('JFK'));
  assert.ok(codeSearch('sf').codes.includes('SFO'));
});

test('codeSearch with nothing to search returns empty arrays', () => {
  assert.deepEqual(codeSearch(''), { codes: [], cities: [] });
  assert.deepEqual(codeSearch('   '), { codes: [], cities: [] });
  assert.deepEqual(codeSearch(undefined), { codes: [], cities: [] });
  assert.deepEqual(codeSearch('t'), { codes: [], cities: [] });
  assert.deepEqual(codeSearch('software engineer'), { codes: [], cities: [] });
});

test('localTime gives the country\'s main-city clock as HH:MM, 24 h', () => {
  const now = new Date('2026-10-14T12:40:00Z');
  assert.equal(localTime('gb', now), '13:40');
  assert.equal(localTime('ca', now), '08:40');
  assert.equal(localTime('in', now), '18:10');
  assert.equal(localTime('jp', now), '21:40');
  assert.equal(localTime('zz', now), '12:40');
  assert.equal(localTime(undefined, now), '12:40');
  assert.equal(localTime('us', new Date('2026-10-14T04:05:00Z')), '00:05');
  assert.match(localTime('de'), /^\d{2}:\d{2}$/);
});

test('localTime can use a city code\'s own clock', () => {
  const now = new Date('2026-10-14T12:40:00Z');
  assert.equal(localTime('ca', now, 'YVR'), '05:40');
  assert.equal(localTime('ca', now, 'ANY'), '08:40');
});

test('the city table is well formed', () => {
  assert.ok(CITY_ROWS.length >= 380 && CITY_ROWS.length <= 450, `${CITY_ROWS.length} rows`);
  for (const row of CITY_ROWS) {
    const [name, aliases, iata, iso2, tz] = row;
    assert.equal(row.length, 5, name);
    assert.ok(typeof name === 'string' && name.length > 1, String(name));
    assert.ok(Array.isArray(aliases), name);
    assert.match(iata, CODE, name);
    assert.match(iso2, /^[a-z]{2}$/, name);
    assert.match(tz, /^[A-Z][A-Za-z_]+\/[A-Za-z_/]+$/, `${name}: ${tz}`);
    // a real IANA zone: the formatter accepts it and does not quietly turn it into UTC
    const resolved = new Intl.DateTimeFormat('en-GB', { timeZone: tz }).resolvedOptions().timeZone;
    assert.notEqual(resolved, 'UTC', `${name}: ${tz}`);
  }
});

test('within a country, a name or alias points at one city', () => {
  const { normPlace } = cityIndexModule;
  const owner = new Map();
  for (const [name, aliases, , iso2] of CITY_ROWS) {
    for (const text of [name, ...aliases]) {
      const key = `${normPlace(text)}|${iso2}`;
      assert.ok(normPlace(text), `${name}: empty alias`);
      assert.ok(!owner.has(key), `${key}: ${owner.get(key)} and ${name}`);
      owner.set(key, name);
    }
  }
});

test('every country the feeds use has a main city', () => {
  const countries = new Set(CITY_ROWS.map((r) => r[3]));
  for (const c of [...ALL_COUNTRIES, ...ADZUNA_COUNTRIES]) {
    assert.ok(countries.has(c), `no city for ${c}`);
    const r = cityCode('Nowhere Special', c);
    assert.match(r.code, CODE);
    assert.equal(r.matched, false);
  }
});
