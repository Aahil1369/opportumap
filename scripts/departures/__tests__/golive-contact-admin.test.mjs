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

// ── /contact: a Send tapped before the JS loads must not put the message in the URL ───────────

test('/contact form is method="post": a native submit never puts name, email and message in the URL', () => {
  const src = read('app/contact/page.js');
  const forms = [...src.matchAll(/<form\b([^>]*)>/g)];
  assert.equal(forms.length, 1, 'one form on the page');
  assert.match(forms[0][1], /\bmethod="post"/, 'not the default GET');
  assert.match(forms[0][1], /\bonSubmit=\{handleSubmit\}/, 'the JSON send still handles it once JS is up');
  assert.doesNotMatch(forms[0][1], /\baction=/, 'no new address: a native POST stays on /contact');
});

// ── /admin: RECENT POSTS reads the real column; the page fits a phone ─────────────────────────

test('admin stats route selects posts.post_type (there is no posts.type column)', () => {
  const src = read('app/api/admin/stats/route.js');
  assert.match(src, /\.select\('id, title, user_name, created_at, post_type'\)\.order\('created_at', \{ ascending: false \}\)/);
  assert.doesNotMatch(src, /\btype\b/, 'never "type" alone: PostgREST refuses the whole query (42703)');
});

test('/admin reads post.post_type for the RECENT POSTS badge', () => {
  const src = read('app/admin/page.js');
  assert.match(src, /\{TYPE_LABELS\[post\.post_type\] \|\| post\.post_type\}/);
  assert.doesNotMatch(src, /\bpost\.type\b/);
});

test('/admin: both post panels carry min-w-0, so a long title truncates instead of widening the page', () => {
  const src = read('app/admin/page.js');
  const grid = /<div className="grid lg:grid-cols-2 gap-5">([\s\S]*?)<p className="pt-5 border-t/.exec(src)?.[1] ?? '';
  for (const heading of ['RECENT POSTS', 'TOP POSTS BY LIKES']) {
    const at = grid.indexOf(`>${heading}</h2>`);
    assert.ok(at > 0, `${heading} panel is in the two-column grid`);
    // The panel is the last <div className={…}> opened before its heading.
    const before = grid.slice(0, at);
    const opener = `${before.slice(before.lastIndexOf('<div className={')).split('>')[0]}>`;
    assert.equal(opener, '<div className={`${panel} min-w-0`}>', `${heading} panel`);
  }
  assert.doesNotMatch(grid, /<div className=\{panel\}>/, 'no grid item without min-w-0');
  assert.match(grid, /text-ink truncate">\{post\.title/, 'the titles still truncate');
});

test('/admin: the three 15px lines are 16px (name and email, row error, "Showing the newest")', () => {
  const src = read('app/admin/page.js');
  assert.doesNotMatch(src, /text-\[15px\]/);
  assert.match(src, /<p className="text-\[16px\] text-ink-dim mt-1 break-words">/, 'name · email line');
  assert.match(src, /<p role="alert" className="mt-2 text-\[16px\] text-warn">\{rowErrors\[m\.id\]\}<\/p>/, 'row error');
  assert.match(src, /<p className="mt-3 text-\[16px\] text-ink-sub">Showing the newest \{INBOX_LIMIT\}\.<\/p>/, 'limit line');
});
