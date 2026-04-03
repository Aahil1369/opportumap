'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function getSessionId() {
  let id = sessionStorage.getItem('om_session_id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('om_session_id', id);
  }
  return id;
}

export default function PingTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const sessionId = getSessionId();
    fetch('/api/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, page: pathname }),
    }).catch(() => {});

    const interval = setInterval(() => {
      fetch('/api/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, page: pathname }),
      }).catch(() => {});
    }, 60000);

    return () => clearInterval(interval);
  }, [pathname]);

  return null;
}
