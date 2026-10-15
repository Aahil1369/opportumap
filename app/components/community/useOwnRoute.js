'use client';

// The signed-in member's own route, { from, to } ('LHE', 'YYZ'), from their job profile:
// GET /api/user-profile, else the copy they chose to keep on this device (localStorage
// 'opportumap_profile'). Only ever the viewer's own profile: other members' profiles are
// private, so their posts carry no route (see lib/departures/routeChip.js).
// Returns { ends, failed, retry }: ends is null while loading or when there is no route; failed
// is true when the profile could not be read at all (offer a retry, not "no route").

import { useCallback, useEffect, useState } from 'react';
import { fetchJson } from '../../../lib/fetchJson.js';
import { routeEnds } from '../../../lib/departures/routeChip.js';

function localProfile() {
  try {
    const raw = window.localStorage.getItem('opportumap_profile');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useOwnRoute(userId) {
  const [found, setFound] = useState(null); // { userId, ends, failed }
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!userId) return undefined;
    let live = true;
    fetchJson('/api/user-profile')
      .then((d) => ({ profile: d?.profile ?? null, failed: false }))
      .catch(() => ({ profile: null, failed: true }))
      .then(({ profile, failed }) => {
        if (!live) return;
        const local = profile ? null : localProfile();
        const ends = routeEnds(profile || local);
        setFound({ userId, ends, failed: failed && !local });
      });
    return () => {
      live = false;
    };
  }, [userId, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const mine = found && found.userId === userId ? found : null;
  return { ends: mine?.ends ?? null, failed: Boolean(mine?.failed), ready: Boolean(mine), retry };
}
