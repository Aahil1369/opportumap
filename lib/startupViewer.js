// The signed-in user's own state on one startup: have they boarded it (+1 PASSENGER, an
// upvote) and are they on STANDBY (interest)? GET /api/startups/[id] returns it as `mine`, so
// the detail page's toggles start from the truth and a tap never un-votes by accident.
// `db` is the cookie client (RLS); both rows are looked up by startup AND user.
//
// Returns { mine: { upvoted, interested } }, or { error } when a lookup fails (never a guess).
export async function viewerState(db, startupId, userId) {
  const mineIn = (table) =>
    db.from(table).select('startup_id').eq('startup_id', startupId).eq('user_id', userId).maybeSingle();
  const [upvote, interest] = await Promise.all([mineIn('startup_upvotes'), mineIn('startup_interests')]);
  const error = upvote?.error || interest?.error;
  if (error) return { error };
  return { mine: { upvoted: Boolean(upvote?.data), interested: Boolean(interest?.data) } };
}
