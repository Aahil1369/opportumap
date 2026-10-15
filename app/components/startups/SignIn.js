'use client';

// "Sign in to board": what signed-out visitors get in place of the hangar's actions (never a
// disabled button or a 401). The button opens the shared sign-in dialog (useSignIn → AuthModal,
// a kit Dialog: focus trap, Esc, focus back to this button). After signing in, useViewer sees
// the new session and the page swaps the prompt for the real actions; focus lands on the one
// marked data-after-signin. onSignedIn also runs then (a stand reloads its state: after an
// expired session the user id does not change).

import { useSignIn } from '../useSignIn';

export function SignInButton({ children = 'Sign in to board', className = 'hg-btn hg-btn-sign', onSignedIn }) {
  const [openSignIn, signInModal] = useSignIn(onSignedIn);
  return (
    <>
      <button type="button" className={className} onClick={openSignIn}>
        {children}
      </button>
      {signInModal}
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
