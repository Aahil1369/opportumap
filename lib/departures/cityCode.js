// A job's location -> the 3-letter code the board shows (YYZ, LHE, ANY ...), from the static city
// table. Pure and synchronous; the index is built once, on first use.
import { CITY_ROWS } from './cityCodes.data.js';
import { isRemotePlace } from './remote.js';

const FOLD = { ł: 'l', ø: 'o', æ: 'ae', ß: 'ss', đ: 'd', ı: 'i', œ: 'oe', þ: 'th', ð: 'd' };

/** Fold case, accents and punctuation: "Ōsaka!!" -> "osaka", "St. John's" -> "st john s". */
export function normPlace(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .replace(/[łøæßđıœþð]/g, (c) => FOLD[c])
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

// "Greater Toronto Area" -> "toronto", "Central London" -> "london". Only tried when the exact
// text has no match, so "Quebec City" or "East London" (their own rows) are never cut.
const LEAD = /^(?:greater|downtown|central|city of|metro|north|south|east|west) /;
const TRAIL = / (?:metropolitan area|metro area|bay area|area|region|metro|city|centre|center|downtown|county)$/;
function variants(n) {
  const out = [n];
  const lead = n.replace(LEAD, '');
  for (const v of [lead, n.replace(TRAIL, ''), lead.replace(TRAIL, '')]) {
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

// Country names a location may use instead of a city ("USA", "Canada", "Remote, Germany").
const COUNTRY_ALIASES = {
  usa: 'us', us: 'us', 'u s': 'us', 'u s a': 'us', 'united states of america': 'us', america: 'us',
  uk: 'gb', 'u k': 'gb', 'great britain': 'gb', britain: 'gb', england: 'gb', scotland: 'gb', wales: 'gb',
  'northern ireland': 'gb', uae: 'ae', emirates: 'ae', holland: 'nl', 'the netherlands': 'nl',
  'czech republic': 'cz', turkey: 'tr', korea: 'kr', 'south korea': 'kr', 'republic of korea': 'kr',
  russia: 'ru', 'russian federation': 'ru', 'viet nam': 'vn', 'ivory coast': 'ci', deutschland: 'de',
  espana: 'es', brasil: 'br', schweiz: 'ch', suisse: 'ch', osterreich: 'at', polska: 'pl', italia: 'it',
  nederland: 'nl', sverige: 'se', norge: 'no', danmark: 'dk', suomi: 'fi', eire: 'ie',
};

let INDEX = null;
function index() {
  if (INDEX) return INDEX;
  const byKey = new Map(); // normalised name/alias -> [{ row, i, alias }]
  const keys = []; // [{ key, row, i, alias }] in table order, for codeSearch
  const main = new Map(); // iso2 -> first row
  const tzByCode = new Map();
  CITY_ROWS.forEach((row, i) => {
    const [name, aliases, code, iso2, tz] = row;
    if (!main.has(iso2)) main.set(iso2, row);
    if (!tzByCode.has(code)) tzByCode.set(code, tz);
    [name, ...aliases].forEach((text, a) => {
      const key = normPlace(text);
      if (!key) return;
      const entry = { key, row, i, alias: a > 0 };
      keys.push(entry);
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(entry);
    });
  });
  const countries = new Map(Object.entries(COUNTRY_ALIASES));
  let names = null;
  try {
    names = new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    names = null;
  }
  for (const iso2 of main.keys()) {
    const full = names ? names.of(iso2.toUpperCase()) : null;
    if (full && full.toLowerCase() !== iso2) countries.set(normPlace(full), iso2);
  }
  INDEX = { byKey, keys, main, tzByCode, countries, names };
  return INDEX;
}

/** Internal lookups shared with codeSearch / localTime. */
export const cityIndex = index;

// `known`: iso2 is a country in the table, so only its own cities may match ("Halifax, West
// Yorkshire" in gb is not Halifax NS). Without it, any country's city matches, preferring iso2's.
function cityIn(part, iso2, known) {
  const { byKey } = index();
  const pick = (list) => list.find((h) => !h.alias) || list[0];
  for (const v of variants(normPlace(part))) {
    const hits = byKey.get(v);
    if (!hits) continue;
    const local = iso2 ? hits.filter((h) => h.row[3] === iso2) : [];
    if (local.length) return pick(local).row;
    if (!known) return pick(hits).row;
  }
  return null;
}

function countryIn(part) {
  const { countries } = index();
  for (const v of variants(normPlace(part))) {
    const iso2 = countries.get(v);
    if (iso2) return iso2;
  }
  return null;
}

const letters = (text) => normPlace(text).replace(/[^a-z]/g, '').toUpperCase();
const pad3 = (s) => (s + 'XXX').slice(0, 3);

/**
 * cityCode('Toronto, Ontario', 'ca') -> { code: 'YYZ', city: 'Toronto', matched: true }.
 * Order: the city part (before the first comma) against the table -> remote words -> a city in a
 * later part -> a country name in any part -> the country's main city -> the first three letters
 * (padded with X). The code is always exactly three letters A-Z.
 *
 * When iso2 is a country in the table, it is trusted: the city steps accept only that country's
 * cities, and a country name counts only if it names iso2. So ('Halifax, West Yorkshire', 'gb')
 * gives LHR unmatched, not Halifax NS, and ('Georgia', 'us') gives JFK, not Tbilisi.
 * Pass iso2 only when it is the job's real country (Adzuna). Leave it out when the country is
 * only where the map places the job: remote feeds and Arbeitnow's round-robin country. Then any
 * country's city may match ("München" -> MUC), and a country name in the text is used.
 */
export function cityCode(location, iso2) {
  const text = typeof location === 'string' ? location : '';
  const country = typeof iso2 === 'string' ? iso2.trim().toLowerCase() : '';
  const parts = text.split(/\s[-–—]\s|[,;/|•·]/).map((p) => p.trim()).filter(Boolean);
  const { main, names } = index();
  const known = main.has(country);

  const first = parts.length ? cityIn(parts[0], country, known) : null;
  if (first) return { code: first[2], city: first[0], matched: true };
  if (isRemotePlace(text)) return { code: 'ANY', city: null, matched: true };
  for (const part of parts.slice(1)) {
    const row = cityIn(part, country, known);
    if (row) return { code: row[2], city: row[0], matched: true };
  }
  for (const part of parts) {
    const named = countryIn(part);
    if (named && main.has(named) && (!known || named === country)) {
      return { code: main.get(named)[2], city: null, matched: false };
    }
  }
  if (main.has(country)) return { code: main.get(country)[2], city: null, matched: false };

  let code = letters(parts[0] || '');
  if (!code && /^[a-z]{2}$/.test(country)) {
    const full = names ? names.of(country.toUpperCase()) : null;
    code = letters(full && full.toLowerCase() !== country ? full : country);
  }
  return { code: pad3(code), city: null, matched: false };
}
