'use client';

// "Sign in to board": what signed-out visitors get in place of the hangar's actions (never a
// disabled button or a 401). The button opens the sign-in modal; after signing in, useViewer
// sees the new session and the page swaps the prompt for the real actions. onSignedIn also runs
// then (a stand reloads its state: after an expired session the user id does not change).

import { useState } from 'react';
import dynamic from 'next/dynamic';

const AuthModal = dynamic(() => import('../AuthModal'), { ssr: false });

export function SignInButton({ children = 'Sign in to board', className = 'hg-btn hg-btn-sign', onSignedIn }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open && (
        <AuthModal
          onClose={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false);
            onSignedIn?.();
          }}
        />
      )}
    </>
  );
}

export function SignInPrompt({ title = 'Sign in to board', children, button = 'Sign in to board', id, onSignedIn }) {
  return (
    <div className="hg-prompt" role="group" aria-labelledby={id}>
      <p className="hg-prompt-t" id={id}>
        {title}
      </p>
      {children && <p className="hg-prompt-s">{children}</p>}
      <SignInButton onSignedIn={onSignedIn}>{button}</SignInButton>
    </div>
  );
}
