// Task 15b integration: the cross-group edits no single group could make in another group's files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** Every file under rel as a repo path with forward slashes (node_modules and .next skipped). */
function files(rel) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) return [];
  if (!statSync(abs).isDirectory()) return [rel];
  return readdirSync(abs)
    .filter((name) => name !== 'node_modules' && name !== '.next')
    .flatMap((name) => files(posix.join(rel, name)));
}

test('/map names the social image Next resolved for the root, hash included (as /jobs does, K3)', () => {
  const src = read('app/map/page.js');
  assert.doesNotMatch(src, /\bSOCIAL_IMAGE\b/, 'the bare /opengraph-image has no cache-busting hash');
  assert.match(src, /export async function generateMetadata\(_props, parent\) \{\s*const images = socialImages\(await parent\);/);
  assert.equal((src.match(/\bimages \}/g) || []).length, 2, 'openGraph and twitter both carry it');
});

test('the AI desk opens with focus in the question box, not on its close button (Task 5 re-review Minor 4)', () => {
  assert.match(read('app/components/ChatWidget.js'), /id="desk-q"\s+data-autofocus\b/);
  // The kit Dialog focuses the first [data-autofocus] when no initialFocusRef is passed.
  assert.match(read('app/components/kit/Dialog.js'), /el\.querySelector\('\[data-autofocus\]'\)/);
});

test('no source file starts with a byte-order mark', () => {
  const sources = ['app', 'lib', 'scripts'].flatMap(files).filter((f) => /\.(?:js|mjs|css)$/.test(f));
  assert.ok(sources.length > 100, 'the scan sees the sources');
  assert.deepEqual(sources.filter((f) => read(f).charCodeAt(0) === 0xfeff), []);
});
