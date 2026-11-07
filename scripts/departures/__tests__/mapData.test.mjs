// /map, the control tower (plan Task 7). lib/departures/mapData.js turns a search's roles into the
// map's clustered beacons (a GeoJSON FeatureCollection) and a country's ARRIVALS mini-board (rows
// from boardRowsFrom), plus the small helpers the tower needs (the country list behind "Arrivals
// by country", a cluster's leading country, the box to fit a country into). Then source guards
// over the tower's files: clustered layer without number labels, popups from DOM nodes only,
// Mapbox loaded lazily, pixel ratio capped at 2, Lenis off, no hydration-unsafe storage reads,
// no "flight"/"fare" or job totals in its copy, CSS on transform/opacity and svh/dvh only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as espree from 'espree';

const {
  ARRIVALS_COLUMNS,
  arrivalCountries,
  boundsOf,
  countryArrivals,
  jobsToGeoJSON,
  leadingCountry,
} = await import(new URL('../../../lib/departures/mapData.js', import.meta.url));

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const show = (abs) => relative(ROOT, abs).split(sep).join('/');
const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

const NOW = new Date('2026-10-15T12:00:00Z');

let seq = 0;
function job(over = {}) {
  seq += 1;
  return {
    id: `adzuna_${seq}`,
    title: 'Software Engineer',
    company: 'Shopify',
    location: 'Toronto, Ontario',
    country: 'ca',
    currency: 'CAD',
    source: 'adzuna',
    remote: false,
    salary_min: 88000,
    salary_max: 102000,
    lng: -79.38,
    lat: 43.65,
    posted_at: '2026-09-01T08:00:00Z',
    ...over,
  };
}

// ── jobsToGeoJSON ───────────────────────────────────────────────────────────────────────────

test('jobsToGeoJSON: one Point feature per role, [lng, lat], with the beacon properties', () => {
  const fc = jobsToGeoJSON([job({ id: 'adzuna_1', lng: -79.38, lat: 43.65 })], { now: NOW });
  assert.equal(fc.type, 'FeatureCollection');
  assert.equal(fc.features.length, 1);
  const [f] = fc.features;
  assert.equal(f.type, 'Feature');
  assert.deepEqual(f.geometry, { type: 'Point', coordinates: [-79.38, 43.65] });
  assert.deepEqual(f.properties, {
    id: 'adzuna_1',
    code: 'YYZ',
    iso2: 'ca',
    title: 'Software Engineer',
    company: 'Shopify',
    payText: 'C$88K–102K',
    status: 'ON TIME',
  });
});

test('jobsToGeoJSON: NaN, missing, null, empty, non-numeric and out-of-range coordinates are dropped', () => {
  const bad = [
    job({ lng: NaN }),
    job({ lat: NaN }),
    job({ lng: undefined }),
    job({ lat: undefined }),
    job({ lng: null, lat: 10 }),
    job({ lng: 10, lat: null }),
    job({ lng: '', lat: '' }),
    job({ lng: 'abc', lat: 12 }),
    job({ lng: Infinity, lat: 1 }),
    job({ lng: 200, lat: 10 }),
    job({ lng: 10, lat: -91 }),
    job({ lng: 0, lat: 0 }), // the old feeds' "nowhere": no real role sits at 0, 0
  ];
  const good = job({ id: 'ok', lng: '13.4', lat: '52.5', location: 'Berlin', country: 'de', currency: 'EUR' });
  const fc = jobsToGeoJSON([...bad, good], { now: NOW });
  assert.deepEqual(fc.features.map((f) => f.properties.id), ['ok']);
  assert.deepEqual(fc.features[0].geometry.coordinates, [13.4, 52.5]);
  for (const f of fc.features) {
    assert.ok(f.geometry.coordinates.every(Number.isFinite));
  }
});

test('jobsToGeoJSON: odd input, id-less roles and repeated ids are skipped (one beacon per role)', () => {
  assert.deepEqual(jobsToGeoJSON(null).features, []);
  assert.deepEqual(jobsToGeoJSON(undefined).features, []);
  assert.deepEqual(jobsToGeoJSON('jobs').features, []);
  const fc = jobsToGeoJSON([null, 42, 'job', job({ id: undefined }), job({ id: '' }), job({ id: 'a' }), job({ id: 'a', lng: 1, lat: 1 }), job({ id: 7 })], { now: NOW });
  assert.deepEqual(fc.features.map((f) => f.properties.id), ['a', '7']);
  assert.deepEqual(fc.features[0].geometry.coordinates, [-79.38, 43.65], 'the first of a repeated id wins');
});

