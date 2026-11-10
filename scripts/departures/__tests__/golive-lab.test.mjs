// Go-live (Ruling R20): the two noindex QA pages, /lab/flap and /lab/kit, are deleted, together
// with the browser check that could only drive /lab/flap. No page, no link, no import, no script
// that needs them comes back. (A robots "disallow /lab/" entry is harmless and may stay.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** Every file under `rel` as a repo path with forward slashes (tests, node_modules, .next skipped). */
function files(rel) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) return [];
  if (!statSync(abs).isDirectory()) return [rel];
  return readdirSync(abs)
    .filter((name) => name !== '__tests__' && name !== 'node_modules' && name !== '.next')
    .flatMap((name) => files(posix.join(rel, name)));
}

// A lab route or folder ("/lab", "/lab/flap?fps=1", "app/lab", "../lab/kit/KitLab"), but not
// "/label" or "/labs"; and the two lab components by name.
const LAB_PATH = /\/lab(?![\w-])/;
const LAB_NAME = /\b(?:Flap|Kit)Lab\b/;
const mentionsLab = (line) => LAB_PATH.test(line) || LAB_NAME.test(line);

// The one mention that may stay: app/robots.js telling crawlers to keep out of /lab/ (harmless
// with the pages gone). Only that quoted entry on a `disallow` line is let through.
const KEEP_OUT = /(['"`])\/lab\/\1/g;
const pointsAtLab = (file, line) =>
  mentionsLab(file === 'app/robots.js' && /\bdisallow\b/.test(line) ? line.replace(KEEP_OUT, '') : line);

test('the matcher sees lab routes, folders and imports, and leaves other words alone (sanity)', () => {
  for (const line of [
    '<a href="/lab/flap?fps=1">',
    "router.push('/lab')",
    "  'app/lab',",
    "import KitLab from '../lab/kit/KitLab';",
    "import FlapLab from './FlapLab';",
    'node scripts/x.mjs http://localhost:3300/lab/flap',
  ]) {
    assert.ok(mentionsLab(line), `should match: ${line}`);
  }
  for (const line of ['<label htmlFor="x">', "fetch('/labels')", "href: '/laboratory'", "'r&d', 'lab', 'academic'", 'lab technician']) {
    assert.ok(!mentionsLab(line), `should not match: ${line}`);
  }
});

test('a robots "keep out of /lab/" entry may stay; nothing else in or around it may (sanity)', () => {
  const keepOut = "      disallow: ['/api/', '/admin', '/auth/', '/lab/'],";
  assert.equal(pointsAtLab('app/robots.js', keepOut), false, 'the robots disallow entry is let through');
  assert.equal(pointsAtLab('app/sitemap.js', keepOut), true, 'the same line in any other file is not');
  for (const line of [
    "      allow: ['/', '/lab/'],",
    "      disallow: ['/api/', '/lab/kit'],",
    "      disallow: ['/lab/'], // see /lab/flap",
    "const QA = '/lab/flap';",
  ]) {
    assert.equal(pointsAtLab('app/robots.js', line), true, `should still be found in app/robots.js: ${line}`);
  }
});

test('app/lab is gone: no /lab/flap, no /lab/kit', () => {
  assert.equal(existsSync(join(ROOT, 'app/lab')), false, 'app/lab still exists');
});

test('nothing under app/, lib/ or scripts/ (outside tests) links to or imports from the lab pages', () => {
  const scanned = ['app', 'lib', 'scripts'].flatMap(files).filter((f) => /\.(?:js|jsx|mjs|cjs|css|json|md|txt|xml|html)$/.test(f));
  // The scan is real: pages, kit, helpers and scripts are all in it; tests are not.
  for (const f of ['app/page.js', 'app/layout.js', 'app/components/kit/FlapText.js', 'app/components/kit/kit.css', 'lib/departures/board.js', 'scripts/ingest.mjs']) {
    assert.ok(scanned.includes(f), `${f} is scanned`);
  }
  assert.ok(!scanned.some((f) => f.includes('__tests__')), 'tests are not scanned');

  const found = [];
  for (const f of scanned) {
    readFileSync(join(ROOT, f), 'utf8')
      .split(/\r?\n/)
      .forEach((line, i) => {
        if (pointsAtLab(f, line)) found.push(`${f}:${i + 1}: ${line.trim().slice(0, 100)}`);
      });
  }
  assert.deepEqual(found, []);
});
