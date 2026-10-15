// /messages — gate chat: the pure helpers (lib/departures/gateChat.js) and the message-list
// helpers StartupChat uses for failed sends (app/components/chatMessages.js).
// - partnerOf / threadKey: one key per conversation (startup + the other person), the same
//   whether it comes from a message (from my side) or from an inbox row.
// - conversationsFrom: the inbox, grouped from the user's messages (GET /api/messages).
// - markOpened / bumpInbox: the unread badge clears when a thread opens; a new message moves its
//   conversation to the top and counts as unread unless that thread is open.
// - threadFromParams / draftThread: a ?startup=…&with=… deep link, checked before it opens.
// - partnerName / partnerRole / unreadLabel / dayLabel: what the list and the thread show.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const gc = await import(new URL('../../../lib/departures/gateChat.js', import.meta.url));
const chat = await import(new URL('../../../app/components/chatMessages.js', import.meta.url));

const ME = '7e57c0de-0000-4000-8000-000000000001';
const FOUNDER = '11111111-2222-4333-8444-555555555555';
const BACKER = '22222222-3333-4444-8555-666666666666';
const S1 = 'aaaaaaaa-bbbb-4ccc-8ddd-000000000001';
const S2 = 'aaaaaaaa-bbbb-4ccc-8ddd-000000000002';

const msg = (id, from, to, sid, at, extra = {}) => ({
  id,
  startup_id: sid,
  sender_id: from,
  receiver_id: to,
  content: `text ${id}`,
  read: false,
  created_at: at,
  ...extra,
});

// ── partnerOf / threadKey ───────────────────────────────────────────────────────────────────

test('partnerOf: the other side of a message, from either side; null when I am not in it', () => {
  assert.equal(gc.partnerOf(msg('m1', ME, FOUNDER, S1), ME), FOUNDER);
  assert.equal(gc.partnerOf(msg('m2', FOUNDER, ME, S1), ME), FOUNDER);
  assert.equal(gc.partnerOf(msg('m3', FOUNDER, BACKER, S1), ME), null, 'not my message');
  assert.equal(gc.partnerOf(msg('m4', ME, ME, S1), ME), null, 'a message to myself has no partner');
  assert.equal(gc.partnerOf(null, ME), null);
  assert.equal(gc.partnerOf(msg('m5', ME, FOUNDER, S1), ''), null, 'no me, no partner');
  assert.equal(gc.partnerOf({ sender_id: ME }, ME), null, 'no receiver');
});

test('threadKey: one key per startup + partner, the same from a message (either way) and an inbox row', () => {
  const sent = gc.threadKey(msg('m1', ME, FOUNDER, S1), ME);
  const got = gc.threadKey(msg('m2', FOUNDER, ME, S1), ME);
  const row = gc.threadKey({ startup_id: S1, other_user_id: FOUNDER });
  assert.equal(sent, `${S1}::${FOUNDER}`);
  assert.equal(got, sent);
  assert.equal(row, sent);
  assert.notEqual(gc.threadKey(msg('m3', ME, FOUNDER, S2), ME), sent, 'another startup is another thread');
  assert.notEqual(gc.threadKey(msg('m4', BACKER, ME, S1), ME), sent, 'another person is another thread');
  assert.equal(gc.threadKey(msg('m5', FOUNDER, BACKER, S1), ME), null, 'not mine');
  assert.equal(gc.threadKey({ other_user_id: FOUNDER }), null, 'no startup');
  assert.equal(gc.threadKey({ startup_id: S1 }), null, 'no partner');
  assert.equal(gc.threadKey(null, ME), null);
});

// ── the inbox ───────────────────────────────────────────────────────────────────────────────

const ROWS = [
  msg('a3', FOUNDER, ME, S1, '2026-10-14T10:05:00.000Z', { startups: { id: S1, name: 'NeuralHire', user_id: FOUNDER, user_name: 'Amna Rauf' } }),
  msg('a2', ME, FOUNDER, S1, '2026-10-14T10:00:00.000Z', { startups: { id: S1, name: 'NeuralHire', user_id: FOUNDER, user_name: 'Amna Rauf' } }),
  msg('a1', FOUNDER, ME, S1, '2026-10-14T09:00:00.000Z', { read: true, startups: { id: S1, name: 'NeuralHire', user_id: FOUNDER, user_name: 'Amna Rauf' } }),
  // I founded S2; a backer wrote to me there.
  msg('b2', ME, BACKER, S2, '2026-10-14T11:00:00+00:00', { startups: { id: S2, name: 'Kiln', user_id: ME, user_name: 'Test Pilot' } }),
  msg('b1', BACKER, ME, S2, '2026-10-14T08:00:00+00:00', { startups: { id: S2, name: 'Kiln', user_id: ME, user_name: 'Test Pilot' } }),
];

