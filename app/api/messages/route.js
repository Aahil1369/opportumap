import { createClient } from '../../../lib/supabase-server.js';
import { hasSupabase } from '../../../lib/supabase.js';
import { isUuid } from '../../../lib/uuid.js';
import { dbErrorStatus } from '../../../lib/dbError.js';
import { conversationsFrom } from '../../../lib/departures/gateChat.js';

const MAX_MESSAGE = 4000; // matches the startup_messages_content_len constraint

// All reads and writes use the user's session: RLS only returns messages the
// user sent or received, and only lets them send as themselves.
export async function GET() {
  if (!hasSupabase) return Response.json({ conversations: [] });
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isUuid(user.id)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // The founder's public name (kept on the startup row by the database, never an email) names
  // the other person when they founded the startup; anyone else reads as "Member 1A2B".
  const { data: messages, error } = await db
    .from('startup_messages')
    .select('id, startup_id, sender_id, receiver_id, content, read, created_at, startups(id, name, user_id, user_name)')
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: 'Could not load messages' }, { status: 500 });

  // One row per conversation (startup + the other person), newest first, with its unread count.
  return Response.json({ conversations: conversationsFrom(messages, user.id) });
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
