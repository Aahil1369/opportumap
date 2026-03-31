'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { createClient } from '../../lib/supabase-browser';
import AuthModal from './AuthModal';

const NAV_LINKS = [
  { href: '/jobs', label: 'Jobs', icon: '💼' },
  { href: '/map', label: 'Map', icon: '🌍' },
  { href: '/community', label: 'Community', icon: '💬' },
];

const TOOL_LINKS = [
  { href: '/resume', label: 'Resume Analyzer', icon: '📄', desc: 'Grade your resume with AI' },
  { href: '/visa', label: 'Visa Intelligence', icon: '🛂', desc: 'Know your visa status instantly' },
  { href: '/relocate', label: 'Relocation Guide', icon: '✈️', desc: 'Full city relocation plan' },
  { href: '/contact', label: 'Contact', icon: '✉️', desc: 'Get in touch with us' },
];

function UserAvatar({ user, size = 'md' }) {
  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email || '?';
  const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const colors = ['from-indigo-500 to-purple-600', 'from-violet-500 to-pink-600', 'from-blue-500 to-cyan-600', 'from-emerald-500 to-teal-600'];
  const color = colors[(name.charCodeAt(0) || 0) % colors.length];
  const sz = size === 'lg' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs';

  if (avatar) return <img src={avatar} alt={name} className={`${sz} rounded-full object-cover`} />;
  return (
    <div className={`${sz} bg-gradient-to-br ${color} rounded-full flex items-center justify-center text-white font-bold`}>
      {initials}
    </div>
  );
}

