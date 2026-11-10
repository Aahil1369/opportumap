// Go-live fix wave, group G7: the information desk (/contact) and the owner's /admin page.
// Brief: .superpowers/sdd/golive/briefs/g7-contact-admin.md in the departures worktree.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

// ── /contact: LinkedIn back as plain text (owner's decision, 2026-11-07) ──────────────────────

test('/contact shows "LinkedIn · OpportuMap" as plain 16px text, in both states of the desk', () => {
  const src = read('app/contact/page.js');
  const line = /<p className="([^"]*)">LinkedIn · OpportuMap<\/p>/.exec(src);
  assert.ok(line, 'the line reads "LinkedIn · OpportuMap", in a plain paragraph');
  assert.match(line[1], /\btext-\[16px\]/, '16px on phones');
  assert.doesNotMatch(line[1], /\b(?:sm|md|lg):text-\[1[0-5]px\]/, 'never under 16px');
  assert.equal(src.match(/LinkedIn/g)?.length, 1, 'named once');
  // After the sent/form switch closes, so the "Message sent." screen keeps it too.
  assert.ok(src.indexOf('LinkedIn · OpportuMap') > src.lastIndexOf(')}'), 'outside the sent/form switch');
  // Plain text: no URL was ever confirmed, so nothing on the page links out.
  assert.doesNotMatch(src, /<a\b|href=|https?:|linkedin\.com/i);
});

test('/contact names no Twitter or X handle', () => {
  const src = read('app/contact/page.js');
  assert.doesNotMatch(src, /twitter|@opportumap|x\.com/i);
  assert.doesNotMatch(src, /\bX\b/, 'no "X" account row');
});
