// /messages (gate chat): the page, its island, StartupChat, messages.css and the inbox API.
// A server page with its own title and the GATE CHAT sign; signed-out visitors get a sign-in
// button (never "SIGN IN REQUIRED", never a flash of it while the session is checked); phones get
// list -> thread with a back button, desktops two panes; the chat scrolls in its own container
// (data-lenis-prevent, never scrollIntoView, which scrolls the page too); failed sends stay in
// the thread with Retry; the unread badge clears when a thread opens; avatars are initials of
// display names; no "flight"/"fare", no totals, no paper theme, no email; motion is
// transform/opacity only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as espree from 'espree';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const show = (abs) => relative(ROOT, abs).split(sep).join('/');

function walk(rel) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) return [];
  if (!statSync(abs).isDirectory()) return [abs];
  return readdirSync(abs).flatMap((name) => walk(join(rel, name)));
}
const PAGE_FILES = [
  'app/messages',
  'app/components/messages',
  'app/components/StartupChat.js',
  'app/components/chatMessages.js',
  'lib/departures/gateChat.js',
]
  .flatMap(walk)
  .filter((f) => /\.(?:js|mjs)$/.test(f));
const CSS_PATH = 'app/components/messages/messages.css';
const css = () => read(CSS_PATH).replace(/\/\*[\s\S]*?\*\//g, '');

function visibleStrings(code, file) {
  const ast = espree.parse(code, { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } });
  const out = [];
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'Literal' && typeof node.value === 'string') out.push(node.value);
    else if (node.type === 'TemplateElement') out.push(node.value.cooked ?? node.value.raw);
    else if (node.type === 'JSXText') out.push(node.value);
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const v = node[key];
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v === 'object') visit(v);
    }
  };
  try {
    visit(ast);
  } catch (e) {
    throw new Error(`${show(file)}: ${e.message}`);
  }
  return out;
}
const allStrings = () => PAGE_FILES.flatMap((f) => visibleStrings(readFileSync(f, 'utf8'), f));

test('the gate chat files are scanned (sanity)', () => {
  const names = PAGE_FILES.map(show);
  for (const f of ['app/messages/page.js', 'app/components/messages/GateChat.js', 'app/components/StartupChat.js', 'lib/departures/gateChat.js']) {
    assert.ok(names.includes(f), `${f} is scanned`);
  }
  assert.ok(existsSync(join(ROOT, CSS_PATH)), 'messages.css exists');
});

