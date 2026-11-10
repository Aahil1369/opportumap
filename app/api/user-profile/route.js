import { createClient } from '../../../lib/supabase-server.js';
import { hasSupabase } from '../../../lib/supabase.js';
import { dbErrorStatus } from '../../../lib/dbError.js';

// The signed-in member's job profile (public.user_profiles, one row per user). Both handlers run on
// the member's own session (the cookie client) so RLS sees auth.uid(); the bare anon client carries
// no user and sees no rows. A failed read or write is an error, never "no profile" / ok.
const MAX_PROFILE_CHARS = 50_000;

export async function GET() {
  if (!hasSupabase) return Response.json({ profile: null });
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ profile: null });
  const { data, error } = await db.from('user_profiles').select('profile_data').eq('user_id', user.id).maybeSingle();
  if (error) return Response.json({ error: 'Could not load your profile' }, { status: 500 });
  return Response.json({ profile: data?.profile_data || null });
}

export async function POST(request) {
  if (!hasSupabase) return Response.json({ error: 'Database unavailable' }, { status: 503 });
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const profile = body?.profile;
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    return Response.json({ error: 'Missing profile' }, { status: 400 });
  }
  if (JSON.stringify(profile).length > MAX_PROFILE_CHARS) {
    return Response.json({ error: 'That profile is too long to save' }, { status: 413 });
  }
  const { error } = await db
    .from('user_profiles')
    .upsert({ user_id: user.id, profile_data: profile, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) return Response.json({ error: 'Could not save your profile' }, { status: dbErrorStatus(error) });
  return Response.json({ ok: true });
}
