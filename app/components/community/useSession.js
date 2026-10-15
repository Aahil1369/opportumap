'use client';

// Who is looking, for the lounge (/community) and the crew badge (/profile):
// { status: 'loading' | 'in' | 'out' | 'error', user, retry }.
// supabase-js is imported on demand (the Navbar does the same, so it is one shared chunk, off
// the page's first load). A failed check (offline, the chunk or the auth server down) is
// 'error' with a retry, never an endless LOADING and never a silent "signed out" (viewerFrom).
// Sign-in / sign-out after that update `user` (onAuthStateChange).

import { useCallback, useEffect, useState } from 'react';
import { viewerFrom } from '../../../lib/departures/lounge.js';

const LOADING = { status: 'loading', user: null };

export function useSession() {
  const [state, setState] = useState(LOADING);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    let subscription;
    import('../../../lib/supabase-browser')
      .then(async ({ createClient }) => {
        const supabase = createClient();
        const result = await supabase.auth.getUser();
        if (!live) return;
        setState(viewerFrom(result));
        ({
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if (!live || event === 'INITIAL_SESSION') return;
          const next = session?.user ?? null;
          // Token refreshes hand over a new object for the same user: keep the old one.
          setState((s) => (s.status !== 'error' && s.user?.id === next?.id ? s : { status: next ? 'in' : 'out', user: next }));
        }));
      })
      .catch(() => {
        if (live) setState({ status: 'error', user: null });
      });
    return () => {
      live = false;
      subscription?.unsubscribe();
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState(LOADING);
    setAttempt((n) => n + 1);
  }, []);

  return { ...state, retry };
}
