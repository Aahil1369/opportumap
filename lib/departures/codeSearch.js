// Search help for the board: what a typed query could mean as a place. "tor" -> YYZ / Toronto,
// "yyz" -> Toronto, "sf" -> SFO. Codes and city names come back in rank order, without repeats.
import { cityIndex, normPlace } from './cityCode.js';

const EMPTY = () => ({ codes: [], cities: [] });

/**
 * Ranks: an exact code (3 letters), an exact name, an exact alias (any length >= 2), then for
 * queries of 3+ characters a name or alias that starts with the query, then one with a word
 * that does ("york" -> New York). One-letter queries match nothing.
 */
export function codeSearch(query) {
  const q = normPlace(query);
  if (q.length < 2) return EMPTY();
  const tiers = [[], [], [], [], [], [], []];
  const isCode = /^[a-z]{3}$/.test(q);
  const long = q.length >= 3;
  for (const { key, row, alias } of cityIndex().keys) {
    let tier = -1;
    if (isCode && row[2].toLowerCase() === q) tier = 0;
    else if (key === q) tier = alias ? 2 : 1;
    else if (long && key.startsWith(q)) tier = alias ? 4 : 3;
    else if (long && key.includes(` ${q}`)) tier = alias ? 6 : 5;
    if (tier >= 0) tiers[tier].push(row);
  }
  const codes = new Set();
  const cities = new Set();
  for (const rows of tiers) {
    for (const [name, , code] of rows) {
      codes.add(code);
      cities.add(name);
    }
  }
  return { codes: [...codes], cities: [...cities] };
}
