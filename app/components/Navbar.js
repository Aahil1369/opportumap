'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton, SignInButton, useUser } from '@clerk/nextjs';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/map', label: 'Map' },
  { href: '/community', label: 'Community' },
  { href: '/contact', label: 'Contact' },
];

export default function Navbar({ dark, onToggleDark }) {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useUser();

  const ui = {
    bg: dark ? 'bg-[#0e0e10]/90' : 'bg-[#f5f5f7]/90',
    border: dark ? 'border-[#2a2a2e]' : 'border-zinc-200',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
    toggle: dark ? 'bg-[#2a2a2e] text-zinc-300 hover:bg-[#333]' : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300',
    link: (active) => active
      ? 'text-indigo-400 font-semibold'
      : dark ? 'text-zinc-300 hover:text-zinc-100' : 'text-zinc-600 hover:text-zinc-900',
  };

  return (
    <nav className={`flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4 border-b ${ui.border} ${ui.bg} backdrop-blur-md sticky top-0 z-40`}>
      {/* Left: logo + links */}
      <div className="flex items-center gap-6 sm:gap-8">
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
        </div>
      </div>

      {/* Right: auth + theme */}
      <div className="flex items-center gap-2 sm:gap-3">
        {isLoaded && (
          isSignedIn ? (
            <UserButton afterSignOutUrl="/" />
          ) : (
            <SignInButton mode="modal">
              <button className="px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all">
                Sign in
              </button>
            </SignInButton>
          )
        )}
        <button onClick={onToggleDark}
          className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${ui.toggle}`}>
          {dark ? '☀' : '☾'}
        </button>
      </div>
    </nav>
  );
}
