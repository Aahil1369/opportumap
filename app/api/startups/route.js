import { createClient } from '../../../lib/supabase-server.js';
import { hasSupabase } from '../../../lib/supabase.js';
import { buildStartupInsert } from '../../../lib/startups.js';
import { dbErrorStatus } from '../../../lib/dbError.js';

// Every query runs on the cookie client, so RLS sees the signed-in user
// (auth.uid()); signed-out visitors are the anon role and can only read.
export async function GET(request) {
  if (!hasSupabase) return Response.json({ startups: [] });
  const { searchParams } = new URL(request.url);
  const stage = searchParams.get('stage');
  const sector = searchParams.get('sector');
  const sort = searchParams.get('sort') || 'newest';

  const db = await createClient();
  let query = db.from('startups').select('*');
  if (stage) query = query.eq('stage', stage);
  if (sector) query = query.eq('sector', sector);
  if (sort === 'trending') query = query.order('upvote_count', { ascending: false });
  else query = query.order('created_at', { ascending: false });

  const { data, error } = await query.limit(50);
  if (error) return Response.json({ error: 'Could not load startups' }, { status: 500 });
  return Response.json({ startups: data ?? [] });
}

export async function POST(request) {
  if (!hasSupabase) return Response.json({ error: 'Database unavailable' }, { status: 503 });
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: 'Sign in to post a startup' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { body = null; }
  const { row, error: invalid } = buildStartupInsert(body, user.id);
  if (invalid) return Response.json({ error: invalid }, { status: 400 });

  // The founder's display name and the counters are set by database triggers;
  // the column grants refuse them from clients.
  const { data, error } = await db.from('startups').insert(row).select().single();
  if (error) {
    return Response.json({ error: 'Could not post your startup. Please try again.' }, { status: dbErrorStatus(error) });
  }
  return Response.json({ startup: data });
}
