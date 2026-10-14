import { createClient } from '../../../lib/supabase-server.js';
import { hasSupabase } from '../../../lib/supabase.js';
import { handleContactSubmission, CONTACT_MAX_BODY } from '../../../lib/contactForm.js';

// POST /api/contact: the /contact form. Validates, drops honeypot hits, then calls
// public.submit_contact() (SECURITY DEFINER: validates, rate limits and inserts into
// the admin-only contact_messages inbox). Runs on the visitor's own session client;
// no service-role key involved. All error mapping lives in lib/contactForm.js.
export async function POST(request) {
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > CONTACT_MAX_BODY * 4) {
    return Response.json({ error: 'Your message is too long (5,000 characters max).' }, { status: 413 });
  }

  let raw = null;
  try {
    raw = await request.text();
  } catch {
    raw = null;
  }

  const submit = hasSupabase
    ? async (args) => (await createClient()).rpc('submit_contact', args)
    : null;

  const { status, body } = await handleContactSubmission(raw, submit);
  return Response.json(body, { status });
}
