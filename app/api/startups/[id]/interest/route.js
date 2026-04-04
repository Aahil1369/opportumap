import { createClient as createServerClient } from '../../../../../lib/supabase-server.js';
import { supabase } from '../../../../../lib/supabase.js';

export async function POST(request, { params }) {
  const { id } = await params;
  const serverClient = await createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: existing } = await supabase
    .from('startup_interests')
    .select('startup_id')
    .eq('startup_id', id)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    await supabase.from('startup_interests').delete().eq('startup_id', id).eq('user_id', user.id);
    const { data: current } = await supabase.from('startups').select('interest_count').eq('id', id).single();
    await supabase.from('startups').update({ interest_count: Math.max(0, (current?.interest_count ?? 1) - 1) }).eq('id', id);
    const { data: updated } = await supabase.from('startups').select('interest_count').eq('id', id).single();
    return Response.json({ interested: false, count: updated?.interest_count ?? 0 });
  } else {
    await supabase.from('startup_interests').insert({ startup_id: id, user_id: user.id });
    const { data: current } = await supabase.from('startups').select('interest_count').eq('id', id).single();
    await supabase.from('startups').update({ interest_count: (current?.interest_count ?? 0) + 1 }).eq('id', id);
    const { data: updated } = await supabase.from('startups').select('interest_count').eq('id', id).single();
    return Response.json({ interested: true, count: updated?.interest_count ?? 1 });
  }
}
