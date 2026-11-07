// Task 7-12: site-wide hover guard. Every rule whose selector contains :hover must be inside an
// @media (hover: hover) block. Nesting inside other @media blocks is fine.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** Every .css file under rel as a repo path with forward slashes. */
function cssFiles(rel) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) return [];
  if (!statSync(abs).isDirectory()) return rel.endsWith('.css') ? [rel] : [];
  return readdirSync(abs)
    .filter((name) => name !== 'node_modules' && name !== '.next')
    .flatMap((name) => cssFiles(posix.join(rel, name)));
}

test('every :hover rule is wrapped in @media (hover: hover)', () => {
  const files = cssFiles('app');
  assert.ok(files.length > 0, 'CSS files found');

  const offenders = [];

  for (const file of files) {
    const path = join(ROOT, file);
    let css = readFileSync(path, 'utf8');

    // Remove all @media (hover: hover) blocks - find them properly with brace matching
    let cleaned = '';
    let i = 0;
    while (i < css.length) {
      const hoverMediaIdx = css.indexOf('@media', i);
      if (hoverMediaIdx === -1) {
        cleaned += css.substring(i);
        break;
      }

      const openBraceIdx = css.indexOf('{', hoverMediaIdx);
      if (openBraceIdx === -1) {
        cleaned += css.substring(i, hoverMediaIdx);
        break;
      }

      const mediaQuery = css.substring(hoverMediaIdx, openBraceIdx);

      if (mediaQuery.includes('(hover: hover)')) {
        // This is a hover media block, skip it entirely with brace matching
        cleaned += css.substring(i, hoverMediaIdx); // Add everything before

        let depth = 1;
        let j = openBraceIdx + 1;
        while (j < css.length && depth > 0) {
          if (css[j] === '{') depth++;
          if (css[j] === '}') depth--;
          j++;
        }
        i = j; // Skip past this media block
      } else {
        // Not a hover media, include it
        cleaned += css.substring(i, openBraceIdx + 1);
        i = openBraceIdx + 1;
      }
    }

    // Now check for any remaining :hover in the cleaned CSS
    // Look for :hover that's part of a selector (followed by space or comma or brace)
    const pattern = /:hover\s*[,{]/g;
    let match;
    while ((match = pattern.exec(cleaned))) {
      let lineNum = 1;
      for (let j = 0; j < match.index; j++) {
        if (cleaned[j] === '\n') lineNum++;
      }

      // Get the selector context
      let start = match.index;
      while (start > 0 && cleaned[start] !== '{' && cleaned[start] !== ';') {
        start--;
      }
      while (start < match.index && cleaned[start] === ' ') start++;

      const selector = cleaned.substring(start, match.index + 6).trim();
      offenders.push(`${file}:${lineNum}: ${selector.substring(0, 70)}`);
    }
  }

  if (offenders.length > 0) {
    assert.fail(`${offenders.length} :hover rules not in @media (hover: hover):\n  ${offenders.join('\n  ')}`);
  }
});
