// The /jobs board's logic, kept pure (and tested): one row's text, the search, the gate chips
// and the order. The board component (app/components/jobs/JobsBoard.js) only wires these up.
//
//   jobRow(job, { now, profile })  -> the row's text, and what to ask the salary model
//   searchPlan(text, { base })     -> what to fetch and which place to keep ("tor" -> YYZ)
//   filterJobs(jobs, filters)      -> place, role type, ANY GATE, country, saved; expired roles out
//   sortJobs(jobs, by, profile)    -> 'match' (scoreJob, best first) | 'newest' | 'feed'
//   payCell(listed, predicted)     -> the PAY cell's text and whether it is an estimate
//   boardJobs(jobs, { now })       -> the trimmed board the server renders (app/jobs/page.js)
//   deepLink(id, { lists, settled }) -> whether a ?job= link opens, waits or missed
import { codeInfo, cleanTitle, placeOf } from './jobPlace.js';
import { cityIndex, normPlace } from './cityCode.js';
import { codeSearch } from './codeSearch.js';
import { PAY_WIDTH, localPay } from './pay.js';
import { jobStatus } from './status.js';
import { matchBadge, rankJobs } from '../../app/data/matchJobs.js';
import { DEFAULT_QUERY } from './profileQuery.js';
import { BOARD_DESC_CHARS, boardDescription } from './boardDescription.js';

// The description the server board keeps (enough for the match score, the chips and the gate's
// advice) lives in its own small module: the saved snapshots (savedStore.js) keep the same text.
export { BOARD_DESC_CHARS } from './boardDescription.js';

// The profile's search lives in its own small module: the homepage's personal board uses it too,
// without pulling the city table into the homepage's first load.
export { DEFAULT_QUERY, profileQuery } from './profileQuery.js';

// ── One row ─────────────────────────────────────────────────────────────────────────────────

/**
 * Tiles in the PAY and STATUS columns. PAY holds the widest yearly range localPay writes in any
 * currency ("CHF 120K–150K", "SEK 450K–550K": 13); jobs.css sizes both columns from these.
 */
export const PAY_TILES = PAY_WIDTH;
export const STATUS_TILES = 8;

/**
 * What the PAY cell shows: the listed pay, else the salary model's estimate (the same text, no
 * "~" tile: the row marks an estimate by its look, amber and underlined), else nothing.
 */
export function payCell(listed, predicted) {
  if (listed) return { text: listed, estimate: false };
  if (predicted) return { text: predicted, estimate: true };
  return { text: null, estimate: false };
}

const NOT_LISTED = 'Pay not listed';
const firstPart = (location) => String(location ?? '').split(',')[0].replace(/\s+/g, ' ').trim();

/**
 * jobRow(job, { now, profile }) -> {
 *   id, code, city, iso2, remote,
 *   role, company, where ('Shopify · Toronto'), pay (listed, local currency) | null,
 *   status ('NEW' | 'ANY GATE' | 'BOARDING' | 'ON TIME'), match (matchBadge) | null,
 *   ask: { title, country, company, location } for the salary model when no pay is listed, else null
 * }
 * A remote role is asked about with no country: its feed country is only a map placement.
 */
export function jobRow(job, { now = new Date(), profile = null } = {}) {
  const j = job && typeof job === 'object' ? job : {};
  const place = placeOf(j);
  const role = cleanTitle(j.title) || 'Untitled role';
  const company = String(j.company ?? '').replace(/\s+/g, ' ').trim();
  const town = place.remote ? 'Remote' : (place.matched && place.city) || firstPart(j.location) || place.city || '';
  const listed = localPay(j);
  const pay = listed === NOT_LISTED ? null : listed;
  return {
    id: String(j.id ?? ''),
    code: place.code,
    city: place.city,
    iso2: place.iso2,
    remote: place.remote,
    role,
    company,
    where: [company, town].filter(Boolean).join(' · '),
    pay,
    status: jobStatus(j, { now, profile }),
    match: matchBadge(j, profile),
    ask: pay ? null : { title: role, country: place.iso2, company, location: String(j.location ?? '') },
  };
}

// ── Search ──────────────────────────────────────────────────────────────────────────────────

