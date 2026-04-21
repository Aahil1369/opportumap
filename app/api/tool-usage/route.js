import { createClient } from '../../../lib/supabase-server';

const TOOLS = ['match', 'visa', 'resume', 'cover-letter', 'interview', 'relocate', 'startups', 'jobs'];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ count: 0, tools: [] });
  const { data } = await supabase
    .from('user_tool_usage')
    .select('tool')
    .eq('user_id', user.id);
  const tools = (data || []).map((r) => r.tool);
  return Response.json({ count: tools.length, tools });
}

export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ ok: false }, { status: 401 });
  const { tool } = await req.json();
  if (!TOOLS.includes(tool)) return Response.json({ ok: false, error: 'invalid tool' }, { status: 400 });
  await supabase
    .from('user_tool_usage')
    .upsert({ user_id: user.id, tool, used_at: new Date().toISOString() });
  return Response.json({ ok: true });
}
