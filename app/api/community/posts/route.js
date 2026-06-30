import { createClient } from '../../../../lib/supabase-server.js';
import { supabase, hasSupabase } from '../../../../lib/supabase.js';

// Columns returned to clients. Deliberately excludes user_email: it is no longer
// stored or exposed (public SELECT would let anyone with the anon key scrape every
// user's email). The verified badge now matches on user_id instead.
const POST_FIELDS = 'id, user_id, user_name, user_avatar, title, content, post_type, tags, like_count, comment_count, created_at';

export async function GET(request) {
  if (!hasSupabase) return Response.json({ posts: [] });
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
  const offset = parseInt(searchParams.get('offset') || '0');
  const userId = searchParams.get('userId');

  let query = supabase
    .from('posts')
    .select(POST_FIELDS)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;

  if (error) return Response.json({ posts: [] });
  return Response.json({ posts: data || [] });
}

export async function POST(request) {
  if (!hasSupabase) return Response.json({ error: 'Database unavailable' }, { status: 503 });

  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return Response.json({ error: 'Sign in to post' }, { status: 401 });

  const { title, content, post_type, tags } = await request.json();
  if (!content?.trim()) return Response.json({ error: 'Content required' }, { status: 400 });

  // Write via the cookie-aware authenticated client so the request carries the
  // user JWT and the RLS INSERT check (auth.uid() = user_id) passes. The bare
  // anon client carries no JWT and would be rejected once RLS is locked down.
  const { data, error } = await authClient
    .from('posts')
    .insert({
      user_id: user.id,
      user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
      user_avatar: user.user_metadata?.avatar_url || '',
      title: title?.trim() || null,
      content: content.trim(),
      post_type: post_type || 'story',
      tags: tags || [],
    })
    .select(POST_FIELDS)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ post: data });
}
