// Gate chat (/messages): pure helpers for the inbox and the open thread.
//
// A conversation is one startup + the two people talking about it (the founder is always one of
// them: the startup_messages insert policy requires it). From my side it is keyed by the startup
// and the other person: threadKey -> 'startupId::partnerId', the same for a message (sent or
// received) and for an inbox row ({ startup_id, other_user_id }), so a Realtime message always
// finds its row. GET /api/messages builds the inbox with conversationsFrom.

import { isUuid } from '../uuid.js';

/** The other person in `message` (sent or received), or null when `me` is not on it. */
export function partnerOf(message, me) {
  if (!message || typeof message !== 'object' || !me) return null;
  const { sender_id: from, receiver_id: to } = message;
  if (!from || !to || from === to) return null;
  if (from === me) return to;
  if (to === me) return from;
  return null;
}

/**
 * 'startupId::partnerId' for a message (from `me`'s side) or for an inbox row (it carries
 * other_user_id, `me` is not needed); null when it cannot be placed.
 */
export function threadKey(item, me) {
  if (!item || typeof item !== 'object' || !item.startup_id) return null;
  const partner = 'other_user_id' in item ? item.other_user_id : partnerOf(item, me);
  return partner ? `${item.startup_id}::${partner}` : null;
}

const time = (iso) => {
  const t = typeof iso === 'string' || typeof iso === 'number' ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? t : -Infinity;
};

/**
 * The inbox from the user's messages (any order, each optionally joined to its startup as
 * `startups: { name, user_id, user_name }`): one row per conversation, newest first, with the
 * last message and how many messages sent to me are still unread.
 */
export function conversationsFrom(rows, me) {
  const byKey = new Map();
  for (const m of Array.isArray(rows) ? rows : []) {
    const key = threadKey(m, me);
    if (!key) continue;
    let c = byKey.get(key);
    if (!c) {
      c = {
        startup_id: m.startup_id,
        startup_name: m.startups?.name || 'Unknown startup',
        startup_founder_id: m.startups?.user_id ?? null,
        founder_name: m.startups?.user_name ?? null,
        other_user_id: partnerOf(m, me),
        last_id: null,
        last_message: '',
        last_at: null,
        last_mine: false,
        unread: 0,
      };
      byKey.set(key, c);
    }
    if (c.last_id == null || time(m.created_at) > time(c.last_at)) {
      c.last_id = m.id;
      c.last_message = m.content;
      c.last_at = m.created_at;
      c.last_mine = m.sender_id === me;
    }
    if (!m.read && m.receiver_id === me) c.unread += 1;
  }
  return [...byKey.values()].sort((a, b) => time(b.last_at) - time(a.last_at));
}

/** The opened thread's unread badge cleared (the same array when there is nothing to clear). */
export function markOpened(list, key) {
  if (!Array.isArray(list)) return [];
  const i = list.findIndex((c) => threadKey(c) === key);
  if (i === -1 || !list[i].unread) return list;
  const next = list.slice();
  next[i] = { ...list[i], unread: 0 };
  return next;
}

/**
 * A message I sent or received (Realtime, or my own send) moves its conversation to the top.
 * Received ones count as unread unless that thread is open (`openKey`). The same message twice
 * counts once; an older one counts but keeps the newer last message. A thread not in the list is
 * added from `draft` (a conversation opened from a deep link) or reported as { known: false }, and
 * the page reloads the inbox. Returns { list, known }.
 */
export function bumpInbox(list, message, me, { openKey = null, draft = null } = {}) {
  const rows = Array.isArray(list) ? list : [];
  const key = threadKey(message, me);
  if (!key) return { list: rows, known: true };
  let i = rows.findIndex((c) => threadKey(c) === key);
  let base = rows[i];
  if (i === -1) {
    if (!draft || threadKey(draft) !== key) return { list: rows, known: false };
    base = draft;
  } else if (base.last_id === message.id) {
    return { list: rows, known: true };
  }
  const incoming = message.receiver_id === me;
  const newer = base.last_id == null || time(message.created_at) >= time(base.last_at);
  const row = {
    ...base,
    ...(newer
      ? { last_id: message.id, last_message: message.content, last_at: message.created_at, last_mine: !incoming }
      : null),
    unread: key === openKey ? 0 : (base.unread || 0) + (incoming ? 1 : 0),
  };
  const rest = i === -1 ? rows : [...rows.slice(0, i), ...rows.slice(i + 1)];
  return { list: [row, ...rest], known: true };
}

