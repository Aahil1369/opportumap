// Startups + messages: insert row matches the DB column grants, DB errors map to sane
// statuses, the chat merges server rows/realtime safely, and fetches fail loudly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const { buildStartupInsert, STARTUP_INSERT_COLUMNS } = await import(new URL('lib/startups.js', ROOT));
const { dbErrorStatus } = await import(new URL('lib/dbError.js', ROOT));
const { fetchJson } = await import(new URL('lib/fetchJson.js', ROOT));
const chat = await import(new URL('app/components/chatMessages.js', ROOT));

const UID = '3c60e96c-18e0-4990-91b4-834acd70579e';
const OTHER = '11111111-2222-4333-8444-555555555555';
const SID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const BASE = { name: 'NeuralHire', tagline: 'AI recruiting', description: 'We hire.', stage: 'seed', sector: 'AI' };

test('STARTUP_INSERT_COLUMNS: exactly the columns granted in db/startups_rls_lockdown.sql', () => {
  const sql = read('db/startups_rls_lockdown.sql');
  const m = sql.match(/grant insert \(([^)]+)\) on public\.startups/);
  assert.ok(m, 'insert grant found');
  const granted = m[1].split(',').map((s) => s.trim()).sort();
  assert.deepEqual([...STARTUP_INSERT_COLUMNS].sort(), granted);
  for (const c of ['user_name', 'upvote_count', 'interest_count', 'id', 'created_at']) {
    assert.ok(!STARTUP_INSERT_COLUMNS.includes(c), `${c} must not be client-set`);
  }
});

test('buildStartupInsert: never sends user_name or counters, user_id from the session', () => {
  const { row, error } = buildStartupInsert({
    ...BASE, user_name: 'Spoofed', upvote_count: 999, interest_count: 999, user_id: OTHER, id: SID,
  }, UID);
  assert.equal(error, undefined);
  assert.equal(row.user_id, UID);
  for (const k of Object.keys(row)) assert.ok(STARTUP_INSERT_COLUMNS.includes(k), `unexpected column ${k}`);
  assert.ok(!('user_name' in row) && !('upvote_count' in row) && !('interest_count' in row));
});

test('buildStartupInsert: trims text and nulls empty optionals', () => {
  const { row } = buildStartupInsert({ ...BASE, name: '  NeuralHire  ', website: '', location: '  ', raise_amount: '' }, UID);
  assert.equal(row.name, 'NeuralHire');
  assert.equal(row.website, null);
  assert.equal(row.location, null);
  assert.equal(row.raise_amount, null);
  assert.equal(row.pitch_deck_url, null);
});

test('buildStartupInsert: rejects missing fields, over-long text, bad URLs, bad numbers', () => {
  assert.ok(buildStartupInsert({ ...BASE, name: '' }, UID).error);
  assert.ok(buildStartupInsert({ ...BASE, sector: '   ' }, UID).error);
  assert.ok(buildStartupInsert({ ...BASE, name: 'x'.repeat(121) }, UID).error);
  assert.ok(buildStartupInsert({ ...BASE, tagline: 'x'.repeat(201) }, UID).error);
  assert.ok(buildStartupInsert({ ...BASE, description: 'x'.repeat(5001) }, UID).error);
  assert.ok(buildStartupInsert({ ...BASE, website: 'javascript:alert(1)' }, UID).error);
  assert.ok(buildStartupInsert({ ...BASE, pitch_deck_url: 'data:application/pdf,x' }, UID).error);
  assert.ok(buildStartupInsert({ ...BASE, team_size: 'lots' }, UID).error);
  assert.ok(buildStartupInsert({ ...BASE, raise_amount: -5 }, UID).error);
  assert.ok(buildStartupInsert(null, UID).error);
  const ok = buildStartupInsert({ ...BASE, website: 'https://neuralhire.example', team_size: '3', raise_amount: 500000 }, UID);
  assert.equal(ok.error, undefined);
  assert.equal(ok.row.website, 'https://neuralhire.example/');
  assert.equal(ok.row.team_size, 3);
  assert.equal(ok.row.raise_amount, 500000);
});

test('dbErrorStatus: RLS 403, FK 404, constraint 400, otherwise 500', () => {
  assert.equal(dbErrorStatus({ code: '42501' }), 403);
  assert.equal(dbErrorStatus({ code: '23503' }), 404);
  assert.equal(dbErrorStatus({ code: '23514' }), 400);
  assert.equal(dbErrorStatus({ code: '22001' }), 400);
  assert.equal(dbErrorStatus({ code: '22P02' }), 400);
  assert.equal(dbErrorStatus({ code: 'XX000' }), 500);
  assert.equal(dbErrorStatus(null), 500);
});

test('fetchJson: resolves JSON on 2xx, rejects on non-2xx, bad JSON, or network error', async () => {
  const orig = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('{"a":1}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    assert.deepEqual(await fetchJson('/x'), { a: 1 });
    globalThis.fetch = async () => new Response('<html>502</html>', { status: 502 });
    await assert.rejects(fetchJson('/x'));
    globalThis.fetch = async () => new Response('{"error":"nope"}', { status: 500 });
    await assert.rejects(fetchJson('/x'), /nope/);
    globalThis.fetch = async () => new Response('not json', { status: 200 });
    await assert.rejects(fetchJson('/x'));
    globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
    await assert.rejects(fetchJson('/x'));
  } finally {
    globalThis.fetch = orig;
  }
});