test('jobsToGeoJSON: remote roles say ANY GATE, new ones NEW; pay not listed says so; titles are tidy', () => {
  const fc = jobsToGeoJSON(
    [
      job({ id: 'r', remote: true, location: 'Remote', source: 'remotive', country: 'gh', salary_min: null, salary_max: null }),
      job({ id: 'n', posted_at: '2026-10-15T06:00:00Z', title: 'Data Engineer (m/w/d)' }),
      job({ id: 'u', title: '   ' }),
    ],
    { now: NOW },
  );
  const by = Object.fromEntries(fc.features.map((f) => [f.properties.id, f.properties]));
  assert.equal(by.r.status, 'ANY GATE');
  assert.equal(by.r.code, 'ANY');
  assert.equal(by.r.iso2, '', 'a remote role has no country of its own');
  assert.equal(by.r.payText, 'Pay not listed');
  assert.equal(by.n.status, 'NEW');
  assert.equal(by.n.title, 'Data Engineer');
  assert.equal(by.u.title, 'Untitled role');
  // Every property is a string: Mapbox copies them to its worker and the label reads them as text.
  for (const f of fc.features) for (const v of Object.values(f.properties)) assert.equal(typeof v, 'string');
});

test('jobsToGeoJSON: 1,500 roles stay one pass (no profile scoring per beacon)', () => {
  const many = Array.from({ length: 1500 }, (_, i) => job({ lng: -79 + (i % 50) / 10, lat: 43 + (i % 30) / 10 }));
  const t = performance.now();
  const fc = jobsToGeoJSON(many, { now: NOW });
  const ms = performance.now() - t;
  assert.equal(fc.features.length, 1500);
  assert.ok(ms < 400, `1,500 beacons took ${Math.round(ms)} ms`);
});

// ── countryArrivals ─────────────────────────────────────────────────────────────────────────

const CA_CITIES = ['Toronto, Ontario', 'Vancouver, British Columbia', 'Montreal, Quebec', 'Calgary, Alberta', 'Ottawa, Ontario'];
function mixedBoard() {
  const jobs = [];
  for (let i = 0; i < 30; i++) jobs.push(job({ location: CA_CITIES[i % CA_CITIES.length], title: `Engineer ${i}` }));
  for (let i = 0; i < 12; i++) jobs.push(job({ location: 'Berlin', country: 'de', currency: 'EUR', lng: 13.4, lat: 52.5, title: `Entwickler ${i}` }));
  for (let i = 0; i < 6; i++) jobs.push(job({ location: 'Remote', remote: true, source: 'remotive', country: 'ca' }));
  jobs.push(job({ location: 'Toronto', title: 'Flight Attendant' }));
  return jobs;
}

test('countryArrivals: at most 8 rows, every one in that country (remote roles are not arrivals)', () => {
  const rows = countryArrivals(mixedBoard(), 'ca', { now: NOW });
  assert.equal(rows.length, 8);
  for (const r of rows) {
    assert.equal(r.iso2, 'ca');
    assert.notEqual(r.cells.code, 'ANY');
    assert.deepEqual(Object.keys(r.cells).sort(), ['code', 'pay', 'role', 'status', 'time']);
  }
  const de = countryArrivals(mixedBoard(), 'DE', { now: NOW });
  assert.ok(de.length > 0 && de.length <= 8);
  assert.ok(de.every((r) => r.iso2 === 'de' && r.cells.code === 'BER'));
});

test('countryArrivals: cities first, then more roles from the same city (one city still fills the board)', () => {
  const rows = countryArrivals(mixedBoard(), 'ca', { now: NOW });
  const firstFive = new Set(rows.slice(0, 5).map((r) => r.cells.code));
  assert.equal(firstFive.size, 5, 'each city once before any city repeats');
  const oneCity = Array.from({ length: 20 }, (_, i) => job({ title: `Role ${i}` }));
  const solo = countryArrivals(oneCity, 'ca', { now: NOW });
  assert.equal(solo.length, 8);
  assert.equal(new Set(solo.map((r) => r.id)).size, 8, 'no role twice');
  assert.ok(solo.every((r) => r.cells.code === 'YYZ'));
});

