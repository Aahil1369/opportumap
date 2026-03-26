import { auth } from '@clerk/nextjs/server';
import { supabase, hasSupabase } from '../../../../lib/supabase.js';

export async function GET(request) {
  if (!hasSupabase) return Response.json({ comments: [] });
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('postId');
  if (!postId) return Response.json({ comments: [] });

  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) return Response.json({ comments: [] });
  return Response.json({ comments: data || [] });
}

export async function POST(request) {
  if (!hasSupabase) return Response.json({ error: 'Database unavailable' }, { status: 503 });
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Sign in to comment' }, { status: 401 });

  const { post_id, content, user_name, user_avatar } = await request.json();
  if (!content?.trim() || !post_id) return Response.json({ error: 'Missing fields' }, { status: 400 });

  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id,
      user_id: userId,
      user_name: user_name || 'Anonymous',
      user_avatar: user_avatar || '',
      content: content.trim(),
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Update comment count on post
  const { data: post } = await supabase.from('posts').select('comment_count').eq('id', post_id).single();
  await supabase.from('posts').update({ comment_count: (post?.comment_count || 0) + 1 }).eq('id', post_id);

  return Response.json({ comment: data });
}
