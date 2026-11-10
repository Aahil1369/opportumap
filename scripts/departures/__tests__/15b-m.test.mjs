// Task 15b, group M: the map control tower, the saved itinerary and the jobs board (the wave 2
// review's carry-ins). Behaviour tests on the pure modules (visitorProfile, radarLoad, radarChip),
// then source guards for the wiring, the markup and the CSS of /jobs, /map and /saved.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as espree from 'espree';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

// ── T8-7: one "account, then device" profile loader (lib/departures/visitorProfile.js) ──────────

const { deviceProfile, inputOnArrival, loadVisitorProfile, searchOnArrival } = await import(
  new URL('../../../lib/departures/visitorProfile.js', import.meta.url)
);
const { PROFILE_KEY } = await import(new URL('../../../lib/saveProfile.js', import.meta.url));

/** A Storage stand-in: getItem only (what the loader reads); `broken` throws like blocked storage. */
function fakeStore(entries = {}, { broken = false } = {}) {
  const data = new Map(Object.entries(entries));
  return {
    getItem(key) {
      if (broken) throw new Error('SecurityError: storage is blocked');
      return data.has(key) ? data.get(key) : null;
    },
  };
}
const ON_DEVICE = fakeStore({ [PROFILE_KEY]: JSON.stringify({ skills: 'vue', jobTypes: ['Design'] }) });

test('T8-7 loadVisitorProfile: the account\'s profile comes first', async () => {
  const p = await loadVisitorProfile({ account: async () => ({ skills: 'react' }), storage: ON_DEVICE });
  assert.deepEqual(p, { skills: 'react' });
  const sync = await loadVisitorProfile({ account: () => ({ skills: 'go' }), storage: ON_DEVICE });
  assert.deepEqual(sync, { skills: 'go' }, 'an account answer that is not a promise works too');
});

test('T8-7 loadVisitorProfile: no account profile (signed out, none saved, request failed) -> the one on this device', async () => {
  const want = { skills: 'vue', jobTypes: ['Design'] };
  assert.deepEqual(await loadVisitorProfile({ account: async () => null, storage: ON_DEVICE }), want);
  assert.deepEqual(await loadVisitorProfile({ account: () => Promise.reject(new Error('offline')), storage: ON_DEVICE }), want);
  assert.deepEqual(
    await loadVisitorProfile({
      account: () => {
        throw new Error('no document');
      },
      storage: ON_DEVICE,
    }),
    want,
    'an account loader that throws is no profile, not a crash',
  );
  assert.deepEqual(await loadVisitorProfile({ account: async () => ['not', 'a', 'profile'], storage: ON_DEVICE }), want);
  assert.deepEqual(await loadVisitorProfile({ storage: ON_DEVICE }), want, 'no account loader at all');
});

test('T8-7 loadVisitorProfile / deviceProfile: nothing usable is null, never a throw', async () => {
  const none = async () => null;
  for (const raw of [undefined, 'not json', '[1,2]', '"text"', '42', 'null', '']) {
    const storage = fakeStore(raw === undefined ? {} : { [PROFILE_KEY]: raw });
    assert.equal(await loadVisitorProfile({ account: none, storage }), null, `stored: ${JSON.stringify(raw)}`);
    assert.equal(deviceProfile(storage), null, `deviceProfile, stored: ${JSON.stringify(raw)}`);
  }
  assert.equal(await loadVisitorProfile({ account: none, storage: fakeStore({}, { broken: true }) }), null, 'blocked storage');
  assert.equal(await loadVisitorProfile({ account: none, storage: null }), null, 'no storage (null) is no device copy');
  assert.deepEqual(deviceProfile(ON_DEVICE), { skills: 'vue', jobTypes: ['Design'] });
  const other = fakeStore({ opportumap_saved_v2: JSON.stringify({ skills: 'x' }) });
  assert.equal(deviceProfile(other), null, 'only the profile key is read');
});

