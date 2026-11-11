import { supabase, hasSupabase } from '../../../lib/supabase.js';
import { isUuid } from '../../../lib/uuid.js';

// One visit ping: { sessionId, page } -> the record_ping() database function
// (db/site_pings_record_ping.sql). The session id is the browser's own random uuid; anything else
// is refused before the database is asked. Never throws: a ping must not break a page.
const MAX_PAGE_CHARS = 200;

export async function POST(request) {
  if (!hasSupabase) return Response.json({ ok: false });
  try {
    const body = await request.json();
    const sessionId = body?.sessionId;
    if (!isUuid(sessionId)) return Response.json({ ok: false });
    const page = typeof body.page === 'string' && body.page ? body.page.slice(0, MAX_PAGE_CHARS) : '/';
    const { error } = await supabase.rpc('record_ping', { p_session_id: sessionId, p_page: page });
    return Response.json({ ok: !error });
  } catch {
    return Response.json({ ok: false });
  }
}