export default function Navbar({ dark, onToggleDark }) {
  const pathname = usePathname();
  const router = useRouter();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef(null);
  const userMenuRef = useRef(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setToolsOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserMenuOpen(false);
    router.push('/');
  };

  const isToolActive = TOOL_LINKS.some((t) => pathname === t.href);
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';

  const navBg = scrolled
    ? dark ? 'bg-[#080810]/95 shadow-lg shadow-black/20' : 'bg-white/95 shadow-lg shadow-black/5'
    : dark ? 'bg-[#080810]/80' : 'bg-white/80';

  const linkBase = 'relative text-sm font-medium transition-all duration-200 py-1';
  const linkActive = dark ? 'text-white' : 'text-zinc-900';
  const linkInactive = dark ? 'text-zinc-400 hover:text-zinc-100' : 'text-zinc-500 hover:text-zinc-900';

  return (
    <>
      {showAuth && <AuthModal dark={dark} onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />}

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className={`absolute top-0 right-0 h-full w-72 ${dark ? 'bg-[#0e0e18]' : 'bg-white'} shadow-2xl flex flex-col`}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: dark ? '#1e1e2e' : '#e4e4e7' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <span className="font-bold text-sm gradient-text">OpportuMap</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className={`text-lg ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
              {[{ href: '/', label: 'Home', icon: '🏠' }, ...NAV_LINKS].map((link) => (
                <Link key={link.href} href={link.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${pathname === link.href ? 'bg-indigo-500/10 text-indigo-400' : dark ? 'text-zinc-300 hover:bg-white/5' : 'text-zinc-600 hover:bg-zinc-50'}`}>
                  <span>{link.icon}</span>{link.label}
                </Link>
              ))}
              <div className={`text-xs font-semibold uppercase tracking-widest px-3 pt-4 pb-1 ${dark ? 'text-zinc-600' : 'text-zinc-400'}`}>Tools</div>
              {TOOL_LINKS.map((link) => (
                <Link key={link.href} href={link.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${pathname === link.href ? 'bg-indigo-500/10 text-indigo-400' : dark ? 'text-zinc-300 hover:bg-white/5' : 'text-zinc-600 hover:bg-zinc-50'}`}>
                  <span>{link.icon}</span>{link.label}
                </Link>
              ))}
            </div>
            <div className="px-4 py-4 border-t" style={{ borderColor: dark ? '#1e1e2e' : '#e4e4e7' }}>
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <UserAvatar user={user} />
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${dark ? 'text-zinc-100' : 'text-zinc-900'}`}>{userName}</p>
                      <p className={`text-xs truncate ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>{user.email}</p>
                    </div>
                  </div>
                  <Link href="/profile" className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${dark ? 'text-zinc-300 hover:bg-white/5' : 'text-zinc-600 hover:bg-zinc-50'}`}>
                    👤 View Profile
                  </Link>
                  <button onClick={handleSignOut} className="w-full text-left px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/5 transition-colors">
                    Sign out
                  </button>
                </div>
              ) : (
                <button onClick={() => { setMobileOpen(false); setShowAuth(true); }}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all">
                  Sign in
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <nav className={`sticky top-0 z-40 flex items-center justify-between px-4 sm:px-8 py-3 border-b backdrop-blur-xl transition-all duration-300 ${navBg}`}
        style={{ borderColor: dark ? 'rgba(99,102,241,0.1)' : 'rgba(0,0,0,0.06)' }}>

        {/* Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition-all">
                <span className="text-white text-xs font-black">O</span>
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border-2 animate-pulse" style={{ borderColor: dark ? '#080810' : 'white' }} />
            </div>
            <span className={`font-black text-sm tracking-tight gradient-text hidden sm:block`}>OpportuMap</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href}
                className={`${linkBase} px-3 py-1.5 rounded-lg transition-all ${pathname === link.href
                  ? `${linkActive} ${dark ? 'bg-white/8' : 'bg-zinc-100'}`
                  : linkInactive}`}>
                {link.label}
                {pathname === link.href && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-indigo-500" />
                )}
              </Link>
            ))}

            {/* Tools dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setToolsOpen(!toolsOpen)}
                className={`${linkBase} px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${isToolActive
                  ? `${linkActive} ${dark ? 'bg-white/8' : 'bg-zinc-100'}`
                  : linkInactive}`}>
                Tools
                <svg className={`w-3 h-3 transition-transform duration-200 ${toolsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {toolsOpen && (
                <div className={`absolute top-full left-0 mt-2 w-64 rounded-2xl border shadow-2xl overflow-hidden z-50 ${dark ? 'bg-[#0e0e18] border-[#1e1e2e]' : 'bg-white border-zinc-100'}`}>
                  <div className="p-1.5">
                    {TOOL_LINKS.map((link) => (
                      <Link key={link.href} href={link.href} onClick={() => setToolsOpen(false)}
                        className={`flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all group ${pathname === link.href
                          ? 'bg-indigo-500/10'
                          : dark ? 'hover:bg-white/5' : 'hover:bg-zinc-50'}`}>
                        <span className="text-lg mt-0.5">{link.icon}</span>
                        <div>
                          <p className={`text-sm font-semibold ${pathname === link.href ? 'text-indigo-400' : dark ? 'text-zinc-200' : 'text-zinc-800'}`}>{link.label}</p>
                          <p className={`text-xs ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>{link.desc}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Dark mode toggle */}
          <button onClick={onToggleDark}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${dark ? 'bg-white/8 text-zinc-300 hover:bg-white/12' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>
            {dark ? '☀' : '☾'}
          </button>

          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border transition-all ${userMenuOpen
                  ? dark ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-indigo-300 bg-indigo-50'
                  : dark ? 'border-[#2a2a3e] hover:border-indigo-500/30 bg-white/5' : 'border-zinc-200 hover:border-zinc-300 bg-white'}`}>
                <UserAvatar user={user} />
                <span className={`text-xs font-semibold hidden sm:block max-w-20 truncate ${dark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                  {userName.split(' ')[0]}
                </span>
                <svg className={`w-3 h-3 transition-transform duration-200 ${dark ? 'text-zinc-400' : 'text-zinc-400'} ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {userMenuOpen && (
                <div className={`absolute right-0 top-full mt-2 w-56 rounded-2xl border shadow-2xl overflow-hidden z-50 ${dark ? 'bg-[#0e0e18] border-[#1e1e2e]' : 'bg-white border-zinc-100'}`}>
                  {/* User header */}
                  <div className={`px-4 py-3 border-b ${dark ? 'border-[#1e1e2e]' : 'border-zinc-100'}`}>
                    <div className="flex items-center gap-3">
                      <UserAvatar user={user} size="lg" />
                      <div className="min-w-0">
                        <p className={`text-sm font-bold truncate ${dark ? 'text-zinc-100' : 'text-zinc-900'}`}>{userName}</p>
                        <p className={`text-xs truncate ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>{user.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-1.5">
                    <Link href="/profile" onClick={() => setUserMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all ${dark ? 'text-zinc-300 hover:bg-white/5' : 'text-zinc-700 hover:bg-zinc-50'}`}>
                      <span className="text-base">👤</span> View Profile
                    </Link>
                    <Link href="/community" onClick={() => setUserMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all ${dark ? 'text-zinc-300 hover:bg-white/5' : 'text-zinc-700 hover:bg-zinc-50'}`}>
                      <span className="text-base">💬</span> Community
                    </Link>
                    <Link href="/jobs" onClick={() => setUserMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all ${dark ? 'text-zinc-300 hover:bg-white/5' : 'text-zinc-700 hover:bg-zinc-50'}`}>
                      <span className="text-base">💼</span> Browse Jobs
                    </Link>
                    <div className={`my-1 h-px ${dark ? 'bg-[#1e1e2e]' : 'bg-zinc-100'}`} />
                    <button onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/8 transition-all">
                      <span className="text-base">↪</span> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)}
              className="px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95">
              Sign in
            </button>
          )}

          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(true)}
            className={`sm:hidden w-8 h-8 rounded-lg flex flex-col items-center justify-center gap-1.5 transition-all ${dark ? 'hover:bg-white/8' : 'hover:bg-zinc-100'}`}>
            <span className={`block w-4 h-0.5 rounded-full transition-all ${dark ? 'bg-zinc-400' : 'bg-zinc-600'}`} />
            <span className={`block w-4 h-0.5 rounded-full transition-all ${dark ? 'bg-zinc-400' : 'bg-zinc-600'}`} />
            <span className={`block w-4 h-0.5 rounded-full transition-all ${dark ? 'bg-zinc-400' : 'bg-zinc-600'}`} />
          </button>
        </div>
      </nav>
    </>
  );
}
