// Go-live fix wave, FX1 (the shell, the hangar hover, the stand page, two comments, no framework banner).
//   - The error pages recover with retry(), not reset(): Next 16.4 cannot recover a server error with reset().
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

test('the error pages recover with retry(), never reset() (Next 16.4.6)', () => {
  for (const file of ['app/error.js', 'app/global-error.js']) {
    const src = read(file);
    assert.doesNotMatch(src, /reset\(/, `${file} must not contain reset(`);
    assert.match(src, /\(\{ retry \}\)/, `${file} takes retry as its prop`);
    assert.match(src, /onClick=\{\(\) => retry\(\)\}/, `${file} the Try again button calls retry()`);
  }
});
