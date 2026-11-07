// The signed-in user's own state on one startup: have they boarded it (+1 PASSENGER, an
// upvote) and are they on STANDBY (interest)? GET /api/startups/[id] returns it as `mine`, so
// the detail page's toggles start from the truth and a tap never un-votes by accident; the
// upvote / interest routes set it with setReaction. `db` is the cookie client (RLS); every row
// is looked up by startup AND user.

import { setEdge } from './community.js';

// Returns { mine: { upvoted, interested } }, or { error } when a lookup fails (never a guess).
export async function viewerState(db, startupId, userId) {
  const mineIn = (table) =>
    db.from(table).select('startup_id').eq('startup_id', startupId).eq('user_id', userId).maybeSingle();
  const [upvote, interest] = await Promise.all([mineIn('startup_upvotes'), mineIn('startup_interests')]);
  const error = upvote?.error || interest?.error;
  if (error) return { error };
  return { mine: { upvoted: Boolean(upvote?.data), interested: Boolean(interest?.data) } };
}

/**
 * `mine` plus owner: true when the signed-in user founded this startup, so their own stand
 * shows no STANDBY and no "Message the founder". The server decides; the page never waits for
 * its own session check. A new object.
 */
export function withOwner(mine, founderId, userId) {
  return { ...mine, owner: Boolean(userId) && founderId === userId };
}

/**
 * Take the user's own reaction on one startup (`table`: startup_upvotes = +1 PASSENGER,
 * startup_interests = STANDBY) to `want`: true = on, false = off, anything else toggles (older
 * clients). Already in that state: nothing is written, so a stale second tab or a double tap
 * never un-boards anyone. The lounge's rules (setEdge): a duplicate insert ('23505') means it is
 * already there; a failed read or write is { error }, never reported as done.
 * -> { on } | { error }
 */
export async function setReaction(db, { table, startupId, userId, want }) {
  const { data: existing, error } = await db
    .from(table)
    .select('startup_id')
    .eq('startup_id', startupId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return { error };
  return setEdge({
    on: Boolean(existing),
    want,
    add: () => db.from(table).insert({ startup_id: startupId, user_id: userId }),
    drop: () => db.from(table).delete().eq('startup_id', startupId).eq('user_id', userId),
  });
}
