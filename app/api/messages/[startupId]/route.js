import { createClient as createServerClient } from '../../../../../lib/supabase-server.js';
import { supabase } from '../../../../../lib/supabase.js';

export async function GET(request, { params }) {
  const { startupId } = await params;
  const serverClient = await createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const otherId = searchParams.get('with');
  if (!otherId) return Response.json({ error: 'Missing with param' }, { status: 400 });

  // Mark received messages as read
  await supabase
    .from('startup_messages')
    .update({ read: true })
    .eq('startup_id', startupId)
    .eq('receiver_id', user.id)
    .eq('sender_id', otherId);

  const { data, error } = await supabase
    .from('startup_messages')
    .select('*')
    .eq('startup_id', startupId)
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`)
    .order('created_at', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ messages: data ?? [] });
}
