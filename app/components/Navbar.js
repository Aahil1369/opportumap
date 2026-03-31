'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { createClient } from '../../lib/supabase-browser';
import AuthModal from './AuthModal';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/map', label: 'Map' },
  { href: '/community', label: 'Community' },
];

const TOOL_LINKS = [
  { href: '/resume', label: '📄 Resume Analyzer' },
  { href: '/visa', label: '🛂 Visa Intelligence' },
  { href: '/relocate', label: '✈️ Relocation Guide' },
  { href: '/contact', label: '✉️ Contact' },
];

function UserAvatar({ user, onClick }) {
  const name = user.user_metadata?.full_name || user.email || '?';
  const avatar = user.user_metadata?.avatar_url;
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const colors = ['bg-indigo-500', 'bg-purple-500', 'bg-blue-500', 'bg-green-500'];
  const color = colors[(name.charCodeAt(0) || 0) % colors.length];

  if (avatar) return (
    <button onClick={onClick}>
      <img src={avatar} alt={name} className="w-8 h-8 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all" />
    </button>
  );
  return (
    <button onClick={onClick} className={`w-8 h-8 ${color} rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all`}>
      {initials}
    </button>
  );
}

export default function Navbar({ dark, onToggleDark }) {
  const pathname = usePathname();
  const router = useRouter();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState(null);
  const dropdownRef = useRef(null);
  const userMenuRef = useRef(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserMenuOpen(false);
    router.push('/');
  };

  const isToolActive = TOOL_LINKS.some((t) => pathname === t.href);

  const ui = {
    bg: dark ? 'bg-[#0e0e10]/90' : 'bg-[#f5f5f7]/90',
    border: dark ? 'border-[#2a2a2e]' : 'border-zinc-200',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
    toggle: dark ? 'bg-[#2a2a2e] text-zinc-300 hover:bg-[#333]' : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300',
    link: (active) => active ? 'text-indigo-400 font-semibold' : dark ? 'text-zinc-300 hover:text-zinc-100' : 'text-zinc-600 hover:text-zinc-900',
    dropdown: dark ? 'bg-[#1a1a1d] border-[#2a2a2e]' : 'bg-white border-zinc-200',
    dropItem: dark ? 'text-zinc-300 hover:bg-[#2a2a2e] hover:text-zinc-100' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
  };

  return (
    <>
      {showAuth && <AuthModal dark={dark} onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />}

      <nav className={`flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4 border-b ${ui.border} ${ui.bg} backdrop-blur-md sticky top-0 z-40`}>
        <div className="flex items-center gap-5 sm:gap-7">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className={`font-semibold text-sm sm:text-base tracking-tight ${ui.text}`}>OpportuMap</span>
          </Link>
          <div className="hidden sm:flex items-center gap-5">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href}
                className={`text-sm font-medium transition-colors ${ui.link(pathname === link.href)}`}>
                {link.label}
              </Link>
            ))}
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setToolsOpen(!toolsOpen)}
                className={`text-sm font-medium transition-colors flex items-center gap-1 ${ui.link(isToolActive)}`}>
                Tools
                <svg className={`w-3 h-3 transition-transform ${toolsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {toolsOpen && (
                <div className={`absolute top-full left-0 mt-2 w-52 rounded-xl border shadow-xl overflow-hidden z-50 ${ui.dropdown}`}>
                  {TOOL_LINKS.map((link) => (
                    <Link key={link.href} href={link.href} onClick={() => setToolsOpen(false)}
                      className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${ui.dropItem} ${pathname === link.href ? 'text-indigo-400 font-semibold' : ''}`}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <UserAvatar user={user} onClick={() => setUserMenuOpen(!userMenuOpen)} />
              {userMenuOpen && (
                <div className={`absolute right-0 top-full mt-2 w-48 rounded-xl border shadow-xl overflow-hidden z-50 ${ui.dropdown}`}>
                  <div className={`px-4 py-3 border-b ${dark ? 'border-[#2a2a2e]' : 'border-zinc-100'}`}>
                    <p className={`text-xs font-semibold truncate ${ui.text}`}>{user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}</p>
                    <p className={`text-xs truncate ${ui.sub}`}>{user.email}</p>
                  </div>
                  <Link href="/profile" onClick={() => setUserMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${ui.dropItem}`}>
                    👤 View Profile
                  </Link>
                  <Link href="/community" onClick={() => setUserMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${ui.dropItem}`}>
                    💬 Community
                  </Link>
                  <div className={`border-t ${dark ? 'border-[#2a2a2e]' : 'border-zinc-100'}`} />
                  <button onClick={handleSignOut}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors text-red-400 hover:bg-red-500/5`}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all">
              Sign in
            </button>
          )}
          <button onClick={onToggleDark}
            className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${ui.toggle}`}>
            {dark ? '☀' : '☾'}
          </button>
        </div>
      </nav>
    </>
  );
}
