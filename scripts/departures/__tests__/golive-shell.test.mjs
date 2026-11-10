// Go-live fix wave, group G4 (the site shell).
//   - PingTracker never breaks a page when site data is blocked (home-s1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
