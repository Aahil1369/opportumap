// Task 15b, group S: the hangar (/startups), the departure lounge (/community), the crew badge
// (/profile) and gate chat (/messages) after wave 4's review. Behaviour tests on the pure
// modules (lib/startupViewer.js, lib/departures/{hangar,routeChip,gateChat}.js); source tests
// only for markup and CSS.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
/** Source without its comments (the headers describe what the code must not do). */
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/**
 * Every style rule of a stylesheet, comments removed, in source order:
 * { selectors: ['.a', '.b:hover'], body: 'color: red;', at: ['@media (hover: hover)', …] },
 * `at` being the @-rules it sits in, outermost first. Keyframe steps are not rules.
 */
function cssRules(css) {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  const open = [];
  let buf = '';
  for (const ch of src) {
    if (ch === '{') {
      open.push(buf.trim());
      buf = '';
    } else if (ch === '}') {
      const prelude = open.pop() ?? '';
      if (!prelude.startsWith('@') && !open.some((p) => p.startsWith('@keyframes'))) {
        rules.push({ selectors: prelude.split(',').map((s) => s.trim()), body: buf.trim(), at: [...open] });
      }
      buf = '';
    } else {
      buf += ch;
    }
  }
  return rules;
}

/** WCAG 2.x contrast of two #rrggbb colours. */
function contrast(a, b) {
  const lum = (hex) => {
    const [r, g, b2] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const c = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b2);
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** color-mix(in srgb, a p, b): #rrggbb. */
function mix(a, b, p) {
  const ch = (hex, i) => parseInt(hex.slice(i, i + 2), 16);
  return `#${[1, 3, 5].map((i) => Math.round(ch(a, i) * p + ch(b, i) * (1 - p)).toString(16).padStart(2, '0')).join('')}`;
}

const viewer = await import(new URL('../../../lib/startupViewer.js', import.meta.url));
const routeChip = await import(new URL('../../../lib/departures/routeChip.js', import.meta.url));
const gateChat = await import(new URL('../../../lib/departures/gateChat.js', import.meta.url));
const hangar = await import(new URL('../../../lib/departures/hangar.js', import.meta.url));
const { buildStartupInsert } = await import(new URL('../../../lib/startups.js', import.meta.url));

const SID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const ME = '3c60e96c-18e0-4990-91b4-834acd70579e';
const YOU = '11111111-2222-4333-8444-555555555555';

// ── M4: the stand's +1 PASSENGER / STANDBY ask for a state (setReaction → setEdge) ──────────

/** A stand-in for the cookie client: one reaction table, the rows in it, and the writes made. */
function fakeReactions({ rows = [], readError = null, insertError = null, deleteError = null } = {}) {
  const writes = [];
  const db = {
    from(table) {
      const filters = {};
      const chain = {
        select() {
          return chain;
        },
        eq(col, v) {
          filters[col] = v;
          return chain;
        },
        async maybeSingle() {
          if (readError) return { data: null, error: readError };
          const hit = rows.find((r) => r.startup_id === filters.startup_id && r.user_id === filters.user_id);
          return { data: hit ? { startup_id: hit.startup_id } : null, error: null };
        },
        insert(row) {
          writes.push({ op: 'insert', table, row });
          return Promise.resolve({ error: insertError });
        },
        delete() {
          const del = { op: 'delete', table, filters: {} };
          writes.push(del);
          const q = {
            eq(col, v) {
              del.filters[col] = v;
              return q;
            },
            then(resolve, reject) {
              return Promise.resolve({ error: deleteError }).then(resolve, reject);
            },
          };
          return q;
        },
      };
      return chain;
    },
  };
  return { db, writes };
}

const UP = 'startup_upvotes';
const ask = (f, want) => viewer.setReaction(f.db, { table: UP, startupId: SID, userId: ME, want });

test('M4 setReaction: the asked-for state wins; already there writes nothing (a stale tab never un-boards)', async () => {
  let f = fakeReactions({ rows: [{ startup_id: SID, user_id: ME }] });
  assert.deepEqual(await ask(f, true), { on: true });
  assert.deepEqual(f.writes, [], 'already on board: nothing written');

  f = fakeReactions();
  assert.deepEqual(await ask(f, true), { on: true });
  assert.deepEqual(f.writes, [{ op: 'insert', table: UP, row: { startup_id: SID, user_id: ME } }]);

  f = fakeReactions({ rows: [{ startup_id: SID, user_id: ME }] });
  assert.deepEqual(await ask(f, false), { on: false });
  assert.deepEqual(f.writes, [{ op: 'delete', table: UP, filters: { startup_id: SID, user_id: ME } }], 'by startup AND user');

  f = fakeReactions({ rows: [{ startup_id: SID, user_id: YOU }] }); // someone else's row is not mine
  assert.deepEqual(await ask(f, false), { on: false });
  assert.deepEqual(f.writes, [], 'not on board: stepping off writes nothing');
});

test('M4 setReaction: no asked-for state toggles (older clients); failures are errors; a duplicate insert is done', async () => {
  let f = fakeReactions();
  assert.deepEqual(await ask(f, undefined), { on: true });
  f = fakeReactions({ rows: [{ startup_id: SID, user_id: ME }] });
  assert.deepEqual(await ask(f, 'no'), { on: false }, 'a non-boolean is no answer');
  const boom = { code: 'XX000' };
  f = fakeReactions({ readError: boom });
  assert.deepEqual(await ask(f, true), { error: boom });
  assert.deepEqual(f.writes, [], 'a failed read writes nothing');
  f = fakeReactions({ insertError: boom });
  assert.deepEqual(await ask(f, true), { error: boom }, 'never reported as done');
  f = fakeReactions({ rows: [{ startup_id: SID, user_id: ME }], deleteError: boom });
  assert.deepEqual(await ask(f, false), { error: boom });
  f = fakeReactions({ insertError: { code: '23505' } });
  assert.deepEqual(await ask(f, true), { on: true }, 'a duplicate insert means it is already there');
});

test('M4 the stand sends the wanted state and both routes take it through setReaction', () => {
  const stand = code('app/components/startups/Stand.js');
  assert.match(stand, /body: JSON\.stringify\(\{ \[flag\]: !mine\[flag\] \}\)/, 'Stand.js asks for the opposite of what the button shows');
  const toggle = code('lib/startupToggle.js');
  assert.match(toggle, /wantFrom\(body, flag\)/, 'the route reads { upvoted } / { interested } from the body');
  assert.match(toggle, /setReaction\(db, \{/);
  assert.ok(!/\.insert\(|\.delete\(/.test(toggle), 'no blind toggle left in the route helper');
  for (const r of ['upvote', 'interest']) {
    assert.match(code(`app/api/startups/[id]/${r}/route.js`), /toggleStartupReaction\(request, params, \{/, `${r} passes the request (its body)`);
  }
});

// ── M7: the owner flag comes from the server ───────────────────────────────────────────────

test('M7 withOwner: the founder is told it is their own stand; nobody else is', () => {
  const mine = { upvoted: false, interested: true };
  assert.deepEqual(viewer.withOwner(mine, ME, ME), { upvoted: false, interested: true, owner: true });
  assert.deepEqual(viewer.withOwner(mine, YOU, ME), { upvoted: false, interested: true, owner: false });
  assert.equal(viewer.withOwner(mine, null, ME).owner, false, 'no founder id: not the owner');
  assert.equal(viewer.withOwner(mine, undefined, undefined).owner, false, 'no user: never the owner');
  assert.deepEqual(mine, { upvoted: false, interested: true }, 'does not mutate');
});

test('M7 GET /api/startups/[id] returns mine.owner and the stand uses it (not its own session check)', () => {
  assert.match(code('app/api/startups/[id]/route.js'), /mine: withOwner\(mine, data\.user_id, user\.id\)/);
  const stand = code('app/components/startups/Stand.js');
  assert.match(stand, /const isOwner = mine\?\.owner === true;/);
  assert.ok(!/user\.id === s\.user_id/.test(stand), 'no client-side owner guess');
});

// ── S2: the hangar and the stand share the lounge's session check ──────────────────────────

test('S2 /startups uses useSession: a failed check reads "couldn\'t check" with a retry, not signed out', () => {
  assert.equal(existsSync(join(ROOT, 'app/components/startups/useViewer.js')), false, 'useViewer.js is gone');
  for (const f of ['app/components/startups/Hangar.js', 'app/components/startups/Stand.js']) {
    const src = code(f);
    assert.match(src, /import \{ useSession \} from '\.\.\/community\/useSession';/, `${f} imports useSession`);
    assert.ok(!/useViewer|viewer\./.test(src), `${f} no longer uses useViewer`);
  }
  const hangarSrc = code('app/components/startups/Hangar.js');
  assert.match(hangarSrc, /session\.status === 'error' \? \(/, 'the post action has a "couldn\'t check" state');
  assert.match(hangarSrc, /onClick=\{session\.retry\}/, 'with a retry');
  assert.match(hangarSrc, /Couldn&apos;t check your sign-in\. Try again/);
  assert.match(code('app/components/startups/Stand.js'), /session\.status === 'in' \? session\.user\.id : session\.status === 'out' \? '' : undefined/);
});

// ── M6: the crew badge's route: a timeout, and a device copy tied to the account ───────────

test('M6 ownRouteFrom / ownRouteRecord: the kept route belongs to one account; junk never shows', () => {
  const rec = routeChip.ownRouteRecord(ME, { from: 'LHE', to: 'YYZ' });
  assert.deepEqual(routeChip.ownRouteFrom(rec, ME), { from: 'LHE', to: 'YYZ' });
  assert.equal(routeChip.ownRouteFrom(rec, YOU), null, 'another account on this device sees nothing');
  assert.equal(routeChip.ownRouteFrom(rec, undefined), null, 'no user: nothing');
  assert.equal(routeChip.ownRouteRecord(ME, null), null, 'no route: nothing to keep');
  assert.equal(routeChip.ownRouteRecord(null, { from: 'LHE', to: 'YYZ' }), null);
  assert.equal(routeChip.ownRouteRecord(ME, { from: 'LH', to: 'YYZ' }), null, 'only three-letter codes are kept');
  for (const junk of [
    null,
    '',
    'not json',
    '{}',
    '[]',
    'null',
    JSON.stringify({ userId: ME }),
    JSON.stringify({ userId: ME, ends: { from: 'lhe', to: 'YYZ' } }),
    JSON.stringify({ userId: ME, ends: { from: '<b>', to: 'YYZ' } }),
  ]) {
    assert.equal(routeChip.ownRouteFrom(junk, ME), null, String(junk));
  }
  assert.notEqual(routeChip.OWN_ROUTE_KEY, 'opportumap_profile', 'not the device-wide job profile');
});

test('M6 useOwnRoute: the profile request has a timeout; only this account\'s kept route is a fallback', () => {
  const own = code('app/components/community/useOwnRoute.js');
  assert.match(own, /fetchJson\('\/api\/user-profile', withTimeout\(\)\)/, 'a hung request ends (no endless "··· → ···")');
  assert.match(own, /AbortSignal\.timeout\(TIMEOUT_MS\)/);
  assert.ok(!/opportumap_profile/.test(own), 'the device-wide profile (no owner) is not read');
  assert.match(own, /ownRouteFrom\(window\.localStorage\.getItem\(OWN_ROUTE_KEY\), userId\)/);
  assert.match(own, /ownRouteRecord\(userId, ends\)/);
});

// ── S1: gate chat catches up after the phone sleeps ────────────────────────────────────────

test('S1 onPageVisible: calls back only when the page comes back into view, until cleaned up', () => {
  const doc = new EventTarget();
  doc.visibilityState = 'hidden';
  let calls = 0;
  const stop = gateChat.onPageVisible(() => {
    calls += 1;
  }, doc);
  doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(calls, 0, 'going into the background fetches nothing');
  doc.visibilityState = 'visible';
  doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(calls, 1);
  stop();
  doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(calls, 1, 'nothing after cleanup');
  const noop = gateChat.onPageVisible(() => {}, null);
  assert.equal(typeof noop, 'function', 'no document (a server render): a no-op cleanup');
  noop();
});

test('S1 the inbox and the open thread are fetched again when the page is visible again', () => {
  const island = code('app/components/messages/GateChat.js');
  assert.match(island, /return onPageVisible\(\(\) => \{[\s\S]{0,160}reloadQuietly\(\);/, 'GateChat reloads the inbox');
  assert.match(island, /cur\.status !== 'loading'/, 'not while the first load is out');
  const chat = code('app/components/StartupChat.js');
  assert.match(chat, /onPageVisible\(\(\) => \{[\s\S]{0,160}refresh\(\);/, 'StartupChat re-fetches the thread');
  assert.match(chat, /if \(statusRef\.current !== 'ready'\) return;/, 'only once the thread is on screen');
  assert.ok(!/addEventListener\('visibilitychange'/.test(chat), 'one visibility listener, through the tested helper');
});

// ── M1 / Ruling R14: the sector chips are filters, with no counts ──────────────────────────

test('M1 the hangar\'s chips carry no counts: no count helper, no count in the view or the markup', () => {
  assert.equal('sectorCounts' in hangar, false, 'the sector-count helper is gone');
  const view = hangar.hangarView([{ id: 'a', sector: 'AI', stage: 'seed', created_at: '2026-10-01T10:00:00Z' }], hangar.DEFAULT_FILTERS);
  assert.deepEqual(Object.keys(view), ['shown'], 'the view is the list to show, nothing counted');
  const page = code('app/components/startups/Hangar.js');
  assert.ok(!/\.counts\b|hg-chip-n|on the floor/.test(page), 'no count on or beside a chip');
  assert.match(page, /onClick=\{\(\) => toggle\('sector', s\)\} label=\{s\}>/, 'the sector chips still filter');
  assert.ok(!/\.hg-chip-n\b/.test(read('app/components/startups/startups.css')), 'no count style left');
});

// ── M2: the post form accepts any raise and a website without https:// ────────────────────

test('M2 websiteUrl: a website typed without a scheme gets https:// (the database wants ^https?://)', () => {
  assert.equal(hangar.websiteUrl('yourstartup.com'), 'https://yourstartup.com');
  assert.equal(hangar.websiteUrl('  www.yourstartup.com/about  '), 'https://www.yourstartup.com/about');
  assert.equal(hangar.websiteUrl('https://yourstartup.com'), 'https://yourstartup.com');
  assert.equal(hangar.websiteUrl('HTTP://yourstartup.com'), 'HTTP://yourstartup.com', 'a scheme in any case is kept');
  assert.equal(hangar.websiteUrl('ftp://yourstartup.com'), 'ftp://yourstartup.com', 'another scheme is left for the API to refuse');
  assert.equal(hangar.websiteUrl(''), '');
  assert.equal(hangar.websiteUrl('   '), '');
  assert.equal(hangar.websiteUrl(undefined), '');
});

test('M2 postPayload: 33,500 and a bare domain go through, and the API accepts them', () => {
  const draft = {
    ...hangar.EMPTY_DRAFT,
    name: 'NeuralHire', tagline: 'AI recruiting', description: 'We hire.', stage: 'seed', sector: 'AI',
    raise_amount: '33500', website: 'neuralhire.example',
  };
  const p = hangar.postPayload(draft);
  assert.equal(p.website, 'https://neuralhire.example');
  assert.equal(p.raise_amount, 33500);
  const { row, error } = buildStartupInsert(p, 'uid');
  assert.equal(error, undefined, 'the API accepts it');
  assert.equal(row.website, 'https://neuralhire.example/');
  assert.equal(hangar.postPayload({ ...draft, raise_amount: '750' }).raise_amount, 750);
  assert.equal(hangar.postPayload({ ...draft, website: '' }).website, '', 'no website: nothing sent');
  assert.equal(buildStartupInsert({ ...p, website: hangar.websiteUrl('ftp://x.example') }, 'uid').error, 'Website must be an http(s) link');
});

test('M2 the raise field takes any amount; the website field is text with the url keyboard', () => {
  const form = read('app/components/startups/PostStartup.js');
  const raise = /<input id="hg-raise"[^>]*>/.exec(form)?.[0] ?? '';
  assert.match(raise, /step="any"/, 'no browser bubble for 33,500 or 750');
  const web = /<input id="hg-website"[^>]*>/.exec(form)?.[0] ?? '';
  assert.match(web, /type="text"/);
  assert.match(web, /inputMode="url"/);
  assert.match(web, /autoComplete="url"/);
  assert.match(web, /autoCapitalize="none"/, 'iOS does not capitalise the link');
  assert.ok(!/type="url"/.test(web), 'no browser bubble for a link without https://');
});

// ── S3: no raw error text on the post form ─────────────────────────────────────────────────

test('S3 the post form shows friendly lines, never storage or network error text', () => {
  const form = code('app/components/startups/PostStartup.js');
  assert.ok(!/err\.message\}/.test(form), 'the deck message does not quote the storage error');
  assert.ok(!/err\?\.message \|\|/.test(form), 'no fallback to whatever the error says');
  assert.match(form, /err\?\.status === 400\s*\?\s*err\.message/, 'only the API\'s 400 answers (the field to fix) are shown');
  assert.match(form, /'Could not post your startup\. Check your connection and try again\.'/);
});

// ── T12-M6: equity and the founder's name are content, not 11px labels ─────────────────────

test('T12-M6 equity and the founder\'s name render at 16px (at least 14), apart from the 11px captions', () => {
  const stand = code('app/components/startups/Stand.js');
  assert.ok(!/RAISING\{equity/.test(stand), 'equity is no longer inside the 11px caption');
  assert.match(stand, /<span className="hg-pass-equity">\{equity\} equity offered<\/span>/);
  assert.match(stand, /<span className="hg-founder-name">\{s\.user_name\}<\/span>/);
  assert.ok(!/FOUNDER · \{s\.user_name\}/.test(stand));
  const rules = cssRules(read('app/components/startups/startups.css'));
  for (const sel of ['.hg-pass-equity', '.hg-founder-name']) {
    const rule = rules.find((r) => r.selectors.includes(sel));
    assert.ok(rule, `${sel} is styled`);
    const px = Number(/font-size:\s*(\d+)px/.exec(rule.body)?.[1] ?? /font:\s*\d{3}\s+(\d+)px/.exec(rule.body)?.[1]);
    assert.ok(px >= 14, `${sel} is ${px}px`);
  }
});

// ── T12-M8: the stands sit under an h2 ─────────────────────────────────────────────────────

test('T12-M8 the stand cards\' h3 headings have an h2 above them', () => {
  const page = code('app/components/startups/Hangar.js');
  assert.match(page, /<h2 id="hg-grid-h" className="sr-only">\s*Startups in the hangar\s*<\/h2>\s*<ul className="hg-grid" aria-labelledby="hg-grid-h">/);
  assert.match(code('app/components/startups/StandCard.js'), /<h3 className="hg-name">/);
});
