import { createClient } from '../../../../lib/supabase-server.js';
import { supabase, hasSupabase } from '../../../../lib/supabase.js';

const ADMIN_EMAIL = 'aahilakbar567@gmail.com';

export async function GET() {
  if (!hasSupabase) return Response.json({ error: 'Not configured' }, { status: 503 });

  const serverSupabase = createClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const [
    { count: postCount },
    { count: likeCount },
    { count: followCount },
    { count: commentCount },
    { data: recentPosts },
    { data: topPosts },
    { data: adminStats },
  ] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }),
    supabase.from('post_likes').select('*', { count: 'exact', head: true }),
    supabase.from('follows').select('*', { count: 'exact', head: true }),
    supabase.from('comments').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('id, title, user_name, created_at, type').order('created_at', { ascending: false }).limit(10),
    supabase.from('posts').select('id, title, user_name, like_count, comment_count').order('like_count', { ascending: false }).limit(5),
    supabase.rpc('get_admin_stats'),
  ]);

  return Response.json({
    stats: {
      posts: postCount ?? 0,
      likes: likeCount ?? 0,
      follows: followCount ?? 0,
      comments: commentCount ?? 0,
      totalUsers: adminStats?.total_users ?? 0,
      liveUsers: adminStats?.live_users ?? 0,
      totalVisits: adminStats?.total_visits ?? 0,
    },
    recentPosts: recentPosts ?? [],
    topPosts: topPosts ?? [],
  });
}
