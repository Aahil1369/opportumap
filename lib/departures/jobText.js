// A job's description as the board keeps it and as the gate's announcement asks about it: plain
// text (tags out, one space between words), cut at a word with "…" past ADVICE_DESC_CHARS. One
// helper set for both (boardDescription.js, used by trimJob and savedStore.js; JobGate's advice body), so a role from the
// server's board and the same role from a search ask the model one question, not two: the
// anonymous answers are kept per exact prompt (app/api/job-advice/route.js).

/** /api/job-advice reads this much of a description (its FIELD_CAPS.description). */
export const ADVICE_DESC_CHARS = 500;

/** HTML -> plain text: tags out, whitespace runs as one space, no space before punctuation. */
export function plainText(html) {
  return String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
}

/** `text` whole when it fits in `max` characters, else cut at a word and ended with "…". */
export function cutAtWord(text, max) {
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  const head = chars.slice(0, max - 1).join('');
  const space = head.lastIndexOf(' ');
  return `${(space > max / 2 ? head.slice(0, space) : head).replace(/[\s.,;:!?–-]+$/, '')}…`;
}

/** The description the gate's announcement is asked about (and the server board keeps). Idempotent. */
export const adviceDescription = (description) => cutAtWord(plainText(description), ADVICE_DESC_CHARS);
