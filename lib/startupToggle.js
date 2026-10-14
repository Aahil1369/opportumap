import { createClient } from './supabase-server.js';
import { hasSupabase } from './supabase.js';
import { isUuid } from './uuid.js';
import { dbErrorStatus } from './dbError.js';

// Shared toggle for POST /api/startups/[id]/upvote and /interest.
// Runs on the user's session so RLS (auth.uid() = user_id) applies. The counter
// on public.startups is maintained by a database trigger; we only read it back.
export async function toggleStartupReaction(params, { table, countColumn, flag }) {
  const { id } = await params;
  if (!hasSupabase) return Response.json({ error: 'Database unavailable' }, { status: 503 });
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isUuid(id)) return Response.json({ error: 'Not found' }, { status: 404 });

  const { data: existing, error: readError } = await db
    .from(table).select('startup_id').eq('startup_id', id).eq('user_id', user.id).maybeSingle();
  if (readError) return Response.json({ error: 'Could not update' }, { status: dbErrorStatus(readError) });

  let on;
  if (existing) {
    const { error } = await db.from(table).delete().eq('startup_id', id).eq('user_id', user.id);
    if (error) return Response.json({ error: 'Could not update' }, { status: dbErrorStatus(error) });
    on = false;
  } else {
    const { error } = await db.from(table).insert({ startup_id: id, user_id: user.id });
    // 23505 = the row already exists (e.g. a double click): that is "already done".
    if (error && error.code !== '23505') {
      return Response.json({ error: 'Could not update' }, { status: dbErrorStatus(error) });
    }
    on = true;
  }

  const { data: startup } = await db.from('startups').select(countColumn).eq('id', id).maybeSingle();
  return Response.json({ [flag]: on, count: startup?.[countColumn] ?? 0 });
}
