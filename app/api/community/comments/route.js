import { createClient } from '../../../../lib/supabase-server.js';
import { supabase, hasSupabase } from '../../../../lib/supabase.js';
import { displayName } from '../../../../lib/displayName.js';
import { commentInput } from '../../../../lib/community.js';
import { dbErrorStatus } from '../../../../lib/dbError.js';

// Columns returned to clients, named one by one: a column added later never leaks by default.
const COMMENT_FIELDS = 'id, post_id, user_id, user_name, user_avatar, content, created_at';

export async function GET(request) {
  if (!hasSupabase) return Response.json({ comments: [] });
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('postId');
  if (!postId) return Response.json({ error: 'Missing post' }, { status: 400 });

  const { data, error } = await supabase
    .from('comments')
    .select(COMMENT_FIELDS)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  // A failed read is an error the post shows (with a retry), never "no comments yet".
  if (error) return Response.json({ error: 'Could not load comments' }, { status: dbErrorStatus(error) });
  return Response.json({ comments: data || [] });
}

export async function POST(request) {
  if (!hasSupabase) return Response.json({ error: 'Database unavailable' }, { status: 503 });

  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return Response.json({ error: 'Sign in to comment' }, { status: 401 });

  const input = commentInput(await request.json().catch(() => null));
  if (input.error) return Response.json({ error: input.error }, { status: 400 });

  // Write via the authenticated client so the RLS INSERT check
  // (auth.uid() = user_id) passes once RLS is locked down.
  const { data, error } = await authClient
    .from('comments')
    .insert({
      post_id: input.value.post_id,
      user_id: user.id,
      user_name: displayName(user),
      user_avatar: user.user_metadata?.avatar_url || '',
      content: input.value.content,
    })
    .select(COMMENT_FIELDS)
    .single();

  if (error) return Response.json({ error: 'Could not post your comment' }, { status: dbErrorStatus(error) });

  // posts.comment_count is maintained by an AFTER INSERT/DELETE trigger on
  // `comments` (a commenter is not the post owner, so an owner-only posts
  // UPDATE policy would reject a manual count bump here). Do not touch it.
  return Response.json({ comment: data });
}
