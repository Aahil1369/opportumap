'use client';

// useSignIn(onSignedIn) -> [openSignIn, modal]: how a signed-out prompt opens sign-in (the
// hangar, the lounge, gate chat, the crew badge). Render `modal` once; any button can call
// openSignIn — as its onClick, it also remembers that button, so focus goes back to it on close
// even on iPhone, where a tap does not focus a button. The modal is AuthModal, itself the kit
// Dialog (focus trap, Esc, focus return), loaded on demand with supabase-js; nothing here wraps
// it in a second dialog.
//
// After signing in, the prompt that opened the dialog is on its way out: once the dialog has
// closed, focus moves to what replaces it ([data-after-signin]: the composer, the inbox, the
// crew badge, the hangar's actions) as soon as the page has swapped it in. This runs on its own
// timer, so it still happens when the prompt that owned the dialog has already unmounted.

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const AuthModal = dynamic(() => import('./AuthModal'), { ssr: false });

const AFTER = '[data-after-signin]';

function landAfterSignIn() {
  let tries = 0;
  let closed = false;
  const land = () => {
    // The dialog hands focus back to its opener as it closes: land only on a check after the
    // one that first saw it gone, so this always comes last.
    const next = closed ? document.querySelector(AFTER) : null;
    if (next) {
      next.focus({ preventScroll: true });
      return;
    }
    closed = !document.querySelector('.dlg.auth');
    if (tries++ < 40) setTimeout(land, 100);
  };
  setTimeout(land, 100);
}

export function useSignIn(onSignedIn) {
  const [open, setOpen] = useState(false);
  const opener = useRef(null);
  const after = useRef(onSignedIn);
  useEffect(() => {
    after.current = onSignedIn;
  });

  const openSignIn = useCallback((e) => {
    const el = e?.currentTarget;
    opener.current = typeof HTMLElement !== 'undefined' && el instanceof HTMLElement ? el : null;
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);
  const signedIn = useCallback(() => {
    setOpen(false);
    landAfterSignIn();
    after.current?.();
  }, []);

  const modal = open ? <AuthModal onClose={close} onSuccess={signedIn} returnFocusRef={opener} /> : null;
  return [openSignIn, modal];
}
