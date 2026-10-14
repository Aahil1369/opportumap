// Contact form -> Netlify Forms: urlencoded body to the static /__forms.html skeleton.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const {
  encodeContactForm, submitContactForm, CONTACT_LIMITS, CONTACT_ENDPOINT, CONTACT_FORM_NAME,
} = await import(new URL('lib/contactForm.js', ROOT));

const FIELDS = { name: 'Ada', email: 'ada@mail.test', subject: 'Hi', message: 'Hello' };

test('encodeContactForm: form-name + honeypot + the four fields, urlencoded', () => {
  const body = encodeContactForm({ ...FIELDS, botField: '' });
  assert.equal(typeof body, 'string');
  const p = new URLSearchParams(body);
  assert.equal(p.get('form-name'), 'contact');
  assert.equal(p.get('bot-field'), '');
  assert.equal(p.get('name'), 'Ada');
  assert.equal(p.get('email'), 'ada@mail.test');
  assert.equal(p.get('subject'), 'Hi');
  assert.equal(p.get('message'), 'Hello');
  assert.deepEqual([...p.keys()].sort(), ['bot-field', 'email', 'form-name', 'message', 'name', 'subject']);
  assert.equal(CONTACT_FORM_NAME, 'contact');
});

test('encodeContactForm: special characters survive the round trip', () => {
  const message = 'a&b=c+d %20 100% "q" <tag>\nline 2 — ünïcode 😀';
  const p = new URLSearchParams(encodeContactForm({ ...FIELDS, message }));
  assert.equal(p.get('message'), message);
  // The raw body must not carry a bare & or = from the user text.
  assert.equal(encodeContactForm({ ...FIELDS, message: 'x&form-name=evil' }).split('&').length, 6);
});

test('encodeContactForm: caps every field at the input limits', () => {
  assert.deepEqual(CONTACT_LIMITS, { name: 100, email: 254, subject: 150, message: 5000 });
  const p = new URLSearchParams(encodeContactForm({
    name: 'n'.repeat(500), email: 'e'.repeat(500), subject: 's'.repeat(500), message: 'm'.repeat(9000),
  }));
  assert.equal(p.get('name').length, 100);
  assert.equal(p.get('email').length, 254);
  assert.equal(p.get('subject').length, 150);
  assert.equal(p.get('message').length, 5000);
});

test('encodeContactForm: missing values become empty strings, never "undefined"', () => {
  const p = new URLSearchParams(encodeContactForm({}));
  for (const k of ['name', 'email', 'subject', 'message', 'bot-field']) assert.equal(p.get(k), '');
});

test('submitContactForm: POSTs urlencoded to /__forms.html', async () => {
  const calls = [];
  const fakeFetch = async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200 }; };
  await submitContactForm({ ...FIELDS, botField: '' }, fakeFetch);
  assert.equal(CONTACT_ENDPOINT, '/__forms.html');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/__forms.html');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers['Content-Type'], 'application/x-www-form-urlencoded');
  assert.equal(new URLSearchParams(calls[0].init.body).get('form-name'), 'contact');
});

test('submitContactForm: a non-2xx response or a network error throws', async () => {
  await assert.rejects(submitContactForm(FIELDS, async () => ({ ok: false, status: 404 })));
  await assert.rejects(submitContactForm(FIELDS, async () => ({ ok: false, status: 500 })));
  await assert.rejects(submitContactForm(FIELDS, async () => { throw new TypeError('Failed to fetch'); }));
});

test('public/__forms.html: static skeleton Netlify can detect, same fields as the encoder', () => {
  const html = read('public/__forms.html');
  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /<form[^>]*\bname="contact"/);
  assert.match(html, /<form[^>]*\bdata-netlify="true"/);
  assert.match(html, /<form[^>]*\bnetlify-honeypot="bot-field"/);
  assert.match(html, /<input[^>]*type="hidden"[^>]*name="form-name"[^>]*value="contact"/);
  const names = [...html.matchAll(/<(?:input|textarea)[^>]*\bname="([^"]+)"/g)].map((m) => m[1]).sort();
  const sent = [...new URLSearchParams(encodeContactForm(FIELDS)).keys()].sort();
  assert.deepEqual(names, sent);
});

test('contact page: real submit, honeypot, limits, error state, no dead address or fake copy', () => {
  const src = read('app/contact/page.js');
  assert.ok(!/setTimeout\(r,\s*1200\)/.test(src), 'simulated send is gone');
  assert.match(src, /submitContactForm\(/);
  assert.match(src, /bot-field|botField/);
  assert.match(src, /tabIndex=\{-1\}/);
  for (const k of ['name', 'email', 'subject', 'message']) {
    assert.match(src, new RegExp(`maxLength=\\{CONTACT_LIMITS\\.${k}\\}`), `maxLength on ${k}`);
  }
  assert.match(src, /Could not send — please try again\./);
  assert.ok(!src.includes('hello@opportumap.com'));
  assert.ok(!src.includes('data-netlify'), 'data-netlify belongs on the static skeleton only');
  const copy = read('app/lib/pageCopy.js');
  assert.ok(!/We read every email/i.test(copy));
});

test('proxy.js: the session-refresh matcher skips /__forms.html', async () => {
  const src = read('proxy.js');
  const m = src.match(/matcher:\s*\[\s*'([^']+)'/);
  assert.ok(m, 'matcher string found');
  const pattern = new RegExp(`^${m[1].replace(/\\\\/g, '\\')}$`);
  assert.equal(pattern.test('/__forms.html'), false);
  assert.equal(pattern.test('/community'), true);
  assert.equal(pattern.test('/api/startups'), true);
});
