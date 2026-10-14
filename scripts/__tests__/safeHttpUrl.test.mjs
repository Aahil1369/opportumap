// Only absolute http(s) URLs may become links.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const ROOT = new URL('../../', import.meta.url);
const { safeHttpUrl } = await import(new URL('lib/safeUrl.js', ROOT));

test('safeHttpUrl: http and https pass through (normalised)', () => {
  assert.equal(safeHttpUrl('https://jobs.example.org/apply?id=1'), 'https://jobs.example.org/apply?id=1');
  assert.equal(safeHttpUrl('http://example.org'), 'http://example.org/');
  assert.equal(safeHttpUrl('  https://example.org/x  '), 'https://example.org/x');
  assert.equal(safeHttpUrl('HTTPS://EXAMPLE.ORG/A'), 'https://example.org/A');
});

test('safeHttpUrl: script and data schemes are rejected', () => {
  assert.equal(safeHttpUrl('javascript:alert(2)'), null);
  assert.equal(safeHttpUrl(' JavaScript:alert(2)'), null);
  assert.equal(safeHttpUrl('java\tscript:alert(2)'), null);
  assert.equal(safeHttpUrl('data:text/html,<script>alert(1)</script>'), null);
  assert.equal(safeHttpUrl('vbscript:msgbox(1)'), null);
  assert.equal(safeHttpUrl('file:///etc/passwd'), null);
});

test('safeHttpUrl: relative and junk values are rejected', () => {
  assert.equal(safeHttpUrl('/jobs/1'), null);
  assert.equal(safeHttpUrl('//evil.example/x'), null);
  assert.equal(safeHttpUrl('jobs/1'), null);
  assert.equal(safeHttpUrl('https://'), null);
  assert.equal(safeHttpUrl(''), null);
  assert.equal(safeHttpUrl('   '), null);
  assert.equal(safeHttpUrl(null), null);
  assert.equal(safeHttpUrl(undefined), null);
  assert.equal(safeHttpUrl(42), null);
  assert.equal(safeHttpUrl({ href: 'https://example.org' }), null);
});

test('safeHttpUrl: quotes cannot break out of an attribute', () => {
  const out = safeHttpUrl('https://a.test/" onmouseover="alert(3)');
  assert.ok(out);
  assert.ok(!out.includes('"'), out);
  assert.ok(out.includes('%22'), out);
  assert.ok(!out.includes(' '), out);
});
