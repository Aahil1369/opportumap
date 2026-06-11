'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '../../lib/supabase-browser';
import AuthModal from './AuthModal';
import ProfileModal from './ProfileModal';

const NAV_LINKS = [
  { href: '/jobs',      label: 'Jobs' },
  { href: '/map',       label: 'Map' },
  { href: '/startups',  label: 'Startups' },
  { href: '/community', label: 'Community' },
  { href: '/messages',  label: 'Messages' },
];

const TOOL_LINKS = [
  { href: '/match',        label: 'Country Match' },
  { href: '/visa',         label: 'Visa Intelligence' },
  { href: '/relocate',     label: 'Relocation Guide' },
  { href: '/resume',       label: 'Resume Grader' },
  { href: '/cover-letter', label: 'Cover Letter' },
  { href: '/interview',    label: 'Interview Prep' },
];

const ADMIN_EMAIL = 'aahilakbar567@gmail.com';

function UserAvatar({ user, size = 'sm' }) {
  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email || '?';
  const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const sz = size === 'lg' ? 'w-10 h-10 text-[12px]' : 'w-7 h-7 text-[10px]';
  if (avatar) return <img src={avatar} alt={name} className={`${sz} object-cover`} />;
  return (
    <div className={`${sz} bg-paper-ink text-paper-bg flex items-center justify-center font-mono tracking-[0.05em]`}>
      {initials}
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [profileSetupData, setProfileSetupData] = useState(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toolsUsed, setToolsUsed] = useState(0);
  const toolsRef = useRef(null);
  const userMenuRef = useRef(null);
  const prevUserRef = useRef(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      prevUserRef.current = data.user;
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const newUser = session?.user ?? null;
      const prevUser = prevUserRef.current;
      prevUserRef.current = newUser;
      setUser(newUser);
      if (newUser && !prevUser) {
        try {
          const res = await fetch('/api/user-profile');
          const { profile } = await res.json();
          if (!profile) {
            const name = newUser.user_metadata?.full_name || newUser.user_metadata?.name || '';
            setProfileSetupData({ name, nationality: '', currentCountry: '', experience: '', jobTypes: [], skills: '', preferredCountries: [] });
            setShowProfileSetup(true);
          }
        } catch {}
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setToolsUsed(0); return; }
    fetch('/api/tool-usage').then((r) => r.ok ? r.json() : { count: 0 }).then((d) => setToolsUsed(d.count || 0)).catch(() => {});
  }, [user, pathname]);

  useEffect(() => {
    const handler = (e) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target)) setToolsOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserMenuOpen(false);
    router.push('/');
  };

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Account';
  const progressPct = Math.min(100, (toolsUsed / TOOL_LINKS.length) * 100);
  const isToolActive = TOOL_LINKS.some((t) => pathname === t.href);
  const isAdmin = user?.email === ADMIN_EMAIL;

  return (
    <>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />}
      {showProfileSetup && (
        <ProfileModal
          initialProfile={profileSetupData}
          onClose={() => setShowProfileSetup(false)}
          onSave={async (profile, rememberOnDevice) => {
            try {
              await fetch('/api/user-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profile_data: profile }),
              });
            } catch {}
            if (rememberOnDevice) localStorage.setItem('opportumap_profile', JSON.stringify(profile));
            else localStorage.removeItem('opportumap_profile');
            setShowProfileSetup(false);
          }}
        />
      )}

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-paper-ink/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-0 right-0 h-full w-[280px] bg-paper-bg border-l border-paper-rule flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-paper-rule">
              <span className="font-display italic text-[22px] leading-none text-paper-ink">OpportuMap</span>
              <button onClick={() => setMobileOpen(false)} className="font-mono text-[12px] text-paper-ink-sub hover:text-accent">CLOSE</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5 font-mono text-[12px] tracking-[0.08em] uppercase text-paper-ink-dim space-y-1">
              {NAV_LINKS.map((l) => (
                <Link key={l.href} href={l.href} className={`block py-2 ${pathname === l.href ? 'text-accent' : 'hover:text-accent'}`}>{l.label}</Link>
              ))}
              <div className="pt-4 pb-1 text-[10px] text-paper-ink-sub tracking-[0.14em]">§ Tools</div>
              {TOOL_LINKS.map((l) => (
                <Link key={l.href} href={l.href} className={`block py-2 ${pathname === l.href ? 'text-accent' : 'hover:text-accent'}`}>{l.label}</Link>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-paper-rule">
              {user ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar user={user} size="lg" />
                    <div className="min-w-0">
                      <p className="font-display italic text-[16px] leading-tight text-paper-ink truncate">{userName}</p>
                      <p className="font-mono text-[10px] text-paper-ink-sub truncate">{user.email}</p>
                    </div>
                  </div>
                  <Link href="/profile" className="block font-mono text-[11px] tracking-[0.1em] uppercase text-paper-ink-dim hover:text-accent">Profile</Link>
                  {isAdmin && (
                    <Link href="/admin" className="block font-mono text-[11px] tracking-[0.1em] uppercase text-accent hover:opacity-80">Admin</Link>
                  )}
                  <button onClick={handleSignOut} className="block font-mono text-[11px] tracking-[0.1em] uppercase text-paper-ink-sub hover:text-accent">Sign out</button>
                </div>
              ) : (
                <button onClick={() => { setMobileOpen(false); setShowAuth(true); }}
                  className="w-full bg-paper-ink text-paper-bg font-sans text-[13px] font-medium tracking-[0.01em] px-[22px] py-3 hover:bg-[#2a3a2f] transition-colors">
                  Sign in
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="border-b border-paper-rule bg-paper-bg sticky top-0 z-30">
        <div className="max-w-[1280px] mx-auto px-6 sm:px-10 py-4 flex items-center justify-between gap-6">
          <Link href="/" className="font-display italic text-[24px] leading-none tracking-[-0.02em] text-paper-ink hover:text-accent transition-colors">
            OpportuMap
          </Link>

          <nav className="hidden md:flex items-center gap-7 font-mono text-[11px] tracking-[0.08em] uppercase text-paper-ink-dim">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href}
                className={`relative transition-colors ${pathname === l.href ? 'text-paper-ink' : 'hover:text-accent'}`}>
                {l.label}
                {pathname === l.href && <span className="absolute -bottom-[18px] left-0 right-0 h-px bg-accent" />}
              </Link>
            ))}
            <div className="relative" ref={toolsRef}>
              <button onClick={() => setToolsOpen(!toolsOpen)}
                className={`transition-colors ${isToolActive ? 'text-paper-ink' : 'hover:text-accent'}`}>
                Tools
              </button>
              {toolsOpen && (
                <div className="absolute top-full right-0 mt-3 w-[240px] bg-paper-bg-alt border border-paper-rule py-2 font-sans normal-case tracking-normal">
                  {TOOL_LINKS.map((t) => (
                    <Link key={t.href} href={t.href} onClick={() => setToolsOpen(false)}
                      className={`block px-4 py-2 text-[13px] transition-colors ${pathname === t.href ? 'text-accent' : 'text-paper-ink hover:bg-paper-bg'}`}>
                      {t.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span className="hidden lg:inline-block bg-paper-ink text-data px-[10px] py-[5px] tracking-[0.05em]">100 CTRY · 33,664 LIVE</span>
            {user ? (
              <div className="relative hidden md:block" ref={userMenuRef}>
                <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 text-paper-ink hover:text-accent transition-colors">
                  <UserAvatar user={user} />
                  <span className="max-w-[90px] truncate">{userName}</span>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-3 w-[220px] bg-paper-bg-alt border border-paper-rule">
                    <div className="px-4 py-3 border-b border-paper-rule">
                      <p className="font-display italic text-[15px] leading-tight text-paper-ink truncate">{userName}</p>
                      <p className="text-[10px] text-paper-ink-sub truncate mt-1">{user.email}</p>
                    </div>
                    <div className="py-1 font-sans normal-case tracking-normal">
                      <Link href="/profile" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-[13px] text-paper-ink hover:bg-paper-bg">Profile</Link>
                      <Link href="/saved" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-[13px] text-paper-ink hover:bg-paper-bg">Saved jobs</Link>
                      {isAdmin && (
                        <Link href="/admin" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-[13px] text-accent hover:bg-paper-bg">Admin</Link>
                      )}
                      <div className="my-1 h-px bg-paper-rule" />
                      <button onClick={handleSignOut} className="block w-full text-left px-4 py-2 text-[13px] text-paper-ink-sub hover:bg-paper-bg">Sign out</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => setShowAuth(true)} className="text-paper-ink hover:text-accent transition-colors">Sign in</button>
            )}
            <button onClick={() => setMobileOpen(true)}
              className="md:hidden w-8 h-8 flex flex-col items-center justify-center gap-1 hover:text-accent">
              <span className="block w-4 h-px bg-paper-ink" />
              <span className="block w-4 h-px bg-paper-ink" />
              <span className="block w-4 h-px bg-paper-ink" />
            </button>
          </div>
        </div>

        {user && toolsUsed > 0 && (
          <div className="h-[2px] bg-paper-rule">
            <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>
        )}
      </header>
    </>
  );
}
