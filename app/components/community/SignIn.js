'use client';

// Sign-in for the lounge and the crew badge: what signed-out visitors get in place of an
// action (never a disabled button or a 401 dead end).
//
// useSignIn() -> [openSignIn, modal]: render `modal` once; any button can call openSignIn().
// It is the shared hook (../useSignIn.js): the modal is AuthModal, a kit Dialog on its own
// (role="dialog" + aria-modal, focus moves in, Tab stays inside, Esc closes, focus goes back to
// the button that opened it), so nothing here wraps it. After signing in, useSession sees the
// new session, the page swaps its prompts for the real actions and focus lands on the one
// marked data-after-signin.

export { useSignIn } from '../useSignIn';

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
