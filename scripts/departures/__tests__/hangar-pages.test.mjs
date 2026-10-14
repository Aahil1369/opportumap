// /startups — the hangar's pages and components: the copy (E · HANGAR, "+1 PASSENGER",
// "STANDBY", "Sign in to board", the empty state; no totals, no "flight"/"fare", no paper theme),
// motion limited to transform/opacity (+ one short stroke-dashoffset), sector counts taken from
// the unfiltered list, own state + sign-in prompts on a stand, and the post form's fields.
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
const HANGAR_FILES = ['app/startups', 'app/components/startups', 'lib/departures/tailFin.js', 'lib/departures/hangar.js']
  .flatMap(walk)
  .filter((f) => /\.(?:js|mjs)$/.test(f));
const hangarSrc = (name) => read(`app/components/startups/${name}`);

function visibleStrings(src, file) {
  const ast = espree.parse(src, { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } });
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
const allStrings = () => HANGAR_FILES.flatMap((f) => visibleStrings(readFileSync(f, 'utf8'), f));

test('the hangar files are scanned (sanity)', () => {
  const names = HANGAR_FILES.map(show);
  for (const f of ['app/startups/page.js', 'app/startups/[id]/page.js', 'app/components/startups/TailFin.js', 'app/components/startups/Hangar.js', 'app/components/startups/Stand.js']) {
    assert.ok(names.includes(f), `${f} is scanned`);
  }
});

test('hangar copy: E · HANGAR sign, +1 PASSENGER, STANDBY, Sign in to board, the empty state', () => {
  const page = read('app/startups/page.js');
  assert.match(page, /sign=\{\{\s*letter:\s*'E',\s*label:\s*'Hangar'\s*\}\}/);
  const strings = allStrings();
  const has = (s) => strings.some((x) => x.includes(s));
  for (const s of ['+1 PASSENGER', 'STANDBY', 'Sign in to board', 'The hangar is empty — post the first startup.']) {
    assert.ok(has(s), `missing "${s}"`);
  }
  assert.ok(!has('THIS WEEK'), '"THIS WEEK" totals are gone');
  assert.ok(!strings.some((x) => /startups listed|total sought/i.test(x)), 'no totals');
});

test('hangar copy: no "flight"/"fare", no totals, no paper theme, no old hero or reveal hooks', () => {
  const found = [];
  for (const f of HANGAR_FILES) {
    const src = readFileSync(f, 'utf8');
    for (const s of visibleStrings(src, f)) {
      if (/\b(?:flights?|fares?)\b/i.test(s)) found.push(`${show(f)}: ${JSON.stringify(s.trim())}`);
      if (/\b\d[\d,.]*\s*[kKmM]?\+?\s*(?:countries|jobs|roles|listings|openings|startups)\b/i.test(s)) found.push(`${show(f)}: total ${JSON.stringify(s.trim())}`);
    }
    if (/\b(?:bg|text|border)-paper|font-display|EditorialHero|useScrollReveal|components\/motion\//.test(src)) found.push(`${show(f)}: old theme`);
    if (/backdrop-blur|backdrop-filter|transition-all/.test(src)) found.push(`${show(f)}: banned style`);
    if (/\.email\b/.test(src)) found.push(`${show(f)}: reads an email`);
  }
  const css = read('app/components/startups/startups.css').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of css.matchAll(/transition(?:-property)?\s*:\s*([^;]+);/g)) {
    for (const part of m[1].replace(/\([^)]*\)/g, '').split(',')) {
      const prop = part.trim().split(/\s+/)[0];
      if (!['transform', 'opacity', 'none'].includes(prop)) found.push(`startups.css transitions ${prop}`);
    }
  }
  for (const m of css.matchAll(/@keyframes\s+[\w-]+\s*\{([\s\S]*?)\n\}/g)) {
    for (const p of m[1].matchAll(/([a-z-]+)\s*:/g)) {
      // transform/opacity, plus the one short stroke-dashoffset (an empty stand's outline)
      if (!['transform', 'opacity', 'stroke-dashoffset'].includes(p[1])) found.push(`startups.css animates ${p[1]}`);
    }
  }
  if (/\b\d+(?:\.\d+)?vh\b/.test(css)) found.push('startups.css uses vh');
  if (!/prefers-reduced-motion:\s*reduce/.test(css)) found.push('startups.css has no reduced-motion block');
  assert.deepEqual(found, []);
});

test('sector counts are taken from the unfiltered list in the page', () => {
  const src = hangarSrc('Hangar.js');
  assert.match(src, /hangarView\(all\b|sectorCounts\(all\b/);
  assert.ok(!/sectorCounts\((?:list|shown|remote|filtered)/.test(src), 'counts never come from a filtered list');
});

test('detail: own state from the API, sign-in prompts (not disabled buttons) when signed out', () => {
  const src = hangarSrc('Stand.js');
  assert.match(src, /\.mine\b/, 'reads mine from GET /api/startups/[id]');
  assert.match(src, /aria-pressed/, 'the toggles say whether they are on');
  assert.match(src, /SignInPrompt/, 'signed-out visitors get a sign-in prompt');
  assert.ok(!/disabled=\{[^}]*!user/.test(src), 'no button is disabled just for being signed out');
  assert.ok(!/disabled=\{[^}]*!user/.test(hangarSrc('Hangar.js')));
});

test('post form: kit Dialog, 16px inputs with labels, no counters or names sent, deck upload safe', () => {
  const src = hangarSrc('PostStartup.js');
  assert.match(src, /from '\.\.\/kit\/Dialog'/);
  const ids = [...src.matchAll(/\bid=["{]`?([\w-]+)/g)].map((m) => m[1]);
  const inputs = [...src.matchAll(/<(?:input|textarea|select)\b[^>]*>/g)].map((m) => m[0]);
  assert.ok(inputs.length >= 8, `${inputs.length} fields`);
  for (const tag of inputs) {
    if (/type="radio"|type=\{?"?hidden/.test(tag)) continue;
    const id = /\bid=(?:"([^"]+)"|\{`([^`]+)`\})/.exec(tag);
    assert.ok(id, `field without id: ${tag.slice(0, 60)}`);
  }
  assert.ok(ids.length > 0);
  assert.ok(/htmlFor=/.test(src), 'labels use htmlFor');
  assert.ok(!/text-\[1[0-5]px\][^"]*hg-input|hg-input[^"]*text-\[1[0-5]px\]/.test(src));
  const inputRule = /\.hg-input\s*\{([^}]*)\}/.exec(read('app/components/startups/startups.css'));
  assert.ok(inputRule && /font(?:-size)?:\s*(?:\d+\s+)?16px\b/.test(inputRule[1]), 'inputs are 16px (no iOS zoom)');
  assert.ok(!/user_name|upvote_count|interest_count/.test(src), 'the DB sets the name and the counters');
  assert.match(src, /upsert:\s*false/);
  assert.ok(!/catch\s*\{\s*\}/.test(src), 'no silent catch {}');
});
