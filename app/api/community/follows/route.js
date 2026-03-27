import { createClient } from '../../../../lib/supabase-server.js';
import { supabase, hasSupabase } from '../../../../lib/supabase.js';

export async function GET(request) {
  if (!hasSupabase) return Response.json({ followers: 0, following: 0, is_following: false });
  const { searchParams } = new URL(request.url);
  const targetUserId = searchParams.get('userId');
  if (!targetUserId) return Response.json({ followers: 0, following: 0 });

  const authClient = await createClient();
  const { data: { user: currentUser } } = await authClient.auth.getUser();

  const [followersRes, followingRes, isFollowingRes] = await Promise.all([
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', targetUserId),
    supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', targetUserId),
    currentUser
      ? supabase.from('follows').select('follower_id').eq('follower_id', currentUser.id).eq('following_id', targetUserId).single()
      : Promise.resolve({ data: null }),
  ]);

  return Response.json({
    followers: followersRes.count || 0,
    following: followingRes.count || 0,
    is_following: !!isFollowingRes.data,
  });
}

export async function POST(request) {
  if (!hasSupabase) return Response.json({ error: 'Database unavailable' }, { status: 503 });

  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return Response.json({ error: 'Sign in to follow' }, { status: 401 });

  const { following_id, following_name } = await request.json();
  if (!following_id || following_id === user.id) return Response.json({ error: 'Invalid' }, { status: 400 });

  const { data: existing } = await supabase
    .from('follows').select('follower_id').eq('follower_id', user.id).eq('following_id', following_id).single();

  if (existing) {
    await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', following_id);
    return Response.json({ following: false });
  } else {
    await supabase.from('follows').insert({
      follower_id: user.id,
      following_id,
      follower_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
      following_name: following_name || '',
    });
    return Response.json({ following: true });
  }
}
