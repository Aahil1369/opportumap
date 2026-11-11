// The FX2 pins of the go-live fix wave: /contact copy, and the admin stats route's failed queries.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

test('/contact: the visible copy uses typographic apostrophes, not straight ones or &apos;', () => {
  const src = read('app/contact/page.js');
  assert.doesNotMatch(src, /'ll/, "no straight-apostrophe 'll (you'll)");
  assert.doesNotMatch(src, /&apos;/, 'no &apos; entity');
  assert.doesNotMatch(src, /what's/, "no straight-apostrophe what's");
  assert.match(src, /you’ll get a reply by email/, 'the sub line says you’ll');
  assert.match(src, /what’s on your mind/, 'the message placeholder says what’s');
});

test('/api/admin/stats: every query result is checked for an error, and a failure is a friendly 500', () => {
  const src = read('app/api/admin/stats/route.js');
  const queries = src.match(/const \[([\s\S]*?)\] = await Promise\.all/);
  assert.ok(queries, 'the queries are destructured together');
  const results = queries[1].split('\n').filter((line) => line.includes('{'));
  assert.equal(results.length, 7, 'seven query results');
  for (const line of results) assert.match(line, /\berror: \w+/, `checks the error: ${line.trim()}`);
  assert.match(src, /console\.error\('\[admin\/stats\]', /, 'logs the code or message on the server');
  assert.match(src, /return Response\.json\(\{ error: 'Could not load the stats' \}, \{ status: 500 \}\);/);
});
