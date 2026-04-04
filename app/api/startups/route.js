import { createClient as createServerClient } from '../../../lib/supabase-server.js';
import { supabase } from '../../../lib/supabase.js';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const stage = searchParams.get('stage');
  const sector = searchParams.get('sector');
  const sort = searchParams.get('sort') || 'newest';

  let query = supabase.from('startups').select('*');
  if (stage) query = query.eq('stage', stage);
  if (sector) query = query.eq('sector', sector);
  if (sort === 'trending') query = query.order('upvote_count', { ascending: false });
  else query = query.order('created_at', { ascending: false });

  const { data, error } = await query.limit(50);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ startups: data ?? [] });
}

export async function POST(request) {
  const serverClient = await createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { name, tagline, description, stage, sector, raise_amount, equity_offered, team_size, location, website, pitch_deck_url } = body;
  if (!name || !tagline || !description || !stage || !sector) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Anonymous';

  const { data, error } = await supabase.from('startups').insert({
    user_id: user.id,
    user_name: userName,
    name, tagline, description, stage, sector,
    raise_amount: raise_amount || null,
    equity_offered: equity_offered || null,
    team_size: team_size || null,
    location: location || null,
    website: website || null,
    pitch_deck_url: pitch_deck_url || null,
  }).select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ startup: data });
}
