// The homepage departures board (spec §6): real roles as rows of LOCAL · TO · ROLE · PAY · STATUS,
// mapped with the Task 2 helpers. The set is varied: one row per country before any country gets
// a second (never more than two), each city once, jobs with listed pay first, then Adzuna's own
// estimates, then roles without pay. When the live feeds give nothing usable (down or slow at ISR
// time) the board is FALLBACK_ROWS, eight static sample rows that link to /jobs; a short real
// board is topped up from them (or from `fill`).
import { cleanTitle, placeOf } from './jobPlace.js';
import { localPay } from './pay.js';
import { jobStatus } from './status.js';
import { localTime } from './localTime.js';

export const BOARD_COLUMNS = [
  { key: 'time', label: 'LOCAL' },
  { key: 'code', label: 'TO' },
  { key: 'role', label: 'ROLE' },
  { key: 'pay', label: 'PAY' },
  { key: 'status', label: 'STATUS' },
];

/** Beat 5: the founder's own row, lit gold while the rest of the board dims. */
export const FOUNDER_ROW = {
  id: 'founder',
  cells: { time: 'NOW', code: 'DFW', role: 'GIL → EBB → DFW · FOUNDER, 16', pay: '', status: 'ARRIVED ✓' },
};

// Sample rows (not live listings): LOCAL is each city's clock at 12:40 UTC in mid-October (the
// page's clock re-times them to now after it loads); pay in the local currency, as localPay
// writes it. No company names and no NEW: a sample never claims a real employer or freshness.
const sample = (n, [time, code, role, pay, status], iso2, tz, city) => ({
  id: `sample-${n}`,
  fallback: true,
  href: '/jobs',
  iso2,
  tz,
  city,
  cells: { time, code, role, pay, status },
});

export const FALLBACK_ROWS = [
  sample(1, ['08:40', 'YYZ', 'Software Engineer', 'C$88K–102K', 'ON TIME'], 'ca', 'America/Toronto', 'Toronto'),
  sample(2, ['14:40', 'BER', 'Data Engineer', '€62K–75K', 'ON TIME'], 'de', 'Europe/Berlin', 'Berlin'),
  sample(3, ['18:10', 'BLR', 'Data Scientist', '₹18L–26L', 'ON TIME'], 'in', 'Asia/Kolkata', 'Bengaluru'),
  sample(4, ['13:40', 'LHR', 'Backend Engineer', '£65K–80K', 'ON TIME'], 'gb', 'Europe/London', 'London'),
  sample(5, ['20:40', 'SIN', 'ML Engineer', 'S$96K–130K', 'ON TIME'], 'sg', 'Asia/Singapore', 'Singapore'),
  sample(6, ['12:40', 'ANY', 'Frontend Developer', '$90K–120K', 'ANY GATE'], '', 'UTC', null),
  sample(7, ['23:40', 'SYD', 'Cloud Engineer', 'A$140K–165K', 'ON TIME'], 'au', 'Australia/Sydney', 'Sydney'),
  sample(8, ['14:40', 'AMS', 'DevOps Engineer', '€58K–70K', 'ON TIME'], 'nl', 'Europe/Amsterdam', 'Amsterdam'),
];

const MAX_PER_COUNTRY = 2;
const ROLE_CHARS = 90;
// The PAY column is PAY_WIDTH (13) tiles (lib/departures/homeBoard.js); localPay's 14-character
// "Pay not listed" would be cut there, so the board says it in the column's own words.
const NOT_LISTED = 'NOT LISTED';
// A departures board must never read like a booking site: such roles stay off it (and so does
// "Welfare", which the source scan cannot tell from "fare").
const OFF_BOARD = /flight|fare/i;
const LATIN = /^[\p{Script=Latin}\p{N}\p{P}\p{S}\s]+$/u;

// Rank tiers: pay (listed 2, Adzuna estimate 1, none 0) x 4, + 2 for a matched city, + 1 for a
// Latin title (the drum's own letters). Pay under 10,000 in any currency is not a year's pay
// (Adzuna sends some hourly or monthly figures, "₹438", "S$1.3K–1.8K"): it is still shown, but
// ranks with the roles that list none. Among equals: BOARDING, then NEW, then feed order.
const LISTED = 8;
const ANY_PAY = 4;
const MIN_YEARLY = 10000;
const LIFT = { BOARDING: 2, NEW: 1 };

/** Board text for a title: gender tags dropped, spaces collapsed, at most 90 characters. */
function cleanRole(title) {
  const s = cleanTitle(title);
  const chars = Array.from(s);
  return chars.length > ROLE_CHARS ? `${chars.slice(0, ROLE_CHARS - 1).join('').trimEnd()}…` : s;
}

