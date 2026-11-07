// The saved roles (spec §8, /saved = the itinerary): what the save toggle on /jobs keeps and what
// /saved shows. Pure, and tested (scripts/departures/__tests__/savedStore.test.mjs).
//
// Each save keeps a snapshot of the role (SNAPSHOT_FIELDS) under `opportumap_saved_v2`, newest
// first, so a role the feeds no longer return is still on the itinerary with its title, company,
// city and pay. Saves made before snapshots (`opportumap_saved`, a list of ids) read as pending
// rows; /saved looks each one up once (migrateSaved): found, it becomes a snapshot; not found, a
// "details unavailable" row the visitor can still remove. Any write folds the old list into the
// new key and drops the old key.
//
//   readSaved(storage)              -> entries, newest first (never throws)
//   saveJob(storage, job)           -> true when stored (false: no id, or storage blocked / full)
//   removeJob(storage, id)          -> true when stored
//   migrateSaved(storage, lookup)   -> entries once the pending ids have been looked up
//
// An entry is a snapshot, { id, pending: true } (saved id-only, not looked up yet) or
// { id, unavailable: true } (looked up, not found). Storage is anything with getItem / setItem /
// removeItem (localStorage, see deviceStorage); blocked, missing or full storage reads as [] and
// writes nothing.
import { boardDescription } from './boardDescription.js';

export const SAVED_KEY = 'opportumap_saved_v2';
export const LEGACY_KEY = 'opportumap_saved';

// The brief's 12 fields, then two the /saved rows and gate read like /jobs does: Adzuna's estimate
// flag (the gate's pay label says "Adzuna's estimate", never "listed", for it) and the description
// as /jobs' server board keeps it (boardDescription: short plain text), so the match score, the
// BOARDING status and the gate's advice are the same on /saved as on /jobs.
export const SNAPSHOT_FIELDS = Object.freeze([
  'id', 'title', 'company', 'location', 'country', 'url',
  'salary_min', 'salary_max', 'currency', 'posted_at', 'remote', 'source',
  'salary_predicted', 'description',
]);

const MAX_ID = 200;
const CAPS = { title: 300, company: 200, location: 200, country: 8, url: 2048, source: 40 };

/** localStorage, or null where reading it throws (blocked cookies, a sandboxed frame) or on the server. */
export function deviceStorage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** A job id as a string ('adzuna_59…', 42 -> '42'), or null. */
function idOf(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : null;
  if (typeof v !== 'string') return null;
  const id = v.trim();
  return id && id.length <= MAX_ID ? id : null;
}

/** One line of text, at most `max` characters, or null. */
function text(v, max) {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const s = String(v).replace(/\s+/g, ' ').trim();
  if (!s) return null;
  const chars = Array.from(s);
  return chars.length > max ? chars.slice(0, max).join('') : s;
}

function amount(v) {
  const n = typeof v === 'string' && v.trim() ? Number(v.trim()) : v;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null;
}

function postedAt(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? new Date(v).toISOString() : null;
  const s = text(v, 64);
  return s && !Number.isNaN(Date.parse(s)) ? s : null;
}

/** The role as the itinerary keeps it: SNAPSHOT_FIELDS only (missing ones null), or null with no id. */
export function snapshot(job) {
  if (!job || typeof job !== 'object' || Array.isArray(job)) return null;
  const id = idOf(job.id);
  if (!id) return null;
  const currency = typeof job.currency === 'string' && /^[A-Za-z]{3}$/.test(job.currency.trim()) ? job.currency.trim().toUpperCase() : null;
  return {
    id,
    title: text(job.title, CAPS.title),
    company: text(job.company, CAPS.company),
    location: text(job.location, CAPS.location),
    country: text(job.country, CAPS.country),
    url: text(job.url, CAPS.url),
    salary_min: amount(job.salary_min),
    salary_max: amount(job.salary_max),
    currency,
    posted_at: postedAt(job.posted_at),
    remote: job.remote === true,
    source: text(job.source, CAPS.source),
    salary_predicted: job.salary_predicted === true,
    description: (typeof job.description === 'string' && boardDescription(job.description)) || null,
  };
}

