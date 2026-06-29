import { createClient } from '../../../../lib/supabase-server.js';
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

  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return Response.json({ error: 'Sign in to comment' }, { status: 401 });

  const { post_id, content } = await request.json();
  if (!content?.trim() || !post_id) return Response.json({ error: 'Missing fields' }, { status: 400 });

  // Write via the authenticated client so the RLS INSERT check
  // (auth.uid() = user_id) passes once RLS is locked down.
  const { data, error } = await authClient
    .from('comments')
    .insert({
      post_id,
      user_id: user.id,
      user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
      user_avatar: user.user_metadata?.avatar_url || '',
      content: content.trim(),
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // posts.comment_count is maintained by an AFTER INSERT/DELETE trigger on
  // `comments` (a commenter is not the post owner, so an owner-only posts
  // UPDATE policy would reject a manual count bump here). Do not touch it.
  return Response.json({ comment: data });
}
