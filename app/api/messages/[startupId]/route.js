import { createClient } from '../../../../lib/supabase-server.js';
import { hasSupabase } from '../../../../lib/supabase.js';
import { isUuid } from '../../../../lib/uuid.js';

// One conversation (this startup, me <-> ?with=<user id>), on the user's session.
export async function GET(request, { params }) {
  const { startupId } = await params;
  if (!hasSupabase) return Response.json({ messages: [] });
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const otherId = searchParams.get('with');
  // Both ids go into an .or() filter string below, so they must be plain UUIDs.
  if (!isUuid(startupId) || !isUuid(otherId) || !isUuid(user.id)) {
    return Response.json({ error: 'Invalid conversation' }, { status: 400 });
  }

  // Mark received messages as read (RLS + column grant: receiver may only set `read`).
  await db
    .from('startup_messages')
    .update({ read: true })
    .eq('startup_id', startupId)
    .eq('receiver_id', user.id)
    .eq('sender_id', otherId)
    .eq('read', false);

  const { data, error } = await db
    .from('startup_messages')
    .select('*')
    .eq('startup_id', startupId)
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`)
    .order('created_at', { ascending: true });

  if (error) return Response.json({ error: 'Could not load messages' }, { status: 500 });
  return Response.json({ messages: data ?? [] });
}
