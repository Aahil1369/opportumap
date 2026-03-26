import { auth } from '@clerk/nextjs/server';
import { supabase, hasSupabase } from '../../../../lib/supabase.js';

export async function POST(request) {
  if (!hasSupabase) return Response.json({ error: 'Database unavailable' }, { status: 503 });
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Sign in to like' }, { status: 401 });

  const { post_id } = await request.json();
  if (!post_id) return Response.json({ error: 'Missing post_id' }, { status: 400 });

  // Check if already liked
  const { data: existing } = await supabase
    .from('post_likes')
    .select('user_id')
    .eq('user_id', userId)
    .eq('post_id', post_id)
    .single();

  const { data: post } = await supabase.from('posts').select('like_count').eq('id', post_id).single();
  const currentCount = post?.like_count || 0;

  if (existing) {
    // Unlike
    await supabase.from('post_likes').delete().eq('user_id', userId).eq('post_id', post_id);
    await supabase.from('posts').update({ like_count: Math.max(0, currentCount - 1) }).eq('id', post_id);
    return Response.json({ liked: false, like_count: Math.max(0, currentCount - 1) });
  } else {
    // Like
    await supabase.from('post_likes').insert({ user_id: userId, post_id });
    await supabase.from('posts').update({ like_count: currentCount + 1 }).eq('id', post_id);
    return Response.json({ liked: true, like_count: currentCount + 1 });
  }
}

export async function GET(request) {
  if (!hasSupabase) return Response.json({ liked_post_ids: [] });
  const { userId } = await auth();
  if (!userId) return Response.json({ liked_post_ids: [] });

  const { data } = await supabase.from('post_likes').select('post_id').eq('user_id', userId);
  return Response.json({ liked_post_ids: (data || []).map((r) => r.post_id) });
}
