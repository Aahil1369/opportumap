// /map popups are built from DOM nodes + textContent; links only for http(s) URLs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const { buildJobPopup } = await import(new URL('app/components/mapPopup.js', ROOT));

// Minimal document: every element refuses raw HTML, so any innerHTML use fails the test.
function fakeDocument() {
  const make = (tag) => {
    const node = {
      tagName: tag.toUpperCase(), className: '', textContent: '', style: {}, childNodes: [],
      append(...xs) { for (const x of xs) this.childNodes.push(x); },
      appendChild(x) { this.childNodes.push(x); return x; },
    };
    for (const p of ['innerHTML', 'outerHTML']) {
      Object.defineProperty(node, p, { get() { throw new Error(`${p} read`); }, set() { throw new Error(`${p} written`); } });
    }
    node.insertAdjacentHTML = () => { throw new Error('insertAdjacentHTML'); };
    return node;
  };
  return { createElement: make, createTextNode: (t) => String(t) };
}

const walk = (n, out = []) => { out.push(n); for (const c of n.childNodes || []) if (typeof c !== 'string') walk(c, out); return out; };
const byClass = (root, cls) => walk(root).find((n) => n.className === cls);
const anchors = (root) => walk(root).filter((n) => n.tagName === 'A');

const XSS = '<img src=x onerror=alert(1)>';

test('buildJobPopup: markup in job fields stays literal text', () => {
  const root = buildJobPopup(fakeDocument(), {
    title: XSS, company: '<b>Co</b>', location: '"><svg onload=alert(1)>', salary: '$1', url: 'https://jobs.example.org/1',
  });
  assert.equal(root.className, 'popup-inner');
  assert.equal(byClass(root, 'popup-title').textContent, XSS);
  assert.equal(byClass(root, 'popup-company').textContent, '<b>Co</b>');
  assert.equal(byClass(root, 'popup-location').textContent, '"><svg onload=alert(1)>');
  assert.equal(byClass(root, 'popup-salary').textContent, '$1');
});

test('buildJobPopup: javascript: / data: / relative URLs get no link', () => {
  for (const url of ['javascript:alert(2)', 'data:text/html,x', '/relative', '', null, undefined]) {
    const root = buildJobPopup(fakeDocument(), { title: 't', url });
    assert.equal(anchors(root).length, 0, `no link for ${url}`);
  }
});

test('buildJobPopup: http(s) link opens in a new tab with noopener noreferrer, quotes encoded', () => {
  const root = buildJobPopup(fakeDocument(), { title: 't', url: 'https://a.test/" onmouseover="alert(3)' });
  const [a] = anchors(root);
  assert.ok(a, 'link present');
  assert.equal(a.className, 'popup-link');
  assert.equal(a.target, '_blank');
  assert.equal(a.rel, 'noopener noreferrer');
  assert.ok(!a.href.includes('"'));
  assert.ok(a.href.startsWith('https://a.test/'));
  assert.equal(a.textContent, 'View job →');
});

test('buildJobPopup: visa line with match score keeps the old look', () => {
  const root = buildJobPopup(fakeDocument(), { title: 't' }, { nationality: 'pk', emoji: '🟢', label: 'Visa likely', score: 80 });
  const visa = byClass(root, 'popup-visa');
  assert.ok(visa);
  assert.equal(visa.childNodes[0], '🟢 Visa likely');
  const span = visa.childNodes.find((c) => typeof c !== 'string' && c.tagName === 'SPAN');
  assert.equal(span.textContent, '80% match');
  assert.equal(span.style.color, '#6366f1');
  const noVisa = buildJobPopup(fakeDocument(), { title: 't' }, { nationality: '', score: 80 });
  assert.equal(byClass(noVisa, 'popup-visa'), undefined);
});

test('Map.js: popups use setDOMContent and no HTML template string', () => {
  const src = read('app/components/Map.js');
  assert.match(src, /\.setDOMContent\(/);
  assert.match(src, /buildJobPopup\(/);
  assert.ok(!/setHTML/.test(src));
  assert.ok(!/`[^`]*popup-title[^`]*`/.test(src), 'no template-string popup');
});

test('api/jobs: entity decoding applied to title, company, location, description', () => {
  const src = read('app/api/jobs/route.js');
  assert.match(src, /decodeEntities/);
  for (const f of ['title', 'company', 'location', 'description']) {
    assert.match(src, new RegExp(`${f}:\\s*decodeEntities\\(job\\.${f}\\)`), `${f} decoded`);
  }
});
