import Navbar from '../../components/Navbar';
import Stand from '../../components/startups/Stand';
import { supabase } from '../../../lib/supabase.js';
import { isUuid } from '../../../lib/uuid.js';
import '../../components/startups/startups.css';

// /startups/[id] — one startup's stand. The stand itself is a client island (Stand.js) fed by
// GET /api/startups/[id], which also brings the signed-in user's own state. The title names the
// startup when it exists (a public read: startups are readable by anyone under RLS).
const FALLBACK = { title: 'Startup — OpportuMap' };

export async function generateMetadata({ params }) {
  const { id } = await params;
  if (!supabase || !isUuid(id)) return FALLBACK;
  try {
    const { data } = await supabase.from('startups').select('name, tagline').eq('id', id).maybeSingle();
    if (!data?.name) return FALLBACK;
    return { title: `${data.name} — OpportuMap`, description: data.tagline || undefined };
  } catch {
    return FALLBACK;
  }
}

export default async function StartupStandPage({ params }) {
  const { id } = await params;
  return (
    <>
      <Navbar />
      <Stand id={id} />
    </>
  );
}
