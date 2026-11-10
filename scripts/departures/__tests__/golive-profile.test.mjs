// Go-live fix wave, group G1 (ruling R27): a member's profile loads and saves on the member's own
// session, and a saved edit is the profile the next page loads.
//
// /api/user-profile used to query public.user_profiles with the bare anon client (lib/supabase.js).
// That client carries no user, so row level security hid every row: the profile never loaded and the
// save failed while the route still answered { ok: true }. These tests run the route's own source
// against a stand-in session client, then pin the lines that carry the fix.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const ROUTE = 'app/api/user-profile/route.js';

const { dbErrorStatus } = await import(new URL('../../../lib/dbError.js', import.meta.url));

/**
 * The route's GET and POST, built from its source with the three imports handed in: `createClient`
 * answers a stand-in for the cookie (session) client that records every table call. Any other
 * client the source reaches for (the old module-level `supabase`) is not defined here and throws.
 */
function loadRoute({ hasSupabase = true, user = null, selected = { data: null, error: null }, upserted = { error: null } } = {}) {
  const calls = [];
  const db = {
    auth: { getUser: async () => ({ data: { user } }) },
    from(table) {
      return {
        select(columns) {
          return {
            eq(column, value) {
              return {
                maybeSingle: async () => {
                  calls.push(['select', table, columns, column, value]);
                  return selected;
                },
              };
            },
          };
        },
        upsert: async (row, options) => {
          calls.push(['upsert', table, row, options]);
          return upserted;
        },
      };
    },
  };
  const body = read(ROUTE)
    .replace(/^import .*$/gm, '')
    .replace(/^export (?=async function )/gm, '');
  const build = new Function('createClient', 'hasSupabase', 'dbErrorStatus', `${body}\nreturn { GET, POST };`);
  return { ...build(async () => db, hasSupabase, dbErrorStatus), calls };
}

