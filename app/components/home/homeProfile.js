// The signed-in visitor's profile, fetched once per page for every homepage island that uses it
// (the personal board, the night window's routes). Visitors with no Supabase session cookie are
// never asked: they have no profile, and the homepage stays one request lighter for them.

let pending = null;

const SESSION_COOKIE = /(?:^|;\s*)sb-[^=;]+-auth-token/;

/** The profile if it says anything a board can use (a nationality, skills, job types, countries), else null. */
function said(profile) {
  if (!profile || typeof profile !== 'object') return null;
  const any = profile.nationality || profile.skills || profile.jobTypes?.length || profile.preferredCountries?.length;
  return any ? profile : null;
}

/** The profile the visitor just saved: the next loadHomeProfile() answers with it, no request. Signed out: forget. */
export function keepHomeProfile(profile) {
  pending = SESSION_COOKIE.test(document.cookie) ? Promise.resolve(said(profile)) : null;
}

/**
 * The profile, or null (signed out, no profile saved, or the request failed). It is kept only
 * while the session cookie is there: a visitor who signs in or out later (no reload) and comes
 * back to / is asked again.
 */
export function loadHomeProfile() {
  if (!SESSION_COOKIE.test(document.cookie)) {
    pending = null;
    return Promise.resolve(null);
  }
  if (pending) return pending;
  pending = (async () => {
    const res = await fetch('/api/user-profile');
    if (!res.ok) return null;
    const { profile } = await res.json();
    return said(profile);
  })().catch(() => null);
  return pending;
}
