// The departure lounge (/community) and the crew badge (/profile): the pure helpers.
// - lib/departures/lounge.js: who is looking (signed in / out / the check failed), the feed's
//   paging merge, initials, "3H AGO", "MEMBER SINCE OCT 2026", the post types' board words.
// - lib/community.js: what the posts/comments routes accept (caps, post types, tags) and the
//   like/follow edge that goes to the state the user asked for (a double tap never undoes it).
import { test } from 'node:test';
import assert from 'node:assert/strict';

const lounge = await import(new URL('../../../lib/departures/lounge.js', import.meta.url));
const community = await import(new URL('../../../lib/community.js', import.meta.url));

// ── who is looking ──────────────────────────────────────────────────────────────────────────

test('viewerFrom: a user is signed in; no session or a refused token is signed out', () => {
  const user = { id: 'u1' };
  assert.deepEqual(lounge.viewerFrom({ data: { user }, error: null }), { status: 'in', user });
  const missing = { name: 'AuthSessionMissingError', status: 400, message: 'Auth session missing!' };
  assert.deepEqual(lounge.viewerFrom({ data: { user: null }, error: missing }), { status: 'out', user: null });
  const expired = { name: 'AuthApiError', status: 403, message: 'invalid JWT' };
  assert.deepEqual(lounge.viewerFrom({ data: { user: null }, error: expired }), { status: 'out', user: null });
  assert.deepEqual(lounge.viewerFrom({ data: { user: null }, error: null }), { status: 'out', user: null });
});

