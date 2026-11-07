// A role's description as the boards keep it: plain text, at most BOARD_DESC_CHARS characters, cut
// at a word ("…"). Enough for the match score (scoreJob), the role-type chips and the gate's
// advice; the full HTML stays with the feed. The /jobs server board (trimJob, jobRows.js) and the
// saved snapshots (savedStore.js) both use it, so a role scores the same on /jobs and on /saved.
// Pure, and tested (jobsServerBoard.test.mjs, savedStore.test.mjs).

export const BOARD_DESC_CHARS = 300;

function plainText(html) {
  return String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
}

function cutAtWord(text, max) {
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  const head = chars.slice(0, max - 1).join('');
  const space = head.lastIndexOf(' ');
  return `${(space > max / 2 ? head.slice(0, space) : head).replace(/[\s.,;:!?–-]+$/, '')}…`;
}

/** boardDescription(html, max) -> the description as plain text of at most `max` characters, or '' when there is none. */
export function boardDescription(html, max = BOARD_DESC_CHARS) {
  const text = plainText(html);
  return text ? cutAtWord(text, max) : '';
}
