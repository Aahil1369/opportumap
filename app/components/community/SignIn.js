'use client';

// Sign-in for the lounge and the crew badge: what signed-out visitors get in place of an
// action (never a disabled button or a 401 dead end).
//
// useSignIn() -> [openSignIn, modal]: render `modal` once; any button can call openSignIn().
// The existing AuthModal (shared with the Navbar, not restyled here) is wrapped in a dialog
// that it lacks on its own: role="dialog" + aria-modal, focus moves in, Tab stays inside, Esc
// closes, and focus goes back to the button that opened it. After signing in, useSession sees
// the new session and the page swaps its prompts for the real actions.

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const AuthModal = dynamic(() => import('../AuthModal'), { ssr: false });

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function SignInDialog({ onClose, onSignedIn }) {
  const box = useRef(null);
  const close = useRef(onClose);
  const signedIn = useRef(false);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    const el = box.current;
    const opener = document.activeElement;
    const items = () => Array.from(el.querySelectorAll(FOCUSABLE)).filter((n) => n.getClientRects().length > 0);
    // AuthModal is loaded on demand: focus its first control once it has rendered.
    let tries = 0;
    let timer = 0;
    const focusIn = () => {
      const first = items()[0];
      if (first) first.focus({ preventScroll: true });
      else if (tries++ < 40) timer = setTimeout(focusIn, 50);
    };
    focusIn();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = items();
      if (!list.length) return;
      const active = document.activeElement;
      if (e.shiftKey && (active === list[0] || !el.contains(active))) {
        e.preventDefault();
        list.at(-1).focus();
      } else if (!e.shiftKey && (active === list.at(-1) || !el.contains(active))) {
        e.preventDefault();
        list[0].focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKey, true);
      if (!signedIn.current) {
        if (opener?.isConnected && typeof opener.focus === 'function') opener.focus({ preventScroll: true });
        return;
      }
      // Signed in: the prompt that opened the dialog is on its way out. Focus what replaces it
      // (the composer, the crew badge: [data-after-signin]) once the page has swapped it in.
      let waits = 0;
      const land = () => {
        const next = document.querySelector('[data-after-signin]');
        if (next) next.focus({ preventScroll: true });
        else if (waits++ < 30) setTimeout(land, 100);
      };
      land();
    };
  }, []);

  return (
    <div ref={box} role="dialog" aria-modal="true" aria-label="Sign in to OpportuMap" data-lenis-prevent="">
      <AuthModal
        onClose={onClose}
        onSuccess={() => {
          signedIn.current = true;
          onClose();
          onSignedIn?.();
        }}
      />
    </div>
  );
}

export function useSignIn(onSignedIn) {
  const [open, setOpen] = useState(false);
  const openSignIn = useCallback(() => setOpen(true), []);
  const modal = open ? <SignInDialog onClose={() => setOpen(false)} onSignedIn={onSignedIn} /> : null;
  return [openSignIn, modal];
}

/** A titled sign-in card: what a signed-out visitor sees where an action would be. */
export function SignInPrompt({ id, title, children, button, onSignIn, extra }) {
  return (
    <div className="lg-prompt" role="group" aria-labelledby={id}>
      <p className="lg-prompt-t" id={id}>
        {title}
      </p>
      {children && <p className="lg-prompt-s">{children}</p>}
      <div className="lg-prompt-a">
        <button type="button" className="lg-btn lg-btn-sign" onClick={onSignIn}>
          {button}
        </button>
        {extra}
      </div>
    </div>
  );
}
