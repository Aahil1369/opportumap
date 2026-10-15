// /community (the departure lounge) and /profile (the crew badge): the pages, components and
// API routes. Copy (LOUNGE / CREW signs, sign-in prompts, the empty lounge; no totals, no
// "flight"/"fare", no paper theme), motion limited to transform/opacity, 16px labelled
// inputs, no email anywhere, no silent redirect or endless LOADING on /profile, and API
// routes that report failures instead of swallowing them.
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
  'app/community',
  'app/profile',
  'app/components/community',
  'app/components/profile',
  'lib/departures/routeChip.js',
  'lib/departures/lounge.js',
  'lib/community.js',
]
  .flatMap(walk)
  .filter((f) => /\.(?:js|mjs)$/.test(f));
const API_FILES = walk('app/api/community').filter((f) => f.endsWith('.js'));
const CSS = read('app/components/community/community.css');
const src = (rel) => read(rel);

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

test('the lounge and crew files are scanned (sanity)', () => {
  const names = PAGE_FILES.map(show);
  for (const f of [
    'app/community/page.js',
    'app/profile/page.js',
    'app/components/community/Lounge.js',
    'app/components/community/PostCard.js',
    'app/components/profile/CrewBadge.js',
    'app/components/profile/Crew.js',
  ]) {
    assert.ok(names.includes(f), `${f} is scanned`);
  }
  assert.ok(API_FILES.length >= 4, 'the community API routes are scanned');
});