const unique = (xs) => [...new Set(xs)];

/** The countries a set of codes is in (Adzuna asks only those). */
function countriesFor(codes) {
  return unique(codes.map((c) => codeInfo(c)?.iso2).filter(Boolean));
}

/** A code, city or alias exactly ("YYZ", "Berlin", "new york", "sf"), or null. */
function exactPlace(text) {
  const n = normPlace(text);
  if (!n) return null;
  if (/^[a-z]{3}$/.test(n)) {
    const info = codeInfo(n.toUpperCase());
    if (info) return { codes: [n.toUpperCase()], cities: [info.city] };
  }
  const rows = (cityIndex().byKey.get(n) || []).map((e) => e.row);
  if (!rows.length) return null;
  return { codes: unique(rows.map((r) => r[2])), cities: unique(rows.map((r) => r[0])) };
}

const LINKER = /(?:^|\s+)(?:in|at|near|around)$/i;

/**
 * searchPlan(text, { base }) -> { text, query, place, countries, fallback }
 *   text that is a place ("tor", "YYZ", "Toronto": codeSearch) keeps the base role search
 *   (`base`, the profile's or 'software engineer') in that place's countries, and the board keeps
 *   only that place's roles. A prefix can be a role word too ("seo" is a prefix of Seoul), so
 *   `fallback` is the text to search as words when the place has no roles.
 *   A trailing exact place splits off: "data scientist toronto", "designer in Berlin".
 *   Anything else is a role / company search.
 */
export function searchPlan(text, { base = DEFAULT_QUERY } = {}) {
  const raw = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!raw) return { text: '', query: base, place: null, countries: null, fallback: null };

  const whole = codeSearch(raw);
  if (whole.codes.length) {
    return { text: raw, query: base, place: whole, countries: countriesFor(whole.codes), fallback: raw };
  }

  const words = raw.split(' ');
  for (let k = Math.min(3, words.length - 1); k >= 1; k--) {
    const place = exactPlace(words.slice(-k).join(' '));
    if (!place) continue;
    const role = words.slice(0, -k).join(' ').replace(LINKER, '').trim();
    return { text: raw, query: role || base, place, countries: countriesFor(place.codes), fallback: null };
  }
  return { text: raw, query: raw, place: null, countries: null, fallback: null };
}

// ── Gate chips ──────────────────────────────────────────────────────────────────────────────

// Role types: words in the title, company or description (the old /jobs filter's lists).
export const ROLE_TYPES = [
  { value: 'tech', label: 'Tech', words: ['software', 'developer', 'engineer', 'frontend', 'backend', 'fullstack', 'devops', 'cloud', 'data', 'ml', 'ai', 'platform', 'sre', 'web', 'mobile', 'ios', 'android', 'python', 'java', 'react', 'node', 'typescript', 'golang', 'rust', 'php', 'ruby', 'scala', 'kotlin', 'swift', 'security', 'cyber', 'network', 'it ', 'systems'] },
  { value: 'healthcare', label: 'Healthcare', words: ['doctor', 'physician', 'nurse', 'pharmacist', 'dentist', 'surgeon', 'medical', 'health', 'clinical', 'physiotherapist', 'therapist', 'radiologist', 'cardiologist', 'pediatr', 'psychiatr', 'psycholog', 'paramedic', 'optometrist', 'veterinar', 'healthcare', 'hospital', 'care'] },
  { value: 'finance', label: 'Finance', words: ['finance', 'financial', 'accountant', 'auditor', 'banker', 'quant', 'fintech', 'risk', 'compliance', 'actuar', 'credit', 'portfolio', 'wealth', 'payroll', 'budget', 'tax', 'treasury', 'investment', 'trading'] },
  { value: 'engineering', label: 'Engineering', words: ['mechanical', 'civil', 'electrical', 'chemical', 'aerospace', 'structural', 'environmental', 'biomedical', 'industrial', 'manufacturing', 'process', 'quality engineer', 'materials', 'petroleum', 'mining', 'construction', 'architect', 'surveyor'] },
  { value: 'marketing', label: 'Marketing', words: ['marketing', 'seo', 'social media', 'content', 'growth', 'brand', 'sales', 'account executive', 'business development', 'copywriter', 'public relations', 'communications', 'email marketing', 'customer success'] },
  { value: 'design', label: 'Design', words: ['design', 'ux', 'ui ', 'figma', 'visual', 'creative director', 'art director', 'motion', 'graphic', 'illustrat', 'animator', '3d artist'] },
  { value: 'education', label: 'Education', words: ['teacher', 'professor', 'lecturer', 'researcher', 'curriculum', 'instructional', 'principal', 'education', 'academic', 'librarian', 'tutor', 'school', 'university'] },
  { value: 'legal', label: 'Legal', words: ['lawyer', 'attorney', 'legal', 'paralegal', 'compliance', 'contract', 'intellectual property', 'corporate law'] },
  { value: 'science', label: 'Science', words: ['scientist', 'biolog', 'chemist', 'physicist', 'geolog', 'marine', 'environmental science', 'climate', 'materials science', 'biotech', 'pharmaceutical', 'food science', 'research scientist'] },
  { value: 'operations', label: 'Operations', words: ['operations', 'supply chain', 'logistics', 'procurement', 'warehouse', 'inventory', 'program manager', 'project manager', 'coordinator', 'facilities', 'real estate', 'property'] },
  { value: 'hr', label: 'HR', words: ['hr ', 'human resources', 'talent', 'recruiter', 'people ops', 'hr business', 'compensation', 'learning and development', 'organisational'] },
  { value: 'media', label: 'Media', words: ['journalist', 'editor', 'video', 'film', 'photograph', 'animator', 'game designer', 'music', 'media', 'broadcast', 'reporter'] },
];
const TYPE_WORDS = new Map(ROLE_TYPES.map((t) => [t.value, t.words]));

