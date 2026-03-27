'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase-browser';

export default function AuthModal({ dark, onClose, onSuccess }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const ui = {
    bg: dark ? 'bg-[#1a1a1d]' : 'bg-white',
    border: dark ? 'border-[#2a2a2e]' : 'border-zinc-200',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
    input: dark ? 'bg-[#2a2a2e] border-[#3a3a3e] text-zinc-100 placeholder-zinc-500' : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400',
    divider: dark ? 'border-[#2a2a2e]' : 'border-zinc-100',
  };

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
      <div className={`w-full max-w-sm rounded-2xl border shadow-2xl ${ui.bg} ${ui.border}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 pt-5 pb-4 border-b ${ui.divider}`}>
          <h2 className={`text-base font-bold ${ui.text}`}>
            {mode === 'signin' ? 'Sign in to OpportuMap' : 'Create your account'}
          </h2>
          <button onClick={onClose} className={`text-lg leading-none ${ui.sub} hover:text-zinc-300`}>✕</button>
        </div>

        <div className="px-6 py-5">
          {sent ? (
            <div className="text-center py-4">
              <p className="text-3xl mb-3">📬</p>
              <p className={`text-sm font-semibold mb-1 ${ui.text}`}>Check your email</p>
              <p className={`text-xs ${ui.sub}`}>We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then sign in.</p>
              <button onClick={() => { setSent(false); setMode('signin'); }} className="mt-4 text-xs text-indigo-400 hover:text-indigo-300">
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              {/* Google OAuth */}
              <button onClick={handleGoogle}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all mb-4 ${dark ? 'border-[#3a3a3e] text-zinc-300 hover:bg-[#2a2a2e]' : 'border-zinc-300 text-zinc-700 hover:bg-zinc-50'}`}>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <div className={`flex items-center gap-3 mb-4 text-xs ${ui.sub}`}>
                <div className={`flex-1 h-px ${dark ? 'bg-[#2a2a2e]' : 'bg-zinc-200'}`} />
                or
                <div className={`flex-1 h-px ${dark ? 'bg-[#2a2a2e]' : 'bg-zinc-200'}`} />
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {mode === 'signup' && (
                  <input value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
                )}
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address" required
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password" required minLength={6}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />

                {error && <p className="text-xs text-red-400">{error}</p>}

                <button type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold transition-all">
                  {loading ? '...' : mode === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              </form>

              <p className={`text-xs text-center mt-4 ${ui.sub}`}>
                {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
                  className="text-indigo-400 hover:text-indigo-300 font-medium">
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
