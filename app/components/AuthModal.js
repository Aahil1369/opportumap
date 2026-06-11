'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase-browser';
import Btn from './ui/Btn';

export default function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const supabase = createClient();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-paper-bg border border-paper-rule">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-paper-rule">
          <h2 className="font-display text-[22px] leading-[1.15] text-paper-ink">
            {mode === 'signin' ? 'Sign in to OpportuMap' : 'Create your account'}
          </h2>
          <button onClick={onClose} className="text-lg leading-none text-paper-ink-sub hover:text-accent transition-colors">✕</button>
        </div>

        <div className="px-6 py-5">
          {sent ? (
            <div className="text-center py-4">
              <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-3">// CHECK YOUR EMAIL</div>
              <p className="text-[14px] font-medium mb-1 text-paper-ink">Confirmation link sent</p>
              <p className="text-[13px] text-paper-ink-dim leading-[1.5]">We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then sign in.</p>
              <button onClick={() => { setSent(false); setMode('signin'); }} className="mt-4 font-mono text-[11px] tracking-[0.08em] text-accent hover:underline">
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              {/* Google OAuth */}
              <button onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-paper-rule text-paper-ink text-[13px] font-medium hover:bg-paper-bg-alt transition-colors mb-4">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-4 font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub">
                <div className="flex-1 h-px bg-paper-rule" />
                OR
                <div className="flex-1 h-px bg-paper-rule" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {mode === 'signup' && (
                  <input value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-3 py-2.5 bg-paper-bg border border-paper-rule text-paper-ink text-sm outline-none focus:border-accent transition-colors" />
                )}
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address" required
                  className="w-full px-3 py-2.5 bg-paper-bg border border-paper-rule text-paper-ink text-sm outline-none focus:border-accent transition-colors" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password" required minLength={6}
                  className="w-full px-3 py-2.5 bg-paper-bg border border-paper-rule text-paper-ink text-sm outline-none focus:border-accent transition-colors" />

                {error && <p className="font-mono text-[11px] text-accent">{error}</p>}

                <Btn as="button" type="submit" variant="primary" disabled={loading} className="w-full justify-center disabled:opacity-50">
                  {loading ? '...' : mode === 'signin' ? 'Sign in' : 'Create account'}
                </Btn>
              </form>

              <p className="font-mono text-[11px] text-center mt-4 text-paper-ink-sub">
                {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
                  className="text-accent hover:underline font-medium">
                  {mode === 'signin' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
