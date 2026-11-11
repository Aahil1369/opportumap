// The repo is public: no personal mail address belongs in a tracked file. Admin checks go by user
// id (lib/admin.js), and docs say `<owner email, redacted>` where an old plan once had the address.
//
// This reads every tracked text file and fails with the names of the files that hold an address at
// the mail provider below, never the address itself. The provider's name is put together from two
// pieces so that a plain search of the repo for it finds nothing, this file included.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PROVIDER = ['g', 'mail'].join('');
const PROVIDERS = [PROVIDER, 'googlemail', 'yahoo', 'outlook', 'hotmail', 'live', 'icloud', 'me', 'proton', 'protonmail', 'aol', 'gmx'];
const ADDRESS = new RegExp(`[A-Za-z0-9._%+-]+@(?:${PROVIDERS.join('|')})\\.[a-z]{2,}`, 'i');

function trackedFiles() {
  const out = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  return out.split('\0').filter(Boolean);
}

/** The file's text, or null when it is binary (a NUL byte, as git decides) or not in the working tree. */
function textOf(file) {
  let bytes;
  try {
    bytes = readFileSync(join(ROOT, file));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
  return bytes.includes(0) ? null : bytes.toString('utf8');
}

test('the pattern matches a personal address at any listed provider, and nothing else', () => {
  for (const p of PROVIDERS) {
    assert.match(`someone.else+tag@${p}.com`, ADDRESS, p);
    assert.match(`'SOMEONE@${p.toUpperCase()}.COM'`, ADDRESS, p);
  }
  assert.match(`someone@${PROVIDERS.at(-2)}.me`, ADDRESS);
  assert.doesNotMatch('<owner email, redacted>', ADDRESS);
  assert.doesNotMatch('noreply@anthropic.com', ADDRESS);
  assert.doesNotMatch(`@${PROVIDER}.com`, ADDRESS);
  assert.doesNotMatch(`someone@medium.com`, ADDRESS);
});

test('no tracked text file holds a personal mail address', () => {
  const files = trackedFiles();
  assert.ok(files.includes('package.json'), 'git lists the tracked files');
  const withAddress = files.filter((file) => {
    const text = textOf(file);
    return text !== null && ADDRESS.test(text);
  });
  assert.deepEqual(withAddress, [], 'files that hold a personal mail address');
});
