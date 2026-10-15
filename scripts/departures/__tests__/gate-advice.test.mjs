// The job-detail gate (spec §7, Task 6): what it says and where it sends you.
//   - /api/job-advice never dresses a canned verdict up as AI: any failure is 503 advice-unavailable.
//   - The gate's links: "Board this role" only to an http(s) apply URL (lib/safeUrl.js, the P0
//     helper), "Visa for <Country>" to Migrova's visa page for that country.
//   - The gate's text: header, posted age, the announcement, the pay and its runway lights.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');

// The route must not reach Groq from a test: with no key it fails, and failing is what we test.
delete process.env.GROQ_API_KEY;
const ROUTE = await import(new URL('../../../app/api/job-advice/route.js', import.meta.url));
const GATE = await import(new URL('../../../lib/departures/gateInfo.js', import.meta.url));
const { gateFor } = await import(new URL('../../../lib/departures/gate.js', import.meta.url));

// ── /api/job-advice ─────────────────────────────────────────────────────────────────────────

test('adviceFailure() is a 503 advice-unavailable, with no verdict in it', () => {
  assert.deepEqual(ROUTE.adviceFailure(), { status: 503, body: { error: 'advice-unavailable' } });
});

test('the route no longer carries the canned "solid opportunity" verdict', () => {
  const src = read('app/api/job-advice/route.js');
  assert.ok(!src.includes('Looks like a solid opportunity'), 'canned headline is gone');
  assert.ok(!/verdict:\s*'maybe'/.test(src), 'no hard-coded maybe verdict');
});

test('a failing model call answers 503 { error: advice-unavailable }', async () => {
  const req = new Request('http://localhost/api/job-advice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job: { title: 'Software Engineer', company: 'Shopify' } }),
  });
  const res = await ROUTE.POST(req);
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { error: 'advice-unavailable' });
});

test('a request with no job is still a 400', async () => {
  const req = new Request('http://localhost/api/job-advice', { method: 'POST', body: JSON.stringify({}) });
  const res = await ROUTE.POST(req);
  assert.equal(res.status, 400);
});

test('advicePrompt: with no profile it speaks to everyone applying (never "insufficient information")', () => {
  const job = { title: 'Software Engineer', company: 'Shopify', location: 'Toronto', salary: 'not listed', description: '<p>React</p>' };
  const anon = ROUTE.advicePrompt(job, null);
  const all = `${anon.system}\n${anon.user}`;
  assert.match(all, /everyone/i);
  assert.doesNotMatch(all, /No profile provided|Candidate profile|whether they should apply/i);
  assert.match(anon.user, /Title: Software Engineer\. Company: Shopify\. Location: Toronto\./);
  assert.match(anon.user, /Description: +React/, 'tags are stripped from the description');

  const mine = ROUTE.advicePrompt(job, { skills: 'React, Node', experience: '3 years', jobTypes: ['Software'], nationality: 'pk' });
  assert.match(mine.user, /Skills: React, Node\./);
  assert.match(mine.user, /Nationality: pk\./);
  assert.match(mine.system, /whether they should apply/);
});

test('advice for visitors with no profile is kept on the server per role (one model call per role)', () => {
  const src = read('app/api/job-advice/route.js');
  assert.match(src, /const ANON = new Map\(\)/);
});

test('parseAdvice: fenced JSON is read, markdown asterisks are stripped from headline and reasons', () => {
  const raw = '```json\n{"verdict":"apply","headline":"**Strong fit** for React folks","reasons":["*Uses* React","Toronto **hybrid**"],"tips":["Lead with **impact**"]}\n```';
  const advice = ROUTE.parseAdvice(raw);
  assert.equal(advice.headline, 'Strong fit for React folks');
  assert.deepEqual(advice.reasons, ['Uses React', 'Toronto hybrid']);
  assert.deepEqual(advice.tips, ['Lead with impact']);
  assert.equal(advice.verdict, 'apply');
});

test('parseAdvice: junk, empty or headline-less answers are failures (null), never a made-up verdict', () => {
  for (const raw of ['', 'not json', '{}', '{"headline":"   "}', '{"headline":42}', 'null', '[]', '{"reasons":["a"]}']) {
    assert.equal(ROUTE.parseAdvice(raw), null, JSON.stringify(raw));
  }
});

