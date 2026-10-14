// Contact form -> POST /api/contact -> public.submit_contact() -> the admin inbox.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const {
  validateContact, contactErrorResponse, handleContactSubmission, submitContact, mailtoHref,
  CONTACT_LIMITS, CONTACT_ENDPOINT, CONTACT_MAX_BODY, SEND_FAILED,
} = await import(new URL('lib/contactForm.js', new URL('../../', import.meta.url)));
const { FOOTNOTES } = await import(new URL('app/lib/pageCopy.js', new URL('../../', import.meta.url)));

const SQL = read('db/contact_messages_inbox.sql');
const VALID = { name: 'Ada', email: 'ada.private@mail.test', subject: 'Hi', message: 'Secret message body 123' };
const TOO_MANY = "You've sent a few messages already — please try again in an hour.";
const BUSY = "We're getting a lot of messages — please try again later.";

// ---------- validateContact ----------

test('validateContact: a valid message passes, every field trimmed, honeypot not in values', () => {
  const r = validateContact({
    name: '  Ada  ', email: ' ada.private@mail.test\n', subject: '\tHi ', message: '\n  Line 1\n\nLine 2  \n', company: '',
  });
  assert.deepEqual(r, {
    ok: true,
    values: { name: 'Ada', email: 'ada.private@mail.test', subject: 'Hi', message: 'Line 1\n\nLine 2' },
  });
});

test('validateContact: subject is optional', () => {
  const r = validateContact({ name: 'Ada', email: 'ada.private@mail.test', message: 'Hello' });
  assert.equal(r.ok, true);
  assert.equal(r.values.subject, '');
});

test('validateContact: blank, whitespace-only, missing and non-string fields are rejected', () => {
  for (const key of ['name', 'email', 'message']) {
    for (const bad of ['', '   ', '\n\t ', undefined, null, 42, {}, ['x']]) {
      const r = validateContact({ ...VALID, [key]: bad });
      assert.equal(r.ok, false, `${key}=${JSON.stringify(bad)} should fail`);
      assert.equal(typeof r.error, 'string');
      assert.ok(r.error.length > 0 && !/undefined|null|object/i.test(r.error), r.error);
    }
  }
  for (const input of [undefined, null, 'text', 7, []]) {
    assert.equal(validateContact(input).ok, false, `input ${JSON.stringify(input)}`);
  }
});

test('validateContact: length limits (measured after trimming) match the SQL check constraints', () => {
  const sqlLimit = (re) => Number(SQL.match(re)[1]);
  assert.deepEqual(CONTACT_LIMITS, {
    name: sqlLimit(/char_length\(name\) between 1 and (\d+)/),
    email: sqlLimit(/char_length\(email\) <= (\d+)/),
    subject: sqlLimit(/char_length\(subject\) <= (\d+)/),
    message: sqlLimit(/char_length\(message\) between 1 and (\d+)/),
  });
  assert.deepEqual(CONTACT_LIMITS, { name: 100, email: 254, subject: 150, message: 5000 });

  const atLimit = {
    name: 'n'.repeat(100),
    email: `${'e'.repeat(254 - '@mail.test'.length)}@mail.test`,
    subject: 's'.repeat(150),
    message: 'm'.repeat(5000),
  };
  assert.equal(atLimit.email.length, 254);
  assert.equal(validateContact(atLimit).ok, true);
  assert.equal(validateContact({ ...atLimit, name: `  ${atLimit.name}  ` }).ok, true, 'padding is trimmed first');

  for (const [key, over] of [
    ['name', 'n'.repeat(101)],
    ['email', `e${atLimit.email}`],
    ['subject', 's'.repeat(151)],
    ['message', 'm'.repeat(5001)],
  ]) {
    const r = validateContact({ ...atLimit, [key]: over });
    assert.equal(r.ok, false, `${key} over the limit`);
    assert.match(r.error, /too long/i);
  }
});

test('validateContact: bad email addresses are rejected, the same way the DB check does', () => {
  const dbRe = new RegExp(SQL.match(/email ~\*\s*'([^']+)'/)[1], 'i');
  const bad = [
    'plainaddress', 'no-at.mail.test', '@mail.test', 'ada@', 'ada@mail', 'ada@@mail.test',
    'a da@mail.test', 'ada@mail .test', 'ada@mail.test extra', 'ada@mail.', 'ada@.',
  ];
  const good = ['first.last+tag@sub.mail.test', 'ADA@MAIL.TEST', 'a@b.test', "o'brien@mail.test"];
  for (const email of bad) {
    const r = validateContact({ ...VALID, email });
    assert.equal(r.ok, false, `${email} should be rejected`);
    assert.match(r.error, /valid email/i);
    assert.equal(dbRe.test(email), false, `${email}: the DB would also reject it`);
  }
  for (const email of good) {
    assert.equal(validateContact({ ...VALID, email }).ok, true, `${email} should pass`);
    assert.equal(dbRe.test(email), true, `${email}: the DB would accept it`);
  }
});

