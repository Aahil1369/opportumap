import { createClient } from './supabase-server.js';
import { hasSupabase } from './supabase.js';
import { isUuid } from './uuid.js';
import { dbErrorStatus } from './dbError.js';
import { wantFrom } from './community.js';
import { setReaction } from './startupViewer.js';

// Shared by POST /api/startups/[id]/upvote and /interest. The body names the state the user
// asked for (what the button showed them): { upvoted: true | false } or
// { interested: true | false }, the `flag`. Without it the reaction toggles (older clients).
// setReaction writes nothing when it is already there, so a stale second tab or a double tap
// never un-boards anyone: the same rule as the lounge's likes and follows.
// Runs on the user's session so RLS (auth.uid() = user_id) applies. The counter on
// public.startups is maintained by a database trigger; we only read it back.
export async function toggleStartupReaction(request, params, { table, countColumn, flag }) {
  const { id } = await params;
  if (!hasSupabase) return Response.json({ error: 'Database unavailable' }, { status: 503 });
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isUuid(id)) return Response.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json().catch(() => null);
  const result = await setReaction(db, { table, startupId: id, userId: user.id, want: wantFrom(body, flag) });
  if (result.error) return Response.json({ error: 'Could not update' }, { status: dbErrorStatus(result.error) });

  const { data: startup } = await db.from('startups').select(countColumn).eq('id', id).maybeSingle();
  return Response.json({ [flag]: result.on, count: startup?.[countColumn] ?? 0 });
}
