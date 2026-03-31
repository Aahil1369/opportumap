import { createClient } from '../../../../lib/supabase-server.js';
import { supabase, hasSupabase } from '../../../../lib/supabase.js';

export async function GET(request) {
  if (!hasSupabase) return Response.json({ posts: [] });
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
  const offset = parseInt(searchParams.get('offset') || '0');
  const userId = searchParams.get('userId');

  let query = supabase
    .from('posts')
    .select('*')
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

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: user.id,
      user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
      user_avatar: user.user_metadata?.avatar_url || '',
      user_email: user.email || '',
      title: title?.trim() || null,
      content: content.trim(),
      post_type: post_type || 'story',
      tags: tags || [],
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ post: data });
}