// ---------- contactErrorResponse ----------

test('contactErrorResponse: rate limits, busy, check violations and unknown errors', () => {
  assert.deepEqual(contactErrorResponse({ code: 'P0001', message: 'contact-too-many' }), { status: 429, message: TOO_MANY });
  assert.deepEqual(contactErrorResponse('contact-too-many'), { status: 429, message: TOO_MANY });
  assert.deepEqual(contactErrorResponse({ code: 'P0001', message: 'contact-busy' }), { status: 503, message: BUSY });
  assert.deepEqual(contactErrorResponse('contact-busy'), { status: 503, message: BUSY });

  const check = contactErrorResponse({
    code: '23514',
    message: 'new row for relation "contact_messages" violates check constraint "contact_email_fmt"',
    details: 'Failing row contains (ada.private@mail.test)',
  });
  assert.equal(check.status, 400);
  assert.ok(check.message.length > 0);
  assert.ok(!/relation|constraint|violates|contact_|Failing row|@/.test(check.message), check.message);
  assert.deepEqual(contactErrorResponse({ code: '23514' }), check);
  assert.equal(contactErrorResponse({ code: '22001', message: 'value too long' }).status, 400);

  for (const unknown of [
    { code: '42501', message: 'permission denied for function submit_contact' },
    { code: 'PGRST202', message: 'Could not find the function public.submit_contact' },
    new Error('fetch failed'), null, undefined, 'something else', {},
  ]) {
    assert.deepEqual(contactErrorResponse(unknown), { status: 500, message: 'Could not send — please try again.' });
  }
  assert.equal(SEND_FAILED, 'Could not send — please try again.');
});

// ---------- handleContactSubmission (the route's logic, with the RPC injected) ----------

function fakeRpc(result = { error: null }) {
  const calls = [];
  const fn = async (args) => {
    calls.push(args);
    if (result instanceof Error) throw result;
    return result;
  };
  fn.calls = calls;
  return fn;
}
const quiet = () => {};

test('handleContactSubmission: a valid message calls submit_contact once with trimmed args', async () => {
  const rpc = fakeRpc();
  const res = await handleContactSubmission(JSON.stringify({ ...VALID, name: '  Ada ', company: '' }), rpc, quiet);
  assert.deepEqual(res, { status: 200, body: { ok: true } });
  assert.deepEqual(rpc.calls, [{
    p_name: 'Ada', p_email: 'ada.private@mail.test', p_subject: 'Hi', p_message: 'Secret message body 123', p_source: 'opportumap',
  }]);
});

test('handleContactSubmission: a filled honeypot gets a 200 and nothing is saved', async () => {
  for (const company of ['Acme Inc', ' x ', 1, true]) {
    const rpc = fakeRpc();
    const res = await handleContactSubmission(JSON.stringify({ ...VALID, company }), rpc, quiet);
    assert.deepEqual(res, { status: 200, body: { ok: true } }, `company=${JSON.stringify(company)}`);
    assert.equal(rpc.calls.length, 0);
  }
  // Even when the rest is junk: bots get no signal.
  const rpc = fakeRpc();
  assert.deepEqual(await handleContactSubmission(JSON.stringify({ company: 'Acme' }), rpc, quiet), { status: 200, body: { ok: true } });
  assert.equal(rpc.calls.length, 0);
});

test('handleContactSubmission: invalid input is a 400 with the friendly message and is not saved', async () => {
  const rpc = fakeRpc();
  const input = { ...VALID, email: 'not-an-email' };
  const res = await handleContactSubmission(JSON.stringify(input), rpc, quiet);
  assert.equal(res.status, 400);
  assert.deepEqual(res.body, { error: validateContact(input).error });
  for (const raw of ['nope', '[]', 'null', '"text"', '', null, undefined]) {
    const r = await handleContactSubmission(raw, rpc, quiet);
    assert.equal(r.status, 400, `raw=${JSON.stringify(raw)}`);
    assert.equal(typeof r.body.error, 'string');
  }
  const huge = await handleContactSubmission(JSON.stringify({ ...VALID, message: 'm'.repeat(CONTACT_MAX_BODY) }), rpc, quiet);
  assert.equal(huge.status, 413);
  assert.equal(rpc.calls.length, 0);
});

