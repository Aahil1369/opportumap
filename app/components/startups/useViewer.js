'use client';

// Who is looking at the hangar: { ready, user }. supabase-js is imported on demand (the Navbar
// does the same, so it is one shared chunk, off the page's first load). `ready` turns true once
// the session is known; sign-in / sign-out after that update `user` (onAuthStateChange).
// A failed check reads as signed out, so the page shows sign-in prompts, never a dead end.

import { useEffect, useState } from 'react';

export function useViewer() {
  const [viewer, setViewer] = useState({ ready: false, user: null });

  useEffect(() => {
    let live = true;
    let subscription;
    import('../../../lib/supabase-browser')
      .then(async ({ createClient }) => {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!live) return;
        setViewer({ ready: true, user: data?.user ?? null });
        ({
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if (!live || event === 'INITIAL_SESSION') return;
          const next = session?.user ?? null;
          // Token refreshes hand over a new object for the same user: keep the old one.
          setViewer((v) => (v.user?.id === next?.id ? v : { ready: true, user: next }));
        }));
      })
      .catch(() => {
        if (live) setViewer({ ready: true, user: null });
      });
    return () => {
      live = false;
      subscription?.unsubscribe();
    };
  }, []);

  return viewer;
}
