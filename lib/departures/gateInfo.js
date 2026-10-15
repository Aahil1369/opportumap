// The job gate's words and links, kept pure (and tested). JobGate (app/components/jobs/JobGate.js)
// only wires these up.
//
//   gateHeader(job)            -> 'OM 4127 · YYZ · TORONTO' and the GATE A12 plate (gateFor)
//   postedAgo(posted_at, now)  -> 'posted 2 days ago' | '' (no or bad date)
//   gateAsk(job)               -> what the gate asks the salary model (the row's own question)
//   gatePay(job, predicted)    -> the PAY section: listed pay or our estimate, and its runway
//   runwayLights(range, n)     -> which of the n runway lights are lit, or null (hidden)
//   announcement(role, advice) -> "Attention, candidates for <role>:" + the advice, or null
//   boardLink(url)             -> the apply link, only http(s) (the P0 helper), else null
//   visaLink(iso2)             -> Migrova's visa page for that country, else null
import { safeHttpUrl } from '../safeUrl.js';
import { gateFor } from './gate.js';
import { cleanTitle, placeOf } from './jobPlace.js';
import { CURRENCY_BY_COUNTRY, localPay } from './pay.js';

const ISO2 = /^[a-z]{2}$/;
const NOT_LISTED = 'Pay not listed';

// ── Links ───────────────────────────────────────────────────────────────────────────────────

/** "Board this role →": the role's apply URL when it is http(s), else null (no link at all). */
export const boardLink = (url) => safeHttpUrl(url);

/** "🛂 Visa for Canada" -> https://migrova.netlify.app/visa?to=ca (Migrova pre-selects the country). */
export function visaLink(iso2) {
  const code = typeof iso2 === 'string' ? iso2.trim().toLowerCase() : '';
  return ISO2.test(code) ? `https://migrova.netlify.app/visa?to=${code}` : null;
}

let NAMES;
/** 'ca' -> 'Canada', or null for no code / a code Intl does not know. */
export function countryLabel(iso2) {
  const code = typeof iso2 === 'string' ? iso2.trim().toUpperCase() : '';
  if (!/^[A-Z]{2}$/.test(code)) return null;
  if (NAMES === undefined) {
    try {
      NAMES = new Intl.DisplayNames(['en'], { type: 'region' });
    } catch {
      NAMES = null;
    }
  }
  const name = NAMES?.of(code);
  return name && name !== code && name !== 'Unknown Region' ? name : null;
}

// ── The header ──────────────────────────────────────────────────────────────────────────────

const firstPart = (location) => String(location ?? '').split(',')[0].replace(/\s+/g, ' ').trim();

/** The place the gate names: the city the table matched, else the job's own first place part. */
function townOf(job, place) {
  if (place.remote) return 'Remote';
  return (place.matched && place.city) || firstPart(job.location) || place.city || '';
}

/**
 * gateHeader(job) -> { number: 'OM 4127', gate: 'A12', code: 'YYZ', city: 'TORONTO', town: 'Toronto',
 *   iso2: 'ca', line: 'OM 4127 · YYZ · TORONTO' }. Remote roles: ANY · REMOTE, no country.
 */
export function gateHeader(job) {
  const j = job && typeof job === 'object' ? job : {};
  const place = placeOf(j);
  const { flight: number, gate } = gateFor(j.id);
  const town = townOf(j, place);
  const city = town.toUpperCase();
  return {
    number,
    gate,
    code: place.code,
    city,
    town,
    iso2: place.iso2,
    line: [number, place.code, city].filter(Boolean).join(' · '),
  };
}

// ── Posted age ──────────────────────────────────────────────────────────────────────────────

const HOUR = 3600e3;
const DAY = 24 * HOUR;
const plural = (n, unit) => `${n} ${unit}${n === 1 ? '' : 's'}`;

/** 'posted today' | 'posted yesterday' | 'posted 3 days ago' | … | '' for no date or one in the future. */
export function postedAgo(postedAt, now = new Date()) {
  if (postedAt == null || postedAt === '') return '';
  const t = new Date(postedAt).getTime();
  const n = now instanceof Date ? now.getTime() : Number(now);
  if (!Number.isFinite(t) || !Number.isFinite(n)) return '';
  const age = n - t;
  if (age < -HOUR) return ''; // a feed clock a little ahead is today; further ahead is nonsense
  const days = Math.max(0, Math.floor(age / DAY));
  if (days === 0) return 'posted today';
  if (days === 1) return 'posted yesterday';
  if (days < 14) return `posted ${days} days ago`;
  if (days < 30) return `posted ${plural(Math.floor(days / 7), 'week')} ago`;
  if (days < 365) return `posted ${plural(Math.max(1, Math.floor(days / 30)), 'month')} ago`;
  return 'posted over a year ago';
}

// ── Pay ─────────────────────────────────────────────────────────────────────────────────────

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function amount(v) {
  const n = typeof v === 'string' && v.trim() ? Number(v.trim()) : v;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null;
}

/** The job's own currency, as localPay writes it (its own, else its country's; none when remote). */
function currencyOf(job, place) {
  if (typeof job.currency === 'string' && /^[A-Za-z]{3}$/.test(job.currency)) return job.currency.toUpperCase();
  return (!place.remote && CURRENCY_BY_COUNTRY[place.iso2]) || null;
}

