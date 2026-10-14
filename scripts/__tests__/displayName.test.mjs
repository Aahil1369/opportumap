// Public display names: one helper, never built from an email address.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const ROOT = new URL('../../', import.meta.url);
const { displayName, realName } = await import(new URL('lib/displayName.js', ROOT));

const ID = '3c60e96c-18e0-4990-91b4-834acd70579e';
const user = (meta, id = ID) => ({ id, user_metadata: meta });

test('displayName: uses full_name, trimmed', () => {
  assert.equal(displayName(user({ full_name: '  Jane Doe  ' })), 'Jane Doe');
});

test('displayName: falls back to name when full_name is blank', () => {
  assert.equal(displayName(user({ full_name: '   ', name: 'Sam Lee' })), 'Sam Lee');
  assert.equal(displayName(user({ name: 'Sam Lee' })), 'Sam Lee');
});

test('displayName: a name that is (or contains) an email becomes "Member XXXX"', () => {
  assert.equal(displayName(user({ full_name: 'jane.doe1990@mail.test' })), 'Member 3C60');
  assert.equal(displayName(user({ full_name: 'Jane @ home' })), 'Member 3C60');
  // Same rule as the database trigger: the first non-blank name decides.
  assert.equal(displayName(user({ full_name: 'x@y.test', name: 'Jane' })), 'Member 3C60');
});

test('displayName: blank or missing names become "Member XXXX" from the user id', () => {
  assert.equal(displayName(user({})), 'Member 3C60');
  assert.equal(displayName(user({ full_name: '' })), 'Member 3C60');
  assert.equal(displayName(user(undefined)), 'Member 3C60');
  assert.equal(displayName(user({ full_name: 42 })), 'Member 3C60');
  assert.equal(displayName(user({}, 'abcd1234-0000-0000-0000-000000000000')), 'Member ABCD');
});

test('displayName: long names are cut to 60 characters (code points)', () => {
  const long = 'A'.repeat(80);
  assert.equal(displayName(user({ full_name: long })), 'A'.repeat(60));
  const emoji = '😀'.repeat(70);
  const out = displayName(user({ full_name: emoji }));
  assert.equal(Array.from(out).length, 60);
  assert.equal(out, '😀'.repeat(60));
});

test('displayName: missing user never throws and never shows an email', () => {
  assert.equal(displayName(null), 'Member');
  assert.equal(displayName(undefined), 'Member');
  assert.equal(displayName({}), 'Member');
});

test('displayName: ignores the email field entirely', () => {
  const u = { id: ID, email: 'someone@mail.test', user_metadata: {} };
  assert.equal(displayName(u), 'Member 3C60');
  assert.ok(!displayName(u).includes('someone'));
});

test('realName: the chosen name or empty string (for form pre-fill)', () => {
  assert.equal(realName(user({ full_name: ' Jane ' })), 'Jane');
  assert.equal(realName(user({ full_name: 'a@b.test' })), '');
  assert.equal(realName(user({})), '');
  assert.equal(realName(null), '');
});