test('server page: its own title, noindex, the hall shell with the GATE CHAT sign, the island in Suspense', () => {
  const page = read('app/messages/page.js');
  assert.ok(!/^\s*['"]use client['"]/.test(page), 'a server page (it exports metadata)');
  assert.match(page, /title:\s*'Messages — OpportuMap'/);
  assert.match(page, /robots:\s*\{\s*index:\s*false/);
  assert.match(page, /<PageShell/);
  assert.match(page, /sign=\{\{\s*label:\s*'Gate chat'\s*\}\}/);
  assert.match(page, /<Suspense[\s\S]*<GateChat/, 'useSearchParams needs a Suspense boundary');
  assert.match(page, /messages\.css/);
});

test('copy: a sign-in button for visitors, designed empty and error states, never SIGN IN REQUIRED', () => {
  const strings = allStrings();
  const has = (s) => strings.some((x) => x.includes(s));
  for (const s of [
    'Sign in to see your messages',
    "We couldn't check your sign-in.",
    "Your messages didn't load.",
    'No conversations yet.',
    'All conversations',
    'Not sent',
    'Retry',
    "This conversation didn't load.",
  ]) {
    assert.ok(has(s), `missing "${s}"`);
  }
  assert.ok(!has('SIGN IN REQUIRED'), 'no SIGN IN REQUIRED');
  assert.ok(!strings.some((s) => /LOADING…/.test(s)), 'no LOADING… text');
});

test('copy: no "flight"/"fare", no totals, no paper theme, no old hero, no email', () => {
  const found = [];
  for (const f of PAGE_FILES) {
    const code = readFileSync(f, 'utf8');
    for (const s of visibleStrings(code, f)) {
      if (/\b(?:flights?|fares?)\b/i.test(s)) found.push(`${show(f)}: ${JSON.stringify(s.trim())}`);
      if (/\b\d[\d,.]*\s*[kKmM]?\+?\s*(?:countries|jobs|roles|listings|openings|members|startups)\b/i.test(s)) found.push(`${show(f)}: total ${JSON.stringify(s.trim())}`);
      if (/\b(?:total|community members|people have)\b/i.test(s)) found.push(`${show(f)}: totals language ${JSON.stringify(s.trim())}`);
    }
    if (/\b(?:bg|text|border)-paper|font-display|EditorialHero|useScrollReveal|components\/motion\/|components\/ui\//.test(code)) found.push(`${show(f)}: old theme`);
    if (/backdrop-blur|backdrop-filter|transition-all|animate-pulse/.test(code)) found.push(`${show(f)}: banned style`);
    if (/\.email\b|user_email/.test(code)) found.push(`${show(f)}: reads an email`);
  }
  assert.deepEqual(found, []);
});

test('phone-first: list -> thread with a back button, desktop two panes, the URL holds the open thread', () => {
  const island = read('app/components/messages/GateChat.js');
  assert.match(island, /data-view=\{/, 'the island says which view a phone shows');
  assert.match(island, /useSearchParams\(/);
  assert.match(island, /threadFromParams\(/);
  assert.match(island, /history\.pushState\(/, 'opening a thread is a history entry (swipe back on iPhone)');
  assert.match(island, /className="gc-back"/);
  assert.match(island, /aria-current=/);
  const styles = css();
  assert.match(styles, /\.gc\[data-view='thread'\] \.gc-inbox\s*\{[^}]*display:\s*none/, 'phones hide the list in a thread');
  assert.match(styles, /\.gc\[data-view='list'\] \.gc-thread\s*\{[^}]*display:\s*none/, 'phones hide the thread in the list');
  assert.match(styles, /@media \(min-width: 768px\)[\s\S]*grid-template-columns/, 'two panes from 768px');
  assert.ok(!/\bw-64\b|256px/.test(island + styles), 'no fixed 256px sidebar');
});

test('the session: a still skeleton while checking, a sign-in button when signed out, a retry when it fails', () => {
  const island = read('app/components/messages/GateChat.js');
  assert.match(island, /useSession\(/);
  assert.match(island, /session\.status === 'loading'/);
  assert.match(island, /session\.status === 'error'/);
  assert.match(island, /session\.status === 'out'/);
  assert.match(island, /onClick=\{openSignIn\}/);
  assert.ok(!/router\.(?:push|replace)\(/.test(island), 'no redirect');
});

test('avatars are initials of display names; the partner name never comes from an email', () => {
  const island = read('app/components/messages/GateChat.js');
  const chat = read('app/components/StartupChat.js');
  assert.match(island, /partnerName\(/);
  assert.match(island, /initials\(/);
  assert.match(chat, /initials\(/);
  assert.match(chat, /displayName\(/);
  assert.ok(!/\{isMine \? 'Y' : 'F'\}/.test(chat), 'no hard-coded Y/F avatars');
});

test('the chat scrolls inside its own container: data-lenis-prevent, scrollTop, never scrollIntoView', () => {
  const chat = read('app/components/StartupChat.js');
  assert.match(chat, /data-lenis-prevent/);
  assert.match(chat, /scrollTop\s*=/);
  assert.ok(!/scrollIntoView\(/.test(chat), 'scrollIntoView scrolls the page as well');
  assert.match(css(), /\.gc-scroll\s*\{[^}]*overflow-y:\s*auto[^}]*overscroll-behavior:\s*contain/, 'no scroll chaining to the page');
});

test('failed sends stay in the thread with Retry and Edit; the P0 chat rules are kept', () => {
  const chat = read('app/components/StartupChat.js');
  assert.match(chat, /markFailed\(/);
  assert.match(chat, /markPending\(/);
  assert.match(chat, /acceptIncoming\(msg, ctx\)/, 'only the open conversation, never your own echo');
  assert.match(chat, /appendUnique\(/, 'de-duplicated by id');
  assert.match(chat, /replaceTemp\(/);
  assert.match(chat, /fetchJson\(/, 'r.ok checked');
  assert.match(chat, /\.catch\(/);
  assert.match(chat, /isComposing/, 'Enter while composing (IME) never sends');
  assert.match(chat, /htmlFor=\{inputId\}/, 'the message box has a label');
  assert.match(chat, /maxLength=\{MAX_MESSAGE\}/);
});

test('the unread badge clears when a thread opens; the inbox follows new messages live', () => {
  const island = read('app/components/messages/GateChat.js');
  assert.match(island, /markOpened\(/);
  assert.match(island, /onLoaded=\{/);
  assert.match(island, /bumpInbox\(/);
  assert.match(island, /receiver_id=eq\./, 'Realtime: messages sent to me');
  assert.match(island, /removeChannel\(/);
});

test('messages.css: only transform/opacity move, no vh, no CSS trig, no backdrop-filter, palette only, 16px inputs', () => {
  const styles = css();
  for (const m of styles.matchAll(/transition\s*:\s*([^;]+);/g)) {
    for (const part of m[1].replace(/\([^)]*\)/g, '()').split(',')) {
      const prop = part.trim().split(/\s+/)[0];
      assert.ok(['transform', 'opacity', 'none'].includes(prop), `transition on ${prop}`);
    }
  }
  for (const m of styles.matchAll(/@keyframes\s+[\w-]+\s*\{([\s\S]*?)\n\}/g)) {
    for (const d of m[1].matchAll(/([a-z-]+)\s*:/g)) {
      assert.ok(['transform', 'opacity'].includes(d[1]), `keyframes animate ${d[1]}`);
    }
  }
  assert.ok(!/\d\s*vh\b/.test(styles), 'no vh');
  assert.ok(!/\b(?:tan|atan2|sin|cos)\(/.test(styles), 'no CSS trig');
  assert.ok(!/backdrop-filter/.test(styles));
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /\.gc-input\s*\{[^}]*font:\s*400 16px/, 'the message box is 16px');
  for (const hex of styles.match(/#[0-9a-f]{3,8}\b/gi) || []) {
    assert.ok(['#000'].includes(hex.toLowerCase()), `off-palette colour ${hex}`);
  }
});

test('API: the inbox is grouped by the tested helper, names its columns, carries the founder name', () => {
  const route = read('app/api/messages/route.js');
  assert.match(route, /conversationsFrom\(/);
  assert.match(route, /user_name/);
  assert.ok(!/select\('\*/.test(route), 'no select *');
});