/** ?startup=…&with=… -> { startupId, withId } when both are UUIDs (they go into DB filters), else null. */
export function threadFromParams(params) {
  if (!params || typeof params.get !== 'function') return null;
  const startupId = params.get('startup');
  const withId = params.get('with');
  return isUuid(startupId) && isUuid(withId) ? { startupId, withId } : null;
}

/**
 * A deep-linked conversation that is not in the inbox yet ("Message the founder" on a stand).
 * Only a conversation the founder is part of can exist, and never one with yourself.
 * -> { conversation } | { error: 'missing' | 'self' | 'closed' }
 */
export function draftThread(sel, startup, me) {
  if (!sel || !startup || startup.id !== sel.startupId) return { error: 'missing' };
  const founder = startup.user_id;
  if (!me || sel.withId === me) return { error: 'self' };
  if (founder !== sel.withId && founder !== me) return { error: 'closed' };
  return {
    conversation: {
      startup_id: startup.id,
      startup_name: startup.name || 'Unknown startup',
      startup_founder_id: founder,
      founder_name: startup.user_name ?? null,
      other_user_id: sel.withId,
      last_id: null,
      last_message: '',
      last_at: null,
      last_mine: false,
      unread: 0,
    },
  };
}

/**
 * The other person's name. A founder's public name is on their startup (set by the database,
 * never an email); anyone else's is private, so they read as "Member 1A2B", the same rule as
 * lib/displayName.js for someone without a name.
 */
export function partnerName(conv) {
  const id = typeof conv?.other_user_id === 'string' ? conv.other_user_id : '';
  if (id && id === conv.startup_founder_id && typeof conv.founder_name === 'string') {
    const n = conv.founder_name.trim();
    if (n && !n.includes('@')) return n;
  }
  return id ? `Member ${id.slice(0, 4).toUpperCase()}` : 'Member';
}

/** 'FOUNDER' when you are writing to the founder, 'YOUR STAND' when it is your startup. */
export function partnerRole(conv, me) {
  if (!conv || !conv.startup_founder_id) return '';
  if (conv.other_user_id === conv.startup_founder_id) return 'FOUNDER';
  if (me && conv.startup_founder_id === me) return 'YOUR STAND';
  return '';
}

/** The unread badge: '' for none, '1'–'9', then '9+'. */
export function unreadLabel(n) {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v) || v <= 0) return '';
  return v > 9 ? '9+' : String(v);
}

const MONTH_DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const MONTH_DAY_YEAR = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const dayStart = (t) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/** The day line between messages, in the viewer's local time: TODAY, YESTERDAY, OCT 12, DEC 31, 2025. */
export function dayLabel(iso, now = Date.now()) {
  const t = time(iso);
  if (t === -Infinity) return '';
  const days = Math.round((dayStart(now) - dayStart(t)) / 86400000);
  if (days === 0) return 'TODAY';
  if (days === 1) return 'YESTERDAY';
  const sameYear = new Date(t).getFullYear() === new Date(now).getFullYear();
  return (sameYear ? MONTH_DAY : MONTH_DAY_YEAR).format(t).toUpperCase();
}

/**
 * Calls `fn` each time the page comes back into view (another tab, or the iPhone waking up).
 * iOS drops the Realtime socket while a tab sleeps, so whatever arrived meanwhile has to be
 * fetched then. Returns the cleanup. `doc` is the document (a stand-in in tests); without one
 * (a server render) nothing is listened to.
 */
export function onPageVisible(fn, doc = typeof document === 'undefined' ? null : document) {
  if (!doc || typeof doc.addEventListener !== 'function') return () => {};
  const handler = () => {
    if (doc.visibilityState === 'visible') fn();
  };
  doc.addEventListener('visibilitychange', handler);
  return () => doc.removeEventListener('visibilitychange', handler);
}
