// Repo-wide guards over app/ and lib/ (client AND server code; the repo is public).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SHARED = await import(new URL('../../lib/admin.js', import.meta.url));
const TEXT = /\.(?:js|jsx|mjs|cjs|ts|tsx|json|css|md|html)$/;

function files(dir) {
  const out = [];
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, name);
    if (statSync(join(ROOT, rel)).isDirectory()) out.push(...files(rel));
    else if (TEXT.test(name)) out.push(rel);
  }
  return out;
}
const SOURCES = [...files('app'), ...files('lib')];
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const show = (rel) => relative(ROOT, join(ROOT, rel)).split(sep).join('/');

function hits(re) {
  const found = [];
  for (const f of SOURCES) {
    read(f).split(/\r?\n/).forEach((line, i) => {
      re.lastIndex = 0;
      if (re.test(line)) found.push(`${show(f)}:${i + 1}: ${line.trim().slice(0, 120)}`);
    });
  }
  return found;
}

test('scan covers the app (sanity)', () => {
  assert.ok(SOURCES.length > 50, `only ${SOURCES.length} files scanned`);
  assert.ok(SOURCES.some((f) => show(f) === 'app/components/Map.js'));
});

test('no raw-HTML sinks in app/ or lib/', () => {
  const re = /\b(?:setHTML|setHTMLUnsafe|innerHTML|outerHTML|insertAdjacentHTML|dangerouslySetInnerHTML|srcdoc)\b|document\.write\s*\(/i;
  assert.deepEqual(hits(re), []);
});

test('no email-address literals in app/ or lib/', () => {
  const re = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;
  assert.deepEqual(hits(re), []);
});

test('no display name is ever derived from an email', () => {
  assert.deepEqual(hits(/email\s*\??\.\s*split\(/), []);
  assert.deepEqual(hits(/split\(\s*['"]@['"]\s*\)/), []);
});

test('the signed-in user\'s email is not rendered on /community, /profile or the Navbar', () => {
  for (const f of ['app/community/page.js', 'app/profile/page.js', 'app/components/Navbar.js']) {
    assert.ok(!/\{\s*(?:user|currentUser|newUser)\??\.email\s*\}/.test(read(f)), `${f} renders an email`);
  }
});

test('admin and verified checks use the admin user id, not an email', () => {
  const { ADMIN_USER_ID, isAdminUser, isVerifiedUserId } = SHARED;
  assert.equal(ADMIN_USER_ID, '3c60e96c-18e0-4990-91b4-834acd70579e');
  assert.equal(isAdminUser({ id: ADMIN_USER_ID }), true);
  assert.equal(isAdminUser({ id: '11111111-2222-4333-8444-555555555555' }), false);
  assert.equal(isAdminUser(null), false);
  assert.equal(isVerifiedUserId(ADMIN_USER_ID), true);
  assert.equal(isVerifiedUserId('nope'), false);
  for (const f of ['app/components/Navbar.js', 'app/admin/page.js', 'app/api/admin/stats/route.js', 'app/api/ingest/route.js']) {
    const src = read(f);
    assert.match(src, /isAdminUser\(/, `${f} uses isAdminUser`);
    assert.ok(!/\.email\s*[!=]==/.test(src), `${f} compares an email`);
  }
  for (const f of ['app/profile/page.js', 'app/community/page.js']) {
    assert.match(read(f), /isVerifiedUserId\(/, `${f} uses isVerifiedUserId`);
  }
});

test('display names come from lib/displayName.js wherever they are built', () => {
  for (const f of [
    'app/api/community/posts/route.js', 'app/api/community/comments/route.js',
    'app/community/page.js', 'app/profile/page.js', 'app/components/Navbar.js',
  ]) {
    assert.match(read(f), /displayName\(/, `${f} uses displayName`);
  }
  assert.match(read('app/jobs/page.js'), /realName\(/);
  const follows = read('app/api/community/follows/route.js');
  assert.match(follows, /follower_name:\s*''/);
  assert.match(follows, /following_name:\s*''/);
});

test('AuthModal: the name field is required on sign-up', () => {
  const src = read('app/components/AuthModal.js');
  assert.match(src, /placeholder="Your name"[^>]*\brequired\b/s);
});

