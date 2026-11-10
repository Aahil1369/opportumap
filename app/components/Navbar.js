'use client';

// The night navbar, on every page: the hall-black bar, the logo, the places as gate signs (the
// current one lit as a full yellow sign), sign-in / the account menu. Below lg the places move to
// the drawer (NavDrawer.js, loaded on demand). Gate letters, spec §4: A Jobs · B Map ·
// C Security (Resume) · D Simulator (Interview) · E Hangar (Startups) · F Airmail (Cover letter)
// · Lounge (Community) · Itinerary (Saved) · Crew (Profile) · Passport Control → Migrova.
// Only transform moves (the caret, the progress bar).

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { displayName } from '../../lib/displayName.js';
import { isAdminUser } from '../../lib/admin.js';
import { saveProfile } from '../../lib/saveProfile.js';
import { keepHomeProfile } from './home/homeProfile';
import { Chip, FOCUS, isHere, Logo, MIGROVA, UserAvatar } from './navParts';

// Keep Supabase and these interaction-gated modals out of the initial bundle.
// supabase-js is ~67KB gzipped and was previously loaded on every page just to
// read auth state; deferring it to an idle import speeds up first load on slow
// connections (logged-out visitors never download it until they open AuthModal).
const AuthModal = dynamic(() => import('./AuthModal'), { ssr: false });
const ProfileModal = dynamic(() => import('./ProfileModal'), { ssr: false });
// The phone drawer only matters after a tap: it loads then (or on idle, on narrow screens).
const NavDrawer = dynamic(() => import('./NavDrawer'), { ssr: false });

const NAV_LINKS = [
  { href: '/jobs', gate: 'A', label: 'Jobs' },
  { href: '/map', gate: 'B', label: 'Map' },
  { href: '/startups', gate: 'E', label: 'Startups', place: 'Hangar' },
  { href: '/community', label: 'Community', place: 'Lounge' },
  { href: '/messages', label: 'Messages' },
];

