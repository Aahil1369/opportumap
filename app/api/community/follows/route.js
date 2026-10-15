import { createClient } from '../../../../lib/supabase-server.js';
import { supabase, hasSupabase } from '../../../../lib/supabase.js';
import { setEdge, wantFrom } from '../../../../lib/community.js';
import { dbErrorStatus } from '../../../../lib/dbError.js';
import { isUuid } from '../../../../lib/uuid.js';

// GET ?userId=: that member's follower / following counts and whether the viewer follows them.
// A failed lookup is an error, never zeros.
export async function GET(request) {
  if (!hasSupabase) return Response.json({ followers: 0, following: 0, is_following: false });
  const { searchParams } = new URL(request.url);
  const targetUserId = searchParams.get('userId');
  if (!isUuid(targetUserId)) return Response.json({ error: 'Unknown member' }, { status: 400 });

  const authClient = await createClient();
  const { data: { user: currentUser } } = await authClient.auth.getUser();

  const [followersRes, followingRes, isFollowingRes] = await Promise.all([
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', targetUserId),
    supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', targetUserId),
    currentUser
      ? supabase.from('follows').select('follower_id').eq('follower_id', currentUser.id).eq('following_id', targetUserId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const error = followersRes.error || followingRes.error || isFollowingRes.error;
  if (error) return Response.json({ error: 'Could not load follows' }, { status: dbErrorStatus(error) });

  return Response.json({
    followers: followersRes.count || 0,
    following: followingRes.count || 0,
    is_following: !!isFollowingRes.data,
  });
}

// POST { following_id, following? }: follow or unfollow. `following` is the state the user
// asked for; without it the follow toggles. Already there = no write (double taps are
// harmless). Runs on the user's session (RLS: auth.uid() = follower_id).
export async function POST(request) {
  if (!hasSupabase) return Response.json({ error: 'Database unavailable' }, { status: 503 });

  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return Response.json({ error: 'Sign in to follow' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const followingId = body?.following_id;
  if (!isUuid(followingId) || followingId === user.id) return Response.json({ error: 'Invalid' }, { status: 400 });

  const { data: existing, error: readError } = await authClient
    .from('follows').select('follower_id').eq('follower_id', user.id).eq('following_id', followingId).maybeSingle();
  if (readError) return Response.json({ error: 'Could not update the follow' }, { status: dbErrorStatus(readError) });

  const result = await setEdge({
    on: Boolean(existing),
    want: wantFrom(body, 'following'),
    add: () => authClient.from('follows').insert({
      follower_id: user.id,
      following_id: followingId,
      // Names on follows are never displayed; store nothing rather than a
      // value that could be (or be derived from) someone's email address.
      follower_name: '',
      following_name: '',
    }),
    drop: () => authClient.from('follows').delete().eq('follower_id', user.id).eq('following_id', followingId),
  });
  if (result.error) return Response.json({ error: 'Could not update the follow' }, { status: dbErrorStatus(result.error) });
  return Response.json({ following: result.on });
}
