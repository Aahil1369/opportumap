// UUID validation before ids reach PostgREST filters (.or() strings in particular).
import { test } from 'node:test';
import assert from 'node:assert/strict';

const ROOT = new URL('../../', import.meta.url);
const { isUuid } = await import(new URL('lib/uuid.js', ROOT));

test('isUuid: accepts canonical UUIDs in either case', () => {
  assert.equal(isUuid('3c60e96c-18e0-4990-91b4-834acd70579e'), true);
  assert.equal(isUuid('3C60E96C-18E0-4990-91B4-834ACD70579E'), true);
  assert.equal(isUuid('00000000-0000-0000-0000-000000000000'), true);
});

test('isUuid: rejects filter-injection and malformed values', () => {
  assert.equal(isUuid('x),or(sender_id.neq.0'), false);
  assert.equal(isUuid('3c60e96c-18e0-4990-91b4-834acd70579e,receiver_id.neq.x'), false);
  assert.equal(isUuid('3c60e96c-18e0-4990-91b4-834acd70579e)'), false);
  assert.equal(isUuid(' 3c60e96c-18e0-4990-91b4-834acd70579e'), false);
  assert.equal(isUuid('{3c60e96c-18e0-4990-91b4-834acd70579e}'), false);
  assert.equal(isUuid('3c60e96c18e0499091b4834acd70579e'), false);
  assert.equal(isUuid('3c60e96c-18e0-4990-91b4-834acd70579g'), false);
  assert.equal(isUuid(''), false);
  assert.equal(isUuid(null), false);
  assert.equal(isUuid(undefined), false);
  assert.equal(isUuid(123), false);
});