test('conversationsFrom: one row per thread, newest first, last message, unread = unread ones sent to me', () => {
  const list = gc.conversationsFrom(ROWS, ME);
  assert.equal(list.length, 2);
  const [kiln, neural] = list;
  assert.deepEqual(kiln, {
    startup_id: S2,
    startup_name: 'Kiln',
    startup_founder_id: ME,
    founder_name: 'Test Pilot',
    other_user_id: BACKER,
    last_id: 'b2',
    last_message: 'text b2',
    last_at: '2026-10-14T11:00:00+00:00',
    last_mine: true,
    unread: 1,
  });
  assert.equal(neural.other_user_id, FOUNDER);
  assert.equal(neural.founder_name, 'Amna Rauf');
  assert.equal(neural.last_id, 'a3');
  assert.equal(neural.last_mine, false);
  assert.equal(neural.unread, 1, 'a1 was read, a2 was mine');
});

test('conversationsFrom: any row order, mixed timestamp formats; skips rows that are not mine', () => {
  const shuffled = [ROWS[2], ROWS[4], ROWS[0], ROWS[3], ROWS[1], msg('x', FOUNDER, BACKER, S1, '2026-10-14T12:00:00Z')];
  const list = gc.conversationsFrom(shuffled, ME);
  assert.deepEqual(list.map((c) => c.last_id), ['b2', 'a3']);
  assert.deepEqual(gc.conversationsFrom(null, ME), []);
  assert.deepEqual(gc.conversationsFrom(ROWS, ''), []);
  const bare = gc.conversationsFrom([msg('c1', FOUNDER, ME, S1, '2026-10-14T10:00:00Z')], ME)[0];
  assert.equal(bare.startup_name, 'Unknown startup');
  assert.equal(bare.startup_founder_id, null);
  assert.equal(bare.founder_name, null);
});

test('markOpened: the unread badge clears for that thread only; nothing to clear keeps the list', () => {
  const list = gc.conversationsFrom(ROWS, ME);
  const key = gc.threadKey(list[1]);
  const after = gc.markOpened(list, key);
  assert.equal(after[1].unread, 0);
  assert.equal(after[0].unread, 1, 'the other thread keeps its badge');
  assert.equal(list[1].unread, 1, 'the input is not mutated');
  assert.equal(gc.markOpened(after, key), after, 'already clear: the same array');
  assert.equal(gc.markOpened(after, 'nope::nope'), after);
  assert.deepEqual(gc.markOpened(null, key), []);
});

test('bumpInbox: a new message moves its thread to the top; unread unless that thread is open', () => {
  const list = gc.conversationsFrom(ROWS, ME); // [Kiln, NeuralHire]
  const incoming = msg('a4', FOUNDER, ME, S1, '2026-10-14T12:00:00.000Z');
  const shut = gc.bumpInbox(list, incoming, ME);
  assert.equal(shut.known, true);
  assert.deepEqual(shut.list.map((c) => c.startup_name), ['NeuralHire', 'Kiln']);
  assert.equal(shut.list[0].unread, 2);
  assert.equal(shut.list[0].last_message, 'text a4');
  assert.equal(shut.list[0].last_mine, false);
  assert.equal(list[1].unread, 1, 'the input is not mutated');

  const open = gc.bumpInbox(list, incoming, ME, { openKey: gc.threadKey(list[1]) });
  assert.equal(open.list[0].unread, 0, 'read as it arrives in the open thread');

  const again = gc.bumpInbox(shut.list, incoming, ME);
  assert.equal(again.list, shut.list, 'the same message twice (a reconnect) counts once');

  const mine = gc.bumpInbox(list, msg('a5', ME, FOUNDER, S1, '2026-10-14T12:01:00.000Z'), ME);
  assert.equal(mine.list[0].unread, 1, 'my own message never adds to the badge');
  assert.equal(mine.list[0].last_mine, true);
});

