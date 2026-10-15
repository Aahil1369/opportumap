// Where a job sits on a departures board: its three-letter code (YYZ, BER, ANY), its city, its own
// country and its clock. Shared by the homepage board (board.js) and the /jobs board (jobRows.js),
// so a role shows the same code on both. Also the board's tidy title (no "(m/w/d)" tags).
import { CITY_ROWS } from './cityCodes.data.js';
import { cityCode, cityIndex } from './cityCode.js';
import { isRemotePlace } from './remote.js';

let CODES = null; // code -> { iso2, city } (first row: the city the code is named for)

/** The city table's country and city for a code, or undefined for a made-up code. */
export function codeInfo(code) {
  if (!CODES) {
    CODES = new Map();
    for (const [name, , c, iso2] of CITY_ROWS) if (!CODES.has(c)) CODES.set(c, { iso2, city: name });
  }
  return CODES.get(code);
}

const GENDER_TAG = /\s*[([]\s*(?:all genders?|gn|[mwfdxhi](?:\s*[/|,*]\s*[mwfdxhi])+)\s*[)\]]/gi;

/** A title as the board writes it: gender tags ("(m/w/d)") dropped, spaces collapsed. */
export function cleanTitle(title) {
  return String(title ?? '').replace(GENDER_TAG, '').replace(/\s+/g, ' ').trim();
}

const places = new WeakMap();

/**
 * placeOf(job) -> { remote, code, city, iso2, tz, matched, known }
 *   remote:  "Remote", "Anywhere", "Worldwide" or a remote feed -> code ANY, no country.
 *   iso2:    the job's own country. Only Adzuna's `country` is that; the other feeds' country is a
 *            map placement, so their country comes from the city table (or stays '').
 *   matched: the city table knew the city; known: the code is a real one (or ANY).
 */
export function placeOf(job) {
  if (!job || typeof job !== 'object') job = {};
  const kept = places.get(job);
  if (kept) return kept;
  const remote = job.remote === true || isRemotePlace(job.location);
  const own = !remote && job.source === 'adzuna' && typeof job.country === 'string' ? job.country.toLowerCase() : '';
  const place = remote ? { code: 'ANY', city: null, matched: true } : cityCode(job.location, own || undefined);
  const info = remote ? null : codeInfo(place.code);
  const iso2 = remote ? '' : own || info?.iso2 || '';
  const { main, tzByCode } = cityIndex();
  const out = {
    remote,
    code: place.code,
    city: place.city || info?.city || null,
    iso2,
    tz: remote ? 'UTC' : tzByCode.get(place.code) || main.get(iso2)?.[4] || 'UTC',
    matched: !!place.matched,
    known: remote || !!info,
  };
  places.set(job, out);
  return out;
}