test('parseAdvice: odd fields are dropped, not passed through', () => {
  const advice = ROUTE.parseAdvice('{"verdict":"definitely","headline":"Go","reasons":["a",7,null,"b","c","d"],"tips":"x"}');
  assert.equal(advice.verdict, undefined);
  assert.deepEqual(advice.reasons, ['a', 'b', 'c']);
  assert.deepEqual(advice.tips, []);
});

// ── Links ───────────────────────────────────────────────────────────────────────────────────

test("visaLink('ca') is Migrova's visa page for Canada", () => {
  assert.equal(GATE.visaLink('ca'), 'https://migrova.netlify.app/visa?to=ca');
  assert.equal(GATE.visaLink('CA'), 'https://migrova.netlify.app/visa?to=ca');
  assert.equal(GATE.visaLink(' gb '), 'https://migrova.netlify.app/visa?to=gb');
});

test('visaLink: no country, or not a country code, gives no link', () => {
  for (const v of [undefined, null, '', 'c', 'can', 'c&', '1a', 'ca&x=1', {}, 42]) {
    assert.equal(GATE.visaLink(v), null, String(v));
  }
});

test('boardLink: only http(s) apply URLs make a Board link (javascript: -> null)', () => {
  assert.equal(GATE.boardLink('javascript:alert(1)'), null);
  assert.equal(GATE.boardLink(' JavaScript:alert(1)'), null);
  assert.equal(GATE.boardLink('data:text/html,<b>x</b>'), null);
  assert.equal(GATE.boardLink('/jobs/apply'), null);
  assert.equal(GATE.boardLink(''), null);
  assert.equal(GATE.boardLink(undefined), null);
  assert.equal(GATE.boardLink('https://jobs.example.org/apply?id=1'), 'https://jobs.example.org/apply?id=1');
  assert.equal(GATE.boardLink('http://example.org'), 'http://example.org/');
});