test('bumpInbox: an older message counts but does not replace the newer last message', () => {
  const list = gc.conversationsFrom(ROWS, ME);
  const late = gc.bumpInbox(list, msg('a0', FOUNDER, ME, S1, '2026-10-14T08:30:00.000Z'), ME);
  const neural = late.list.find((c) => c.startup_id === S1);
  assert.equal(neural.last_id, 'a3');
  assert.equal(neural.unread, 2);
});

test('bumpInbox: an unknown thread is reported (the page reloads the inbox) or added from a draft', () => {
  const list = gc.conversationsFrom(ROWS, ME);
  const S3 = 'aaaaaaaa-bbbb-4ccc-8ddd-000000000003';
  const stranger = gc.bumpInbox(list, msg('n1', BACKER, ME, S3, '2026-10-14T12:00:00Z'), ME);
  assert.equal(stranger.known, false);
  assert.equal(stranger.list, list);

  const draft = { startup_id: S3, startup_name: 'Orbit', startup_founder_id: FOUNDER, founder_name: 'Amna Rauf', other_user_id: FOUNDER, last_id: null, last_message: '', last_at: null, last_mine: false, unread: 0 };
  const first = gc.bumpInbox(list, msg('n2', ME, FOUNDER, S3, '2026-10-14T12:00:00Z'), ME, { draft });
  assert.equal(first.known, true);
  assert.equal(first.list.length, 3);
  assert.equal(first.list[0].startup_name, 'Orbit');
  assert.equal(first.list[0].last_message, 'text n2');
  assert.equal(first.list[0].last_mine, true);

  const notMine = gc.bumpInbox(list, msg('n3', FOUNDER, BACKER, S1, '2026-10-14T12:00:00Z'), ME);
  assert.equal(notMine.known, true, 'not my message: nothing to do');
  assert.equal(notMine.list, list);
});

// ── deep links ──────────────────────────────────────────────────────────────────────────────

test('threadFromParams: ?startup=…&with=… with two UUIDs, else null', () => {
  const p = (s) => new URLSearchParams(s);
  assert.deepEqual(gc.threadFromParams(p(`startup=${S1}&with=${FOUNDER}`)), { startupId: S1, withId: FOUNDER });
  assert.equal(gc.threadFromParams(p(`startup=${S1}`)), null);
  assert.equal(gc.threadFromParams(p(`startup=${S1}&with=x),or(id.neq.0`)), null, 'never a crafted filter');
  assert.equal(gc.threadFromParams(p('')), null);
  assert.equal(gc.threadFromParams(null), null);
});

test('draftThread: a deep link opens only a conversation the founder is part of', () => {
  const startup = { id: S1, name: 'NeuralHire', user_id: FOUNDER, user_name: 'Amna Rauf' };
  const toFounder = gc.draftThread({ startupId: S1, withId: FOUNDER }, startup, ME);
  assert.deepEqual(toFounder, {
    conversation: {
      startup_id: S1,
      startup_name: 'NeuralHire',
      startup_founder_id: FOUNDER,
      founder_name: 'Amna Rauf',
      other_user_id: FOUNDER,
      last_id: null,
      last_message: '',
      last_at: null,
      last_mine: false,
      unread: 0,
    },
  });
  // The founder writing back to someone about their own startup.
  const mine = { ...startup, user_id: ME };
  assert.equal(gc.draftThread({ startupId: S1, withId: BACKER }, mine, ME).conversation.other_user_id, BACKER);
  assert.deepEqual(gc.draftThread({ startupId: S1, withId: ME }, mine, ME), { error: 'self' });
  assert.deepEqual(gc.draftThread({ startupId: S1, withId: BACKER }, startup, ME), { error: 'closed' }, 'two people, neither the founder');
  assert.deepEqual(gc.draftThread({ startupId: S1, withId: FOUNDER }, null, ME), { error: 'missing' });
  assert.deepEqual(gc.draftThread({ startupId: S2, withId: FOUNDER }, startup, ME), { error: 'missing' }, 'a different startup');
});

// ── what the list and the thread show ───────────────────────────────────────────────────────

