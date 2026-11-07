// A member's route as a board chip: 'LHE → YYZ'. From where they are now to where they want to
// work, read from their job profile ({ nationality, currentCountry, preferredCountries }, see
// app/components/ProfileModal.js). Pure and synchronous, off the static city table.
//
// - From: currentCountry (free text: a city, "City, Country" or a country name; a two-letter
//   code is read as that country), else nationality (an iso2 code). A country gives its main
//   city (cityCode's country fallback). Text the table cannot place, "Remote", or "other" is
//   not an origin; the next source is tried.
// - To: the first preferredCountries entry (iso2) that the table knows and that is not the
//   origin's own country; its main city.
// - null when either end is missing, so a chip never shows a made-up code.

import { CITY_ROWS } from './cityCodes.data.js';
import { cityCode, cityIndex, normPlace } from './cityCode.js';

let COUNTRY_OF_CODE = null;
/** 'YVR' -> 'ca': the country a table code belongs to (the first row that uses it). */
function countryOfCode(code) {
  if (!COUNTRY_OF_CODE) {
    COUNTRY_OF_CODE = new Map();
    for (const [, , c, iso2] of CITY_ROWS) if (!COUNTRY_OF_CODE.has(c)) COUNTRY_OF_CODE.set(c, iso2);
  }
  return COUNTRY_OF_CODE.get(code) || null;
}

const asIso2 = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');
const known = (iso2) => /^[a-z]{2}$/.test(iso2) && cityIndex().main.has(iso2);

/** A country in the table -> { code: its main city's code, iso2 } (cityCode's country fallback). */
function countryEnd(iso2) {
  if (!known(iso2)) return null;
  return { code: cityCode('', iso2).code, iso2 };
}

/** A country the text names ("Pakistan", "USA", "Lahore, Pakistan"), if the table has it. */
function namedCountry(text) {
  const { countries, main } = cityIndex();
  for (const part of text.split(/\s[-–—]\s|[,;/|•·]/)) {
    const iso2 = countries.get(normPlace(part));
    if (iso2 && main.has(iso2)) return iso2;
  }
  return null;
}

/** Where they live (free text) -> { code, iso2 }, or null when the table cannot place it. */
function placeEnd(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return null;
  const hit = cityCode(text);
  if (hit.matched) return hit.code === 'ANY' ? null : { code: hit.code, iso2: countryOfCode(hit.code) };
  if (/^[a-z]{2}$/i.test(text)) return countryEnd(asIso2(text));
  // cityCode fell back to a country's main city or to the text's first three letters; only the
  // first is a real place ("Madagascar" is not in the table and must not become Madrid's MAD).
  const iso2 = namedCountry(text);
  const end = iso2 ? countryEnd(iso2) : null;
  return end && end.code === hit.code ? end : null;
}

/** The two codes of the route, { from: 'LHE', to: 'YYZ' }, or null. */
export function routeEnds(profile) {
  if (!profile || typeof profile !== 'object') return null;
  const from = placeEnd(profile.currentCountry) || countryEnd(asIso2(profile.nationality));
  if (!from) return null;
  const wanted = Array.isArray(profile.preferredCountries) ? profile.preferredCountries : [];
  for (const raw of wanted) {
    const to = countryEnd(asIso2(raw));
    if (to && to.iso2 !== from.iso2) return { from: from.code, to: to.code };
  }
  return null;
}

/** 'LHE → YYZ', or null when the profile has no route to show. */
export function routeChip(profile) {
  const ends = routeEnds(profile);
  return ends ? `${ends.from} → ${ends.to}` : null;
}

// ── The member's own route, kept on this device for their account ──────────────────────────
// The device-wide job profile (localStorage 'opportumap_profile') has no owner: anyone who used
// this browser, signed in or not, may have saved it. The crew badge and the lounge keep their
// own copy of the route instead, tied to the user id, and show it only to that account.

/** localStorage key of the last route shown to the signed-in member: { userId, ends }. */
export const OWN_ROUTE_KEY = 'opportumap_own_route';

const isCode = (c) => typeof c === 'string' && /^[A-Z]{3}$/.test(c);

/**
 * The route kept on this device for `userId` (the stored text), or null: another account's copy
 * (a shared device), junk, or anything but two three-letter codes never shows.
 */
export function ownRouteFrom(raw, userId) {
  if (!userId || typeof raw !== 'string') return null;
  let kept;
  try {
    kept = JSON.parse(raw);
  } catch {
    return null;
  }
  const ends = kept && typeof kept === 'object' && kept.userId === userId ? kept.ends : null;
  return ends && isCode(ends.from) && isCode(ends.to) ? { from: ends.from, to: ends.to } : null;
}

/** The text to keep for `userId`'s route, or null when there is nothing to keep (remove the key). */
export function ownRouteRecord(userId, ends) {
  if (!userId || !ends || !isCode(ends.from) || !isCode(ends.to)) return null;
  return JSON.stringify({ userId, ends: { from: ends.from, to: ends.to } });
}
