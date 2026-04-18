import { createClient } from '../../../lib/supabase-server.js';
import { supabase, hasSupabase } from '../../../lib/supabase.js';

export async function GET(request) {
  if (!hasSupabase) return Response.json({ stories: [] });

  const { searchParams } = new URL(request.url);
  const all = searchParams.get('all') === 'true';

  let query = supabase.from('user_stories').select('*').order('created_at', { ascending: false });

  if (all) {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user || user.email !== 'aahilakbar567@gmail.com') {
      query = query.eq('approved', true);
    }
  } else {
    query = query.eq('approved', true);
  }

  const { data } = await query.limit(50);
  return Response.json({ stories: data || [] });
}

export async function POST(request) {
  if (!hasSupabase) return Response.json({ error: 'Database unavailable' }, { status: 503 });

  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return Response.json({ error: 'Sign in to share your story' }, { status: 401 });

  const { from_country, current_country, story_text, rating } = await request.json();

  if (!from_country || !current_country || !story_text) {
    return Response.json({ error: 'All fields required' }, { status: 400 });
  }

  const { error } = await supabase.from('user_stories').insert({
    user_id: user.id,
    from_country,
    current_country,
    story_text,
    rating: rating || null,
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function PATCH(request) {
  if (!hasSupabase) return Response.json({ error: 'Database unavailable' }, { status: 503 });

  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user || user.email !== 'aahilakbar567@gmail.com') {
    return Response.json({ error: 'Not authorized' }, { status: 403 });
  }

  const { id, approved } = await request.json();
  const { error } = await supabase.from('user_stories').update({ approved }).eq('id', id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