const post = (body) =>
  new Request('http://localhost/api/user-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const MEMBER = { id: '00000000-0000-4000-8000-000000000001' };
const PROFILE = { name: 'Sam', nationality: 'Canadian', jobTypes: ['Design'], preferredCountries: ['ca'], skills: 'figma' };

test('G1 GET reads the member\'s own row on the session client; a failed read is an error, not "no profile"', async () => {
  const mine = loadRoute({ user: MEMBER, selected: { data: { profile_data: PROFILE }, error: null } });
  const got = await mine.GET();
  assert.equal(got.status, 200);
  assert.deepEqual(await got.json(), { profile: PROFILE });
  assert.deepEqual(mine.calls, [['select', 'user_profiles', 'profile_data', 'user_id', MEMBER.id]]);

  const none = await loadRoute({ user: MEMBER }).GET();
  assert.equal(none.status, 200);
  assert.deepEqual(await none.json(), { profile: null }, 'no row yet: no profile');

  const down = await loadRoute({ user: MEMBER, selected: { data: null, error: { code: '57014', message: 'canceling statement' } } }).GET();
  assert.equal(down.status, 500);
  assert.deepEqual(await down.json(), { error: 'Could not load your profile' }, 'friendly, and no { profile: null }');

  const signedOut = loadRoute({ user: null, selected: { data: { profile_data: PROFILE }, error: null } });
  assert.deepEqual(await (await signedOut.GET()).json(), { profile: null }, 'signed out: no profile');
  const noDatabase = loadRoute({ hasSupabase: false, user: MEMBER, selected: { data: { profile_data: PROFILE }, error: null } });
  assert.deepEqual(await (await noDatabase.GET()).json(), { profile: null }, 'no database configured: no profile');
  assert.deepEqual([...signedOut.calls, ...noDatabase.calls], [], 'and neither reads the table');
});

test('G1 POST upserts the member\'s own row on the session client; a failed write is never { ok: true }', async () => {
  const mine = loadRoute({ user: MEMBER });
  const saved = await mine.POST(post({ profile: PROFILE }));
  assert.equal(saved.status, 200);
  assert.deepEqual(await saved.json(), { ok: true });
  assert.equal(mine.calls.length, 1);
  const [kind, table, row, options] = mine.calls[0];
  assert.deepEqual([kind, table], ['upsert', 'user_profiles']);
  assert.deepEqual(Object.keys(row), ['user_id', 'profile_data', 'updated_at']);
  assert.equal(row.user_id, MEMBER.id);
  assert.deepEqual(row.profile_data, PROFILE);
  assert.equal(Number.isNaN(Date.parse(row.updated_at)), false);
  assert.deepEqual(options, { onConflict: 'user_id' });

  const refused = await loadRoute({ user: MEMBER, upserted: { error: { code: '42501', message: 'new row violates row-level security policy' } } })
    .POST(post({ profile: PROFILE }));
  assert.equal(refused.status, 403, 'an RLS refusal is a 403 (lib/dbError.js)');
  assert.deepEqual(await refused.json(), { error: 'Could not save your profile' });

  const broke = await loadRoute({ user: MEMBER, upserted: { error: { message: 'connection reset' } } }).POST(post({ profile: PROFILE }));
  assert.equal(broke.status, 500);
  assert.deepEqual(await broke.json(), { error: 'Could not save your profile' });

  const signedOut = loadRoute({ user: null });
  const turnedAway = await signedOut.POST(post({ profile: PROFILE }));
  assert.equal(turnedAway.status, 401, 'signed out: 401');
  assert.deepEqual(await turnedAway.json(), { error: 'Not authenticated' });
  const noDatabase = loadRoute({ hasSupabase: false, user: MEMBER });
  assert.equal((await noDatabase.POST(post({ profile: PROFILE }))).status, 503, 'no database configured: 503');
  assert.deepEqual([...signedOut.calls, ...noDatabase.calls], [], 'and neither writes');
});

test('G1 POST refuses a body with no profile object, or one too long to store, before any write', async () => {
  const route = loadRoute({ user: MEMBER });
  for (const body of ['not json', {}, { profile: null }, { profile: 'text' }, { profile: [PROFILE] }, { profile_data: PROFILE }]) {
    const res = await route.POST(post(body));
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.deepEqual(await res.json(), { error: 'Missing profile' });
  }
  const long = await route.POST(post({ profile: { ...PROFILE, skills: 'x'.repeat(50_000) } }));
  assert.equal(long.status, 413);
  assert.deepEqual(await long.json(), { error: 'That profile is too long to save' });
  assert.deepEqual(route.calls, []);
});

test('G1 the route source: the session client only, both results checked, no raw error text', () => {
  const route = read(ROUTE);
  assert.match(route, /^import \{ createClient \} from '\.\.\/\.\.\/\.\.\/lib\/supabase-server\.js';\r?$/m);
  assert.match(route, /^import \{ hasSupabase \} from '\.\.\/\.\.\/\.\.\/lib\/supabase\.js';\r?$/m, 'only the flag comes from lib/supabase.js');
  assert.doesNotMatch(route, /import \{[^}]*\bsupabase\b[^}]*\} from/, 'the bare anon client is not imported');
  assert.match(route, /^import \{ dbErrorStatus \} from '\.\.\/\.\.\/\.\.\/lib\/dbError\.js';\r?$/m);

  assert.equal(route.match(/const db = await createClient\(\);/g)?.length, 2, 'GET and POST each build the session client');
  assert.equal(route.match(/\.from\(/g)?.length, 2, 'two table queries');
  assert.equal(route.match(/await db\s*\.from\('user_profiles'\)/g)?.length, 2, 'both on the session client');

  assert.match(
    route,
    /const \{ data, error \} = await db\.from\('user_profiles'\)\.select\('profile_data'\)\.eq\('user_id', user\.id\)\.maybeSingle\(\);\r?\n\s*if \(error\) return Response\.json\(\{ error: 'Could not load your profile' \}, \{ status: 500 \}\);/,
    'the select checks its error',
  );
  assert.match(
    route,
    /const \{ error \} = await db\s*\.from\('user_profiles'\)\s*\.upsert\([^;]*\);\r?\n\s*if \(error\) return Response\.json\(\{ error: 'Could not save your profile' \}, \{ status: dbErrorStatus\(error\) \}\);/,
    'the upsert checks its error',
  );
  const signedOut = /export async function POST\(request\) \{[\s\S]*?if \(!user\) return Response\.json\(\{ error: 'Not authenticated' \}, \{ status: 401 \}\);[\s\S]*?\.upsert\(/;
  assert.match(route, signedOut, 'signed out is a 401, before the write');
  assert.doesNotMatch(route, /\b(?:err|error|e)\.message\b/, 'no raw database text reaches the visitor');
});

test('G1 the navbar: a failed profile read does not open the welcome profile', () => {
  const nav = read('app/components/Navbar.js');
  assert.match(
    nav,
    /const res = await fetch\('\/api\/user-profile'\);\r?\n\s*if \(!res\.ok\) return;\r?\n\s*const \{ profile \} = await res\.json\(\);/,
  );
});

test('G1 every save path keeps the saved profile for the next page (jobs-s1)', () => {
  for (const f of ['app/components/jobs/JobsBoard.js', 'app/components/map/ControlTower.js']) {
    const src = read(f);
    assert.match(src, /^import \{ keepHomeProfile, loadHomeProfile \} from '\.\.\/home\/homeProfile';\r?$/m, f);
    assert.match(
      src,
      /\n\s*keepHomeProfile\(p\);\r?\n\s*storeProfile\(p, \{ signedIn: SESSION_COOKIE\.test\(document\.cookie\) \}\);/,
      `${f}: kept just before it is stored`,
    );
  }
  const nav = read('app/components/Navbar.js');
  assert.match(nav, /^import \{ keepHomeProfile \} from '\.\/home\/homeProfile';\r?$/m);
  assert.match(nav, /\n\s*keepHomeProfile\(profile\);\r?\n\s*saveProfile\(profile, \{ signedIn: true \}\);/, 'the welcome save too');
});
