// The profile editor and how a profile is saved (wave 1 review I1 + I4).
//
// I1: ProfileModal (/jobs "Set up profile", the navbar after a first sign-in) had 14px fields
// (iPhone Safari zooms on focus), no role="dialog" / aria-modal / focus trap / Esc, a backdrop
// blur over the flipping board, and a country total in its copy. It is now a kit Dialog with a
// flat backdrop, 16px fields and no totals.
//
// I4: the navbar posted { profile_data } while /api/user-profile reads { profile }, and read
// rememberOnDevice as a second argument ProfileModal never passes: a first-run profile was lost
// from the account and the device. Every surface now saves through lib/saveProfile.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const stripCss = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

const { PROFILE_KEY, saveProfile } = await import(new URL('../../../lib/saveProfile.js', import.meta.url));

const PROFILE = {
  name: 'Ada',
  nationality: 'ug',
  currentCountry: 'Uganda',
  experience: '0-2',
  jobTypes: ['Software Engineering'],
  skills: 'Python, SQL',
  preferredCountries: ['ca', 'gb'],
  resumeSummary: '',
};

function fakeStorage({ broken = false } = {}) {
  const data = new Map();
  const calls = [];
  const guard = () => {
    if (broken) throw new Error('SecurityError: storage is blocked');
  };
  return {
    data,
    calls,
    setItem(k, v) {
      guard();
      calls.push(['set', k]);
      data.set(k, v);
    },
    removeItem(k) {
      guard();
      calls.push(['remove', k]);
      data.delete(k);
    },
  };
}

function fakeFetch(response = { ok: true }) {
  const sent = [];
  const fn = async (url, init) => {
    sent.push({ url, init });
    if (response instanceof Error) throw response;
    return response;
  };
  fn.sent = sent;
  return fn;
}

// ── I4: one way to save ───────────────────────────────────────────────────────────────────────

test('saveProfile posts { profile } to /api/user-profile, the key the route reads', async () => {
  const fetch = fakeFetch();
  const storage = fakeStorage();
  const profile = { ...PROFILE, rememberOnDevice: false };
  assert.equal(await saveProfile(profile, { signedIn: true, fetch, storage }), true);
  assert.equal(fetch.sent.length, 1);
  const { url, init } = fetch.sent[0];
  assert.equal(url, '/api/user-profile');
  assert.equal(init.method, 'POST');
  assert.equal(init.headers['Content-Type'], 'application/json');
  const body = JSON.parse(init.body);
  assert.deepEqual(Object.keys(body), ['profile'], 'no profile_data');
  assert.deepEqual(body.profile, profile);

  // What the route does with it: `const { profile } = await request.json()` is the saved profile.
  const route = read('app/api/user-profile/route.js');
  assert.match(route, /const profile = body\?\.profile;/);
  assert.match(route, /profile_data: profile\b/);
  const { profile: received } = JSON.parse(init.body);
  assert.deepEqual(received, profile, 'the route upserts the whole profile, not undefined');
});

test('the device copy follows profile.rememberOnDevice (inside the object ProfileModal saves)', async () => {
  const kept = fakeStorage();
  await saveProfile({ ...PROFILE, rememberOnDevice: true }, { signedIn: true, fetch: fakeFetch(), storage: kept });
  assert.deepEqual(kept.calls, [['set', PROFILE_KEY]]);
  assert.deepEqual(JSON.parse(kept.data.get(PROFILE_KEY)), { ...PROFILE, rememberOnDevice: true });

  const dropped = fakeStorage();
  dropped.data.set(PROFILE_KEY, 'old');
  await saveProfile({ ...PROFILE, rememberOnDevice: false }, { signedIn: true, fetch: fakeFetch(), storage: dropped });
  assert.deepEqual(dropped.calls, [['remove', PROFILE_KEY]]);
  assert.equal(dropped.data.has(PROFILE_KEY), false);
  assert.equal(PROFILE_KEY, 'opportumap_profile', 'the key the homepage and /jobs read back');
});

