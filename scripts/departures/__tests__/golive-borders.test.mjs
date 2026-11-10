// Go-live fix wave, group 3: resting control borders reach 3:1 (the owner's rule for UI borders).
// Search fields, filter chips, selects and ghost buttons on the homepage, /jobs, /map, /saved, the
// Ask AI desk, the job gate, the relocation guide and the hangar rested on var(--rule), which is
// 1.17-1.30:1. They now rest on the house mix, color-mix(in srgb, var(--ink-sub) 60%, var(--hall-2)),
// through a page-local custom property set on a root that really contains the control (a kit Dialog
// is a portal, so its panel is its own root). Dividers, panels and disabled controls stay on --rule.
// Also here: the source pin for the stand page's real 404 (an unknown startup id).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const MIX = 'color-mix(in srgb, var(--ink-sub) 60%, var(--hall-2))';

/**
 * Every style rule of a stylesheet, comments removed, in source order:
 * { selectors: ['.a', '.b:hover'], body: 'color: red;', at: ['@media (hover: hover)', …] },
 * `at` being the @-rules it sits in, outermost first. Keyframe steps are not rules.
 */
function cssRules(css) {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  const open = [];
  let buf = '';
  for (const ch of src) {
    if (ch === '{') {
      open.push(buf.trim());
      buf = '';
    } else if (ch === '}') {
      const prelude = open.pop() ?? '';
      if (!prelude.startsWith('@') && !open.some((p) => p.startsWith('@keyframes'))) {
        rules.push({ selectors: prelude.split(',').map((s) => s.trim().replace(/\s+/g, ' ')), body: buf.trim(), at: [...open] });
      }
      buf = '';
    } else {
      buf += ch;
    }
  }
  return rules;
}

/** The values of a rule's `border` and `border-color` declarations (not border-top, border-radius…). */
const borderValues = (body) => [...body.matchAll(/(?:^|;)\s*border(?:-color)?\s*:\s*([^;]+)/g)].map((m) => m[1].trim());

/** A selector's resting border: its rules outside every @-rule (hover lives in @media (hover: hover)). */
function restingBorders(rules, selector) {
  return rules.filter((r) => r.at.length === 0 && r.selectors.includes(selector)).flatMap((r) => borderValues(r.body));
}

