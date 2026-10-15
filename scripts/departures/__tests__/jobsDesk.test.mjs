// /jobs fix round 1: the AI assistant (ChatWidget, /api/chat) and the relocation guide
// (RelocationModal, "I got the job") are back on /jobs, their only host. Night-themed, each in
// the kit's Dialog (focus trap, Esc, data-lenis-prevent), and loaded only when first opened.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');

const BOARD = 'app/components/jobs/JobsBoard.js';
const CHAT = 'app/components/ChatWidget.js';
const MOVE = 'app/components/RelocationModal.js';

test('/jobs hosts the assistant and the relocation guide, each loaded on first open', () => {
  const src = read(BOARD);
  assert.match(src, /const ChatWidget = dynamic\(\(\) => import\('\.\.\/ChatWidget'\), \{ ssr: false \}\)/);
  assert.match(src, /const RelocationModal = dynamic\(\(\) => import\('\.\.\/RelocationModal'\), \{ ssr: false \}\)/);
  assert.match(src, /<ChatWidget\b/);
  assert.match(src, /<RelocationModal\b/);
  assert.match(src, />\s*I got the job/);
});

test('the assistant still asks /api/chat, and that route is still there', () => {
  assert.match(read(CHAT), /fetch\('\/api\/chat'/);
  assert.ok(existsSync(`${ROOT}app/api/chat/route.js`));
});

test('both open in the kit Dialog (focus trap, Esc) with a name', () => {
  for (const f of [CHAT, MOVE]) {
    const src = read(f);
    assert.match(src, /import Dialog from '\.\/kit\/Dialog'/, `${f} uses the kit Dialog`);
    assert.match(src, /<Dialog\b[^>]*\b(?:labelledBy|label)=/, `${f} names its dialog`);
    assert.match(src, /returnFocusRef=\{returnFocusRef\}/, `${f} hands focus back to its button`);
    assert.doesNotMatch(src, /className="fixed inset-0/, `${f} draws no overlay of its own`);
  }
});

test('both are on the night theme: no paper tokens, no colour transitions, no vh, no blur', () => {
  for (const f of [CHAT, MOVE]) {
    const src = read(f);
    assert.doesNotMatch(src, /paper-|#2a3a2f/, `${f} still uses the paper theme`);
    assert.doesNotMatch(src, /transition-colors|transition-all/, `${f} animates colours`);
    assert.doesNotMatch(src, /\d+vh\b|-\[\d+vh\]/, `${f} uses vh`);
    assert.doesNotMatch(src, /backdrop-blur/, `${f} blurs the page`);
    assert.doesNotMatch(src, /text-\[1[0-5]px\]/, `${f} sets text under 16px`);
  }
});

test('the assistant shows no raw server errors and does not scroll the page', () => {
  const src = read(CHAT);
  assert.doesNotMatch(src, /`Error: \$\{/);
  assert.doesNotMatch(src, /scrollIntoView/);
});

test('no count claims in the relocation guide', () => {
  assert.doesNotMatch(read(MOVE), /\d+\+\s*cities/);
});

test('the redesigned-copy scans cover both', () => {
  const src = read('scripts/departures/__tests__/foundation.test.mjs');
  assert.match(src, /'app\/components\/ChatWidget\.js'/);
  assert.match(src, /'app\/components\/RelocationModal\.js'/);
});
