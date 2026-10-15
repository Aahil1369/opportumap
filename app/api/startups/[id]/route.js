import { createClient } from '../../../../lib/supabase-server.js';
import { hasSupabase } from '../../../../lib/supabase.js';
import { isUuid } from '../../../../lib/uuid.js';
import { viewerState } from '../../../../lib/startupViewer.js';

// One startup, plus `mine`: the signed-in user's own { upvoted, interested } (null when signed
// out), so the detail page's +1 PASSENGER / STANDBY toggles start from the truth and a tap
// never un-votes by accident. Runs on the cookie client, so RLS sees the user.
export async function GET(request, { params }) {
  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: 'Not found' }, { status: 404 });
  if (!hasSupabase) return Response.json({ error: 'Database unavailable' }, { status: 503 });

  const db = await createClient();
  const [{ data, error }, { data: auth }] = await Promise.all([
    db.from('startups').select('*').eq('id', id).maybeSingle(),
    db.auth.getUser(),
  ]);
  if (error) return Response.json({ error: 'Could not load this startup' }, { status: 500 });
  if (!data) return Response.json({ error: 'Not found' }, { status: 404 });

  const user = auth?.user;
  if (!user) return Response.json({ startup: data, mine: null });
  const { mine, error: mineError } = await viewerState(db, id, user.id);
  // Without the user's own state a toggle could undo their vote: fail, and the page retries.
  if (mineError) return Response.json({ error: 'Could not load this startup' }, { status: 500 });
  return Response.json({ startup: data, mine });
}