test('signed out: no request; failures never throw (no retry, the device copy still saved)', async () => {
  const fetch = fakeFetch();
  const storage = fakeStorage();
  assert.equal(await saveProfile({ ...PROFILE, rememberOnDevice: true }, { signedIn: false, fetch, storage }), false);
  assert.equal(fetch.sent.length, 0);
  assert.equal(storage.data.has(PROFILE_KEY), true);

  const down = fakeFetch(new Error('offline'));
  assert.equal(await saveProfile(PROFILE, { signedIn: true, fetch: down, storage: fakeStorage() }), false);
  assert.equal(down.sent.length, 1, 'asked once');
  assert.equal(await saveProfile(PROFILE, { signedIn: true, fetch: fakeFetch({ ok: false }), storage: fakeStorage() }), false);
  const blocked = fakeFetch();
  assert.equal(await saveProfile(PROFILE, { signedIn: true, fetch: blocked, storage: fakeStorage({ broken: true }) }), true);
  assert.equal(blocked.sent.length, 1, 'blocked storage does not stop the account copy');
});

test('the navbar\'s first-run profile and /jobs both save through lib/saveProfile.js', () => {
  const nav = read('app/components/Navbar.js');
  assert.match(nav, /import \{ saveProfile \} from '\.\.\/\.\.\/lib\/saveProfile\.js'/);
  assert.doesNotMatch(nav, /profile_data/, 'the navbar posts { profile }');
  assert.doesNotMatch(nav, /onSave=\{[^}]*\(\s*profile\s*,\s*rememberOnDevice\s*\)/, 'no second argument');
  assert.doesNotMatch(nav, /opportumap_profile|localStorage/, 'the device copy is the helper\'s');
  assert.match(nav, /onSave=\{\(profile\) => \{[\s\S]*?saveProfile\(profile, \{ signedIn: true \}\)/);
  assert.match(nav, /<ProfileModal\s+welcome\b/, 'the first-run profile is the welcome one (Skip, not "Edit your profile")');

  const jobs = read('app/components/jobs/JobsBoard.js');
  assert.match(jobs, /import \{ saveProfile as storeProfile \} from '\.\.\/\.\.\/\.\.\/lib\/saveProfile'/);
  assert.match(jobs, /storeProfile\(p, \{ signedIn: SESSION_COOKIE\.test\(document\.cookie\) \}\)/);
  assert.doesNotMatch(jobs, /'opportumap_profile'/, 'one profile key');
  assert.doesNotMatch(jobs, /\/api\/user-profile', \{\s*method: 'POST'/, 'no second copy of the POST');

  const modal = read('app/components/ProfileModal.js');
  assert.match(modal, /onSave\(\{ \.\.\.profile, resumeSummary, rememberOnDevice \}\)/, 'one object, the choice inside');
});

// ── I1: the dialog ────────────────────────────────────────────────────────────────────────────

test('ProfileModal is a kit Dialog: named by its title, Esc / backdrop close, focus goes back', () => {
  const src = read('app/components/ProfileModal.js');
  assert.match(src, /import Dialog from '\.\/kit\/Dialog'/);
  assert.match(src, /<Dialog\b[^>]*\bopen=\{open\}[^>]*\bonClose=\{onClose\}[^>]*\blabelledBy=\{id\('title'\)\}[^>]*\breturnFocusRef=\{returnFocusRef\}/s);
  assert.match(src, /<h2 id=\{id\('title'\)\}/);
  assert.doesNotMatch(src, /fixed inset-0|backdrop-blur|bg-black\//, 'no home-made overlay or blur');
  assert.doesNotMatch(src, /\btext-(?:xs|sm)\b|text-\[1[0-5]px\]/, 'no 12-15px text classes');
  assert.doesNotMatch(src, /paper-/, 'the hall, not the paper theme');
  assert.match(src, /import '\.\/ProfileModal\.css'/);

  // The kit Dialog is the one that traps focus and closes on Esc.
  const dialog = read('app/components/kit/Dialog.js');
  assert.match(dialog, /role="dialog"/);
  assert.match(dialog, /aria-modal="true"/);
  assert.match(dialog, /e\.key === 'Escape'/);
  assert.match(dialog, /e\.key !== 'Tab'/);

  const jobs = read('app/components/jobs/JobsBoard.js');
  assert.match(jobs, /<button ref=\{meRef\} type="button" className="jb-me"/);
  assert.match(jobs, /<ProfileModal\b[^\n]*returnFocusRef=\{meRef\}/,'focus back to "Set up profile" (iPhone taps do not focus it)');
});

test('every field has a label, and every control is a real button', () => {
  const src = read('app/components/ProfileModal.js');
  for (const name of ['name', 'nationality', 'home', 'skills', 'resume']) {
    assert.match(src, new RegExp(`htmlFor=\\{id\\('${name}'\\)\\}`), `${name} has a <label htmlFor>`);
    assert.match(src, new RegExp(`\\bid=\\{id\\('${name}'\\)\\}`), `${name} field has the id`);
  }
  assert.match(src, /aria-pressed=/, 'pills say whether they are on');
  assert.doesNotMatch(src, /<button(?![^>]*type="button")[^>]*>/, 'every button is type="button"');
  assert.doesNotMatch(src, /className="hidden"/, 'the file input stays reachable by keyboard');
});

test('ProfileModal.css: 16px fields, pills, buttons and text; tokens only; only transform moves', () => {
  const css = stripCss(read('app/components/ProfileModal.css'));
  const rule = (sel) => {
    const m = new RegExp(`(?:^|\\})\\s*${sel.replace(/[.[\]'()]/g, (c) => `\\${c}`)}\\s*\\{([^}]*)\\}`).exec(css);
    assert.ok(m, `${sel} rule`);
    return m[1];
  };
  const px = (body) => {
    const m = /font-size:\s*(\d+)px/.exec(body) || /font:\s*\d+\s+(\d+)px/.exec(body);
    return m ? Number(m[1]) : null;
  };
  for (const sel of ['.pm-input', '.pm-pill', '.pm-btn', '.pm-x', '.pm-text', '.pm-hint', '.pm-check', '.pm-welcome', '.pm-need', '.pm-drop-main']) {
    assert.equal(px(rule(sel)), 16, `${sel} is 16px`);
  }
  for (const m of css.matchAll(/font(?:-size)?:\s*(?:\d+\s+)?(\d+)px/g)) assert.ok(Number(m[1]) >= 12, `no text under 12px (${m[0]})`);
  for (const sel of ['.pm-input', '.pm-pill', '.pm-btn', '.pm-x', '.pm-check']) {
    const h = /min-height:\s*(\d+)px/.exec(rule(sel));
    assert.ok(h && Number(h[1]) >= 44, `${sel} is at least 44px tall`);
  }
  assert.doesNotMatch(css, /backdrop-filter|filter:/, 'no blur');
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i, 'palette tokens, no hex');
  assert.doesNotMatch(css, /\bvh\b/, 'no vh');
  for (const m of css.matchAll(/transition(?:-property)?\s*:\s*([^;]+);/g)) {
    for (const part of m[1].replace(/\([^)]*\)/g, '').split(',')) {
      assert.ok(['transform', 'opacity', 'none'].includes(part.trim().split(/\s+/)[0]), `transitions ${part.trim()}`);
    }
  }
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*transition: none/);
});

test('ProfileModal\'s copy has no country total and no flight / fare', () => {
  const src = read('app/components/ProfileModal.js');
  assert.doesNotMatch(src, /\ball \d+ countries\b|\b\d+\s+countries\b/i);
  assert.match(src, /search every country/);
  assert.doesNotMatch(src, /\b(?:flights?|fares?)\b/i);
  // The redesigned-surface copy scan (foundation.test.mjs) covers it too.
  assert.match(read('scripts/departures/__tests__/foundation.test.mjs'), /'app\/components\/ProfileModal\.js'/);
});
