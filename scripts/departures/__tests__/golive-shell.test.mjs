// Go-live fix wave, group G4 (the site shell).
//   - PingTracker never breaks a page when site data is blocked (home-s1).
//   - A link from a scrolled page lands at the top of the next page; smooth scrolling respects
//     reduced motion (home-s2).
//   - The 404, a page that throws and a root layout that throws all stay in the dark hall, and
//     none of them shows the error itself (Ruling R28, platform-7).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

// ── PingTracker (home-s1) ───────────────────────────────────────────────────────────────────

/** getSessionId() from PingTracker.js (this repo's own source), run against the given
    sessionStorage and crypto. */
function sessionIdWith(sessionStorage, crypto) {
  const src = read('app/components/PingTracker.js');
  const fn = src.match(/^function getSessionId\(\) \{\n[\s\S]*?\n\}$/m)?.[0];
  assert.ok(fn, 'PingTracker.js declares getSessionId()');
  return new Function('sessionStorage', 'crypto', `${fn}\nreturn getSessionId();`)(sessionStorage, crypto);
}

test('PingTracker: blocked site data gives no session id instead of an error', () => {
  const blocked = {
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('SecurityError'); },
  };
  assert.equal(sessionIdWith(blocked, { randomUUID: () => 'id-1' }), null, 'reading throws');
  const readOnly = { getItem: () => null, setItem() { throw new Error('QuotaExceededError'); } };
  assert.equal(sessionIdWith(readOnly, { randomUUID: () => 'id-1' }), null, 'writing throws');
  assert.equal(sessionIdWith({ getItem: () => null, setItem() {} }, {}), null, 'no crypto.randomUUID');
  // The storage read is inside the try, and the catch returns null.
  const src = read('app/components/PingTracker.js');
  assert.match(src, /try \{\s*let id = sessionStorage\.getItem\('om_session_id'\);[\s\S]*?\} catch \{\s*return null;/);
});

test('PingTracker: working storage still makes one id and keeps it', () => {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  let made = 0;
  const crypto = { randomUUID: () => `id-${++made}` };
  assert.equal(sessionIdWith(storage, crypto), 'id-1');
  assert.equal(store.get('om_session_id'), 'id-1');
  assert.equal(sessionIdWith(storage, crypto), 'id-1', 'the stored id is reused');
});

test('PingTracker: the effect stops before any ping when there is no session id', () => {
  const src = read('app/components/PingTracker.js');
  const effect = src.slice(src.indexOf('useEffect(() => {'));
  assert.match(effect, /const sessionId = getSessionId\(\);\n\s*if \(!sessionId\) return;/);
  assert.ok(effect.indexOf('if (!sessionId) return;') < effect.indexOf('fetch('), 'before the first fetch');
  assert.ok(effect.indexOf('if (!sessionId) return;') < effect.indexOf('setInterval('), 'before the timer starts');
});

// ── Route changes land at the top (home-s2) ─────────────────────────────────────────────────

const stripCss = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Every declaration of `prop` in a stylesheet, each with the rule and at-rules around it
    (outermost first). */
function declarations(css, prop) {
  const src = stripCss(css);
  const found = [];
  const open = [];
  let start = 0;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') {
      open.push(src.slice(start, i).trim().replace(/\s+/g, ' '));
      start = i + 1;
    } else if (ch === '}' || ch === ';') {
      const m = src.slice(start, i).match(/^\s*([\w-]+)\s*:\s*([\s\S]*?)\s*$/);
      if (m && m[1] === prop) found.push({ value: m[2], inside: [...open] });
      if (ch === '}') open.pop();
      start = i + 1;
    }
  }
  return found;
}

test('layout: <html> tells Next the page scrolls smoothly, so a route change jumps to the top', () => {
  // Next only switches smooth scrolling off for a route change when this attribute is there.
  assert.match(read('app/layout.js'), /<html\b[^>]*\bdata-scroll-behavior="smooth"/);
});

test('globals.css: smooth scrolling only for visitors who have not asked for reduced motion', () => {
  assert.deepEqual(declarations(read('app/globals.css'), 'scroll-behavior'), [
    { value: 'smooth', inside: ['@media (prefers-reduced-motion: no-preference)', 'html'] },
  ]);
});

// ── The 404 and the error pages stay in the hall (Ruling R28, platform-7) ───────────────────

const CRASH_PAGES = ['app/not-found.js', 'app/error.js', 'app/global-error.js'];
const stripJsComments = (src) => src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');

test('the 404, the page error and the global error each have their own file', () => {
  for (const f of CRASH_PAGES) assert.ok(existsSync(join(ROOT, f)), `${f} exists`);
});

test('not-found: a server page in the hall, with the navbar and a way on', () => {
  const src = read('app/not-found.js');
  assert.doesNotMatch(src, /^'use client'/, 'it can export metadata');
  assert.match(src, /export const metadata = \{[^}]*robots:\s*\{\s*index:\s*false\s*\}/, 'search engines skip it');
  assert.match(src, /<Navbar \/>\s*<PageShell\b/, 'the navbar, then the hall header');
  assert.match(src, /<Link href="\/jobs"/);
});

test('error.js and global-error.js are client components with a retry and a way home', () => {
  const page = read('app/error.js');
  assert.ok(page.startsWith("'use client'"), 'error.js starts with use client');
  assert.match(page, /<PageShell\b/, 'the hall header');
  assert.match(page, /<button type="button" onClick=\{\(\) => reset\(\)\}[^>]*>Try again<\/button>/);
  assert.match(page, /<Link href="\/"/);

  const root = read('app/global-error.js');
  assert.ok(root.startsWith("'use client'"), 'global-error.js starts with use client');
  // It replaces the root layout: its own document, and the global sheet for the palette classes.
  assert.match(root, /<html lang="en"/);
  assert.match(root, /<body\b[^>]*\bbg-hall\b[^>]*\btext-ink\b/, 'the hall, not a white page');
  assert.match(root, /^import '\.\/globals\.css';$/m);
  assert.match(root, /<button type="button" onClick=\{\(\) => reset\(\)\}[^>]*>\s*Try again\s*<\/button>/);
  assert.match(root, /<a href="\/"/, 'a plain link: the router may be what broke');
  assert.doesNotMatch(root, /from 'next\/link'|from '\.\/components\//, 'nothing that could throw again');
  // Phones: 16px text, 44px tap targets.
  assert.equal(root.match(/\bmin-h-\[44px\]/g)?.length, 2, 'the button and the link');
  for (const size of root.match(/\btext-\[(\d+)px\]/g) ?? []) {
    assert.ok(Number(size.match(/\d+/)[0]) >= 16, `${size} is at least 16px`);
  }
});

test('the crash pages never show the error itself, and keep the house copy rules', () => {
  for (const f of CRASH_PAGES) {
    const src = read(f);
    for (const leak of ['.message', '.stack', '.digest']) assert.ok(!src.includes(leak), `${f} reads ${leak}`);
    const code = stripJsComments(src);
    assert.doesNotMatch(code, /\{\s*error\b|\berror\s*[,}]/, `${f} does not take the error prop at all`);
    assert.doesNotMatch(code, /#[0-9a-f]{3,8}\b/i, `${f}: palette classes, no hex colours`);
    assert.doesNotMatch(code, /\bflights?\b|\bfares?\b/i, `${f}: never "flight" or "fare"`);
    assert.doesNotMatch(code, /[a-z]'[a-z]/i, `${f}: typographic apostrophes in copy`);
    assert.doesNotMatch(code, /\bstyle=/, `${f}: no inline styles`);
  }
});
