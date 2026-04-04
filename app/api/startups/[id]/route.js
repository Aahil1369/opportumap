import { supabase } from '../../../../../lib/supabase.js';

export async function GET(request, { params }) {
  const { id } = await params;
  const { data, error } = await supabase.from('startups').select('*').eq('id', id).single();
  if (error) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ startup: data });
}