test('partnerName: the founder by their public name; anyone else as "Member 1A2B" (never an email)', () => {
  const base = { startup_id: S1, startup_founder_id: FOUNDER };
  assert.equal(gc.partnerName({ ...base, other_user_id: FOUNDER, founder_name: '  Amna Rauf ' }), 'Amna Rauf');
  assert.equal(gc.partnerName({ ...base, other_user_id: FOUNDER, founder_name: '' }), 'Member 1111');
  assert.equal(gc.partnerName({ ...base, other_user_id: FOUNDER, founder_name: 'amna@mail.test' }), 'Member 1111');
  assert.equal(gc.partnerName({ ...base, startup_founder_id: ME, founder_name: 'Test Pilot', other_user_id: BACKER }), 'Member 2222');
  assert.equal(gc.partnerName({ startup_id: S1, other_user_id: 'abcd1234-0000-4000-8000-000000000000' }), 'Member ABCD');
  assert.equal(gc.partnerName(null), 'Member');
});

test('partnerRole: FOUNDER when you write to one, YOUR STAND when they write to you', () => {
  assert.equal(gc.partnerRole({ startup_founder_id: FOUNDER, other_user_id: FOUNDER }, ME), 'FOUNDER');
  assert.equal(gc.partnerRole({ startup_founder_id: ME, other_user_id: BACKER }, ME), 'YOUR STAND');
  assert.equal(gc.partnerRole({ startup_founder_id: null, other_user_id: BACKER }, ME), '');
  assert.equal(gc.partnerRole(null, ME), '');
});

test('unreadLabel: nothing for none, the number up to 9, then 9+', () => {
  assert.equal(gc.unreadLabel(0), '');
  assert.equal(gc.unreadLabel(-2), '');
  assert.equal(gc.unreadLabel(undefined), '');
  assert.equal(gc.unreadLabel('x'), '');
  assert.equal(gc.unreadLabel(1), '1');
  assert.equal(gc.unreadLabel(9), '9');
  assert.equal(gc.unreadLabel(10), '9+');
  assert.equal(gc.unreadLabel(250), '9+');
});

test('dayLabel: TODAY, YESTERDAY, then OCT 12 (with the year when it is another year), local dates', () => {
  const now = new Date(2026, 9, 14, 15, 0).getTime();
  assert.equal(gc.dayLabel(new Date(2026, 9, 14, 0, 5).toISOString(), now), 'TODAY');
  assert.equal(gc.dayLabel(new Date(2026, 9, 13, 23, 55).toISOString(), now), 'YESTERDAY');
  assert.equal(gc.dayLabel(new Date(2026, 9, 12, 9, 0).toISOString(), now), 'OCT 12');
  assert.equal(gc.dayLabel(new Date(2025, 11, 31, 9, 0).toISOString(), now), 'DEC 31, 2025');
  assert.equal(gc.dayLabel('not a date', now), '');
  assert.equal(gc.dayLabel(null, now), '');
});

// ── failed sends (chatMessages.js) ──────────────────────────────────────────────────────────

test('chat.markFailed / markPending: a failed send stays in the thread, marked, until retried or edited', () => {
  const tmp = { ...msg('tmp-1', ME, FOUNDER, S1, '2026-10-14T12:00:00Z'), pending: true };
  const list = [msg('m1', FOUNDER, ME, S1, '2026-10-14T11:00:00Z'), tmp];
  const failed = chat.markFailed(list, 'tmp-1');
  assert.deepEqual(failed.map((m) => m.id), ['m1', 'tmp-1'], 'kept in place');
  assert.equal(failed[1].failed, true);
  assert.equal(failed[1].pending, false);
  assert.equal(list[1].pending, true, 'the input is not mutated');
  const retry = chat.markPending(failed, 'tmp-1');
  assert.equal(retry[1].failed, false);
  assert.equal(retry[1].pending, true);
  assert.equal(chat.markFailed(list, 'nope'), list, 'unknown id: the same list');
  assert.equal(chat.markPending(list, 'nope'), list);
  // Retry succeeds: the server row takes the failed row's place.
  const server = msg('srv-1', ME, FOUNDER, S1, '2026-10-14T12:00:01Z');
  assert.deepEqual(chat.replaceTemp(retry, 'tmp-1', server).map((m) => m.id), ['m1', 'srv-1']);
});