/** A stored entry, cleaned (the list is the visitor's to tamper with), or null. */
function entry(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const id = idOf(item.id);
  if (!id) return null;
  if (item.unavailable === true) return { id, unavailable: true };
  if (item.pending === true) return { id, pending: true };
  return snapshot(item);
}

function parsed(storage, key) {
  const raw = storage.getItem(key); // may throw: the caller decides what that means
  if (raw == null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null; // unreadable: as good as empty
  }
}

/** Both lists merged: the snapshots, then the id-only saves they do not cover. Throws when storage does. */
function collect(storage) {
  if (!storage || typeof storage.getItem !== 'function') return [];
  const out = [];
  const seen = new Set();
  const kept = parsed(storage, SAVED_KEY);
  for (const item of Array.isArray(kept) ? kept : []) {
    const e = entry(item);
    if (e && !seen.has(e.id)) {
      seen.add(e.id);
      out.push(e);
    }
  }
  const old = parsed(storage, LEGACY_KEY);
  for (const raw of Array.isArray(old) ? old : []) {
    const id = idOf(raw);
    if (id && !seen.has(id)) {
      seen.add(id);
      out.push({ id, pending: true });
    }
  }
  return out;
}

function writable(storage) {
  return !!storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function';
}

/** Stores the list under the new key; only then is the id-only key dropped (its ids are in the list). */
function write(storage, list) {
  try {
    storage.setItem(SAVED_KEY, JSON.stringify(list));
  } catch {
    return false; // full or blocked: what was there stays
  }
  try {
    storage.removeItem?.(LEGACY_KEY);
  } catch {
    // the new key holds every id now; a stale old key is only read for ids it does not cover
  }
  return true;
}

/** The saved roles, newest first. Never throws: blocked or missing storage is []. */
export function readSaved(storage) {
  try {
    return collect(storage);
  } catch {
    return [];
  }
}

/** Saves a snapshot of `job` at the top (saving it again moves it there). */
export function saveJob(storage, job) {
  const snap = snapshot(job);
  if (!snap || !writable(storage)) return false;
  let list;
  try {
    list = collect(storage);
  } catch {
    return false; // unreadable: writing now could drop the roles already saved
  }
  return write(storage, [snap, ...list.filter((e) => e.id !== snap.id)]);
}

/** Takes the role with this id off the itinerary. */
export function removeJob(storage, id) {
  const want = idOf(id);
  if (!want || !writable(storage)) return false;
  let list;
  try {
    list = collect(storage);
  } catch {
    return false;
  }
  return write(storage, list.filter((e) => e.id !== want));
}

/**
 * Looks up every pending (id-only) save once: lookup(id) -> the job, or null when it is not
 * found (it becomes { id, unavailable: true }). A lookup that throws or rejects (offline, a 5xx)
 * leaves its id pending, for the next visit. At most `concurrency` lookups run at once. The
 * answers are applied to the list as it is when they are all in, so a role removed or saved
 * meanwhile stays removed or saved. -> the entries, as stored.
 */
export async function migrateSaved(storage, lookup, { concurrency = 2 } = {}) {
  let list;
  try {
    list = collect(storage);
  } catch {
    return [];
  }
  const pending = list.filter((e) => e.pending).map((e) => e.id);
  if (!pending.length || typeof lookup !== 'function' || !writable(storage)) return list;

  const found = new Map(); // id -> snapshot | null (not found)
  let next = 0;
  const worker = async () => {
    while (next < pending.length) {
      const id = pending[next++];
      try {
        const snap = snapshot(await lookup(id));
        found.set(id, snap && snap.id === id ? snap : null);
      } catch {
        // stays pending
      }
    }
  };
  const lanes = Math.min(pending.length, Math.max(1, Math.floor(concurrency) || 1));
  await Promise.all(Array.from({ length: lanes }, worker));

  let now;
  try {
    now = collect(storage);
  } catch {
    return list;
  }
  const merged = now.map((e) => (e.pending && found.has(e.id) ? found.get(e.id) || { id: e.id, unavailable: true } : e));
  write(storage, merged);
  return merged;
}
