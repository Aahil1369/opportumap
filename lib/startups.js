import { safeHttpUrl } from './safeUrl.js';

// Exactly the columns `authenticated` may INSERT on public.startups
// (db/startups_rls_lockdown.sql). user_name is set by a BEFORE INSERT trigger;
// upvote_count / interest_count are kept by triggers; id / created_at default.
export const STARTUP_INSERT_COLUMNS = [
  'user_id', 'name', 'tagline', 'description', 'stage', 'sector', 'raise_amount',
  'equity_offered', 'team_size', 'location', 'website', 'pitch_deck_url',
];

// Same limits as the startups_text_len check constraint, plus sane caps for the rest.
export const STARTUP_LIMITS = { name: 120, tagline: 200, description: 5000, stage: 40, sector: 40, location: 120 };

const text = (v) => (typeof v === 'string' ? v.trim() : '');

function optionalNumber(v, { integer = false, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (v === null || v === undefined || v === '') return { value: null };
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  if (!Number.isFinite(n) || n < 0 || n > max || (integer && !Number.isInteger(n))) return { bad: true };
  return { value: n };
}

function optionalUrl(v) {
  const s = text(v);
  if (!s) return { value: null };
  const url = safeHttpUrl(s);
  return url ? { value: url } : { bad: true };
}

// Validate a POST /api/startups body into an insert row for the signed-in user.
// Returns { row } or { error } (a message safe to show the user).
export function buildStartupInsert(body, userId) {
  if (!body || typeof body !== 'object') return { error: 'Invalid request' };
  const row = { user_id: userId };

  for (const key of ['name', 'tagline', 'description', 'stage', 'sector']) {
    const v = text(body[key]);
    if (!v) return { error: 'Missing required fields' };
    if (v.length > STARTUP_LIMITS[key]) return { error: `${key} is too long (max ${STARTUP_LIMITS[key]} characters)` };
    row[key] = v;
  }

  const location = text(body.location);
  if (location.length > STARTUP_LIMITS.location) return { error: 'location is too long' };
  row.location = location || null;

  const numbers = {
    raise_amount: optionalNumber(body.raise_amount, { max: 1e12 }),
    equity_offered: optionalNumber(body.equity_offered, { max: 100 }),
    team_size: optionalNumber(body.team_size, { integer: true, max: 100000 }),
  };
  for (const [key, r] of Object.entries(numbers)) {
    if (r.bad) return { error: `${key.replace('_', ' ')} must be a positive number` };
    row[key] = r.value;
  }

  for (const key of ['website', 'pitch_deck_url']) {
    const r = optionalUrl(body[key]);
    if (r.bad) return { error: `${key === 'website' ? 'Website' : 'Pitch deck'} must be an http(s) link` };
    row[key] = r.value;
  }

  return { row };
}