test('the gate reuses the P0 safeHttpUrl helper (no second URL check)', () => {
  const src = read('lib/departures/gateInfo.js');
  assert.match(src, /import \{ safeHttpUrl \} from '\.\.\/safeUrl\.js'/);
  assert.ok(!/new URL\(/.test(src), 'no URL parsing of its own');
});

// ── The header ──────────────────────────────────────────────────────────────────────────────

test('gateHeader: number and gate from gateFor, the code and the city in capitals', () => {
  const job = { id: 'adzuna_1', title: 'Software Engineer', location: 'Toronto, Ontario', country: 'ca', source: 'adzuna' };
  const h = GATE.gateHeader(job);
  const g = gateFor('adzuna_1');
  assert.equal(h.number, g.flight);
  assert.equal(h.gate, g.gate);
  assert.equal(h.code, 'YYZ');
  assert.equal(h.city, 'TORONTO');
  assert.equal(h.iso2, 'ca');
  assert.equal(h.line, `${g.flight} · YYZ · TORONTO`);
});

test('gateHeader: remote roles are ANY · REMOTE with no country; unknown places keep their own name', () => {
  const remote = GATE.gateHeader({ id: 'r1', location: 'Anywhere', remote: true, country: 'us' });
  assert.equal(remote.code, 'ANY');
  assert.equal(remote.city, 'REMOTE');
  assert.equal(remote.iso2, '');
  const canada = GATE.gateHeader({ id: 'a2', location: 'Canada', country: 'ca', source: 'adzuna' });
  assert.equal(canada.code.length, 3);
  assert.equal(canada.city, 'CANADA');
  const odd = GATE.gateHeader({});
  assert.match(odd.number, /^OM \d{4}$/);
  assert.equal(odd.code.length, 3);
});

test('countryLabel names a country, or gives null', () => {
  assert.equal(GATE.countryLabel('ca'), 'Canada');
  assert.equal(GATE.countryLabel('GB'), 'United Kingdom');
  assert.equal(GATE.countryLabel(''), null);
  assert.equal(GATE.countryLabel('zz9'), null);
});

// ── Posted age ──────────────────────────────────────────────────────────────────────────────

test('postedAgo: today, yesterday, days, weeks, months; nothing for a missing or bad date', () => {
  const now = new Date('2026-10-14T12:00:00Z');
  const ago = (ms) => new Date(now.getTime() - ms).toISOString();
  const H = 3600e3;
  const D = 24 * H;
  assert.equal(GATE.postedAgo(ago(2 * H), now), 'posted today');
  assert.equal(GATE.postedAgo(ago(-0.5 * H), now), 'posted today'); // a feed clock a little ahead
  assert.equal(GATE.postedAgo(ago(30 * H), now), 'posted yesterday');
  assert.equal(GATE.postedAgo(ago(2 * D + H), now), 'posted 2 days ago');
  assert.equal(GATE.postedAgo(ago(13 * D), now), 'posted 13 days ago');
  assert.equal(GATE.postedAgo(ago(15 * D), now), 'posted 2 weeks ago');
  assert.equal(GATE.postedAgo(ago(45 * D), now), 'posted 1 month ago');
  assert.equal(GATE.postedAgo(ago(200 * D), now), 'posted 6 months ago');
  assert.equal(GATE.postedAgo(ago(800 * D), now), 'posted over a year ago');
  for (const v of [undefined, null, '', 'not a date', ago(-3 * D)]) assert.equal(GATE.postedAgo(v, now), '', String(v));
});

// ── The announcement ────────────────────────────────────────────────────────────────────────

test('announcement: "Attention, candidates for <role>:" then the headline and the reasons, as plain text', () => {
  const a = GATE.announcement('Software Engineer', {
    verdict: 'apply',
    headline: 'Strong fit if you have React + TypeScript',
    reasons: ['Ask whether the role offers visa sponsorship', 'Check your visa route before you apply.', 'Hybrid in Toronto!'],
  });
  assert.equal(a.lead, 'Attention, candidates for Software Engineer:');
  assert.equal(
    a.text,
    'Strong fit if you have React + TypeScript. Ask whether the role offers visa sponsorship. Check your visa route before you apply. Hybrid in Toronto!',
  );
  assert.ok(!/apply now|maybe|skip/i.test(a.lead + a.text.replace('before you apply', '')), 'no verdict words');
});

test('announcement: no usable advice gives null; markup characters are just text', () => {
  assert.equal(GATE.announcement('X', null), null);
  assert.equal(GATE.announcement('X', { error: 'advice-unavailable' }), null);
  assert.equal(GATE.announcement('X', { headline: '  ' }), null);
  const a = GATE.announcement('', { headline: '**Bold** <b>move</b>', reasons: 'nope' });
  assert.equal(a.lead, 'Attention, candidates for this role:');
  assert.equal(a.text, 'Bold <b>move</b>.');
});

// ── Pay and the runway ──────────────────────────────────────────────────────────────────────

test('runwayLights: the lights inside min–max of the city range low–high are lit', () => {
  // 12 lights over C$60K–140K; the role's C$88K–102K lights the middle ones (as in the mockup).
  const lit = GATE.runwayLights({ min: 88000, max: 102000, low: 60000, high: 140000 });
  assert.equal(lit.length, 12);
  assert.deepEqual(lit.map((on, i) => (on ? i : -1)).filter((i) => i >= 0), [4, 5]);
  const wide = GATE.runwayLights({ min: 60000, max: 140000, low: 60000, high: 140000 });
  assert.ok(wide.every(Boolean));
});

test('runwayLights: a narrow range still lights one light; one outside the range lights its end', () => {
  const narrow = GATE.runwayLights({ min: 100000, max: 100000, low: 60000, high: 140000 });
  assert.equal(narrow.filter(Boolean).length, 1);
  assert.equal(narrow.indexOf(true), 6);
  const above = GATE.runwayLights({ min: 150000, max: 180000, low: 60000, high: 140000 });
  assert.deepEqual(above.map((on, i) => (on ? i : -1)).filter((i) => i >= 0), [11]);
  const below = GATE.runwayLights({ min: 20000, max: 30000, low: 60000, high: 140000 });
  assert.deepEqual(below.map((on, i) => (on ? i : -1)).filter((i) => i >= 0), [0]);
  assert.equal(GATE.runwayLights({ min: 1, max: 2, low: 0, high: 10 }, 6).length, 6);
});

test('runwayLights: missing or nonsense values -> null (the runway is hidden)', () => {
  const ok = { min: 88000, max: 102000, low: 60000, high: 140000 };
  for (const bad of [
    null,
    {},
    { ...ok, low: undefined },
    { ...ok, high: null },
    { ...ok, min: NaN },
    { ...ok, max: '102000' },
    { ...ok, low: 140000, high: 60000 },
    { ...ok, low: 100000, high: 100000 },
    { ...ok, min: -5 },
    { ...ok, min: 120000, max: 90000 },
  ]) {
    assert.equal(GATE.runwayLights(bad), null, JSON.stringify(bad));
  }
});

test('gatePay: listed pay, our estimate, still asking, or unavailable', () => {
  const toronto = { id: 'a', title: 'Dev', location: 'Toronto', country: 'ca', source: 'adzuna' };
  const listed = GATE.gatePay({ ...toronto, salary_min: 88000, salary_max: 102000, currency: 'CAD' }, { state: 'idle' });
  assert.equal(listed.kind, 'listed');
  assert.equal(listed.text, 'C$88K–102K');
  assert.equal(listed.label, 'PAY · LISTED FOR THIS ROLE');
  assert.equal(listed.runway, null);

  const adz = GATE.gatePay({ ...toronto, salary_min: 88000, salary_max: 102000, currency: 'CAD', salary_predicted: true }, { state: 'idle' });
  assert.equal(adz.label, "PAY · ADZUNA'S ESTIMATE FOR THIS ROLE");

  const asking = GATE.gatePay(toronto, { state: 'loading' });
  assert.equal(asking.kind, 'loading');
  assert.equal(asking.label, 'PAY · PREDICTED FOR THIS ROLE');
  assert.equal(asking.text, null);

  const range = { min: 88000, max: 102000, low: 60000, high: 140000, currency: 'CAD' };
  const est = GATE.gatePay(toronto, { state: 'done', pay: 'C$88K–102K', range });
  assert.equal(est.kind, 'predicted');
  assert.equal(est.text, 'C$88K–102K');
  assert.deepEqual(est.runway, { min: 88000, max: 102000, low: 60000, high: 140000, lowText: 'C$60K', highText: 'C$140K' });

  const gone = GATE.gatePay(toronto, { state: 'unavailable', pay: null });
  assert.equal(gone.kind, 'unavailable');
  assert.equal(gone.text, 'Pay estimate unavailable');
});

test("gatePay: listed pay sits on the model's city range only in the same currency; remote roles have no runway", () => {
  const toronto = { id: 'a', title: 'Dev', location: 'Toronto', country: 'ca', source: 'adzuna', salary_min: 90000, salary_max: 110000, currency: 'CAD' };
  const cad = { min: 85000, max: 100000, low: 60000, high: 140000, currency: 'CAD' };
  const same = GATE.gatePay(toronto, { state: 'done', pay: 'C$85K–100K', range: cad });
  assert.equal(same.text, 'C$90K–110K', 'the listed pay, not the estimate');
  assert.deepEqual(same.runway, { min: 90000, max: 110000, low: 60000, high: 140000, lowText: 'C$60K', highText: 'C$140K' });
  const usd = GATE.gatePay(toronto, { state: 'done', pay: '$70K–80K', range: { ...cad, currency: 'USD' } });
  assert.equal(usd.runway, null);

  const remote = { id: 'r', title: 'Dev', location: 'Remote', remote: true };
  const r = GATE.gatePay(remote, { state: 'done', pay: '$90K–120K', range: { min: 90000, max: 120000, low: 50000, high: 200000, currency: 'USD' } });
  assert.equal(r.text, '$90K–120K');
  assert.equal(r.runway, null);
});

test('gateAsk: what the gate asks the salary model (the row\'s own question: same title|country key)', () => {
  const job = { id: 'a', title: 'Senior Dev (m/w/d)', company: 'Acme', location: 'Berlin', country: 'de', source: 'adzuna' };
  assert.deepEqual(GATE.gateAsk(job), { title: 'Senior Dev', country: 'de', company: 'Acme', location: 'Berlin' });
  assert.deepEqual(GATE.gateAsk({ ...job, salary_min: 60000 }), { title: 'Senior Dev', country: 'de', company: 'Acme', location: 'Berlin' });
  assert.equal(GATE.gateAsk({ ...job, location: 'Remote', remote: true, salary_min: 60000 }), null, 'a remote role with listed pay asks nothing');
  assert.deepEqual(GATE.gateAsk({ ...job, location: 'Remote', remote: true }), { title: 'Senior Dev', country: '', company: 'Acme', location: 'Remote' });
});

// ── The salary model's answer ───────────────────────────────────────────────────────────────

const PAY = await import(new URL('../../../lib/departures/pay.js', import.meta.url));

test("modelPay: the model's answer -> the pay text and the numbers the runway needs", () => {
  const got = PAY.modelPay({ min: 88000, max: 102000, low: 60000, high: 140000, currency: 'cad', display: 'x' });
  assert.deepEqual(got, { pay: 'C$88K–102K', range: { min: 88000, max: 102000, low: 60000, high: 140000, currency: 'CAD' } });
  // An answer without the city range (an older cached one) still gives the pay; the runway hides.
  const old = PAY.modelPay({ min: 75000, max: 110000, currency: 'CAD' });
  assert.equal(old.pay, 'C$75K–110K');
  assert.deepEqual(old.range, { min: 75000, max: 110000, low: null, high: null, currency: 'CAD' });
  assert.equal(PAY.modelPay({ min: '80000', max: '90000', currency: 'GBP' }).range.min, 80000);
});

test('modelPay: no usable pay -> null', () => {
  for (const d of [null, undefined, 'x', {}, { min: 0, max: 0 }, { error: 'rate limited' }, { min: -1, max: 'a' }]) {
    assert.equal(PAY.modelPay(d), null, JSON.stringify(d));
  }
});

test("predict-salary asks for the city's range (low/high) in the same single answer", () => {
  const src = read('app/api/predict-salary/route.js');
  assert.match(src, /"low":number/);
  assert.match(src, /"high":number/);
  assert.equal((src.match(/chat\.completions\.create\(/g) || []).length, 1, 'still one model call');
});

test('usePredictedPay hands the gate the numbers, the rows the text, one queue for both', () => {
  const src = read('app/components/jobs/usePredictedPay.js');
  assert.match(src, /modelPay\(/);
  assert.match(src, /om:payn:/, 'the numbers are kept for the session too');
  assert.match(src, /om:pay:/, "the homepage's text key is still written");
  assert.match(src, /range/);
});

// ── The components ──────────────────────────────────────────────────────────────────────────

test('JobGate: a named kit Dialog, the right links, plain text only', () => {
  const src = read('app/components/jobs/JobGate.js');
  assert.match(src, /import Dialog from '\.\.\/kit\/Dialog'/);
  assert.match(src, /<Dialog\b[^>]*\blabelledBy=/);
  assert.match(src, /import FlapText from '\.\.\/kit\/FlapText'/);
  assert.match(src, /import RunwayRange from '\.\/RunwayRange'/);
  assert.match(src, /usePredictedPay\(/);
  assert.match(src, /boardLink\(/);
  assert.match(src, /visaLink\(/);
  assert.match(src, /target="_blank"\s+rel="noopener noreferrer"/);
  assert.match(src, /Board this role/);
  assert.match(src, /Announcement unavailable right now\./);
  assert.match(src, /ANNOUNCEMENT · AI ADVICE/);
  assert.match(src, /fetch\('\/api\/job-advice'/);
  assert.ok(!/dangerouslySetInnerHTML/.test(src));
  assert.ok(!/verdict/i.test(src.replace(/\/\/.*$/gm, '')), 'the gate shows no verdict');
});

test("JobGate says whose numbers the runway's city range is, for listed pay too", () => {
  const src = read('app/components/jobs/JobGate.js');
  assert.match(src, /pay\.kind === 'listed' && pay\.runway && \(/);
  assert.match(src, /range is our salary model’s estimate/);
});

test('/jobs opens JobGate (loaded on first open) and hands focus back to the row', () => {
  const src = read('app/components/jobs/JobsBoard.js');
  assert.match(src, /const JobGate = dynamic\(\(\) => import\('\.\/JobGate'\), \{ ssr: false \}\)/);
  assert.match(src, /<JobGate\b[^>]*returnFocusRef=/);
  assert.ok(!/JobDetailPanel/.test(src), 'the old panel is gone from /jobs');
});

test('RunwayRange: lights are aria-hidden and move by opacity only', () => {
  const src = read('app/components/jobs/RunwayRange.js');
  assert.match(src, /aria-hidden="true"/);
  assert.match(src, /runwayLights\(/);
  const css = read('app/components/jobs/gate.css').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of css.matchAll(/transition(?:-property)?:\s*([^;]+);/g)) {
    assert.ok(!/\b(?:width|height|left|top|background|box-shadow|color)\b/.test(m[1]), `transition: ${m[1]}`);
  }
  for (const m of css.matchAll(/@keyframes\s+[\w-]+\s*\{([\s\S]*?\})\s*\}/g)) {
    const props = [...m[1].matchAll(/([a-z-]+)\s*:/g)].map((p) => p[1]);
    assert.ok(props.every((p) => p === 'opacity' || p === 'transform'), `keyframes animate ${props}`);
  }
  assert.ok(!/\b\d+(?:\.\d+)?vh\b/.test(css), 'svh/dvh, not vh');
  assert.ok(!/backdrop-filter/.test(css));
});
