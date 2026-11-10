// /startups — the hangar's pure helpers: the stage/sector chips (filters only, no counts: the
// no-totals rule), the filtered + sorted view, the API query, the post form's body, and the
// small labels (raise, stand, passengers). No DOM, no React.

import { tailFin } from './tailFin.js';

export const STAGES = [
  { value: 'idea', label: 'IDEA' },
  { value: 'pre-seed', label: 'PRE-SEED' },
  { value: 'seed', label: 'SEED' },
  { value: 'series-a', label: 'SERIES A' },
  { value: 'series-b+', label: 'SERIES B+' },
];
export const SECTORS = ['AI', 'Fintech', 'HealthTech', 'CleanTech', 'SaaS', 'EdTech', 'Other'];
export const SORTS = [
  { value: 'newest', label: 'NEWEST' },
  { value: 'trending', label: 'TRENDING' },
];
export const DEFAULT_FILTERS = Object.freeze({ stage: '', sector: '', sort: 'newest' });

/** GET /api/startups returns at most this many (app/api/startups/route.js, .limit(50)). */
export const HANGAR_PAGE = 50;

const list = (all) => (Array.isArray(all) ? all : []);

export function isDefaultFilters(f) {
  return !f?.stage && !f?.sector && (f?.sort || 'newest') === 'newest';
}

const time = (s) => {
  const t = Date.parse(s?.created_at ?? '');
  return Number.isFinite(t) ? t : 0;
};
const newestFirst = (a, b) => time(b) - time(a);
const trendingFirst = (a, b) => (Number(b?.upvote_count) || 0) - (Number(a?.upvote_count) || 0) || newestFirst(a, b);

/**
 * What the hangar shows for `filters`, from the unfiltered list `all`: `shown`, filtered by
 * stage and sector, newest or most passengers first (a new array).
 */
export function hangarView(all, filters = DEFAULT_FILTERS) {
  const rows = list(all);
  const { stage = '', sector = '', sort = 'newest' } = filters ?? {};
  const shown = rows
    .filter((s) => s && (!stage || s.stage === stage) && (!sector || s.sector === sector))
    .sort(sort === 'trending' ? trendingFirst : newestFirst);
  return { shown };
}

/**
 * The page can filter the list it already has only while that list is complete: a full API
 * page (HANGAR_PAGE rows) may be missing older startups, so then the API filters instead.
 */
export function filtersLocally(all) {
  return Array.isArray(all) && all.length < HANGAR_PAGE;
}

/** The query string for GET /api/startups. */
export function startupQuery(filters = DEFAULT_FILTERS) {
  const p = new URLSearchParams();
  if (filters?.stage) p.set('stage', filters.stage);
  if (filters?.sector) p.set('sector', filters.sector);
  p.set('sort', filters?.sort === 'trending' ? 'trending' : 'newest');
  return p.toString();
}

/** The list with a just-posted startup first (and only once). */
export function withPosted(all, startup) {
  return [startup, ...list(all).filter((s) => s?.id !== startup?.id)];
}

/** $750 · $500K · $1.5M; null when there is no ask. */
export function formatRaise(amount) {
  const n = Number(amount);
  if (!amount || !Number.isFinite(n) || n <= 0) return null;
  const trim = (x) => String(Math.round(x * 10) / 10);
  if (n >= 999_500) return `$${trim(n / 1_000_000)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

/** The startup's stand in hangar E, stable for its id: E01–E90. A label, not a number of anything. */
export function standFor(id) {
  const n = tailFin(`stand:${String(id ?? '')}`).hue % 90;
  return `E${String(n + 1).padStart(2, '0')}`;
}

/** The passenger count as board tiles: 000–999, then 999+. */
export function passengerTiles(count) {
  const n = Math.max(0, Math.floor(Number(count)) || 0);
  return n > 999 ? '999+' : String(n).padStart(3, '0');
}

export function passengerLabel(count) {
  const n = Math.max(0, Math.floor(Number(count)) || 0);
  if (!n) return 'No passengers yet';
  return `${n} passenger${n === 1 ? '' : 's'}`;
}

// ── The post form ───────────────────────────────────────────────────────────────────────────

/** A blank "Post a startup" form: the startup's own columns, plus the deck's file name. */
export const EMPTY_DRAFT = Object.freeze({
  name: '',
  tagline: '',
  description: '',
  stage: '',
  sector: '',
  raise_amount: '',
  equity_offered: '',
  team_size: '',
  location: '',
  website: '',
  pitch_deck_url: '',
  deck_name: '',
});

/**
 * The website as the database takes it (^https?://): 'yourstartup.com' -> 'https://yourstartup.com'.
 * A link that already names a scheme (https://, http://, or another one the API then refuses)
 * stays as typed; '' stays ''.
 */
export function websiteUrl(raw) {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s || /^[a-z][a-z\d+.-]*:\/\//i.test(s) || /^https?:/i.test(s)) return s;
  return `https://${s}`;
}

const numberOrNull = (v) => {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : s; // the API rejects a non-number with a readable message
};

/**
 * The POST /api/startups body for a draft: only the startup's own fields. The server sets
 * user_id from the session; the database sets the founder's name and the counters. A website
 * typed without a scheme gets https:// (websiteUrl).
 */
export function postPayload(draft) {
  const d = draft ?? {};
  const text = (k) => (typeof d[k] === 'string' ? d[k] : '');
  return {
    name: text('name'),
    tagline: text('tagline'),
    description: text('description'),
    stage: text('stage'),
    sector: text('sector'),
    location: text('location'),
    website: websiteUrl(text('website')),
    pitch_deck_url: text('pitch_deck_url'),
    raise_amount: numberOrNull(d.raise_amount),
    equity_offered: numberOrNull(d.equity_offered),
    team_size: numberOrNull(d.team_size),
  };
}