function candidate(job, index, now, profile) {
  if (!job || typeof job !== 'object') return null;
  const role = cleanRole(job.title);
  if (!role || OFF_BOARD.test(role)) return null;

  // Code, city, own country (only Adzuna's country is the job's own) and clock: jobPlace.js.
  const place = placeOf(job);
  const { remote, iso2 } = place;

  const listed = localPay(job);
  const none = listed === 'Pay not listed';
  const top = Math.max(Number(job.salary_min) || 0, Number(job.salary_max) || 0);
  const payTier = none || top < MIN_YEARLY ? 0 : job.salary_predicted ? 1 : 2;
  const status = jobStatus(job, { now, profile });
  const id = String(job.id ?? `job-${index}`);
  return {
    index,
    rank: payTier * 4 + (place.matched ? 2 : 0) + (LATIN.test(role) ? 1 : 0),
    lift: LIFT[status] || 0,
    known: place.known,
    country: remote ? 'any' : iso2 || `?${place.code}`,
    roleKey: role.toLowerCase(),
    row: {
      id,
      href: `/jobs?job=${encodeURIComponent(id)}`,
      iso2,
      tz: place.tz,
      city: place.city,
      company: String(job.company ?? ''),
      location: String(job.location ?? ''),
      cells: {
        time: localTime(iso2, now, remote ? undefined : place.code),
        code: place.code,
        role,
        pay: none ? NOT_LISTED : listed,
        status,
      },
    },
  };
}

const keyOf = (row) => row.iso2 || (row.cells.code === 'ANY' ? 'any' : `?${row.cells.code}`);

/**
 * boardRowsFrom(jobs, { now, profile, limit, fill, perCountry }) -> up to `limit` rows
 *   { id, href, iso2, tz, city, company, location, cells: { time, code, role, pay, status } }.
 * No usable job (an empty or missing list, every job broken) gives `fill` (FALLBACK_ROWS).
 * `perCountry` (default 2) caps the rows per country; a visitor's own board, already narrowed to
 * the countries they chose, can raise it.
 */
export function boardRowsFrom(
  jobs,
  { now = new Date(), profile = null, limit = 8, fill = FALLBACK_ROWS, perCountry = MAX_PER_COUNTRY } = {},
) {
  const all = [];
  (Array.isArray(jobs) ? jobs : []).forEach((job, i) => {
    try {
      const c = candidate(job, i, now, profile);
      if (c) all.push(c);
    } catch {
      // one odd job never breaks the board
    }
  });
  if (!all.length) return fill.slice(0, limit);

  all.sort((a, b) => b.rank - a.rank || b.lift - a.lift || a.index - b.index);
  const groups = new Map(); // country -> candidates, best first; countries in order of their best
  for (const c of all) {
    if (!groups.has(c.country)) groups.set(c.country, []);
    groups.get(c.country).push(c);
  }

  const picked = [];
  const codes = new Set();
  const roles = new Set();
  const per = new Map();
  const room = (key) => (per.get(key) || 0) < perCountry;
  const add = (row, key) => {
    picked.push(row);
    codes.add(row.cells.code);
    per.set(key, (per.get(key) || 0) + 1);
  };

  // Listed pay, then any pay, then everything; within each, cities the table knows before codes
  // made up from letters ("EUR" for "Europe"). Each pass deals one row per country per round,
  // preferring a role the board does not show yet.
  const passes = [LISTED, ANY_PAY, 0].flatMap((minRank) => [
    (c) => c.rank >= minRank && c.known,
    (c) => c.rank >= minRank,
  ]);
  for (const fits of passes) {
    for (let round = 0; round < perCountry; round++) {
      for (const group of groups.values()) {
        if (picked.length >= limit) break;
        const open = (c) => !c.taken && fits(c) && !codes.has(c.row.cells.code) && room(c.country);
        const c = group.find((x) => open(x) && !roles.has(x.roleKey)) || group.find(open);
        if (!c) continue;
        c.taken = true;
        roles.add(c.roleKey);
        add(c.row, c.country);
      }
    }
  }

  for (const row of fill) {
    if (picked.length >= limit) break;
    if (!codes.has(row.cells.code) && room(keyOf(row))) add(row, keyOf(row));
  }
  return picked;
}

/**
 * hasOwnRows(rows, fill) -> true when at least one of `rows` came from the jobs, not from `fill`
 * (boardRowsFrom tops a short board up with the very fill rows, and returns them all when no job
 * is usable). The homepage says YOUR DEPARTURES only then.
 */
export function hasOwnRows(rows, fill) {
  const from = new Set(Array.isArray(fill) ? fill : []);
  return Array.isArray(rows) && rows.some((row) => row && !from.has(row));
}
