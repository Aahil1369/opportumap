// A role's description as the boards keep it: plain text, at most BOARD_DESC_CHARS characters, cut
// at a word ("…"). Enough for the match score (scoreJob), the role-type chips and the gate's
// advice; the full HTML stays with the feed. The /jobs server board (trimJob, jobRows.js) and the
// saved snapshots (savedStore.js) both use it, so a role scores the same on /jobs and on /saved.
// The description the boards keep is the text the gate's announcement asks about (jobText.js),
// so a role scores the same on /jobs and /saved and asks the model one question.
// Pure, and tested (jobsServerBoard.test.mjs, savedStore.test.mjs).

import { ADVICE_DESC_CHARS, cutAtWord, plainText } from './jobText.js';

export const BOARD_DESC_CHARS = ADVICE_DESC_CHARS;

/** boardDescription(html, max) -> the description as plain text of at most `max` characters, or '' when there is none. */
export function boardDescription(html, max = BOARD_DESC_CHARS) {
  const text = plainText(html);
  return text ? cutAtWord(text, max) : '';
}