test('T8-7: /jobs, /map and /saved load the profile through the one loader, not copies of their own', () => {
  for (const f of ['app/components/jobs/JobsBoard.js', 'app/components/map/ControlTower.js', 'app/saved/Itinerary.js']) {
    const src = read(f);
    assert.match(src, /from '(?:\.\.\/)+lib\/departures\/visitorProfile'/, `${f} imports lib/departures/visitorProfile`);
    assert.match(src, /loadVisitorProfile\(\{ account: loadHomeProfile \}\)\.then\(/, `${f}: the account's profile, then the device's`);
    assert.doesNotMatch(src, /function (?:loadProfile|readProfile|readJson)\b/, `${f} keeps no loader of its own`);
    assert.doesNotMatch(src, /\bPROFILE_KEY\b/, `${f} reads no profile key itself`);
  }
});

// ── jobs-s1: a saved edit is the profile the next page loads (app/components/home/homeProfile.js) ──

test('jobs-s1 keepHomeProfile: the next loadHomeProfile() answers with the profile just saved, no request', async (t) => {
  const before = { document: globalThis.document, fetch: globalThis.fetch };
  t.after(() => {
    for (const [name, value] of Object.entries(before)) {
      if (value === undefined) delete globalThis[name];
      else globalThis[name] = value;
    }
  });
  const A = { nationality: 'Canadian', jobTypes: ['Software Engineering'], skills: 'react' };
  const B = { nationality: 'Canadian', jobTypes: ['Design'], preferredCountries: ['ca'], skills: 'figma' };
  let gets = 0;
  globalThis.fetch = async (url) => {
    assert.equal(url, '/api/user-profile');
    gets += 1;
    return { ok: true, json: async () => ({ profile: A }) };
  };
  // Signed out first, so the module's kept promise starts empty.
  globalThis.document = { cookie: '' };
  const { keepHomeProfile, loadHomeProfile } = await import(
    new URL('../../../app/components/home/homeProfile.js', import.meta.url)
  );
  assert.equal(await loadHomeProfile(), null, 'signed out: no profile');
  assert.equal(gets, 0, 'signed out: never asked');

  globalThis.document.cookie = 'sb-x-auth-token=1';
  assert.deepEqual(await loadHomeProfile(), A);
  assert.equal(gets, 1, 'the account profile is asked for once');

  keepHomeProfile(B);
  assert.equal(await loadHomeProfile(), B, 'the profile just saved, not the one fetched before the edit');
  assert.equal(gets, 1, 'no second request');

  keepHomeProfile({ name: 'x' });
  assert.equal(await loadHomeProfile(), null, 'a profile that says nothing is no profile, as when it is fetched');
  assert.equal(gets, 1);

  globalThis.document.cookie = '';
  keepHomeProfile(B);
  assert.equal(await loadHomeProfile(), null, 'signed out: nothing is kept');
  assert.equal(gets, 1, 'signed out: no request');
  globalThis.document.cookie = 'sb-x-auth-token=1';
  assert.deepEqual(await loadHomeProfile(), A, 'a save made signed out is not what the next member sees');
  assert.equal(gets, 2, 'signed in again: asked again');
});

test('T7-5 searchOnArrival: a search the visitor already asked for stays; else the URL\'s ?q=', () => {
  const asked = { text: 'nurse', n: 1 };
  assert.equal(searchOnArrival(asked, 'tor'), asked, 'a submitted search is not replaced');
  const blank = { text: '', n: 2 };
  assert.equal(searchOnArrival(blank, 'tor'), blank, 'an empty search the visitor submitted stays too');
  assert.deepEqual(searchOnArrival(null, 'tor'), { text: 'tor', n: 0 }, 'nothing asked yet: the URL\'s');
  assert.deepEqual(searchOnArrival(null, ''), { text: '', n: 0 }, 'no ?q=: the profile\'s own search');
});

test('T7-5 inputOnArrival: what the visitor typed stays; else the URL\'s ?q=', () => {
  assert.equal(inputOnArrival('nur', 'tor'), 'nur');
  assert.equal(inputOnArrival('', 'tor'), 'tor');
  assert.equal(inputOnArrival('', ''), '');
});

// ── T7-5: a profile that lands late keeps the visitor's own search ──────────────────────────────

test('T7-5: /jobs and /map no longer overwrite the search box or the search when the profile lands', () => {
  for (const f of ['app/components/jobs/JobsBoard.js', 'app/components/map/ControlTower.js']) {
    const src = read(f);
    assert.match(src, /setInput\(\(v\) => inputOnArrival\(v, q\)\);/, `${f}: typed text stays`);
    assert.match(src, /setAsked\(\(a\) => searchOnArrival\(a, q\)\);/, `${f}: a submitted search stays`);
    assert.doesNotMatch(src, /setAsked\(\{ text: q, n: 0 \}\)/, `${f}: the profile no longer replaces the search`);
    assert.doesNotMatch(src, /setInput\(q\)/, `${f}: the profile no longer replaces the typed text`);
  }
});

// ── T8-7 (second half) + T8-3: /saved's Remove ──────────────────────────────────────────────────

/** `const <name> = useCallback(fn, deps)` in a file: { fn (its source), deps (each dependency's source) }, or null. */
function callbackOf(src, name) {
  const ast = espree.parse(src, { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true }, range: true });
  let found = null;
  const visit = (node) => {
    if (found || !node || typeof node.type !== 'string') return;
    if (
      node.type === 'VariableDeclarator' &&
      node.id.type === 'Identifier' &&
      node.id.name === name &&
      node.init?.type === 'CallExpression' &&
      node.init.callee.name === 'useCallback'
    ) {
      const [fn, deps] = node.init.arguments;
      found = {
        fn: src.slice(...fn.range),
        deps: deps?.type === 'ArrayExpression' ? deps.elements.map((d) => src.slice(...d.range)) : null,
      };
      return;
    }
    for (const key of Object.keys(node)) {
      if (key === 'range') continue;
      const v = node[key];
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v === 'object') visit(v);
    }
  };
  visit(ast);
  return found;
}