test('server pages: per-route titles, the hall shell, LOUNGE and CREW signs, no old hero', () => {
  const lounge = src('app/community/page.js');
  const crew = src('app/profile/page.js');
  for (const [page, title, label] of [
    [lounge, 'Community — OpportuMap', 'Lounge'],
    [crew, 'Profile — OpportuMap', 'Crew'],
  ]) {
    assert.ok(!/^\s*['"]use client['"]/.test(page), 'a server page (it exports metadata)');
    assert.match(page, new RegExp(`title:\\s*'${title}'`));
    assert.match(page, /<PageShell/);
    assert.match(page, new RegExp(`sign=\\{\\{\\s*label:\\s*'${label}'\\s*\\}\\}`));
  }
});

test('lounge copy: sign-in prompts for every action and the designed empty lounge', () => {
  const strings = allStrings();
  const has = (s) => strings.some((x) => x.includes(s));
  // JSX text arrives with &apos; decoded to '.
  for (const s of [
    'Sign in to post in the lounge',
    'Sign in to comment',
    'The lounge is quiet — be the first to share your story.',
    "The lounge didn't load.",
    'Sign in to see your crew badge',
    "We couldn't check your sign-in.",
  ]) {
    assert.ok(has(s), `missing "${s}"`);
  }
});

test('copy: no "flight"/"fare", no totals, no paper theme, no old hero or reveal hooks, no email', () => {
  const found = [];
  for (const f of PAGE_FILES) {
    const code = readFileSync(f, 'utf8');
    for (const s of visibleStrings(code, f)) {
      if (/\b(?:flights?|fares?)\b/i.test(s)) found.push(`${show(f)}: ${JSON.stringify(s.trim())}`);
      if (/\b\d[\d,.]*\s*[kKmM]?\+?\s*(?:countries|jobs|roles|listings|openings|members|posts)\b/i.test(s)) found.push(`${show(f)}: total ${JSON.stringify(s.trim())}`);
      if (/\b(?:total|community members|people have)\b/i.test(s)) found.push(`${show(f)}: totals language ${JSON.stringify(s.trim())}`);
    }
    if (/\b(?:bg|text|border)-paper|font-display|EditorialHero|useScrollReveal|components\/motion\/|components\/ui\//.test(code)) found.push(`${show(f)}: old theme`);
    if (/backdrop-blur|backdrop-filter|transition-all/.test(code)) found.push(`${show(f)}: banned style`);
    if (/\.email\b|user_email/.test(code)) found.push(`${show(f)}: reads an email`);
  }
  assert.deepEqual(found, []);
});

test('community.css: only transform/opacity move, no vh, no CSS trig, no backdrop-filter, reduced motion', () => {
  const css = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of css.matchAll(/transition\s*:\s*([^;]+);/g)) {
    for (const part of m[1].replace(/\([^)]*\)/g, '()').split(',')) {
      const prop = part.trim().split(/\s+/)[0];
      assert.ok(['transform', 'opacity', 'none'].includes(prop), `transition on ${prop}`);
    }
  }
  for (const m of css.matchAll(/@keyframes\s+[\w-]+\s*\{([\s\S]*?)\n\}/g)) {
    for (const d of m[1].matchAll(/([a-z-]+)\s*:/g)) {
      assert.ok(['transform', 'opacity'].includes(d[1]), `keyframes animate ${d[1]}`);
    }
  }
  assert.ok(!/\d\s*vh\b/.test(css), 'no vh');
  assert.ok(!/\b(?:tan|atan2|sin|cos)\(/.test(css), 'no CSS trig');
  assert.ok(!/backdrop-filter/.test(css));
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.lg-input\s*\{[^}]*font:\s*400 16px/, 'inputs are 16px');
  for (const hex of css.match(/#[0-9a-f]{3,8}\b/gi) || []) {
    assert.ok(['#000'].includes(hex.toLowerCase()), `off-palette colour ${hex}`);
  }
});

test('forms: every field has a label (htmlFor or wrapping) and the composer caps lengths', () => {
  const composer = src('app/components/community/Composer.js');
  for (const id of ['lg-f-title', 'lg-f-content', 'lg-f-tags']) {
    assert.match(composer, new RegExp(`htmlFor="${id}"`), `${id} has a label`);
    assert.match(composer, new RegExp(`id="${id}"`));
  }
  assert.match(composer, /<fieldset[\s\S]*<legend/, 'post type is a fieldset with a legend');
  assert.match(composer, /maxLength=\{LIMITS\.content\}/);
  const comments = src('app/components/community/Comments.js');
  assert.match(comments, /htmlFor=\{inputId\}/);
  assert.match(comments, /maxLength=\{LIMITS\.comment\}/);
});

test('signed-out visitors get prompts, never disabled buttons or silently ignored taps', () => {
  for (const f of ['app/components/community/PostCard.js', 'app/components/community/Lounge.js', 'app/components/community/Composer.js']) {
    const code = src(f);
    assert.ok(!/disabled=\{[^}]*!(?:user|currentUser)/.test(code), `${f}: no disabled-when-signed-out`);
    assert.ok(!/if \(!(?:user|currentUser)\) return;/.test(code), `${f}: no silent return for visitors`);
  }
  const card = src('app/components/community/PostCard.js');
  assert.match(card, /onClick=\{onSignIn\}/, 'visitor taps open sign-in');
  assert.match(src('app/components/community/Lounge.js'), /if \(!user\) return openSignIn\(\)/);
});

test('/profile: no silent redirect, no endless LOADING, a sign-in prompt for visitors', () => {
  const crew = src('app/components/profile/Crew.js');
  assert.ok(!/router\.(?:push|replace)\(/.test(crew + src('app/profile/page.js')), 'no redirect');
  assert.ok(!/LOADING…/.test(crew));
  assert.match(crew, /session\.status === 'error'/);
  assert.match(crew, /SignInPrompt/);
  const session = src('app/components/community/useSession.js');
  assert.match(session, /\.catch\(/, 'a failed session check is caught');
  assert.match(session, /viewerFrom\(/);
});

test('route chips: the member\'s own route only (other profiles are private)', () => {
  const card = src('app/components/community/PostCard.js');
  assert.match(card, /\{mine && <RouteChip ends=\{ownRoute\} \/>\}/);
  const own = src('app/components/community/useOwnRoute.js');
  assert.match(own, /\/api\/user-profile/);
  assert.match(own, /routeEnds\(/);
  assert.ok(!/user_profiles/.test(read('app/api/community/posts/route.js')), 'the feed never joins profiles');
});

test('API routes: failures are errors (never empty lists or zeros), likes/follows ask for a state', () => {
  for (const f of API_FILES) {
    const code = readFileSync(f, 'utf8');
    assert.ok(!/if \(error\) return Response\.json\(\{ (?:posts|comments|liked_post_ids): \[\] \}\)/.test(code), `${show(f)} swallows a DB error`);
    assert.ok(!/select\('\*'\)/.test(code), `${show(f)} selects *`);
  }
  const likes = read('app/api/community/likes/route.js');
  const follows = read('app/api/community/follows/route.js');
  assert.match(likes, /wantFrom\(body, 'liked'\)/);
  assert.match(likes, /setEdge\(/);
  assert.match(follows, /wantFrom\(body, 'following'\)/);
  assert.match(follows, /setEdge\(/);
  assert.match(read('app/api/community/posts/route.js'), /postInput\(/);
  assert.match(read('app/api/community/comments/route.js'), /commentInput\(/);
  const lounge = src('app/components/community/Lounge.js');
  assert.match(lounge, /liked: want/);
  assert.match(lounge, /following: want/);
});