test('viewerFrom: a network failure or a 5xx is "could not check", never "signed out"', () => {
  const offline = { name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' };
  assert.deepEqual(lounge.viewerFrom({ data: { user: null }, error: offline }), { status: 'error', user: null });
  const down = { name: 'AuthApiError', status: 503, message: 'unavailable' };
  assert.deepEqual(lounge.viewerFrom({ data: { user: null }, error: down }), { status: 'error', user: null });
  assert.deepEqual(lounge.viewerFrom(undefined), { status: 'error', user: null }, 'no result at all');
});

// ── the feed ────────────────────────────────────────────────────────────────────────────────

test('mergePosts appends the next page without repeating a post (offset paging shifts)', () => {
  const a = { id: 'a' }, b = { id: 'b' }, c = { id: 'c' };
  const prev = [a, b];
  const out = lounge.mergePosts(prev, [b, c]);
  assert.deepEqual(out.map((p) => p.id), ['a', 'b', 'c']);
  assert.deepEqual(prev.map((p) => p.id), ['a', 'b'], 'does not mutate');
  assert.deepEqual(lounge.mergePosts(prev, null).map((p) => p.id), ['a', 'b']);
  assert.deepEqual(lounge.mergePosts([], [a, a]).map((p) => p.id), ['a'], 'no duplicates within a page either');
});

test('prependPost puts a new post first, once', () => {
  const out = lounge.prependPost([{ id: 'a' }, { id: 'n' }], { id: 'n', title: 'new' });
  assert.deepEqual(out.map((p) => p.id), ['n', 'a']);
  assert.equal(out[0].title, 'new');
});

test('postType: the board word for each type; unknown types read as a story', () => {
  assert.equal(lounge.postType('story').word, 'STORY');
  assert.equal(lounge.postType('question').word, 'QUESTION');
  assert.equal(lounge.postType('job').word, 'JOB POST');
  assert.equal(lounge.postType('advice').word, 'ADVICE');
  assert.equal(lounge.postType('spam').value, 'story');
  assert.equal(lounge.postType(undefined).value, 'story');
  assert.deepEqual(lounge.POST_TYPES.map((t) => t.value), community.POST_TYPE_VALUES);
  for (const t of lounge.POST_TYPES) assert.ok(!/\b(?:flights?|fares?)\b/i.test(`${t.label} ${t.word}`));
});

test('initials: two letters from a display name, any script, never an empty avatar', () => {
  assert.equal(lounge.initials('Aisha Khan'), 'AK');
  assert.equal(lounge.initials('aisha'), 'A');
  assert.equal(lounge.initials('Member 3C60'), 'M3');
  assert.equal(lounge.initials('  Émile   zola  dupont '), 'ÉZ');
  assert.equal(lounge.initials('🚀 Rocket Team'), 'RT');
  assert.equal(lounge.initials(''), '?');
  assert.equal(lounge.initials(null), '?');
});

test('ago: short board times, absolute dates after a month, nothing for a bad date', () => {
  const now = Date.parse('2026-10-14T12:00:00Z');
  assert.equal(lounge.ago('2026-10-14T11:59:40Z', now), 'JUST NOW');
  assert.equal(lounge.ago('2026-10-14T11:55:00Z', now), '5M AGO');
  assert.equal(lounge.ago('2026-10-14T09:00:00Z', now), '3H AGO');
  assert.equal(lounge.ago('2026-10-10T12:00:00Z', now), '4D AGO');
  assert.equal(lounge.ago('2026-08-03T12:00:00Z', now), 'AUG 3');
  assert.equal(lounge.ago('2025-08-03T12:00:00Z', now), 'AUG 3, 2025');
  assert.equal(lounge.ago('2026-10-14T12:05:00Z', now), 'JUST NOW', 'a clock a little ahead');
  assert.equal(lounge.ago('nope', now), '');
  assert.equal(lounge.ago(null, now), '');
});

test('memberSince: month and year, in UTC, or nothing', () => {
  assert.equal(lounge.memberSince('2026-10-01T03:00:00Z'), 'OCT 2026');
  assert.equal(lounge.memberSince('2025-01-31T23:30:00Z'), 'JAN 2025');
  assert.equal(lounge.memberSince(''), '');
  assert.equal(lounge.memberSince(undefined), '');
  assert.equal(lounge.memberSince('garbage'), '');
});

test('crewNo: a badge number from the public user id (a label, not a count)', () => {
  assert.equal(lounge.crewNo('3c60e96c-18e0-4990-91b4-834acd70579e'), '3C60');
  assert.equal(lounge.crewNo(''), '');
  assert.equal(lounge.crewNo(null), '');
});

test('postsLabel: the user\'s own post count, with + when a full page came back', () => {
  assert.equal(lounge.postsLabel(0, false), '0');
  assert.equal(lounge.postsLabel(3, false), '3');
  assert.equal(lounge.postsLabel(20, true), '20+');
});

test('excerpt: long posts are cut on a word with an ellipsis; short ones are whole', () => {
  assert.deepEqual(lounge.excerpt('short post', 300), { text: 'short post', cut: false });
  const long = `${'word '.repeat(80)}end`;
  const out = lounge.excerpt(long, 300);
  assert.equal(out.cut, true);
  assert.ok(out.text.length <= 301);
  assert.ok(out.text.endsWith('…'));
  assert.ok(!/\s…$/.test(out.text), 'no space before the ellipsis');
  assert.deepEqual(lounge.excerpt(null, 300), { text: '', cut: false });
});

// ── what the routes accept ──────────────────────────────────────────────────────────────────

test('tagsFrom: comma list -> up to 5 clean tags, no #, no duplicates, each ≤ 24 characters', () => {
  assert.deepEqual(community.tagsFrom('visa, #Canada ,tech,,canada'), ['visa', 'Canada', 'tech']);
  assert.deepEqual(community.tagsFrom(['a', ' b ', '', 7]), ['a', 'b']);
  assert.equal(community.tagsFrom('a,b,c,d,e,f,g').length, 5);
  assert.equal(community.tagsFrom('x'.repeat(40))[0].length, 24);
  assert.deepEqual(community.tagsFrom(undefined), []);
});

test('postInput: trims, caps, checks the type; content is required', () => {
  const ok = community.postInput({ title: '  Hi  ', content: '  Moved to Toronto.  ', post_type: 'question', tags: 'visa, canada' });
  assert.deepEqual(ok, { value: { title: 'Hi', content: 'Moved to Toronto.', post_type: 'question', tags: ['visa', 'canada'] } });
  assert.equal(community.postInput({ content: 'x', post_type: 'nope' }).value.post_type, 'story');
  assert.equal(community.postInput({ content: 'x' }).value.title, null);
  assert.ok(community.postInput({ content: '   ' }).error);
  assert.ok(community.postInput(null).error);
  assert.ok(community.postInput({ content: 'x'.repeat(community.LIMITS.content + 1) }).error, 'too long is refused, not cut');
  assert.ok(community.postInput({ content: 'x', title: 'y'.repeat(community.LIMITS.title + 1) }).error);
  assert.ok(community.postInput({ content: 7 }).error);
});

test('commentInput: a post id and 1..LIMITS.comment characters', () => {
  assert.deepEqual(community.commentInput({ post_id: 'p1', content: ' hi ' }), { value: { post_id: 'p1', content: 'hi' } });
  assert.ok(community.commentInput({ post_id: 'p1', content: ' ' }).error);
  assert.ok(community.commentInput({ content: 'hi' }).error);
  assert.ok(community.commentInput({ post_id: 'p1', content: 'x'.repeat(community.LIMITS.comment + 1) }).error);
});

// ── likes and follows: go to the state the user asked for ───────────────────────────────────

function fakeEdge({ on, addError = null, dropError = null }) {
  const calls = [];
  return {
    calls,
    args: (want) => ({
      on,
      want,
      add: async () => { calls.push('add'); return { error: addError }; },
      drop: async () => { calls.push('drop'); return { error: dropError }; },
    }),
  };
}

test('setEdge: asked-for state wins; already there means no write (double taps are harmless)', async () => {
  let f = fakeEdge({ on: false });
  assert.deepEqual(await community.setEdge(f.args(true)), { on: true });
  assert.deepEqual(f.calls, ['add']);
  f = fakeEdge({ on: true });
  assert.deepEqual(await community.setEdge(f.args(true)), { on: true });
  assert.deepEqual(f.calls, [], 'already liked: nothing written');
  f = fakeEdge({ on: true });
  assert.deepEqual(await community.setEdge(f.args(false)), { on: false });
  assert.deepEqual(f.calls, ['drop']);
  f = fakeEdge({ on: false });
  assert.deepEqual(await community.setEdge(f.args(false)), { on: false });
  assert.deepEqual(f.calls, []);
});

test('setEdge: no asked-for state toggles (older clients)', async () => {
  let f = fakeEdge({ on: false });
  assert.deepEqual(await community.setEdge(f.args(undefined)), { on: true });
  f = fakeEdge({ on: true });
  assert.deepEqual(await community.setEdge(f.args('yes')), { on: false }, 'a non-boolean is no answer');
});

test('setEdge: a failed write is an error (never reported as done); a duplicate insert is done', async () => {
  const boom = { code: '42501', message: 'denied' };
  let f = fakeEdge({ on: false, addError: boom });
  assert.deepEqual(await community.setEdge(f.args(true)), { error: boom });
  f = fakeEdge({ on: true, dropError: boom });
  assert.deepEqual(await community.setEdge(f.args(false)), { error: boom });
  f = fakeEdge({ on: false, addError: { code: '23505', message: 'duplicate' } });
  assert.deepEqual(await community.setEdge(f.args(true)), { on: true });
});

test('wantFrom: only a real boolean in the body is an asked-for state', () => {
  assert.equal(community.wantFrom({ liked: true }, 'liked'), true);
  assert.equal(community.wantFrom({ liked: false }, 'liked'), false);
  assert.equal(community.wantFrom({ liked: 'false' }, 'liked'), undefined);
  assert.equal(community.wantFrom(null, 'liked'), undefined);
});
