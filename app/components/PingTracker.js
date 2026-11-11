'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function getSessionId() {
  try {
    let id = sessionStorage.getItem('om_session_id');
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem('om_session_id', id);
    }
    return id;
  } catch {
    return null; // site data blocked (or no randomUUID): skip the visit ping, never break the page
  }
}

const REPEAT_MS = 120_000; // "live" on /admin means active in the last 5 minutes

export default function PingTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const sessionId = getSessionId();
    if (!sessionId) return;
    const ping = () => {
      fetch('/api/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, page: pathname }),
      }).catch(() => {});
    };
    ping();
    // Repeat only while the tab is on screen: a hidden tab is not a live visitor.
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') ping();
    }, REPEAT_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') ping();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [pathname]);

  return null;
}