/** WCAG 2.x contrast of two #rrggbb colours. */
function contrast(a, b) {
  const lum = (hex) => {
    const [r, g, b2] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const c = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b2);
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** color-mix(in srgb, a p, b): #rrggbb. */
function mix(a, b, p) {
  const ch = (hex, i) => parseInt(hex.slice(i, i + 2), 16);
  return `#${[1, 3, 5].map((i) => Math.round(ch(a, i) * p + ch(b, i) * (1 - p)).toString(16).padStart(2, '0')).join('')}`;
}

const HOME = 'app/components/home/home.css';
const JOBS = 'app/components/jobs/jobs.css';
const GATE = 'app/components/jobs/gate.css';
const MAP = 'app/components/map/map.css';
const DESK = 'app/components/desk.css';
const SAVED = 'app/saved/saved.css';
const HANGAR = 'app/components/startups/startups.css';

// [stylesheet, the control, the roots that must carry the page-local variable for it].
// The roots are the elements that contain the control in the DOM: the page's own root, or the
// kit Dialog's panel (.dlg.<name>) for a control inside a dialog, which renders into document.body.
const CONTROLS = [
  [HOME, '.wt-input', ['.wt']],
  [JOBS, '.jb-input', ['.jb']],
  [JOBS, '.gf-chip', ['.jb']],
  [JOBS, '.gf-select', ['.jb']],
  [GATE, '.gate-visa', ['.dlg.gate']],
  [MAP, '.mt-input', ['.mt']],
  [MAP, '.mt-select', ['.mt']],
  [MAP, '.mt-me', ['.mt']],
  [MAP, '.mt .mapboxgl-ctrl-group', ['.mt']],
  [MAP, '.arr-x', ['.dlg.arr']],
  [DESK, '.desk-sugg button', ['.dlg.desk-chat']],
  [DESK, '.desk-input', ['.dlg.desk-chat']],
  [SAVED, '.it-x', ['.iti']],
  [HANGAR, '.hg-btn-ghost', ['.hg', '.hg-standpage', '.dlg.hg-post']],
  [HANGAR, '.hg-chip', ['.hg']],
];

test('resting control borders use the 3:1 mix, through a page-local variable set on a root that holds the control', () => {
  for (const [file, selector, roots] of CONTROLS) {
    const rules = cssRules(read(file));
    const borders = restingBorders(rules, selector);
    assert.ok(borders.length > 0, `${file} ${selector}: a resting border is declared`);
    for (const value of borders) {
      assert.ok(!value.includes('var(--rule)'), `${file} ${selector}: rests on var(--rule) (${value})`);
    }
    // The colour is the last border declaration (no var(--rule) line before it either, see above).
    const value = borders.at(-1);
    if (value.includes(MIX)) continue;
    const name = /var\((--[a-z-]+)\)/.exec(value)?.[1];
    assert.ok(name, `${file} ${selector}: the border is the mix or a page-local variable (${value})`);
    const declared = rules.filter((r) => r.at.length === 0 && r.body.includes(`${name}:`));
    assert.equal(declared.length, 1, `${file}: ${name} is declared once, in this file`);
    assert.ok(declared[0].body.includes(`${name}: ${MIX}`), `${file}: ${name} is the house mix`);
    for (const root of roots) {
      assert.ok(declared[0].selectors.includes(root), `${file}: ${root} carries ${name} for ${selector}`);
    }
  }

  // The controls sit inside those roots in the markup (a variable set elsewhere would leave the
  // border unset: a kit Dialog's content is not inside the page that opened it).
  const src = (rel) => read(rel);
  // Home: WhereTo's own section holds the form and its input.
  assert.match(src('app/components/home/WhereTo.js'), /<section className="hp-beat wt"[\s\S]*className="wt-input"[\s\S]*<\/section>/);
  // /jobs: the board's root holds the search field and the chips (GateFilters).
  assert.match(src('app/components/jobs/JobsBoard.js'), /<div className="jb">[\s\S]*className="jb-input"[\s\S]*<GateFilters\b/);
  // /map: the page's <main class="mt"> holds the tower (search, select, profile button, the map).
  assert.match(src('app/map/page.js'), /<main className="mt"[^>]*>[\s\S]*<ControlTower \/>[\s\S]*<\/main>/);
  // /saved: the itinerary's root holds its rows.
  assert.match(src('app/saved/Itinerary.js'), /<div className="iti">/);
  // Dialog panels: className lands on the panel itself (class="dlg <name>").
  assert.match(src('app/components/kit/Dialog.js'), /className=\{className \? `dlg \$\{className\}` : 'dlg'\}/);
  assert.match(src('app/components/jobs/JobGate.js'), /<Dialog\b[^>]*className="gate"[\s\S]*className="gate-visa"/);
  assert.match(src('app/components/map/ArrivalsBoard.js'), /<Dialog\b[^>]*className="arr"[\s\S]*className="arr-x"/);
  assert.match(src('app/components/ChatWidget.js'), /<Dialog\b[^>]*className="desk-chat"[\s\S]*className="desk-sugg"[\s\S]*className="desk-input"/);
  assert.match(src('app/components/startups/PostStartup.js'), /<Dialog\b[^>]*className="hg-post"[\s\S]*className="hg-btn hg-btn-ghost"/);
});

test('dividers, panels and disabled controls stay on var(--rule) (not a blanket replace)', () => {
  const keep = [
    [HOME, '.wt-board', /border:\s*1px solid var\(--rule\)/],
    [JOBS, '.jr', /border-top:\s*1px solid var\(--rule\)/],
    [JOBS, '.jb-board', /border:\s*1px solid var\(--rule\)/],
    [JOBS, '.gf-rule', /background:\s*var\(--rule\)/],
    [GATE, '.gate-head', /border-bottom:\s*1px solid var\(--rule\)/],
    [GATE, '.gate-pa', /border:\s*1px solid var\(--rule\)/],
    [MAP, '.mt-bar', /border-bottom:\s*1px solid var\(--rule\)/],
    [MAP, '.mt-show:disabled', /border-color:\s*var\(--rule\)/],
    [MAP, '.mt .mapboxgl-ctrl-group button + button', /border-top-color:\s*var\(--rule\)/],
    [MAP, '.arr-none', /border:\s*1px solid var\(--rule\)/],
    [DESK, '.desk-assistant', /border:\s*1px solid var\(--rule\)/],
    [DESK, '.desk-form', /border-top:\s*1px solid var\(--rule\)/],
    [SAVED, '.it', /border-top:\s*1px solid var\(--rule\)/],
    [SAVED, '.it-board', /border:\s*1px solid var\(--rule\)/],
    [SAVED, ".it-x[aria-disabled='true']", /border-color:\s*var\(--rule\)/],
    [HANGAR, '.hg-card', /border:\s*1px solid var\(--rule\)/],
    [HANGAR, '.hg-chip-sep', /background:\s*var\(--rule\)/],
  ];
  for (const [file, selector, pin] of keep) {
    const rule = cssRules(read(file)).find((r) => r.at.length === 0 && r.selectors.includes(selector) && pin.test(r.body));
    assert.ok(rule, `${file} ${selector} keeps var(--rule)`);
  }
});

test('the mix is 3:1 or better on the hall and on both panel fills (from the palette in globals.css)', () => {
  const globals = read('app/globals.css');
  const token = (name) => {
    const hex = new RegExp(`--${name}:\\s*(#[0-9a-f]{6})\\b`, 'i').exec(globals)?.[1];
    assert.ok(hex, `--${name} is a #rrggbb token in globals.css`);
    return hex;
  };
  const edge = mix(token('ink-sub'), token('hall-2'), 0.6);
  const rule = token('rule');
  for (const name of ['hall', 'hall-2', 'hall-3']) {
    const bg = token(name);
    assert.ok(contrast(edge, bg) >= 3, `${edge} on --${name}: ${contrast(edge, bg).toFixed(2)}:1`);
    assert.ok(contrast(rule, bg) < 3, `--rule on --${name} is under 3:1 (why the controls moved off it)`);
  }
});

test('the relocation guide\'s fields rest on the mix (Tailwind arbitrary colour), yellow on focus', () => {
  const field = /const FIELD =\s*'([^']*)'/.exec(read('app/components/RelocationModal.js'))?.[1];
  assert.ok(field, 'FIELD is one class string');
  const classes = field.split(/\s+/);
  assert.ok(!classes.includes('border-rule'), 'FIELD no longer rests on border-rule');
  assert.ok(classes.includes('border'), 'FIELD still draws a 1px border');
  assert.ok(classes.includes('border-[color-mix(in_srgb,var(--ink-sub)_60%,var(--hall-2))]'), 'FIELD rests on the 3:1 mix');
  assert.ok(classes.includes('focus:border-sign'), 'focus still turns the edge yellow');
});

test('/startups/[id]: an unknown stand answers a real 404 (notFound), a database error does not', () => {
  const page = read('app/startups/[id]/page.js');
  assert.match(page, /import \{ notFound \} from 'next\/navigation';/);
  const body = page.slice(page.indexOf('export default async function StartupStandPage'));
  assert.ok(body.length > 0 && body.length < page.length, 'StartupStandPage is the default export');
  assert.match(body, /if \(!isUuid\(id\)\) notFound\(\);/, 'an id that is not a uuid is a 404');
  assert.match(body, /supabase\.from\('startups'\)\.select\('id'\)\.eq\('id', id\)\.maybeSingle\(\)/, 'asks the public client for the row');
  assert.match(body, /if \(!error && !data\) notFound\(\);/, 'no row and no error: a 404');
  assert.ok(!/if \(!data\) notFound\(\)/.test(body), 'a database error alone never turns into a 404');
  assert.match(body, /<Stand id=\{id\} \/>/, 'a stand that exists still renders the stand');
});