const TOOL_LINKS = [
  { href: '/resume', gate: 'C', place: 'Security', label: 'Resume grader' },
  { href: '/interview', gate: 'D', place: 'Simulator', label: 'Interview prep' },
  { href: '/cover-letter', gate: 'F', place: 'Airmail', label: 'Cover letter' },
];

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
  const [drawerWanted, setDrawerWanted] = useState(false);
  const [toolsUsed, setToolsUsed] = useState(0);
  const toolsRef = useRef(null);
  const toolsButton = useRef(null);
  const userMenuRef = useRef(null);
  const userButton = useRef(null);
  const menuButton = useRef(null);
  const prevUserRef = useRef(null);
  const supabaseRef = useRef(null);

  useEffect(() => {
    let active = true;
    let subscription;
    (async () => {
      // Load supabase-js lazily so it stays out of the initial page bundle.
      const { createClient } = await import('../../lib/supabase-browser');
      const supabase = createClient();
      supabaseRef.current = supabase;

      const { data } = await supabase.auth.getUser();
      if (!active) return;
      setUser(data.user);
      prevUserRef.current = data.user;

      const sub = supabase.auth.onAuthStateChange(async (_e, session) => {
        const newUser = session?.user ?? null;
        const prevUser = prevUserRef.current;
        prevUserRef.current = newUser;
        setUser(newUser);
        if (newUser && !prevUser) {
          try {
            const res = await fetch('/api/user-profile');
            if (!res.ok) return;
            const { profile } = await res.json();
            if (!profile) {
              const name = newUser.user_metadata?.full_name || newUser.user_metadata?.name || '';
              setProfileSetupData({ name, nationality: '', currentCountry: '', experience: '', jobTypes: [], skills: '', preferredCountries: [] });
              setShowProfileSetup(true);
            }
          } catch {}
        }
      });
      subscription = sub.data.subscription;
    })();
    return () => { active = false; subscription?.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!user) { setToolsUsed(0); return; }
    fetch('/api/tool-usage').then((r) => r.ok ? r.json() : { count: 0 }).then((d) => setToolsUsed(d.count || 0)).catch(() => {});
  }, [user, pathname]);

  // The desktop menus close on a click outside, and on Esc (focus back to their button).
  useEffect(() => {
    if (!toolsOpen && !userMenuOpen) return undefined;
    const onDown = (e) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target)) setToolsOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (toolsOpen) { setToolsOpen(false); toolsButton.current?.focus(); }
      if (userMenuOpen) { setUserMenuOpen(false); userButton.current?.focus(); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [toolsOpen, userMenuOpen]);

  useEffect(() => { setMobileOpen(false); setToolsOpen(false); setUserMenuOpen(false); }, [pathname]);

  // Below lg the menu button is the way around: fetch the drawer while the page is idle, so the
  // first tap opens it at once.
  useEffect(() => {
    if (!window.matchMedia('(max-width: 1023.98px)').matches) return undefined;
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const id = idle(() => { import('./NavDrawer').catch(() => {}); });
    return () => cancel(id);
  }, []);

  const handleSignOut = async () => {
    await supabaseRef.current?.auth.signOut();
    setUserMenuOpen(false);
    setMobileOpen(false);
    router.push('/');
  };

  const closeDrawer = () => setMobileOpen(false);
  const userName = user ? displayName(user) : 'Account';
  const progress = Math.min(1, toolsUsed / TOOL_LINKS.length);
  const isToolActive = TOOL_LINKS.some((t) => isHere(pathname, t.href));
  const isAdmin = isAdminUser(user);

  const navLink = (l) => {
    const here = isHere(pathname, l.href);
    return (
      <Link
        key={l.href}
        href={l.href}
        aria-current={here ? 'page' : undefined}
        title={l.place ? `${l.place} · ${l.label}` : undefined}
        className={`inline-flex items-center gap-2 h-8 rounded-[6px] font-mono text-[12px] font-medium tracking-[0.12em] uppercase whitespace-nowrap ${FOCUS} ${
          l.gate ? 'pl-[5px] pr-2.5' : 'px-2.5'
        } ${here ? 'bg-sign text-sign-ink' : 'text-ink-dim hover:text-ink'}`}
      >
        <Chip gate={l.gate} lit={here} />
        {l.label}
      </Link>
    );
  };

  const menuItem = `flex items-center gap-3 w-full rounded-[6px] px-2.5 py-2 text-left font-sans text-[14px] text-ink hover:bg-hall-3 ${FOCUS}`;

  return (
    <>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />}
      {showProfileSetup && (
        <ProfileModal
          welcome
          initialProfile={profileSetupData}
          onClose={() => setShowProfileSetup(false)}
          onSave={(profile) => {
            // The account copy ({ profile }) and, if they ticked it, this device's (inside profile).
            keepHomeProfile(profile);
            saveProfile(profile, { signedIn: true });
            setShowProfileSetup(false);
          }}
        />
      )}

      {drawerWanted && (
        <NavDrawer
          open={mobileOpen}
          onClose={closeDrawer}
          pathname={pathname}
          user={user}
          userName={userName}
          isAdmin={isAdmin}
          onSignIn={() => { closeDrawer(); setShowAuth(true); }}
          onSignOut={handleSignOut}
          returnFocusRef={menuButton}
        />
      )}

      <header className="sticky top-0 z-30 bg-hall text-ink border-b border-rule">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-10 h-[60px] flex items-center justify-between gap-6">
          <Logo />

          <nav aria-label="Main" className="hidden lg:flex items-center gap-1.5">
            {NAV_LINKS.map(navLink)}
            <div className="relative" ref={toolsRef}>
              <button
                ref={toolsButton}
                type="button"
                aria-expanded={toolsOpen}
                aria-controls={toolsOpen ? 'nav-tools' : undefined}
                onClick={() => setToolsOpen((o) => !o)}
                className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[6px] font-mono text-[12px] font-medium tracking-[0.12em] uppercase ${FOCUS} ${
                  isToolActive ? 'bg-sign text-sign-ink' : 'text-ink-dim hover:text-ink'
                }`}
              >
                Tools
                <span aria-hidden="true" className={`inline-block transition-transform duration-200 motion-reduce:transition-none ${toolsOpen ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {toolsOpen && (
                <div id="nav-tools" className="absolute top-full right-0 mt-3 w-[300px] rounded-[10px] bg-hall-2 border border-rule p-2 shadow-[0_18px_48px_rgba(0,0,0,0.5)]">
                  {TOOL_LINKS.map((t) => {
                    const here = isHere(pathname, t.href);
                    return (
                      <Link key={t.href} href={t.href} onClick={() => setToolsOpen(false)} aria-current={here ? 'page' : undefined}
                        className={`${menuItem} ${here ? 'bg-hall-3' : ''}`}>
                        <Chip gate={t.gate} lit={false} />
                        <span className="font-mono text-[12px] font-medium tracking-[0.12em] uppercase text-sign">{t.place}</span>
                        <span className="ml-auto text-ink-dim">{t.label}</span>
                      </Link>
                    );
                  })}
                  <div className="my-1.5 h-px bg-rule" />
                  <a href={MIGROVA} target="_blank" rel="noopener noreferrer" onClick={() => setToolsOpen(false)} className={menuItem}>
                    <span aria-hidden="true" className="inline-grid place-items-center w-[22px]">🛂</span>
                    <span className="font-mono text-[12px] font-medium tracking-[0.12em] uppercase text-sign">Passport control</span>
                    <span className="ml-auto text-ink-dim">Migrova ↗</span>
                  </a>
                </div>
              )}
            </div>
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="relative hidden lg:block" ref={userMenuRef}>
                <button
                  ref={userButton}
                  type="button"
                  aria-expanded={userMenuOpen}
                  aria-controls={userMenuOpen ? 'nav-account' : undefined}
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className={`flex items-center gap-2 h-9 pl-1 pr-2.5 rounded-[6px] text-ink hover:bg-hall-3 font-mono text-[12px] font-medium tracking-[0.06em] ${FOCUS}`}
                >
                  <UserAvatar user={user} />
                  <span className="max-w-[120px] truncate">{userName}</span>
                </button>
                {userMenuOpen && (
                  <div id="nav-account" className="absolute right-0 top-full mt-3 w-[240px] rounded-[10px] bg-hall-2 border border-rule p-2 shadow-[0_18px_48px_rgba(0,0,0,0.5)]">
                    <div className="px-2.5 pt-1.5 pb-2.5 border-b border-rule mb-1.5">
                      <p className="font-sans text-[15px] font-semibold leading-tight text-ink truncate">{userName}</p>
                      <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-sub mt-1">Signed in</p>
                    </div>
                    <Link href="/profile" onClick={() => setUserMenuOpen(false)} className={menuItem}>
                      <span className="font-mono text-[12px] font-medium tracking-[0.12em] uppercase text-sign">Crew</span>
                      <span className="ml-auto text-ink-dim">Profile</span>
                    </Link>
                    <Link href="/saved" onClick={() => setUserMenuOpen(false)} className={menuItem}>
                      <span className="font-mono text-[12px] font-medium tracking-[0.12em] uppercase text-sign">Itinerary</span>
                      <span className="ml-auto text-ink-dim">Saved jobs</span>
                    </Link>
                    {isAdmin && (
                      <Link href="/admin" onClick={() => setUserMenuOpen(false)} className={menuItem}>
                        <span className="font-mono text-[12px] font-medium tracking-[0.12em] uppercase text-sign">Admin</span>
                      </Link>
                    )}
                    <div className="my-1.5 h-px bg-rule" />
                    <button type="button" onClick={handleSignOut} className={`${menuItem} text-ink-dim`}>Sign out</button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuth(true)}
                className={`inline-flex items-center h-9 px-3 rounded-[6px] font-mono text-[12px] font-medium tracking-[0.14em] uppercase text-ink ring-1 ring-inset ring-rule hover:ring-ink-sub ${FOCUS}`}
              >
                Sign in
              </button>
            )}
            <button
              ref={menuButton}
              type="button"
              aria-label="Open menu"
              aria-haspopup="dialog"
              aria-expanded={mobileOpen}
              onClick={() => { setDrawerWanted(true); setMobileOpen(true); }}
              className={`lg:hidden w-11 h-11 -mr-2 flex flex-col items-center justify-center gap-[5px] rounded-[6px] hover:bg-hall-3 ${FOCUS}`}
            >
              <span className="block w-[18px] h-[1.5px] bg-ink" />
              <span className="block w-[18px] h-[1.5px] bg-ink" />
              <span className="block w-[18px] h-[1.5px] bg-ink" />
            </button>
          </div>
        </div>

        {user && toolsUsed > 0 && (
          <div className="h-[2px] bg-rule overflow-hidden" aria-hidden="true">
            <div className="h-full w-full bg-sign origin-left transition-transform duration-300 motion-reduce:transition-none" style={{ transform: `scaleX(${progress})` }} />
          </div>
        )}
      </header>
    </>
  );
}
