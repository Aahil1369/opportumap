import { cache } from 'react';
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
const READ_LIMIT_MS = 2500;

// One read per request, shared by the title and the page (React cache), with a time limit so a
// slow database cannot hold the page. -> { row, failed }. failed means "could not tell" (an
// error, the time limit, no database): that is not the same as a stand that does not exist.
const readStand = cache(async (id) => {
  if (!supabase) return { row: null, failed: true };
  try {
    const { data, error } = await supabase
      .from('startups')
      .select('id, name, tagline')
      .eq('id', id)
      .abortSignal(AbortSignal.timeout(READ_LIMIT_MS))
      .maybeSingle();
    return error ? { row: null, failed: true } : { row: data, failed: false };
  } catch {
    return { row: null, failed: true };
  }
});

export async function generateMetadata({ params }) {
  const { id } = await params;
  if (!isUuid(id)) return FALLBACK;
  const { row } = await readStand(id);
  if (!row?.name) return FALLBACK;
  return { title: `${row.name} — OpportuMap`, description: row.tagline || undefined };
}

// A stand that does not exist answers a real 404 (not a 200 page that says "vacant"), so old
// links to a deleted startup drop out of search results. A read that failed is not "missing": the
// page still renders, and the stand shows its own "didn't load" state with a retry.
export default async function StartupStandPage({ params }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { row, failed } = await readStand(id);
  if (!failed && !row) notFound();
  return (
    <>
      <Navbar />
      <Stand id={id} />
    </>
  );
}
