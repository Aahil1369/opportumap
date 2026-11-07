'use client';

// The signed-in member's own route, { from, to } ('LHE', 'YYZ'), from their job profile:
// GET /api/user-profile (15 s timeout, so a hung request never leaves "··· → ···" forever).
// Only ever the viewer's own profile: other members' profiles are private, so their posts carry
// no route (see lib/departures/routeChip.js). This device keeps the last route it showed for
// this account (OWN_ROUTE_KEY, tied to the user id) and falls back to it only when the profile
// cannot be read, so on a shared device another account's route never shows.
// Returns { ends, failed, ready, retry }: ends is null while loading or when there is no route;
// failed is true when the profile could not be read and this device keeps no route for this
// account (offer a retry, not "no route").

import { useCallback, useEffect, useState } from 'react';
import { fetchJson } from '../../../lib/fetchJson.js';
import { OWN_ROUTE_KEY, ownRouteFrom, ownRouteRecord, routeEnds } from '../../../lib/departures/routeChip.js';

const TIMEOUT_MS = 15000;
const withTimeout = () =>
  typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? { signal: AbortSignal.timeout(TIMEOUT_MS) } : {};

function keptRoute(userId) {
  try {
    return ownRouteFrom(window.localStorage.getItem(OWN_ROUTE_KEY), userId);
  } catch {
    return null; // storage blocked (private mode)
  }
}

function keepRoute(userId, ends) {
  try {
    const record = ownRouteRecord(userId, ends);
    if (record) window.localStorage.setItem(OWN_ROUTE_KEY, record);
    else window.localStorage.removeItem(OWN_ROUTE_KEY);
  } catch {
    // storage blocked: the route still shows, it is just not kept on this device
  }
}

export function useOwnRoute(userId) {
  const [found, setFound] = useState(null); // { userId, ends, failed }
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!userId) return undefined;
    let live = true;
    fetchJson('/api/user-profile', withTimeout())
      .then((d) => {
        if (!live) return;
        const ends = routeEnds(d?.profile ?? null);
        keepRoute(userId, ends);
        setFound({ userId, ends, failed: false });
      })
      .catch(() => {
        if (!live) return;
        const kept = keptRoute(userId);
        setFound({ userId, ends: kept, failed: !kept });
      });
    return () => {
      live = false;
    };
  }, [userId, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const mine = found && found.userId === userId ? found : null;
  return { ends: mine?.ends ?? null, failed: Boolean(mine?.failed), ready: Boolean(mine), retry };
}
