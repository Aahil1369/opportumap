// The departure lounge (/community) and the crew badge (/profile): pure helpers for the pages.
// Board words for the post types, who is looking (signed in, signed out, or the check failed),
// the feed's paging merge, initials for an avatar, "3H AGO", "OCT 2026".

import { POST_TYPE_VALUES } from '../community.js';

const TYPES = {
  story: { label: 'Story', word: 'STORY' },
  job: { label: 'Job post', word: 'JOB POST' },
  question: { label: 'Question', word: 'QUESTION' },
  advice: { label: 'Advice', word: 'ADVICE' },
};
export const POST_TYPES = POST_TYPE_VALUES.map((value) => ({ value, ...TYPES[value] }));

/** The post type entry for a post; unknown types read as a story. */
export function postType(value) {
  return POST_TYPES.find((t) => t.value === value) || POST_TYPES[0];
}

/**
 * supabase.auth.getUser()'s result -> { status: 'in' | 'out' | 'error', user }. No session or a
 * refused token is signed out (the page shows sign-in prompts). A network failure or a server
 * error is 'error': the page says it could not check and offers a retry, never "sign in".
 */
export function viewerFrom(result) {
  const user = result?.data?.user ?? null;
  if (user) return { status: 'in', user };
  if (!result) return { status: 'error', user: null };
  const e = result.error;
  // Never reached the auth server (AuthRetryableFetchError, status 0), or it failed (5xx).
  const failed = e && e.name !== 'AuthSessionMissingError' && (e.name === 'AuthRetryableFetchError' || !(e.status > 0) || e.status >= 500);
  return failed ? { status: 'error', user: null } : { status: 'out', user: null };
}

/** prev + the next page, without repeating a post (offset paging shifts when someone posts). */
export function mergePosts(prev, next) {
  const out = [];
  const seen = new Set();
  for (const p of [...(prev || []), ...(next || [])]) {
    if (!p || seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

/** A new post first, once. */
export function prependPost(list, post) {
  return [post, ...(list || []).filter((p) => p.id !== post.id)];
}

/** 'Aisha Khan' -> 'AK'. First letter or digit of the first two words that have one; '?' if none. */
export function initials(name) {
  const words = typeof name === 'string' ? name.trim().split(/\s+/) : [];
  let out = '';
  for (const w of words) {
    const ch = w.match(/[\p{L}\p{N}]/u)?.[0];
    if (ch) out += ch.toUpperCase();
    if (out.length === 2) break;
  }
  return out || '?';
}

const MONTH_DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const MONTH_DAY_YEAR = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const MONTH_YEAR_UTC = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });

const when = (iso) => {
  const t = typeof iso === 'string' || typeof iso === 'number' ? new Date(iso).getTime() : NaN;
  return Number.isFinite(t) ? t : null;
};

/** '5M AGO', '3H AGO', '4D AGO', then 'AUG 3' (or 'AUG 3, 2025' in another year); '' if no date. */
export function ago(iso, now = Date.now()) {
  const t = when(iso);
  if (t == null) return '';
  const m = Math.floor((now - t) / 60000);
  if (m < 1) return 'JUST NOW';
  if (m < 60) return `${m}M AGO`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}H AGO`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}D AGO`;
  const sameYear = new Date(t).getFullYear() === new Date(now).getFullYear();
  return (sameYear ? MONTH_DAY : MONTH_DAY_YEAR).format(t).toUpperCase();
}

/** The month an account was made, 'OCT 2026' (UTC), or ''. */
export function memberSince(iso) {
  const t = when(iso);
  return t == null ? '' : MONTH_YEAR_UTC.format(t).toUpperCase();
}

/** A crew badge number from the public user id: '3C60'. A label, not a count. */
export function crewNo(id) {
  return typeof id === 'string' ? id.replace(/[^0-9a-f]/gi, '').slice(0, 4).toUpperCase() : '';
}

/** The user's own post count; '20+' when a full page came back (there may be more). */
export function postsLabel(n, more) {
  return `${n}${more ? '+' : ''}`;
}

/** A long post's opening: cut on a word, with '…'. { text, cut }. */
export function excerpt(body, max = 300) {
  const s = typeof body === 'string' ? body : '';
  if (s.length <= max) return { text: s, cut: false };
  let head = s.slice(0, max);
  const space = head.search(/\s\S*$/);
  if (space > max * 0.6) head = head.slice(0, space);
  return { text: `${head.trimEnd()}…`, cut: true };
}
