// Server-side entity decoding for job text. Safe only because every sink renders text.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const ROOT = new URL('../../', import.meta.url);
const { decodeEntities } = await import(new URL('lib/htmlEntities.js', ROOT));

test('decodeEntities: common named entities', () => {
  assert.equal(decodeEntities('Transportation Partners &amp; Logistics'), 'Transportation Partners & Logistics');
  assert.equal(decodeEntities('&lt;b&gt;Senior&lt;/b&gt;'), '<b>Senior</b>');
  assert.equal(decodeEntities('&quot;Lead&quot; &apos;Dev&apos;'), '"Lead" \'Dev\'');
  assert.equal(decodeEntities('A&nbsp;B'), 'A B');
  assert.equal(decodeEntities('Q&amp;A &ndash; Ops &mdash; R&amp;D&hellip;'), 'Q&A – Ops — R&D…');
});

test('decodeEntities: numeric entities (decimal and hex)', () => {
  assert.equal(decodeEntities('It&#39;s &#x27;fine&#x27;'), "It's 'fine'");
  assert.equal(decodeEntities('&#8364;50k'), '€50k');
  assert.equal(decodeEntities('&#x1F600;'), '😀');
});

test('decodeEntities: one pass only (no double decoding)', () => {
  assert.equal(decodeEntities('&amp;lt;script&amp;gt;'), '&lt;script&gt;');
});

test('decodeEntities: unknown or invalid entities are left alone', () => {
  assert.equal(decodeEntities('AT&T'), 'AT&T');
  assert.equal(decodeEntities('&bogus; &;'), '&bogus; &;');
  assert.equal(decodeEntities('&#0; &#xD800; &#1114112;'), '&#0; &#xD800; &#1114112;');
  assert.equal(decodeEntities('no entities here'), 'no entities here');
});

test('decodeEntities: non-strings pass through untouched', () => {
  assert.equal(decodeEntities(null), null);
  assert.equal(decodeEntities(undefined), undefined);
  assert.equal(decodeEntities(5), 5);
});