const DAY = 24 * 60 * 60 * 1000;
const STALE_DAYS = 60;
const time = (v) => {
  if (v == null || v === '') return null;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? null : t;
};

/** Past its closing date, or posted more than 60 days ago. A role with no dates stays. */
export function isExpired(job, now = new Date()) {
  const n = now instanceof Date ? now.getTime() : Number(now);
  const closes = time(job?.expires_at);
  if (closes != null && closes < n) return true;
  const posted = time(job?.posted_at);
  return posted != null && n - posted > STALE_DAYS * DAY;
}

/**
 * Ranks a job against a place: its code's position in the place's codes, or its city's. -1: not
 * there. Only a city the table matched counts by code: "Canada" shows Canada's main code (YYZ)
 * on the board, but it is not a Toronto role.
 */
function placeRank(job, place, cities) {
  const own = placeOf(job);
  const at = own.matched && !own.remote ? place.codes.indexOf(own.code) : -1;
  if (at >= 0) return at;
  const loc = ` ${normPlace(job?.location)} `;
  return cities.findIndex((c) => c && loc.includes(` ${c} `));
}

/**
 * filterJobs(jobs, { place, type, remote, country, saved, now }) -> the roles left on the board.
 *   place: a searchPlan place (codes + cities), best code first; type: a ROLE_TYPES value;
 *   remote: ANY GATE only; country: an own-country iso2 (remote roles have none);
 *   saved: a Set of job ids. Expired roles always leave.
 */
export function filterJobs(jobs, { place = null, type = 'all', remote = false, country = 'all', saved = null, now = new Date() } = {}) {
  let list = (Array.isArray(jobs) ? jobs : []).filter((j) => j && !isExpired(j, now));
  if (place?.codes?.length) {
    const cities = place.cities.map((c) => normPlace(c));
    list = list
      .map((job, i) => ({ job, i, r: placeRank(job, place, cities) }))
      .filter((x) => x.r >= 0)
      .sort((a, b) => a.r - b.r || a.i - b.i)
      .map((x) => x.job);
  }
  const words = TYPE_WORDS.get(type);
  if (words) {
    list = list.filter((j) => {
      const text = `${j.title ?? ''} ${j.company ?? ''} ${j.description ?? ''}`.toLowerCase();
      return words.some((w) => text.includes(w));
    });
  }
  if (remote) list = list.filter((j) => placeOf(j).remote);
  if (country && country !== 'all') list = list.filter((j) => placeOf(j).iso2 === country);
  if (saved) list = list.filter((j) => saved.has(String(j.id)));
  return list;
}

