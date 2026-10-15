// The one sign-in dialog (app/components/AuthModal.js), opened by the Navbar and by every
// signed-out prompt (hangar, lounge, gate chat, crew badge) through useSignIn. It is the kit
// Dialog itself (focus trap, Esc, focus return; no second role="dialog" wrapped around it), in
// the dark hall (no paper theme, no Instrument Serif, no backdrop blur), with 16px labelled
// inputs and 16px buttons, so an iPhone does not zoom on focus. Both prompt modules
// (startups/SignIn.js, community/SignIn.js) go through the shared hook.
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

/** Source without its comments (the headers describe what the code must not do). */
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const MODAL = code('app/components/AuthModal.js');
const CSS = read('app/components/AuthModal.css').replace(/\/\*[\s\S]*?\*\//g, '');
const HOOK = code('app/components/useSignIn.js');
const STARTUPS = code('app/components/startups/SignIn.js');
const COMMUNITY = code('app/components/community/SignIn.js');

const parse = (code) => espree.parse(code, { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true }, range: true });

/** Every JSX opening element: { name, attrs: { attr: source text of its value | true } }. */
function jsxElements(code) {
  const out = [];
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'JSXOpeningElement') {
      const attrs = {};
      for (const a of node.attributes) {
        if (a.type !== 'JSXAttribute') continue;
        const v = a.value;
        attrs[a.name.name] = !v ? true : v.type === 'Literal' ? v.value : code.slice(v.expression.range[0], v.expression.range[1]);
      }
      out.push({ name: node.name.name, attrs });
    }
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const v = node[key];
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v === 'object') visit(v);
    }
  };
  visit(parse(code));
  return out;
}

function visibleStrings(code) {
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
  visit(parse(code));
  return out;
}

/** The declarations of the first rule whose selector list includes `sel` exactly. */
function rule(sel) {
  for (const m of CSS.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (m[1].split(',').map((s) => s.trim()).includes(sel)) return m[2];
  }
  return null;
}

