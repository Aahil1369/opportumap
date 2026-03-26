import { auth } from '@clerk/nextjs/server';
import { supabase, hasSupabase } from '../../../../lib/supabase.js';

export async function GET(request) {
  if (!hasSupabase) return Response.json({ posts: [] });
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
  const offset = parseInt(searchParams.get('offset') || '0');

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return Response.json({ posts: [] });
  return Response.json({ posts: data || [] });
}

export async function POST(request) {
  if (!hasSupabase) return Response.json({ error: 'Database unavailable' }, { status: 503 });
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Sign in to post' }, { status: 401 });

  const { title, content, post_type, tags, user_name, user_avatar } = await request.json();
  if (!content?.trim()) return Response.json({ error: 'Content required' }, { status: 400 });

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      user_name: user_name || 'Anonymous',
      user_avatar: user_avatar || '',
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
