import { createClient } from '../../../../lib/supabase-server.js';
import { supabase, hasSupabase } from '../../../../lib/supabase.js';
import { displayName } from '../../../../lib/displayName.js';
import { postInput } from '../../../../lib/community.js';
import { dbErrorStatus } from '../../../../lib/dbError.js';
import { isUuid } from '../../../../lib/uuid.js';

// Columns returned to clients. Deliberately excludes user_email: it is no longer
// stored or exposed (public SELECT would let anyone with the anon key scrape every
// user's email). The verified badge now matches on user_id instead.
const POST_FIELDS = 'id, user_id, user_name, user_avatar, title, content, post_type, tags, like_count, comment_count, created_at';

const intIn = (raw, fallback, min, max) => {
  const n = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
};

export async function GET(request) {
  if (!hasSupabase) return Response.json({ posts: [] });
  const { searchParams } = new URL(request.url);
  const limit = intIn(searchParams.get('limit'), 20, 1, 50);
  const offset = intIn(searchParams.get('offset'), 0, 0, 100000);
  const userId = searchParams.get('userId');
  if (userId && !isUuid(userId)) return Response.json({ error: 'Unknown member' }, { status: 400 });

  let query = supabase
    .from('posts')
    .select(POST_FIELDS)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;

  // A failed read is an error the lounge shows (with a retry), never an empty lounge.
  if (error) return Response.json({ error: 'Could not load posts' }, { status: dbErrorStatus(error) });
  return Response.json({ posts: data || [] });
}

export async function POST(request) {
  if (!hasSupabase) return Response.json({ error: 'Database unavailable' }, { status: 503 });

  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return Response.json({ error: 'Sign in to post' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const input = postInput(body);
  if (input.error) return Response.json({ error: input.error }, { status: 400 });

  // Write via the cookie-aware authenticated client so the request carries the
  // user JWT and the RLS INSERT check (auth.uid() = user_id) passes. The bare
  // anon client carries no JWT and would be rejected once RLS is locked down.
  const { data, error } = await authClient
    .from('posts')
    .insert({
      user_id: user.id,
      user_name: displayName(user),
      user_avatar: user.user_metadata?.avatar_url || '',
      ...input.value,
    })
    .select(POST_FIELDS)
    .single();

  if (error) return Response.json({ error: 'Could not publish your post' }, { status: dbErrorStatus(error) });
  return Response.json({ post: data });
}
