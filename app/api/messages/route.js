import { createClient } from '../../../lib/supabase-server.js';
import { hasSupabase } from '../../../lib/supabase.js';
import { isUuid } from '../../../lib/uuid.js';
import { dbErrorStatus } from '../../../lib/dbError.js';

const MAX_MESSAGE = 4000; // matches the startup_messages_content_len constraint

// All reads and writes use the user's session: RLS only returns messages the
// user sent or received, and only lets them send as themselves.
export async function GET() {
  if (!hasSupabase) return Response.json({ conversations: [] });
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isUuid(user.id)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: messages, error } = await db
    .from('startup_messages')
    .select('*, startups(id, name, user_id)')
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: 'Could not load messages' }, { status: 500 });

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
  if (!hasSupabase) return Response.json({ error: 'Database unavailable' }, { status: 503 });
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { body = {}; }
  const { startupId, receiverId } = body ?? {};
  const content = typeof body?.content === 'string' ? body.content.trim() : '';
  if (!isUuid(startupId) || !isUuid(receiverId) || !content) {
    return Response.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (receiverId === user.id) return Response.json({ error: 'You cannot message yourself' }, { status: 400 });
  if (content.length > MAX_MESSAGE) {
    return Response.json({ error: `Messages can be at most ${MAX_MESSAGE} characters` }, { status: 400 });
  }

  const { data, error } = await db.from('startup_messages').insert({
    startup_id: startupId,
    sender_id: user.id,
    receiver_id: receiverId,
    content,
  }).select().single();

  if (error) return Response.json({ error: 'Could not send your message' }, { status: dbErrorStatus(error) });
  return Response.json({ message: data });
}