/** The own countries on a board (iso2, sorted), for the country chip. Remote roles have none. */
export function countriesOf(jobs) {
  return unique((Array.isArray(jobs) ? jobs : []).map((j) => placeOf(j).iso2).filter(Boolean)).sort();
}

// ── The server's board ──────────────────────────────────────────────────────────────────────

// What the rows (jobRow), the chips (filterJobs), the order and the gate read. The rest (map
// coordinates, ingest bookkeeping, the full HTML description) stays on the server.
const BOARD_FIELDS = [
  'id', 'title', 'company', 'location', 'country', 'remote', 'source',
  'salary', 'salary_min', 'salary_max', 'salary_predicted', 'currency',
  'url', 'posted_at', 'expires_at',
];
/**
 * trimJob(job, { descChars }) -> the job as the server's board keeps it: BOARD_FIELDS plus its
 * description as plain text of at most `descChars` characters (cut at a word, "…"); null for a
 * non-object. No expiry check (the id lookup returns any role the homepage could list).
 */
export function trimJob(job, { descChars = BOARD_DESC_CHARS } = {}) {
  if (!job || typeof job !== 'object') return null;
  const kept = {};
  for (const field of BOARD_FIELDS) {
    if (job[field] !== undefined && job[field] !== null) kept[field] = job[field];
  }
  const text = boardDescription(job.description, descChars);
  if (text) kept.description = text;
  return kept;
}

/**
 * boardJobs(jobs, { now, descChars }) -> the board /jobs renders on the server: the roles still
 * open (isExpired), in the feed's order, each trimmed (trimJob). Odd items are skipped.
 */
export function boardJobs(jobs, { now = new Date(), descChars = BOARD_DESC_CHARS } = {}) {
  const out = [];
  for (const job of Array.isArray(jobs) ? jobs : []) {
    if (!job || typeof job !== 'object' || isExpired(job, now)) continue;
    out.push(trimJob(job, { descChars }));
  }
  return out;
}

// ── Deep links ──────────────────────────────────────────────────────────────────────────────

/** The job with this id in a list (ids compare as strings), or null. */
export function findJob(jobs, id) {
  if (!Array.isArray(jobs) || id == null) return null;
  const want = String(id);
  return jobs.find((j) => j && String(j.id) === want) || null;
}

/** A feed's job id ("adzuna_5927958773", "arbeitnow_senior-dev-berlin-123"): safe to look up. */
export function isJobId(id) {
  return typeof id === 'string' && /^[\w.:-]{1,200}$/.test(id);
}

/**
 * deepLink(id, { lists, settled, looked }) -> what a ?job=<id> link does now:
 *   'open'    one of the page's boards (the server's, the visitor's search, a lookup) has the role;
 *   'wait'    not yet: the visitor's own search is still on its way;
 *   'lookup'  their search has settled without it: ask for this one id (once);
 *   'miss'    looked up (or not an id) and still not found;  'none'  there is no id.
 * The homepage and /jobs render their boards from the same search but not at the same moment,
 * and a feed call that fails for one leaves its roles off that board only: hence the lookup.
 */
export function deepLink(id, { lists = [], settled = false, looked = false } = {}) {
  if (id == null || id === '') return 'none';
  if (lists.some((jobs) => findJob(jobs, id))) return 'open';
  if (!settled) return 'wait';
  return looked || !isJobId(id) ? 'miss' : 'lookup';
}

// ── Order ───────────────────────────────────────────────────────────────────────────────────

/** 'match': scoreJob, best first (rankJobs; the badge shows the same number); 'newest': posted date; else the feed order. */
export function sortJobs(jobs, by, profile) {
  const list = Array.isArray(jobs) ? jobs : [];
  if (by === 'match') return rankJobs(list, profile);
  if (by === 'newest') {
    return list
      .map((job, i) => ({ job, i, t: time(job?.posted_at) }))
      .sort((a, b) => (b.t ?? -Infinity) - (a.t ?? -Infinity) || a.i - b.i)
      .map((x) => x.job);
  }
  return list.slice();
}
