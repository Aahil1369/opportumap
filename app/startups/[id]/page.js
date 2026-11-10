import { notFound } from 'next/navigation';
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

// A stand that does not exist answers a real 404 (not a 200 page that says "vacant"), so old
// links to a deleted startup drop out of search results. A database error is not "missing": the
// page still renders, and the stand shows its own "didn't load" state with a retry.
export default async function StartupStandPage({ params }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  if (supabase) {
    const { data, error } = await supabase.from('startups').select('id').eq('id', id).maybeSingle();
    if (!error && !data) notFound();
  }
  return (
    <>
      <Navbar />
      <Stand id={id} />
    </>
  );
}