test('countryArrivals: limit, no sample rows, unknown or empty countries give nothing; no "flight" roles', () => {
  assert.equal(countryArrivals(mixedBoard(), 'ca', { now: NOW, limit: 3 }).length, 3);
  assert.deepEqual(countryArrivals(mixedBoard(), 'fr', { now: NOW }), []);
  assert.deepEqual(countryArrivals(mixedBoard(), '', { now: NOW }), []);
  assert.deepEqual(countryArrivals(mixedBoard(), 'canada', { now: NOW }), []);
  assert.deepEqual(countryArrivals(null, 'ca', { now: NOW }), []);
  const rows = countryArrivals(mixedBoard(), 'ca', { now: NOW, limit: 40 });
  assert.equal(rows.length, 30, 'every Toronto-to-Ottawa role, but not the sample board');
  assert.ok(rows.every((r) => !r.fallback));
  assert.ok(rows.every((r) => !/flight/i.test(r.cells.role)));
});

test('countryArrivals: a profile can light BOARDING on its rows', () => {
  const profile = { skills: 'react, typescript, node', jobTypes: ['Software Engineering'], experience: '5-10' };
  const strong = job({ title: 'Senior Software Engineer React TypeScript Node', description: 'react typescript node software engineer frontend' });
  const rows = countryArrivals([strong], 'ca', { now: NOW, profile });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].cells.status, 'BOARDING');
  assert.equal(countryArrivals([strong], 'ca', { now: NOW })[0].cells.status, 'ON TIME');
});

test('ARRIVALS_COLUMNS: LOCAL · CITY · ROLE · PAY · STATUS, PAY wide enough for any pay', () => {
  assert.deepEqual(ARRIVALS_COLUMNS.map((c) => [c.key, c.label]), [
    ['time', 'LOCAL'],
    ['code', 'CITY'],
    ['role', 'ROLE'],
    ['pay', 'PAY'],
    ['status', 'STATUS'],
  ]);
  assert.equal(ARRIVALS_COLUMNS.find((c) => c.key === 'pay').width, 13);
  assert.equal(ARRIVALS_COLUMNS.find((c) => c.key === 'status').tone, 'status');
});

// ── Small helpers ───────────────────────────────────────────────────────────────────────────

test('arrivalCountries: the countries with roles of their own, by name, for the keyboard path', () => {
  const list = arrivalCountries(mixedBoard());
  assert.deepEqual(list, [
    { iso2: 'ca', name: 'Canada' },
    { iso2: 'de', name: 'Germany' },
  ]);
  assert.deepEqual(arrivalCountries(null), []);
});

test('leadingCountry: the country most of a cluster is in; remote (no country) never leads', () => {
  assert.equal(leadingCountry(['de', 'fr', 'de', '', '', '', 'nl']), 'de');
  assert.equal(leadingCountry(['', '', null, undefined]), null);
  assert.equal(leadingCountry([]), null);
  assert.equal(leadingCountry(['fr', 'de']), 'fr', 'a tie goes to the first seen');
});

test('boundsOf: the box around some points; across the antimeridian it wraps instead of spanning the world', () => {
  assert.equal(boundsOf([]), null);
  assert.deepEqual(boundsOf([[-79.4, 43.6]]), [[-79.4, 43.6], [-79.4, 43.6]]);
  assert.deepEqual(boundsOf([[-123.1, 49.3], [-79.4, 43.6], [-73.6, 45.5]]), [[-123.1, 43.6], [-73.6, 49.3]]);
  // Fiji: 178 and -179.5 are 2.5 degrees apart, not 357.5.
  const fiji = boundsOf([[178, -18], [-179.5, -16.5]]);
  assert.deepEqual(fiji, [[178, -18], [180.5, -16.5]]);
});

// ── Source guards over the control tower ────────────────────────────────────────────────────

function walk(rel) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) return [];
  if (!statSync(abs).isDirectory()) return [abs];
  return readdirSync(abs).flatMap((name) => walk(join(rel, name)));
}
const TOWER = ['app/map', 'app/components/map', 'app/components/Map.js', 'lib/departures/mapData.js'].flatMap(walk);
const TOWER_JS = TOWER.filter((f) => /\.(?:js|jsx|mjs)$/.test(f));

test('the tower files exist (sanity)', () => {
  const names = TOWER.map(show);
  for (const f of ['app/map/page.js', 'app/components/Map.js', 'app/components/map/ArrivalsBoard.js', 'app/components/map/map.css', 'lib/departures/mapData.js']) {
    assert.ok(names.includes(f), `${f} exists`);
  }
});

