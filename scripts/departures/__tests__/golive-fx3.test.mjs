// Go-live fix wave, FX3: the visit ping works again, through the record_ping() database function.
//   - /api/ping sends one call to record_ping() with the browser's uuid and the page (200 chars at most),
//     and refuses anything that is not a uuid before the database is asked.
//   - It never throws: a 404 or a body that is not JSON answers { ok: false }.
//   - PingTracker repeats every 120 s only while the tab is visible and removes its listener on cleanup.
//   - db/site_pings_record_ping.sql is security definer with a pinned search_path and the grant line.
// This runs the real route with fetch stubbed: no network, no database.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

const UUID = '3f2b8c1e-9a4d-4e7b-8f10-0123456789ab';
const NO_CONTENT = () => new Response(null, { status: 204 });

const realFetch = globalThis.fetch;
const realEnv = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-not-real';

const calls = []; // { url, body } of each fetch the route makes
let reply = NO_CONTENT; // what the stub answers next
globalThis.fetch = async (url, init = {}) => {
  const body = typeof init.body === 'string' ? init.body : await new Response(init.body).text();
  calls.push({ url: String(url), body });
  return reply();
};

// Imported after the env and the stub are in place: lib/supabase.js reads both when it loads.
const { POST } = await import(new URL('../../../app/api/ping/route.js', import.meta.url));

after(() => {
  globalThis.fetch = realFetch;
  for (const [name, value] of [
    ['NEXT_PUBLIC_SUPABASE_URL', realEnv.url],
    ['NEXT_PUBLIC_SUPABASE_ANON_KEY', realEnv.key],
  ]) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

/** POST a raw body text to the route; resets the recorded calls and sets the stub's answer. */
async function post(text, answer = NO_CONTENT) {
  calls.length = 0;
  reply = answer;
  const res = await POST(
    new Request('http://localhost/api/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: text,
    }),
  );
  return res.json();
}

const send = (payload, answer) => post(JSON.stringify(payload), answer);

test('a valid uuid and page make exactly one record_ping() call and answer ok', async () => {
  const out = await send({ sessionId: UUID, page: '/jobs' });
  assert.deepEqual(out, { ok: true });
  assert.equal(calls.length, 1, 'one fetch');
  assert.ok(calls[0].url.endsWith('/rest/v1/rpc/record_ping'), `the database function (${calls[0].url})`);
  assert.deepEqual(JSON.parse(calls[0].body), { p_session_id: UUID, p_page: '/jobs' });
});

test('a page longer than 200 characters is sent as its first 200', async () => {
  const page = `/${'a'.repeat(299)}`;
  assert.equal(page.length, 300);
  await send({ sessionId: UUID, page });
  assert.equal(calls.length, 1);
  const sent = JSON.parse(calls[0].body).p_page;
  assert.equal(sent.length, 200);
  assert.equal(sent, page.slice(0, 200));
});

test('a missing, empty or non-string page is sent as /', async () => {
  for (const extra of [{}, { page: '' }, { page: 42 }, { page: null }, { page: ['/jobs'] }]) {
    await send({ sessionId: UUID, ...extra });
    assert.equal(calls.length, 1, `one fetch for ${JSON.stringify(extra)}`);
    assert.equal(JSON.parse(calls[0].body).p_page, '/', `page sent as / for ${JSON.stringify(extra)}`);
  }
});

test('a session id that is missing, not a string, or not a uuid never reaches the database', async () => {
  const bad = [{ page: '/' }, { sessionId: 42, page: '/' }, { sessionId: 'abc', page: '/' }, { sessionId: '1; drop table', page: '/' }];
  for (const payload of bad) {
    const out = await send(payload);
    assert.deepEqual(out, { ok: false }, JSON.stringify(payload));
    assert.equal(calls.length, 0, `no fetch for ${JSON.stringify(payload)}`);
  }
});

test('a database error (404 with a JSON body) answers { ok: false } and does not throw', async () => {
  const notFound = () => new Response(JSON.stringify({ code: '42501', message: 'permission denied' }), {
    status: 404,
    headers: { 'content-type': 'application/json' },
  });
  const out = await send({ sessionId: UUID, page: '/' }, notFound);
  assert.deepEqual(out, { ok: false });
  assert.equal(calls.length, 1, 'the call was made, and its error is answered quietly');
});

test('a body that is not JSON answers { ok: false } and makes no call', async () => {
  const out = await post('not json');
  assert.deepEqual(out, { ok: false });
  assert.equal(calls.length, 0);
});

test('PingTracker.js: repeats every 120 s, only while the tab is visible', () => {
  const src = read('app/components/PingTracker.js');
  assert.match(src, /const REPEAT_MS = 120_000;/);
  assert.doesNotMatch(src, /60000/, 'the old one-minute repeat is gone');
  assert.match(src, /setInterval\(\(\) => \{\s*if \(document\.visibilityState === 'visible'\) ping\(\);\s*\}, REPEAT_MS\);/);
  assert.match(src, /const onVisible = \(\) => \{\s*if \(document\.visibilityState === 'visible'\) ping\(\);\s*\};/);
});

test('PingTracker.js: the visibilitychange listener is removed in the cleanup', () => {
  const src = read('app/components/PingTracker.js');
  assert.match(src, /document\.addEventListener\('visibilitychange', onVisible\);/);
  assert.match(src, /return \(\) => \{\s*clearInterval\(interval\);\s*document\.removeEventListener\('visibilitychange', onVisible\);\s*\};/);
});

test('db/site_pings_record_ping.sql: security definer, pinned search_path, and the grant', () => {
  const sql = read('db/site_pings_record_ping.sql');
  assert.match(sql, /create or replace function public\.record_ping\(p_session_id text, p_page text\)/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /grant execute on function public\.record_ping\(text, text\) to anon, authenticated;/);
});