test('handleContactSubmission: RPC errors are mapped, never echoed, and unknown ones are logged without PII', async () => {
  const cases = [
    [{ code: 'P0001', message: 'contact-too-many' }, 429, false],
    [{ code: 'P0001', message: 'contact-busy' }, 503, false],
    [{ code: '23514', message: 'new row for relation "contact_messages" violates check constraint "contact_email_fmt"', details: 'Failing row contains (ada.private@mail.test, Secret message body 123)' }, 400, null],
    [{ code: '42501', message: 'permission denied for function submit_contact', details: 'Failing row contains (ada.private@mail.test)' }, 500, true],
    [new Error('fetch failed'), 500, true],
  ];
  for (const [err, status, mustLog] of cases) {
    const logs = [];
    const rpc = err instanceof Error ? fakeRpc(err) : fakeRpc({ data: null, error: err });
    const res = await handleContactSubmission(JSON.stringify(VALID), rpc, (...a) => logs.push(a));
    assert.equal(res.status, status, err.message);
    assert.deepEqual(res.body, { error: contactErrorResponse(err).message });
    assert.ok(!JSON.stringify(res.body).includes(err.message), 'raw DB error not echoed');
    if (mustLog === true) assert.equal(logs.length, 1, `${err.message} is logged`);
    if (mustLog === false) assert.equal(logs.length, 0, `${err.message} is not logged`);
    const logged = JSON.stringify(logs);
    assert.ok(!logged.includes('ada.private@mail.test') && !logged.includes('Secret message body'), 'no PII in logs');
  }
});

test('handleContactSubmission: no database configured is a logged 500', async () => {
  const logs = [];
  const res = await handleContactSubmission(JSON.stringify(VALID), null, (...a) => logs.push(a));
  assert.deepEqual(res, { status: 500, body: { error: SEND_FAILED } });
  assert.equal(logs.length, 1);
});

// ---------- submitContact (browser side) ----------

test('submitContact: POSTs JSON to /api/contact, honeypot sent as "company"', async () => {
  const calls = [];
  const fakeFetch = async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200, json: async () => ({ ok: true }) }; };
  await submitContact({ ...VALID, company: '' }, fakeFetch);
  assert.equal(CONTACT_ENDPOINT, '/api/contact');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/contact');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers['Content-Type'], 'application/json');
  const sent = JSON.parse(calls[0].init.body);
  assert.deepEqual(Object.keys(sent).sort(), ['company', 'email', 'message', 'name', 'subject']);
  assert.equal(sent.company, '');
  assert.equal(sent.message, VALID.message);
});

test('submitContact: throws the server\'s friendly message, or the generic one', async () => {
  const reply = (status, json) => async () => ({ ok: status < 300, status, json: async () => json });
  await assert.rejects(submitContact(VALID, reply(429, { error: TOO_MANY })), { message: TOO_MANY });
  await assert.rejects(submitContact(VALID, reply(503, { error: BUSY })), { message: BUSY });
  await assert.rejects(submitContact(VALID, reply(500, { error: SEND_FAILED })), { message: SEND_FAILED });
  await assert.rejects(submitContact(VALID, async () => ({ ok: false, status: 502, json: async () => { throw new SyntaxError('bad'); } })), { message: SEND_FAILED });
  await assert.rejects(submitContact(VALID, async () => { throw new TypeError('Failed to fetch'); }), { message: SEND_FAILED });
  await assert.rejects(submitContact(VALID, reply(200, { nope: true })), { message: SEND_FAILED });
  await assert.rejects(submitContact(VALID, reply(500, { error: 'x'.repeat(500) })), { message: SEND_FAILED });
});

// ---------- mailtoHref ----------

test('mailtoHref: a reply link that cannot smuggle extra recipients or headers', () => {
  assert.equal(mailtoHref('ada.private@mail.test', 'Hi there'), 'mailto:ada.private@mail.test?subject=Re%3A%20Hi%20there');
  assert.match(mailtoHref('ada.private@mail.test', ''), /^mailto:ada\.private@mail\.test\?subject=Re%3A%20/);
  const sneaky = mailtoHref('x?bcc=evil%40bad.test&cc=y#@mail.test', 'a&body=b');
  assert.equal(sneaky.split('?').length, 2, sneaky);
  assert.ok(!sneaky.includes('#') && !/[&?]bcc=|[&?]cc=|[&?]body=/.test(sneaky), sneaky);
  const url = new URL(sneaky);
  assert.equal(url.protocol, 'mailto:');
  assert.deepEqual([...url.searchParams.keys()], ['subject']);
  assert.equal(url.searchParams.get('subject'), 'Re: a&body=b');
});

// ---------- source checks ----------

