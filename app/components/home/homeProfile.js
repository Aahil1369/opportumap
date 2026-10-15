// The signed-in visitor's profile, fetched once per page for every homepage island that uses it
// (the personal board, the night window's routes). Visitors with no Supabase session cookie are
// never asked: they have no profile, and the homepage stays one request lighter for them.

let pending = null;

const SESSION_COOKIE = /(?:^|;\s*)sb-[^=;]+-auth-token/;

/** The profile, or null (signed out, no profile saved, or the request failed). */
export function loadHomeProfile() {
  if (pending) return pending;
  pending = (async () => {
    if (!SESSION_COOKIE.test(document.cookie)) return null;
    const res = await fetch('/api/user-profile');
    if (!res.ok) return null;
    const { profile } = await res.json();
    if (!profile || typeof profile !== 'object') return null;
    const any = profile.nationality || profile.skills || profile.jobTypes?.length || profile.preferredCountries?.length;
    return any ? profile : null;
  })().catch(() => null);
  return pending;
}