test('T8-7: /saved\'s remove is one function for the life of the page, so a removal re-renders only its own row', () => {
  const src = read('app/saved/Itinerary.js');
  const remove = callbackOf(src, 'remove');
  assert.ok(remove, 'Itinerary has const remove = useCallback(…)');
  assert.deepEqual(remove.deps, [], 'remove depends on nothing that changes');
  assert.match(remove.fn, /= onBoard\.current;/, 'it reads the board as of the last render');
  assert.match(src, /const onBoard = useRef\(/);
  assert.match(src, /useEffect\(\(\) => \{\s*onBoard\.current = \{ list, stages, rows \};\s*\}\);/, 'the ref follows every render');
  assert.match(read('app/saved/ItineraryRow.js'), /export default memo\(ItineraryRow\);/, 'rows are memo\'d');
});

test('T8-3: when this device refuses the removal, /saved keeps the row and says so', () => {
  const src = read('app/saved/Itinerary.js');
  const remove = callbackOf(src, 'remove');
  assert.match(remove.fn, /if \(!removeJob\(deviceStorage\(\), id\)\) \{\s*setSaid\("Couldn't remove it on this device\."\);\s*return;\s*\}/);
  const refused = remove.fn.indexOf('if (!removeJob(');
  assert.ok(refused > 0, 'the store\'s answer is checked');
  assert.ok(refused < remove.fn.indexOf("new Map(m).set(id, 'cancelled')"), 'before the row flaps to CANCELLED');
  assert.ok(refused < remove.fn.indexOf('removed from your itinerary.'), 'before the removal is announced');
  assert.ok(refused < remove.fn.indexOf('drop();'), 'before the row is dropped (reduced motion)');
});

// ── N3: the /saved status line ──────────────────────────────────────────────────────────────────

/**
 * Every style rule of a stylesheet (comments out), with the at-rules around it, outermost first:
 * [{ selector (spaces collapsed), body, within: ['@container (min-width: 560px)', …] }].
 */
function cssRules(css) {
  const out = [];
  const stack = [];
  let buf = '';
  for (const ch of css.replace(/\/\*[\s\S]*?\*\//g, '')) {
    if (ch === '{') {
      stack.push(buf.slice(buf.lastIndexOf(';') + 1).trim());
      buf = '';
    } else if (ch === '}') {
      const head = stack.pop();
      if (head !== undefined && !head.startsWith('@')) {
        out.push({ selector: head.replace(/\s+/g, ' '), body: buf.trim(), within: stack.filter((h) => h.startsWith('@')) });
      }
      buf = '';
    } else {
      buf += ch;
    }
  }
  return out;
}

/** A declaration's plain number (px, or a bare 0) in a rule body, or null when it is not set that way. */
function px(body, prop) {
  const m = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*(-?\\d+(?:\\.\\d+)?)(?:px)?\\s*(?:;|$)`).exec(body);
  return m ? Number(m[1]) : null;
}

test('N3: /saved\'s status line holds sentences at 16px (body text) on every board width', () => {
  const rules = cssRules(read('app/saved/saved.css')).filter((r) => r.selector.split(',').some((s) => s.trim() === '.it-live'));
  const size = (body) => {
    const shorthand = /(?:^|;)\s*font\s*:\s*(?:\d{3}\s+)?(\d+(?:\.\d+)?)px/.exec(body);
    return shorthand ? Number(shorthand[1]) : px(body, 'font-size');
  };
  const base = rules.find((r) => r.within.length === 0);
  assert.ok(base, 'saved.css has a top-level .it-live rule');
  assert.ok(size(base.body) >= 16, `.it-live is ${size(base.body)}px`);
  for (const r of rules) {
    const s = size(r.body);
    if (s !== null) assert.ok(s >= 16, `.it-live is ${s}px in ${r.within.join(' ') || 'the base rule'}`);
  }
});

// ── T7-4 + T7-7: the radar's load state and its light-up frame (lib/departures/radarLoad.js) ────

const { radarLoad } = await import(new URL('../../../lib/departures/radarLoad.js', import.meta.url));

/** A clock the test drives: its timers and frames run only when the test says so. */
function fakeClock() {
  let seq = 0;
  const clock = {
    timers: new Map(),
    frames: new Map(),
    cleared: [],
    cancelled: [],
    setTimeout(fn, ms) {
      seq += 1;
      clock.timers.set(seq, { fn, ms });
      return seq;
    },
    clearTimeout(id) {
      clock.cleared.push(id);
      clock.timers.delete(id);
    },
    requestAnimationFrame(fn) {
      seq += 1;
      clock.frames.set(seq, fn);
      return seq;
    },
    cancelAnimationFrame(id) {
      clock.cancelled.push(id);
      clock.frames.delete(id);
    },
    /** Fires every timer still set. */
    elapse() {
      for (const [id, t] of [...clock.timers]) {
        clock.timers.delete(id);
        t.fn();
      }
    },
    /** Runs every frame still waiting. */
    frame() {
      for (const [id, fn] of [...clock.frames]) {
        clock.frames.delete(id);
        fn();
      }
    },
  };
  return clock;
}

test('T7-4 radarLoad: no load within the timeout is the error state; a late load still brings the map up', () => {
  const clock = fakeClock();
  const log = [];
  const watch = radarLoad({ timeoutMs: 20000, onState: (s) => log.push(s), clock });
  assert.deepEqual([...clock.timers.values()].map((t) => t.ms), [20000], 'one timer, for timeoutMs');
  clock.elapse();
  assert.deepEqual(log, ['error'], '20 s without a load');
  watch.load(() => log.push('setup'));
  assert.deepEqual(log, ['error', 'setup', 'ready'], 'the late load runs the setup, then clears the error');
  assert.equal(watch.loaded, true);
});

test('T7-4 radarLoad: a style or token error before load is the error state, once; a later load still says ready', () => {
  const clock = fakeClock();
  const log = [];
  const watch = radarLoad({ timeoutMs: 20000, onState: (s) => log.push(s), clock });
  watch.error({ error: new Error('401') });
  watch.error({ error: new Error('again') });
  assert.deepEqual(log, ['error'], 'said once');
  clock.elapse();
  assert.deepEqual(log, ['error'], 'the timeout adds nothing');
  watch.load();
  assert.deepEqual(log, ['error', 'ready']);
});

test('T7-4 radarLoad: a tile failing is never the error state, and after load nothing is', () => {
  const clock = fakeClock();
  const log = [];
  const watch = radarLoad({ timeoutMs: 20000, onState: (s) => log.push(s), clock });
  watch.error({ sourceId: 'roles', error: new Error('tile') });
  assert.deepEqual(log, [], 'a tile (sourceId) failing is not the map failing');
  watch.load(() => log.push('setup'));
  assert.deepEqual(log, ['setup', 'ready']);
  assert.equal(clock.timers.size, 0, 'the load clears the timer');
  watch.error({ error: new Error('later') });
  clock.elapse();
  watch.load(() => log.push('setup again'));
  assert.deepEqual(log, ['setup', 'ready'], 'a later error and a second load change nothing');
});

test('T7-7 radarLoad: nextFrame waits for the next frame; stop() cancels a frame still waiting and the timer', () => {
  const clock = fakeClock();
  const log = [];
  const watch = radarLoad({ timeoutMs: 20000, onState: (s) => log.push(s), clock });
  watch.load();
  watch.nextFrame(() => log.push('lit'));
  assert.deepEqual(log, ['ready'], 'not at once');
  clock.frame();
  assert.deepEqual(log, ['ready', 'lit']);

  const early = fakeClock();
  const seen = [];
  const gone = radarLoad({ timeoutMs: 20000, onState: (s) => seen.push(s), clock: early });
  gone.load();
  gone.nextFrame(() => seen.push('lit'));
  const waiting = [...early.frames.keys()];
  assert.equal(waiting.length, 1);
  gone.stop();
  assert.deepEqual(early.cancelled, waiting, 'the unmount cancels the light-up frame');
  early.frame();
  gone.nextFrame(() => seen.push('late'));
  early.frame();
  assert.deepEqual(seen, ['ready'], 'nothing runs on a removed map');

  const never = fakeClock();
  const states = [];
  const unmounted = radarLoad({ timeoutMs: 20000, onState: (s) => states.push(s), clock: never });
  unmounted.stop();
  assert.equal(never.timers.size, 0, 'stop clears the load timer');
  unmounted.error({ error: new Error('x') });
  unmounted.load();
  assert.deepEqual(states, [], 'no state after stop');
});

test('T7-4 + T7-7: Map.js runs its load state and its light-up frames through radarLoad', () => {
  const src = read('app/components/Map.js');
  assert.match(src, /import \{ radarLoad \} from '\.\.\/\.\.\/lib\/departures\/radarLoad';/);
  assert.match(src, /const watch = radarLoad\(\{ timeoutMs: LOAD_TIMEOUT_MS, onState: \(s\) => on\.current\.onState\?\.\(s\) \}\);/);
  assert.match(src, /map\.on\('error', \(e\) => watch\.error\(e\)\);/);
  assert.match(src, /map\.on\('load', \(\) => \{\s*watch\.load\(\(\) => \{/);
  assert.doesNotMatch(src, /if \(failed\) return/, 'a late load is no longer ignored');
  assert.doesNotMatch(src, /requestAnimationFrame\(\(\) => lightUp\(map\)\)/, 'no light-up frame outside radarLoad');
  assert.equal((src.match(/\.nextFrame\(\(\) => lightUp\(map\)\)/g) || []).length, 2, 'the first beacons, and a first search that lands later');
  assert.match(src, /return \(\) => \{\s*watch\.stop\(\);/, 'the unmount stops the watch first');
});

// ── N2 + T7-6: the HUD (lib/departures/radarChip.js) ────────────────────────────────────────────

const { radarChip } = await import(new URL('../../../lib/departures/radarChip.js', import.meta.url));

test('N2 radarChip: the HUD says a search is scanning, landed, or came up empty', () => {
  assert.deepEqual(radarChip({ busy: true, label: 'nurse' }), { key: 'RADAR', text: 'Scanning for nurse…' });
  assert.deepEqual(radarChip({ busy: true }), { key: 'RADAR', text: 'Scanning…' });
  assert.deepEqual(radarChip({ ok: true, label: 'nurse' }), { key: 'ON RADAR', text: 'nurse' });
  assert.deepEqual(
    radarChip({ ok: true, empty: true, label: 'zzzz' }),
    { key: 'RADAR', text: 'Nothing on the radar for “zzzz”' },
    'an empty search is not ON RADAR',
  );
  assert.deepEqual(radarChip({ empty: true }), { key: 'RADAR', text: 'Nothing on the radar' });
  assert.equal(radarChip({ busy: true, empty: true, label: 'x' }).text, 'Scanning for x…', 'a new search on its way wins');
  assert.equal(radarChip({ ok: false, label: 'x' }), null, 'a failed search has no chip (the error message says it)');
  assert.equal(radarChip({ ok: true, label: '' }), null);
  assert.equal(radarChip(), null);
});

/** Every JSX element under a node (the node itself first, when it is one). */
function jsxElements(node, out = []) {
  if (!node || typeof node.type !== 'string') return out;
  if (node.type === 'JSXElement') out.push(node);
  for (const key of Object.keys(node)) {
    if (key === 'range') continue;
    const v = node[key];
    if (Array.isArray(v)) v.forEach((c) => jsxElements(c, out));
    else if (v && typeof v === 'object') jsxElements(v, out);
  }
  return out;
}
const jsxAttr = (el, name) => el.openingElement.attributes.find((a) => a.type === 'JSXAttribute' && a.name.name === name);

test('T7-6 + N2: the HUD is the one live region (nothing inside it has a role or aria-live), and its chip is radarChip\'s', () => {
  const src = read('app/components/map/ControlTower.js');
  const all = jsxElements(espree.parse(src, { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true }, range: true }));
  const huds = all.filter((el) => jsxAttr(el, 'className')?.value?.value === 'mt-hud');
  assert.equal(huds.length, 1, 'one HUD');
  assert.equal(jsxAttr(huds[0], 'aria-live')?.value?.value, 'polite');
  const inner = jsxElements(huds[0]).slice(1).filter((el) => jsxAttr(el, 'role') || jsxAttr(el, 'aria-live'));
  assert.deepEqual(inner.map((el) => src.slice(...el.openingElement.range)), [], 'no live region nested in the HUD');
  assert.match(src, /const chip = radarChip\(\{ busy, empty, ok: radar\?\.state === 'ok', label \}\);/);
  assert.match(src, /<span className="mt-chip-k">\{chip\.key\}<\/span>/);
  assert.match(src, /<span className="mt-chip-t">\{chip\.text\}<\/span>/);
});

// ── N1: Back closes a gate on /map ──────────────────────────────────────────────────────────────

const { deepLink } = await import(new URL('../../../lib/departures/jobRows.js', import.meta.url));

test('N1: on /map a gate is a history entry: Back closes it, Forward and a ?job= link open it', () => {
  const src = read('app/components/map/ControlTower.js');
  const open = callbackOf(src, 'openGate');
  const close = callbackOf(src, 'closeGate');
  assert.ok(open && close, 'openGate and closeGate are useCallback');
  assert.match(open.fn, /window\.history\.pushState\(null, '', gateHref\(asked\?\.text, id\)\);\s*pushed\.current = true;/);
  assert.match(
    close.fn,
    /if \(pushed\.current\) \{\s*pushed\.current = false;\s*window\.history\.back\(\);\s*\} else \{\s*window\.history\.replaceState\(null, '', searchHref\(asked\?\.text\)\);/,
  );
  assert.match(src, /const gateHref = \(text, id\) => `\/map\?\$\{new URLSearchParams\(text \? \{ q: text, job: id \} : \{ job: id \}\)\}`;/);
  assert.match(src, /const onPop = \(\) => \{\s*pushed\.current = false;\s*setOpenId\(new URLSearchParams\(window\.location\.search\)\.get\('job'\)\);/);
  assert.match(src, /window\.addEventListener\('popstate', onPop\);/);
  assert.match(src, /window\.removeEventListener\('popstate', onPop\);/);
  assert.match(src, /wanted\.current = params\.get\('job'\);/);
  assert.match(src, /lib\.deepLink\(id, \{ lists: \[radar\?\.jobs\], settled, looked: true \}\)/);
  assert.match(src, /const MISSING = "That role isn't on the radar for this search\.";/);
  assert.match(
    read('app/components/map/towerData.js'),
    /export \{ deepLink, filterJobs, findJob, searchPlan \} from '\.\.\/\.\.\/\.\.\/lib\/departures\/jobRows';/,
  );
});

test('N1: /map\'s ?job= link opens a role on the radar and is a miss for one that is not (deepLink, looked: true)', () => {
  const radar = [{ id: 'adzuna_1' }, { id: 'remotive_2' }];
  assert.equal(deepLink('adzuna_1', { lists: [radar], settled: true, looked: true }), 'open');
  assert.equal(deepLink('adzuna_9', { lists: [radar], settled: true, looked: true }), 'miss', 'no lookup by id on /map');
  assert.equal(deepLink('adzuna_9', { lists: [undefined], settled: false, looked: true }), 'wait', 'its search is still on its way');
  assert.equal(deepLink(null, { lists: [radar], settled: true, looked: true }), 'none');
});

// ── T7-3: the map's zoom buttons ────────────────────────────────────────────────────────────────

test('T7-3: the map\'s zoom buttons are 44px touch targets', () => {
  const rule = cssRules(read('app/components/map/map.css')).find((r) => r.selector === '.mt .mapboxgl-ctrl-group button');
  assert.ok(rule, 'map.css sizes the Mapbox control buttons');
  assert.equal(px(rule.body, 'width'), 44);
  assert.equal(px(rule.body, 'height'), 44);
});

// ── N4 + T8-5: /saved's Remove ──────────────────────────────────────────────────────────────────

test('N4 + T8-5: /saved\'s Remove is a 44px target on phones and ends above the row\'s second line (phone, 560-879px)', () => {
  const rules = cssRules(read('app/saved/saved.css'));
  const rule = (selector, at = null) =>
    rules.find((r) => r.selector === selector && (at ? r.within.length === 1 && r.within[0] === at : r.within.length === 0))?.body ?? '';
  const AT560 = '@container (min-width: 560px)';
  const AT880 = '@container (min-width: 880px)';
  const x = rule('.it-x');
  const grid = rule('.it-grid, .it-link');
  assert.equal(px(x, 'min-width'), 44, 'phone: 44px wide at least');
  assert.equal(px(x, 'height'), 44, 'phone: 44px tall');
  assert.equal(px(grid, '--x-w'), 44, 'the role keeps room for the 44px Remove');
  // The first line: the link's 10px top padding, then the code's tiles (17px, kit.css .flap-tiles height in em).
  const kit = cssRules(read('app/components/kit/kit.css')).find((r) => r.selector === '.flap-tiles' && r.within.length === 0);
  const tileEm = Number(/(?:^|;)\s*height:\s*([\d.]+)em/.exec(kit?.body ?? '')?.[1]);
  assert.ok(tileEm > 1, `kit.css tile height ${tileEm}em`);
  assert.match(grid, /(?:^|;)\s*padding:\s*10px 12px\s*(?:;|$)/, 'the row keeps its 10px top padding');
  const line1End = 10 + tileEm * px(rule('.it-code'), 'font-size');
  const top = px(x, 'top');
  assert.equal(top, 0, 'phone: Remove sits at the top of its row');
  const phoneLine2 = line1End + px(grid, 'row-gap');
  assert.ok(top + 44 + 2 <= phoneLine2, `phone: Remove ends at ${top + 44}px, line 2 starts at ${phoneLine2.toFixed(2)}px`);
  // 560-879px: the same 44px Remove (no smaller height there), and line 2 clear of it.
  const x560 = rule('.it-x', AT560);
  assert.equal(px(x560, 'height'), null, '560-879px keeps the 44px height');
  assert.equal(px(x560, 'top'), null, '560-879px keeps the top: 0');
  const tabletLine2 = line1End + px(rule('.it-grid, .it-link', AT560), 'row-gap');
  assert.ok(top + 44 + 2 <= tabletLine2, `560-879px: Remove ends at ${top + 44}px, line 2 starts at ${tabletLine2.toFixed(2)}px`);
  // From 880px the row is one 40px line: Remove is 36px there, centred.
  assert.equal(px(rule('.it-x', AT880), 'height'), 36, '880px+: 36px fits the one-line row');
});


// ── T7-12: no sticky :hover on touch screens ────────────────────────────────────────────────────

const HOVER_CSS = {
  'app/components/jobs/jobs.css': 4,
  'app/components/jobs/gate.css': 3,
  'app/components/map/map.css': 5,
  'app/saved/saved.css': 3,
};

test('T7-12: every :hover rule in the jobs, gate, map and saved CSS sits inside @media (hover: hover), and nothing else does', () => {
  for (const [file, count] of Object.entries(HOVER_CSS)) {
    const rules = cssRules(read(file));
    const hover = rules.filter((r) => /:hover\b/.test(r.selector));
    assert.equal(hover.length, count, `${file} keeps its ${count} :hover rules`);
    for (const r of hover) {
      assert.ok(r.within.includes('@media (hover: hover)'), `${file}: "${r.selector}" is outside @media (hover: hover)`);
      for (const sel of r.selector.split(',')) assert.match(sel, /:hover\b/, `${file}: "${sel.trim()}" shares a rule with :hover`);
    }
    for (const r of rules.filter((x) => x.within.includes('@media (hover: hover)'))) {
      assert.match(r.selector, /:hover\b/, `${file}: "${r.selector}" (no :hover) moved into @media (hover: hover)`);
    }
    for (const r of rules.filter((x) => /:focus-visible|:active/.test(x.selector))) {
      assert.ok(!r.within.includes('@media (hover: hover)'), `${file}: "${r.selector}" must stay outside the hover block`);
    }
  }
});