test('api/contact route: the user-session server client + the shared handler', () => {
  const src = read('app/api/contact/route.js');
  assert.match(src, /export async function POST\(/);
  assert.match(src, /lib\/supabase-server\.js/);
  assert.match(src, /\.rpc\('submit_contact'/);
  assert.match(src, /handleContactSubmission\(/);
  assert.ok(!/service_role|SERVICE_ROLE/i.test(src));
});

test('contact page: JSON to /api/contact, "company" honeypot, limits, friendly errors, honest copy', () => {
  const src = read('app/contact/page.js');
  assert.match(src, /submitContact\(/);
  assert.match(src, /validateContact\(/);
  assert.ok(!/urlencoded|__forms|data-netlify|bot-field|botField|Netlify/i.test(src), 'Netlify Forms path is gone');
  assert.ok(!/setTimeout\(r,\s*1200\)/.test(src), 'no simulated send');
  assert.match(src, /name="company"/);
  assert.match(src, /tabIndex=\{-1\}/);
  assert.match(src, /aria-hidden="true"/);
  for (const k of ['name', 'email', 'subject', 'message']) {
    assert.match(src, new RegExp(`maxLength=\\{CONTACT_LIMITS\\.${k}\\}`), `maxLength on ${k}`);
  }
  assert.match(src, /setError\(\s*err\?\.message/, 'shows the server\'s friendly message');
  assert.match(src, /role="alert"/);
  assert.match(src, /straight to the founder/);
  assert.match(src, /reply by email/);
  const noPromise = /\b\d+\s*(?:hours?|hrs?|days?|minutes?)\b|\bwithin\b|\busually\b|\bresponse time\b|\bASAP\b/i;
  assert.ok(!noPromise.test(src), 'no response-time promise on the page');
  assert.ok(!noPromise.test(FOOTNOTES.contact), 'no response-time promise in the footnote');
  assert.match(FOOTNOTES.contact, /straight to the founder/);
  assert.ok(!/We read every email/i.test(FOOTNOTES.contact));
});

test('admin inbox: cookie client (RLS), newest first, plain-text message, mailto reply, read toggle, states', () => {
  const src = read('app/admin/page.js');
  assert.match(src, /from '\.\.\/\.\.\/lib\/supabase-browser'/);
  assert.ok(!/lib\/supabase(?:\.js)?['"]/.test(src), 'not the anon client');
  assert.ok(!/service_role/i.test(src));
  assert.match(src, /\.from\('contact_messages'\)/);
  assert.match(src, /\.order\('created_at',\s*\{\s*ascending:\s*false\s*\}\)/);
  assert.match(src, /\.update\(\{\s*read:/);
  assert.match(src, /mailtoHref\(/);
  assert.match(src, /whitespace-pre-wrap[^>]*>\s*\{\s*\w+\.message\s*\}/, 'message rendered as text with line breaks kept');
  assert.ok(!/dangerouslySetInnerHTML|innerHTML/.test(src));
  assert.match(src, /Mark read/);
  assert.match(src, /Mark unread/);
  assert.match(src, /unread/i);
  assert.match(src, /No messages yet/);
  assert.match(src, /Could not load messages/);
  assert.match(src, /isAdminUser\(/);
});

function walk(dir) {
  const out = [];
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, name);
    if (statSync(join(ROOT, rel)).isDirectory()) out.push(...walk(rel));
    else out.push(rel);
  }
  return out;
}

test('Netlify Forms leftovers are gone from app/, public/ and proxy.js', () => {
  assert.equal(existsSync(join(ROOT, 'public/__forms.html')), false);
  const files = [...walk('app'), ...walk('public'), 'proxy.js'];
  assert.ok(files.length > 50, `only ${files.length} files`);
  const found = [];
  for (const f of files) {
    if (f.includes('__forms')) { found.push(f); continue; }
    if (!/\.(?:js|jsx|mjs|cjs|json|css|md|html|svg|txt|xml)$/.test(f)) continue;
    if (read(f).includes('__forms')) found.push(f);
  }
  assert.deepEqual(found, []);
});

test('proxy.js: the session-refresh matcher is back to the default exclusions', () => {
  const src = read('proxy.js');
  const m = src.match(/matcher:\s*\[\s*'([^']+)'/);
  assert.ok(m, 'matcher string found');
  const pattern = new RegExp(`^${m[1].replace(/\\\\/g, '\\')}$`);
  for (const p of ['/community', '/contact', '/api/contact', '/admin']) assert.equal(pattern.test(p), true, p);
  for (const p of ['/_next/static/chunk.js', '/_next/image', '/favicon.ico', '/passport-hero.webp']) assert.equal(pattern.test(p), false, p);
  assert.equal(
    m[1],
    '/((?!_next/static|_next/image|favicon.ico|.*\\\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|woff2?|ttf)).*)',
  );
});