const msg = (id, from, to, sid = SID) => ({ id, sender_id: from, receiver_id: to, startup_id: sid, content: id, created_at: '2026-10-13T00:00:00Z' });

test('chat.acceptIncoming: only the open conversation, never your own echo', () => {
  const ctx = { currentUserId: UID, otherUserId: OTHER, startupId: SID };
  assert.equal(chat.acceptIncoming(msg('m1', OTHER, UID), ctx), true);
  assert.equal(chat.acceptIncoming(msg('m2', UID, OTHER), ctx), false, 'own echo');
  assert.equal(chat.acceptIncoming(msg('m3', '99999999-2222-4333-8444-555555555555', UID), ctx), false, 'another investor');
  assert.equal(chat.acceptIncoming(msg('m4', OTHER, UID, '00000000-0000-4000-8000-000000000000'), ctx), false, 'another startup');
  assert.equal(chat.acceptIncoming(null, ctx), false);
});

test('chat.appendUnique: de-duplicates by id', () => {
  const list = [msg('m1', OTHER, UID)];
  assert.equal(chat.appendUnique(list, msg('m1', OTHER, UID)), list);
  assert.deepEqual(chat.appendUnique(list, msg('m2', OTHER, UID)).map((m) => m.id), ['m1', 'm2']);
});

test('chat.replaceTemp: swaps the optimistic row for the server row, once', () => {
  const tmp = { ...msg('tmp-1', UID, OTHER), pending: true };
  const list = [msg('m1', OTHER, UID), tmp];
  const server = msg('srv-9', UID, OTHER);
  assert.deepEqual(chat.replaceTemp(list, 'tmp-1', server).map((m) => m.id), ['m1', 'srv-9']);
  // If the server row is somehow already there, the temp row is just dropped.
  assert.deepEqual(chat.replaceTemp([...list, server], 'tmp-1', server).map((m) => m.id), ['m1', 'srv-9']);
  // On failure (no server row) the temp row is removed.
  assert.deepEqual(chat.replaceTemp(list, 'tmp-1', null).map((m) => m.id), ['m1']);
});

const ROUTES = [
  'app/api/startups/route.js',
  'app/api/startups/[id]/route.js',
  'app/api/startups/[id]/upvote/route.js',
  'app/api/startups/[id]/interest/route.js',
  'app/api/messages/route.js',
  'app/api/messages/[startupId]/route.js',
];

test('startups + messages routes: the user session client only, no manual counters', () => {
  for (const r of [...ROUTES, 'lib/startupToggle.js']) {
    const src = read(r);
    assert.match(src, /supabase-server\.js|lib\/startupToggle\.js/, `${r} uses the cookie client`);
    assert.ok(!/\bsupabase\s*\.\s*(from|rpc|storage)\s*\(/.test(src), `${r} must not query with the anon client`);
    assert.ok(!/upvote_count\s*:|interest_count\s*:/.test(src), `${r} must not write counters`);
    assert.ok(!/user_name/.test(src), `${r} must not set user_name`);
  }
});

test('upvote/interest routes: duplicate insert (23505) means "already done", ids validated', () => {
  for (const r of ['app/api/startups/[id]/upvote/route.js', 'app/api/startups/[id]/interest/route.js']) {
    assert.match(read(r), /toggleStartupReaction\(/, `${r} uses the shared toggle`);
  }
  const toggle = read('lib/startupToggle.js');
  assert.match(toggle, /'23505'/, 'toggle treats 23505 as already done');
  assert.match(toggle, /isUuid\(id\)/, 'toggle validates the startup id');
  assert.match(toggle, /\.\/supabase-server\.js/, 'toggle uses the cookie client');
  const thread = read('app/api/messages/[startupId]/route.js');
  assert.match(thread, /isUuid\(startupId\)/);
  assert.match(thread, /isUuid\(otherId\)/);
});

test('pages never spin forever: fetches go through fetchJson with an error state', () => {
  for (const p of ['app/startups/page.js', 'app/startups/[id]/page.js', 'app/messages/page.js', 'app/components/StartupChat.js', 'app/community/page.js']) {
    const src = read(p);
    assert.match(src, /fetchJson\(/, `${p} uses fetchJson`);
    assert.match(src, /\.catch\(/, `${p} handles failures`);
    assert.ok(!/\.then\(\(r\) => r\.json\(\)\)/.test(src), `${p} has no unchecked r.json()`);
  }
});

test('StartupModal: pitch-deck upload does not overwrite and surfaces errors', () => {
  const src = read('app/components/StartupModal.js');
  assert.match(src, /upsert:\s*false/);
  assert.ok(!/catch\s*\{\s*\}/.test(src), 'no silent catch {}');
  assert.match(src, /setError\(/);
});
