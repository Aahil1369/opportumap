'use client';

// Sign in / create an account: the one sign-in dialog, shared by the Navbar and every signed-out
// prompt (hangar, lounge, gate chat, crew badge; they open it through useSignIn). It is a kit
// Dialog — role="dialog" + aria-modal, focus moves in, Tab stays inside, Esc or a tap on the
// backdrop closes, focus goes back to the opener (returnFocusRef) — in the dark hall: Inter,
// 16px inputs with real labels (no iPhone zoom on focus), 16px buttons, no backdrop blur.
// Loaded on demand (next/dynamic), together with supabase-js. `open` defaults to true, so a
// parent can simply mount it while it is wanted (the Navbar does).

import { useEffect, useId, useRef, useState } from 'react';
import Dialog from './kit/Dialog';
import { createClient } from '../../lib/supabase-browser';
import './AuthModal.css';

export default function AuthModal({ open = true, onClose, onSuccess, returnFocusRef }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const supabase = useRef(null);
  const backButton = useRef(null);
  const emailInput = useRef(null);
  const wasSent = useRef(sent);

  const uid = useId();
  const ids = {
    title: `${uid}-title`,
    name: `${uid}-name`,
    nameHint: `${uid}-name-hint`,
    email: `${uid}-email`,
    password: `${uid}-password`,
    passwordHint: `${uid}-password-hint`,
  };

  const client = () => (supabase.current ??= createClient());

  // The form and the "check your email" note swap places: keep focus inside the dialog.
  useEffect(() => {
    if (wasSent.current === sent) return;
    wasSent.current = sent;
    (sent ? backButton : emailInput).current?.focus({ preventScroll: true });
  }, [sent]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const fullName = name.trim();
        if (!fullName) throw new Error('Please enter your name.');
        if (fullName.includes('@')) throw new Error('Please enter your name, not an email address. It is shown publicly.');
        const { error: signUpError } = await client().auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (signUpError) throw signUpError;
        setSent(true);
      } else {
        const { error: signInError } = await client().auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        setLoading(false);
        onSuccess?.();
        onClose();
        return;
      }
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError('');
    const { error: oauthError } = await client().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) setError(oauthError.message);
  };

  const switchMode = () => {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    setError('');
  };

  const signup = mode === 'signup';
  const title = sent ? 'Check your email' : signup ? 'Create your account' : 'Sign in to OpportuMap';

  return (
    <Dialog open={open} onClose={onClose} labelledBy={ids.title} returnFocusRef={returnFocusRef} className="auth">
      <header className="auth-head">
        <div>
          <p className="auth-kicker">CHECK-IN</p>
          <h2 id={ids.title} className="auth-title">
            {title}
          </h2>
        </div>
        <button type="button" className="auth-x" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </header>

      <div className="auth-body">
        {sent ? (
          <>
            <p className="auth-text">
              We sent a confirmation link to <strong>{email}</strong>. Open it to activate your account, then sign in.
            </p>
            <button
              ref={backButton}
              type="button"
              className="auth-btn auth-btn-ghost"
              onClick={() => {
                setSent(false);
                setMode('signin');
              }}
            >
              Back to sign in
            </button>
          </>
        ) : (
          <>
            <button type="button" className="auth-btn auth-btn-ghost" onClick={handleGoogle}>
              <svg className="auth-g" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            <p className="auth-or" aria-hidden="true">
              OR
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              {signup && (
                <div className="auth-field">
                  <label htmlFor={ids.name} className="auth-label">
                    Your name
                  </label>
                  <input
                    id={ids.name}
                    className="auth-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={60}
                    autoComplete="name"
                    aria-describedby={ids.nameHint}
                  />
                  <p id={ids.nameHint} className="auth-hint">
                    Shown publicly on what you post.
                  </p>
                </div>
              )}
              <div className="auth-field">
                <label htmlFor={ids.email} className="auth-label">
                  Email
                </label>
                <input
                  ref={emailInput}
                  id={ids.email}
                  className="auth-input"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="auth-field">
                <label htmlFor={ids.password} className="auth-label">
                  Password
                </label>
                <input
                  id={ids.password}
                  className="auth-input"
                  type="password"
                  autoComplete={signup ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  aria-describedby={signup ? ids.passwordHint : undefined}
                />
                {signup && (
                  <p id={ids.passwordHint} className="auth-hint">
                    At least 6 characters.
                  </p>
                )}
              </div>

              {error && (
                <p role="alert" className="auth-alert">
                  {error}
                </p>
              )}

              <button type="submit" className="auth-btn auth-btn-sign" aria-disabled={loading || undefined}>
                {loading ? (signup ? 'Creating your account…' : 'Signing in…') : signup ? 'Create account' : 'Sign in'}
              </button>
            </form>

            <p className="auth-switch">
              {signup ? 'Already have an account?' : 'New to OpportuMap?'}{' '}
              <button type="button" className="auth-link" onClick={switchMode}>
                {signup ? 'Sign in' : 'Create an account'}
              </button>
            </p>
          </>
        )}
      </div>
    </Dialog>
  );
}