test('AuthModal is a kit Dialog in the dark hall: no paper theme, no serif, no blur', () => {
  assert.match(MODAL, /import Dialog from '\.\/kit\/Dialog'/);
  assert.match(MODAL, /import '\.\/AuthModal\.css'/);
  const dialog = jsxElements(MODAL).find((e) => e.name === 'Dialog');
  assert.ok(dialog, 'renders the kit Dialog');
  assert.ok(dialog.attrs.labelledBy, 'named by its title');
  assert.equal(dialog.attrs.onClose, 'onClose', 'Esc / backdrop / ✕ close through the caller');
  assert.equal(dialog.attrs.returnFocusRef, 'returnFocusRef', 'focus goes back to the opener');
  assert.ok(!/role="dialog"|aria-modal/.test(MODAL), 'the Dialog owns role="dialog"; none of its own');
  assert.ok(!/\b(?:bg|text|border)-paper|paper-|font-display|Instrument/.test(MODAL), 'no paper theme or Instrument Serif');
  assert.ok(!/backdrop-blur|backdrop-filter|bg-black\//.test(MODAL + CSS), 'no backdrop blur');
  assert.ok(!/\bui\/Btn\b|text-\[1[0-5]px\]|text-sm\b|text-xs\b/.test(MODAL), 'no small Tailwind text or the old paper button');
});

test('every field has a real label (htmlFor) and the name field is required on sign-up', () => {
  const els = jsxElements(MODAL);
  const inputs = els.filter((e) => e.name === 'input');
  assert.equal(inputs.length, 3, 'name, email, password');
  const labels = new Set(els.filter((e) => e.name === 'label').map((e) => e.attrs.htmlFor));
  for (const input of inputs) {
    assert.ok(input.attrs.id, `input without id: ${JSON.stringify(input.attrs)}`);
    assert.ok(labels.has(input.attrs.id), `no <label htmlFor> for ${input.attrs.id}`);
    assert.equal(input.attrs.className, 'auth-input');
    assert.ok(!input.attrs.placeholder, 'the label names the field, not a placeholder');
  }
  const nameInput = inputs.find((e) => e.attrs.autoComplete === 'name');
  assert.ok(nameInput?.attrs.required, 'the name field is required');
  const email = inputs.find((e) => e.attrs.type === 'email');
  assert.equal(email?.attrs.autoComplete, 'email');
  const password = inputs.find((e) => e.attrs.type === 'password');
  assert.ok(password?.attrs.required && password.attrs.minLength);
  assert.ok(els.some((e) => e.name === 'p' && e.attrs.role === 'alert'), 'errors are announced');
  assert.ok(!els.some((e) => e.name === 'button' && 'disabled' in e.attrs), 'busy is aria-disabled, never disabled (focus stays)');
  const close = els.find((e) => e.name === 'button' && e.attrs['aria-label'] === 'Close');
  assert.ok(close, 'a labelled close button');
});

test('AuthModal.css: 16px inputs, buttons and links, Inter + JetBrains Mono, palette only, transform only', () => {
  for (const sel of ['.auth-input', '.auth-btn', '.auth-link']) {
    const body = rule(sel);
    assert.ok(body, `missing ${sel}`);
    assert.match(body, /font:\s*\d{3} 16px\//, `${sel} is 16px`);
    assert.match(body, /var\(--auth-sans\)/, `${sel} is Inter`);
  }
  assert.match(rule('.auth-x'), /font-size:\s*16px/);
  for (const sel of ['.auth-btn', '.auth-x', '.auth-link']) {
    assert.match(rule(sel), /(?:min-height|height):\s*(?:4[4-9]|[5-9]\d)px/, `${sel} is a 44px+ target`);
  }
  for (const sel of ['.auth-text', '.auth-alert', '.auth-switch']) assert.match(rule(sel), /font-size:\s*16px/, `${sel} is 16px`);
  assert.match(rule('.auth'), /--auth-sans:\s*var\(--font-inter\)/);
  for (const m of CSS.matchAll(/font(?:-family)?:\s*([^;]+);/g)) {
    assert.match(m[1], /var\(--(?:auth-sans|font-board|font-inter)\)|^inherit$/, `font ${m[1]}`);
  }
  assert.match(rule('.dlg.auth'), /width:\s*min\(100%, \d+px\)/, 'fits a 375px phone');
  assert.ok(!/#[0-9a-f]{3,8}\b/i.test(CSS), 'colours come from the palette tokens');
  for (const m of CSS.matchAll(/transition(?:-property)?\s*:\s*([^;]+);/g)) {
    for (const part of m[1].replace(/\([^)]*\)/g, '()').split(',')) {
      assert.ok(['transform', 'opacity', 'none'].includes(part.trim().split(/\s+/)[0]), `transition on ${part}`);
    }
  }
  assert.ok(!/@keyframes|backdrop-filter|filter:|\d\s*vh\b|\b(?:tan|atan2|sin|cos)\(/.test(CSS));
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)/);
});

test('copy: no "flight"/"fare", no totals', () => {
  for (const s of visibleStrings(MODAL)) {
    assert.ok(!/\b(?:flights?|fares?)\b/i.test(s), JSON.stringify(s));
    assert.ok(!/\b\d[\d,.]*\s*[kKmM]?\+?\s*(?:countries|jobs|roles|listings|members)\b/i.test(s), JSON.stringify(s));
  }
  for (const s of ['Sign in to OpportuMap', 'Create your account', 'Continue with Google', 'Check your email']) {
    assert.ok(visibleStrings(MODAL).some((x) => x.includes(s)), `missing "${s}"`);
  }
});

test('the prompts open the shared dialog: never bare, never wrapped in a second dialog', () => {
  // The hook loads AuthModal on demand and hands it the opener for focus return.
  assert.match(HOOK, /dynamic\(\(\) => import\('\.\/AuthModal'\), \{ ssr: false \}\)/);
  assert.match(HOOK, /<AuthModal onClose=\{close\} onSuccess=\{signedIn\} returnFocusRef=\{opener\} \/>/);
  assert.match(HOOK, /\[data-after-signin\]/, 'after signing in, focus lands on what replaced the prompt');
  assert.match(STARTUPS, /import \{ useSignIn \} from '\.\.\/useSignIn'/);
  assert.match(STARTUPS, /onClick=\{openSignIn\}/);
  assert.match(COMMUNITY, /export \{ useSignIn \} from '\.\.\/useSignIn'/);
  for (const [file, src] of [['startups/SignIn.js', STARTUPS], ['community/SignIn.js', COMMUNITY], ['useSignIn.js', HOOK]]) {
    assert.ok(!/role="dialog"|aria-modal|addEventListener\('keydown'/.test(src), `${file} adds no dialog of its own`);
  }
  // Only the Navbar and the hook mount AuthModal.
  const importers = walk('app')
    .filter((f) => /\.js$/.test(f))
    .filter((f) => /import\(['"][./]*AuthModal['"]\)|from ['"][./]*AuthModal['"]/.test(readFileSync(f, 'utf8')))
    .map(show)
    .sort();
  assert.deepEqual(importers, ['app/components/Navbar.js', 'app/components/useSignIn.js']);
  assert.match(read('app/components/Navbar.js'), /<AuthModal onClose=\{\(\) => setShowAuth\(false\)\}/, 'the Navbar still mounts it while wanted');
});

test('after signing in, every page has somewhere for focus to land', () => {
  for (const f of [
    'app/components/startups/Hangar.js',
    'app/components/startups/Stand.js',
    'app/components/community/Composer.js',
    'app/components/messages/GateChat.js',
    'app/components/profile/CrewBadge.js',
  ]) {
    assert.match(read(f), /data-after-signin|'data-after-signin'/, `${f} marks its after-sign-in target`);
  }
});
