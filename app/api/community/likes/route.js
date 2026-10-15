import { createClient } from '../../../../lib/supabase-server.js';
import { hasSupabase } from '../../../../lib/supabase.js';
import { setEdge, wantFrom } from '../../../../lib/community.js';
import { dbErrorStatus } from '../../../../lib/dbError.js';

// POST { post_id, liked? }: like or unlike a post. `liked` is the state the user asked for
// (what the button showed them); without it the like toggles. Already in that state = no
// write, so a double tap never undoes itself. Every step runs on the user's session (RLS:
// auth.uid() = user_id). posts.like_count is maintained by an AFTER INSERT/DELETE trigger on
// `post_likes` (the liker is not the post owner, so an owner-only posts UPDATE policy would
// reject a manual bump); it is read back after the write.
export async function POST(request) {
  if (!hasSupabase) return Response.json({ error: 'Database unavailable' }, { status: 503 });

  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: 'Sign in to like' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const postId = typeof body?.post_id === 'string' ? body.post_id : '';
  if (!postId) return Response.json({ error: 'Missing post_id' }, { status: 400 });

  const { data: existing, error: readError } = await db
    .from('post_likes').select('user_id').eq('user_id', user.id).eq('post_id', postId).maybeSingle();
  if (readError) return Response.json({ error: 'Could not update the like' }, { status: dbErrorStatus(readError) });

  const result = await setEdge({
    on: Boolean(existing),
    want: wantFrom(body, 'liked'),
    add: () => db.from('post_likes').insert({ user_id: user.id, post_id: postId }),
    drop: () => db.from('post_likes').delete().eq('user_id', user.id).eq('post_id', postId),
  });
  if (result.error) return Response.json({ error: 'Could not update the like' }, { status: dbErrorStatus(result.error) });

  const { data: post } = await db.from('posts').select('like_count').eq('id', postId).maybeSingle();
  return Response.json({ liked: result.on, like_count: post?.like_count ?? null });
}

// GET: the signed-in user's liked post ids. A failed read is an error (the lounge then does
// not pretend nothing is liked), never an empty list.
export async function GET() {
  if (!hasSupabase) return Response.json({ liked_post_ids: [] });

  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ liked_post_ids: [] });

  const { data, error } = await db.from('post_likes').select('post_id').eq('user_id', user.id);
  if (error) return Response.json({ error: 'Could not load your likes' }, { status: dbErrorStatus(error) });
  return Response.json({ liked_post_ids: (data || []).map((r) => r.post_id) });
}
