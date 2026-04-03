import { supabase, hasSupabase } from '../../../lib/supabase.js';

export async function POST(request) {
  if (!hasSupabase) return Response.json({ ok: false });
  try {
    const { sessionId, page } = await request.json();
    if (!sessionId) return Response.json({ ok: false });
    await supabase.from('site_pings').upsert(
      { session_id: sessionId, last_seen: new Date().toISOString(), page: page || '/' },
      { onConflict: 'session_id' }
    );
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false });
  }
}
