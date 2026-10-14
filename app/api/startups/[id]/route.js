import { createClient } from '../../../../lib/supabase-server.js';
import { hasSupabase } from '../../../../lib/supabase.js';
import { isUuid } from '../../../../lib/uuid.js';

export async function GET(request, { params }) {
  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: 'Not found' }, { status: 404 });
  if (!hasSupabase) return Response.json({ error: 'Database unavailable' }, { status: 503 });

  const db = await createClient();
  const { data, error } = await db.from('startups').select('*').eq('id', id).maybeSingle();
  if (error) return Response.json({ error: 'Could not load this startup' }, { status: 500 });
  if (!data) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ startup: data });
}
