import { createClient as createServerClient } from '../../../../../lib/supabase-server.js';
import { supabase } from '../../../../../lib/supabase.js';

export async function POST(request, { params }) {
  const { id } = await params;
  const serverClient = await createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Check if already upvoted
  const { data: existing } = await supabase
    .from('startup_upvotes')
    .select('startup_id')
    .eq('startup_id', id)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    // Remove upvote
    await supabase.from('startup_upvotes').delete().eq('startup_id', id).eq('user_id', user.id);
    const { data: current } = await supabase.from('startups').select('upvote_count').eq('id', id).single();
    await supabase.from('startups').update({ upvote_count: Math.max(0, (current?.upvote_count ?? 1) - 1) }).eq('id', id);
    const { data: updated } = await supabase.from('startups').select('upvote_count').eq('id', id).single();
    return Response.json({ upvoted: false, count: updated?.upvote_count ?? 0 });
  } else {
    // Add upvote
    await supabase.from('startup_upvotes').insert({ startup_id: id, user_id: user.id });
    const { data: current } = await supabase.from('startups').select('upvote_count').eq('id', id).single();
    await supabase.from('startups').update({ upvote_count: (current?.upvote_count ?? 0) + 1 }).eq('id', id);
    const { data: updated } = await supabase.from('startups').select('upvote_count').eq('id', id).single();
    return Response.json({ upvoted: true, count: updated?.upvote_count ?? 1 });
  }
}