test('Map.js: one clustered GeoJSON source, circle beacons, no number labels on clusters', () => {
  const src = read('app/components/Map.js');
  assert.match(src, /type:\s*'geojson'/);
  assert.match(src, /cluster:\s*true/);
  assert.match(src, /type:\s*'circle'/);
  assert.ok(!/point_count_abbreviated/.test(src), 'no cluster totals');
  assert.ok(!/text-field/.test(src), 'no symbol text on the beacons');
  assert.ok(!/new mapboxgl\.Marker/.test(src), 'no DOM markers (one canvas layer, not thousands of nodes)');
  assert.match(src, /\.setData\(/, 'a new search replaces the source data');
  assert.match(src, /getClusterExpansionZoom/, 'a cluster click zooms');
});

test('Map.js: pixel ratio capped at 2; popups from DOM nodes only', () => {
  const src = read('app/components/Map.js');
  // Mapbox GL v3 has no pixelRatio option: it reads window.devicePixelRatio, capped while the map lives.
  assert.match(src, /Math\.min\(\s*\w*[dD]evicePixelRatio\w*\(\)[^,)]*,\s*2\s*\)/);
  assert.match(src, /defineProperty\(window, 'devicePixelRatio'/);
  assert.match(src, /\.setDOMContent\(/);
  assert.match(src, /beaconLabel\(/);
  assert.ok(!/setHTML|innerHTML|insertAdjacentHTML/.test(src));
});

test('mapbox-gl loads lazily: only Map.js imports it, and the tower loads Map.js with ssr: false', () => {
  for (const f of TOWER_JS) {
    if (show(f) === 'app/components/Map.js') continue;
    assert.ok(!/from ['"]mapbox-gl/.test(readFileSync(f, 'utf8')), `${show(f)} imports mapbox-gl`);
  }
  const tower = read('app/components/map/ControlTower.js');
  assert.match(tower, /dynamic\(\s*\(\)\s*=>\s*import\(['"]\.\.\/Map['"]\),\s*\{[^}]*ssr:\s*false/);
  assert.ok(!/^['"]use client['"]/.test(read('app/map/page.js').trim()), 'the page itself renders on the server');
  assert.match(read('app/map/page.js'), /export const metadata/);
});

test('no storage read while rendering (no hydration mismatch); Lenis is off on /map', () => {
  for (const f of TOWER_JS) {
    const src = readFileSync(f, 'utf8');
    assert.ok(!/useState\(\s*\(\)\s*=>[^;]*(?:localStorage|sessionStorage|window\.)/s.test(src), `${show(f)} reads the browser in a state initialiser`);
    assert.ok(!/typeof window === 'undefined'/.test(src), `${show(f)} renders differently on the server`);
  }
  assert.match(read('app/map/page.js'), /data-lenis-prevent/);
  const smooth = read('app/components/motion/SmoothScroll.js');
  assert.match(smooth, /usePathname/);
  assert.match(smooth, /['"]\/map['"]/);
});

/**
 * ControlTower.js as a tree: its JSX elements, and its functions by name (`const f = () => …`,
 * `const f = useCallback(() => …)`, `function f() {}`), so a handler can be followed through the
 * functions it calls.
 */
function towerTree() {
  const src = read('app/components/map/ControlTower.js');
  const ast = espree.parse(src, { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true }, range: true });
  const elements = [];
  const fns = new Map();
  const isFn = (n) => n && (n.type === 'ArrowFunctionExpression' || n.type === 'FunctionExpression');
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'JSXElement') elements.push(node);
    if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier') {
      const init = node.init?.type === 'CallExpression' && isFn(node.init.arguments[0]) ? node.init.arguments[0] : node.init;
      if (isFn(init)) fns.set(node.id.name, src.slice(...init.range));
    }
    if (node.type === 'FunctionDeclaration' && node.id) fns.set(node.id.name, src.slice(...node.range));
    for (const key of Object.keys(node)) {
      const v = node[key];
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v === 'object' && key !== 'range') visit(v);
    }
  };
  visit(ast);
  const name = (el) => el.openingElement.name.name;
  const attr = (el, key) => el.openingElement.attributes.find((a) => a.type === 'JSXAttribute' && a.name.name === key);
  const text = (node) =>
    node.type === 'JSXText' ? node.value : node.type === 'JSXElement' ? node.children.map(text).join('') : '';
  /** A handler's code and the code of every tower function it calls, however deep. */
  const reach = (a) => {
    const seen = new Set();
    const out = [];
    const take = (code) => {
      out.push(code);
      for (const m of code.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) {
        if (fns.has(m[1]) && !seen.has(m[1])) {
          seen.add(m[1]);
          take(fns.get(m[1]));
        }
      }
    };
    const e = a.value.expression;
    take(e.type === 'Identifier' && fns.has(e.name) ? fns.get(e.name) : src.slice(...e.range));
    return out.join('\n');
  };
  return { elements, name, attr, text, reach };
}

test('Arrivals by country: choosing a country opens nothing; the Show arrivals button opens its board (WCAG 3.2.2)', () => {
  // ArrowDown on a closed <select> fires `change` at once in Chromium and Firefox: a board that
  // opened on change would open the first country, and the next ArrowDown would open it again.
  const { elements, name, attr, text, reach } = towerTree();
  const select = elements.find((el) => name(el) === 'select' && attr(el, 'id')?.value?.value === 'mt-arr');
  assert.ok(select, 'the #mt-arr select');
  const value = attr(select, 'value');
  assert.ok(value?.value?.type === 'JSXExpressionContainer' && value.value.expression.type !== 'Literal', 'the chosen country is kept in state (not value="")');
  const change = attr(select, 'onChange');
  assert.ok(change, 'the select has an onChange');
  const onChange = reach(change);
  assert.ok(!/\bsetArrivals\s*\(/.test(onChange), 'the select’s onChange never opens a board');
  assert.ok(!/\b(?:showCountry|setOpenId)\s*\(|boardOpener/.test(onChange), 'the select’s onChange opens nothing');

  const show = elements.find((el) => name(el) === 'button' && text(el).replace(/\s+/g, ' ').trim() === 'Show arrivals');
  assert.ok(show, 'a "Show arrivals" button');
  assert.equal(attr(show, 'type')?.value?.value, 'button', 'Show arrivals is not a submit button');
  const click = attr(show, 'onClick');
  assert.ok(click, 'Show arrivals has an onClick');
  assert.match(reach(click), /\bsetArrivals\s*\(/, 'Show arrivals opens the chosen country’s board');
  assert.match(reach(click), /boardOpener\.current\s*=/, 'the board gives focus back to what opened it');
  const css = stripCssComments(read('app/components/map/map.css'));
  assert.match(css, /\.mt-show\s*\{[^}]*\bheight:\s*44px[^}]*\bmin-width:\s*44px/, 'Show arrivals is a 44px touch target');
});

/** Every string a file can show: string literals, template text, JSX text and attributes. */
function visibleStrings(src, file) {
  const ast = espree.parse(src, { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } });
  const out = [];
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'Literal' && typeof node.value === 'string') out.push(node.value);
    else if (node.type === 'TemplateElement') out.push(node.value.cooked ?? node.value.raw);
    else if (node.type === 'JSXText') out.push(node.value);
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const v = node[key];
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v === 'object') visit(v);
    }
  };
  try {
    visit(ast);
  } catch (e) {
    throw new Error(`${show(file)}: ${e.message}`);
  }
  return out;
}

test('the tower copy: no "flight"/"fare", no job or listing totals', () => {
  const found = [];
  for (const f of TOWER_JS) {
    const src = readFileSync(f, 'utf8');
    for (const s of visibleStrings(src, f)) {
      if (/\b(?:flights?|fares?)\b/i.test(s)) found.push(`${show(f)}: ${JSON.stringify(s.trim().slice(0, 80))}`);
      if (/\b\d[\d,.]*\s*[kKmM]?\+?\s*(?:countries|jobs|roles|listings|openings|beacons|arrivals)\b/i.test(s)) {
        found.push(`${show(f)}: ${JSON.stringify(s.trim().slice(0, 80))}`);
      }
    }
    if (/\.length\.toLocaleString\(\)|\{\s*\w+\.length\s*\}\s*(?:jobs|roles)/i.test(src)) found.push(`${show(f)}: renders a total`);
  }
  assert.deepEqual(found, []);
});

test('map.css: transform/opacity transitions only, no CSS trig, no backdrop-filter, svh/dvh not vh', () => {
  const css = stripCssComments(read('app/components/map/map.css'));
  assert.ok(!/atan2|\b(?:a?sin|a?cos|a?tan)\(/i.test(css), 'CSS trig');
  assert.ok(!/backdrop-filter/.test(css), 'backdrop-filter');
  assert.ok(!/\d(?:vh)\b/.test(css), 'vh (use svh / dvh)');
  for (const m of css.matchAll(/transition(?:-property)?\s*:\s*([^;]+);/g)) {
    for (const part of m[1].replace(/\([^)]*\)/g, '').split(',')) {
      const prop = part.trim().split(/\s+/)[0];
      assert.ok(['transform', 'opacity', 'none'].includes(prop), `map.css transitions ${prop}`);
    }
  }
  for (const m of css.matchAll(/@keyframes[^{]+\{([\s\S]*?)\}\s*\}/g)) {
    for (const p of m[1].matchAll(/([a-z-]+)\s*:/g)) {
      assert.ok(['transform', 'opacity'].includes(p[1]), `a keyframe animates ${p[1]}`);
    }
  }
  assert.match(css, /100svh/, 'the tower fills the small viewport height');
});
