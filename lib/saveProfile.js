// Saving the visitor's profile: the one way every surface does it (the /jobs board's editor, and
// the navbar's welcome profile after a first sign-in). ProfileModal hands over one object, with
// the "Remember my profile on this device" choice inside it (profile.rememberOnDevice).
//   - Signed in: POST /api/user-profile with { profile } (the route reads that key).
//   - This device: kept in localStorage only when the visitor ticked "remember", else removed.

export const PROFILE_KEY = 'opportumap_profile';

/**
 * saveProfile(profile, { signedIn }) -> Promise<boolean>: whether the account copy was saved
 * (false when signed out or the request failed; it never throws). The device copy is written
 * (or removed) at once; blocked storage is skipped.
 */
export function saveProfile(profile, { signedIn = true, fetch: send = globalThis.fetch, storage } = {}) {
  try {
    const store = storage ?? globalThis.localStorage;
    if (profile?.rememberOnDevice) store.setItem(PROFILE_KEY, JSON.stringify(profile));
    else store.removeItem(PROFILE_KEY);
  } catch {
    // storage blocked (private mode): the account copy, if any, still holds it
  }
  if (!signedIn || typeof send !== 'function') return Promise.resolve(false);
  return Promise.resolve()
    .then(() =>
      send('/api/user-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      }),
    )
    .then((res) => !!res?.ok)
    .catch(() => false);
}
