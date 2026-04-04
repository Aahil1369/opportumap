import { createClient as createServerClient } from '../../../lib/supabase-server.js';
import { supabase } from '../../../lib/supabase.js';

export async function GET(request) {
  const serverClient = await createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Get all messages where user is sender or receiver
  const { data: messages, error } = await supabase
    .from('startup_messages')
    .select('*, startups(id, name, user_id)')
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Group into conversations by startup_id + other_user_id
  const convMap = {};
  for (const msg of messages ?? []) {
    const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
    const key = `${msg.startup_id}::${otherId}`;
    if (!convMap[key]) {
      convMap[key] = {
        startup_id: msg.startup_id,
        startup_name: msg.startups?.name ?? 'Unknown',
        startup_founder_id: msg.startups?.user_id,
        other_user_id: otherId,
        last_message: msg.content,
        last_at: msg.created_at,
        unread: 0,
      };
    }
    if (!msg.read && msg.receiver_id === user.id) convMap[key].unread++;
  }

  return Response.json({ conversations: Object.values(convMap) });
}

export async function POST(request) {
  const serverClient = await createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { startupId, receiverId, content } = await request.json();
  if (!startupId || !receiverId || !content?.trim()) {
    return Response.json({ error: 'Missing fields' }, { status: 400 });
  }

  const { data, error } = await supabase.from('startup_messages').insert({
    startup_id: startupId,
    sender_id: user.id,
    receiver_id: receiverId,
    content: content.trim(),
  }).select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ message: data });
}
