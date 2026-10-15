// /map's beacon label (the hover label over a role's beacon) is built from DOM nodes + textContent:
// job fields come from third-party feeds and never become markup. The P0 fix's rule for Map.js
// (setDOMContent, no HTML strings) holds for the control tower's rewrite.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const { beaconLabel } = await import(new URL('app/components/map/beaconLabel.js', ROOT));

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

test('beaconLabel: markup in job fields stays literal text', () => {
  const root = beaconLabel(fakeDocument(), {
    id: 'a', code: 'YYZ', status: 'ON TIME', title: XSS, company: '<b>Co</b>', payText: '"><svg onload=alert(1)>',
  });
  assert.equal(root.className, 'mt-pop-in');
  assert.equal(byClass(root, 'mt-pop-t').textContent, XSS);
  assert.equal(byClass(root, 'mt-pop-s').textContent, '<b>Co</b>');
  assert.equal(byClass(root, 'mt-pop-p').textContent, '"><svg onload=alert(1)>');
  assert.equal(anchors(root).length, 0, 'no links: the gate opens on click');
});

test('beaconLabel: code and status line, pay or "Pay not listed", the hint; odd input is safe', () => {
  const root = beaconLabel(fakeDocument(), { code: 'BER', status: 'NEW', title: 'Data Engineer', company: '', payText: 'Pay not listed' });
  assert.equal(byClass(root, 'mt-pop-k').textContent, 'BER · NEW');
  assert.equal(byClass(root, 'mt-pop-s'), undefined, 'no empty company line');
  const pay = byClass(root, 'mt-pop-p');
  assert.equal(pay.textContent, 'Pay not listed');
  assert.match(byClass(root, 'mt-pop-h').textContent, /gate/i);
  const empty = beaconLabel(fakeDocument(), null);
  assert.equal(byClass(empty, 'mt-pop-t').textContent, 'Untitled role');
});

test('Map.js: labels use setDOMContent + beaconLabel and no HTML template string', () => {
  const src = read('app/components/Map.js');
  assert.match(src, /\.setDOMContent\(/);
  assert.match(src, /beaconLabel\(/);
  assert.ok(!/setHTML/.test(src));
  assert.ok(!/`[^`]*mt-pop-t[^`]*`/.test(src), 'no template-string label');
});

test('api/jobs: entity decoding applied to title, company, location, description', () => {
  // The feeds moved to lib/jobsFeed.js (shared with the homepage); the route serves both paths from it.
  const route = read('app/api/jobs/route.js');
  assert.match(route, /from '\.\.\/\.\.\/\.\.\/lib\/jobsFeed\.js'/);
  assert.match(route, /fetchDbJobs\(/);
  assert.match(route, /fetchLiveJobs\(/);
  const src = read('lib/jobsFeed.js');
  assert.match(src, /decodeEntities/);
  for (const f of ['title', 'company', 'location', 'description']) {
    assert.match(src, new RegExp(`${f}:\\s*decodeEntities\\(job\\.${f}\\)`), `${f} decoded`);
  }
  assert.match(src, /return data\.map\(cleanJobText\)/, 'db jobs decoded');
  assert.match(src, /\]\.map\(cleanJobText\)/, 'live jobs decoded');
});