/**
 * What the gate asks the salary model: the row's own question (cleaned title | own country), so
 * an answer the board already has is shared. Also asked for a role that lists its pay (once, when
 * its gate opens): the answer's city range is what its runway lights sit on. A remote role has no
 * city: it asks only when it lists no pay.
 */
export function gateAsk(job) {
  const j = job && typeof job === 'object' ? job : {};
  const place = placeOf(j);
  const listed = localPay(j) !== NOT_LISTED;
  if (place.remote && listed) return null;
  return {
    title: cleanTitle(j.title) || 'Untitled role',
    country: place.iso2,
    company: String(j.company ?? '').replace(/\s+/g, ' ').trim(),
    location: String(j.location ?? ''),
  };
}

/**
 * runwayLights({ min, max, low, high }, count = 12) -> booleans: a light is lit when its centre
 * on the city range low–high falls inside the role's min–max. A range narrower than one light
 * lights the nearest one; a role above or below the city range lights that end. Any value
 * missing or nonsense (not numbers, low >= high, min > max) -> null: the runway is hidden.
 */
export function runwayLights(range, count = 12) {
  if (!range || typeof range !== 'object') return null;
  const min = num(range.min);
  const max = num(range.max);
  const low = num(range.low);
  const high = num(range.high);
  if (min == null || max == null || low == null || high == null) return null;
  if (min <= 0 || low < 0 || min > max || high <= low) return null;
  const n = Math.max(2, Math.floor(count) || 12);
  const step = (high - low) / n;
  const lit = Array.from({ length: n }, (_, i) => {
    const centre = low + (i + 0.5) * step;
    return centre >= min && centre <= max;
  });
  if (!lit.some(Boolean)) {
    const at = Math.floor(((min + max) / 2 - low) / step);
    lit[Math.min(n - 1, Math.max(0, at))] = true;
  }
  return lit;
}

const short = (v, currency) => localPay({ salary_min: v, salary_max: v, currency });

/**
 * gatePay(job, predicted) -> { kind, label, text, runway }
 *   predicted: usePredictedPay's { state, pay, range } for gateAsk(job) (range: { min, max, low,
 *   high, currency } numbers from the salary model, when it gave them).
 *   kind: 'listed' (the role's own pay) | 'predicted' | 'loading' | 'unavailable'
 *   runway: { min, max, low, high, lowText, highText } on the model's city range, or null when
 *   there is none, it is in another currency than the pay, or the role is remote (no city).
 */
export function gatePay(job, predicted) {
  const j = job && typeof job === 'object' ? job : {};
  const place = placeOf(j);
  const p = predicted && typeof predicted === 'object' ? predicted : {};
  const range = p.range && typeof p.range === 'object' ? p.range : null;
  const listed = localPay(j);

  let kind;
  let text = null;
  let min = null;
  let max = null;
  let currency = null;
  if (listed !== NOT_LISTED) {
    kind = 'listed';
    text = listed;
    currency = currencyOf(j, place);
    min = amount(j.salary_min) ?? amount(j.salary_max);
    max = amount(j.salary_max) ?? min;
    if (min != null && max != null && min > max) [min, max] = [max, min];
  } else if (p.pay) {
    kind = 'predicted';
    text = p.pay;
    currency = typeof range?.currency === 'string' ? range.currency.toUpperCase() : null;
    min = num(range?.min);
    max = num(range?.max);
  } else {
    kind = p.state === 'unavailable' ? 'unavailable' : 'loading';
    if (kind === 'unavailable') text = 'Pay estimate unavailable';
  }

  let label = 'PAY · PREDICTED FOR THIS ROLE';
  if (kind === 'listed') label = j.salary_predicted === true ? "PAY · ADZUNA'S ESTIMATE FOR THIS ROLE" : 'PAY · LISTED FOR THIS ROLE';

  let runway = null;
  const rangeCurrency = typeof range?.currency === 'string' ? range.currency.toUpperCase() : null;
  if (!place.remote && range && currency && rangeCurrency === currency) {
    const r = { min, max, low: num(range.low), high: num(range.high) };
    if (runwayLights(r)) runway = { ...r, lowText: short(r.low, currency), highText: short(r.high, currency) };
  }
  return { kind, label, text, runway };
}

// ── The announcement ────────────────────────────────────────────────────────────────────────

const sentence = (s) => {
  const t = typeof s === 'string' ? s.replace(/\*+/g, '').replace(/\s+/g, ' ').trim() : '';
  if (!t) return '';
  return /[.!?…]$/.test(t) ? t : `${t}.`;
};

/**
 * announcement(role, advice) -> { lead: 'Attention, candidates for Software Engineer:', text }
 * where text is the advice's headline and reasons as plain sentences; null when there is no
 * usable advice (a failure, an empty headline). No verdict is ever part of it.
 */
export function announcement(role, advice) {
  if (!advice || typeof advice !== 'object') return null;
  const headline = sentence(advice.headline);
  if (!headline) return null;
  const reasons = Array.isArray(advice.reasons) ? advice.reasons.map(sentence).filter(Boolean).slice(0, 3) : [];
  const name = typeof role === 'string' && role.trim() ? role.replace(/\s+/g, ' ').trim() : 'this role';
  return { lead: `Attention, candidates for ${name}:`, text: [headline, ...reasons].join(' ') };
}
