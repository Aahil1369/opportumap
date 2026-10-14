'use client';

import { useSyncExternalStore } from 'react';

const REDUCE = '(prefers-reduced-motion: reduce)';

function subscribe(onChange) {
  const mq = window.matchMedia(REDUCE);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
const now = () => window.matchMedia(REDUCE).matches;
const onServer = () => false; // the server renders the motion markup; CSS covers reduce until hydration

/** prefers-reduced-motion, live; false on the server and during hydration. */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, now, onServer);
}
