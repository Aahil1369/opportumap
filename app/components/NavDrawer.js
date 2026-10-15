'use client';

// The navbar's phone/tablet drawer (below lg): every place as a gate sign, in gate order, plus
// Passport Control → Migrova and the account. A Dialog: labelled "Site menu", focus starts on
// Close, Tab stays inside, Esc / the backdrop / any link closes it, focus returns to the menu
// button. Loaded on demand by Navbar.js, so it is not in any page's first-load JavaScript.

import Link from 'next/link';
import Dialog from './kit/Dialog';
import { Chip, FOCUS, isHere, Logo, MIGROVA, UserAvatar } from './navParts';

const DRAWER_LINKS = [
  { href: '/jobs', gate: 'A', label: 'Jobs' },
  { href: '/map', gate: 'B', label: 'Map' },
  { href: '/resume', gate: 'C', label: 'Security', sub: 'Resume grader' },
  { href: '/interview', gate: 'D', label: 'Simulator', sub: 'Interview prep' },
  { href: '/startups', gate: 'E', label: 'Hangar', sub: 'Startups' },
  { href: '/cover-letter', gate: 'F', label: 'Airmail', sub: 'Cover letter' },
  { href: '/community', label: 'Lounge', sub: 'Community' },
  { href: '/messages', label: 'Messages' },
];

const account = 'flex items-center min-h-[44px] px-3 rounded-[6px] ring-1 ring-inset ring-rule';

export default function NavDrawer({ open, onClose, pathname, user, userName, isAdmin, onSignIn, onSignOut, returnFocusRef }) {
  return (
    <Dialog open={open} onClose={onClose} label="Site menu" placement="right" returnFocusRef={returnFocusRef} className="flex flex-col">
      <div className="flex items-center justify-between gap-3 px-4 h-[60px] border-b border-rule flex-none">
        <Logo onClick={onClose} />
        <button
          type="button"
          data-autofocus
          onClick={onClose}
          className={`inline-flex items-center gap-2 h-10 px-3 rounded-[6px] font-mono text-[12px] font-medium tracking-[0.14em] text-ink-dim hover:text-ink ring-1 ring-inset ring-rule ${FOCUS}`}
        >
          CLOSE <span aria-hidden="true">✕</span>
        </button>
      </div>
      <nav aria-label="Places" className="flex-1 px-3 py-4">
        <p className="px-1 pb-3 font-mono text-[11px] font-medium tracking-[0.22em] text-sign">GATES</p>
        <ul className="space-y-1.5">
          {DRAWER_LINKS.map((l) => {
            const here = isHere(pathname, l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={onClose}
                  aria-current={here ? 'page' : undefined}
                  className={`flex items-center gap-3 min-h-[48px] rounded-[8px] pr-3 ${FOCUS} ${l.gate ? 'pl-2' : 'pl-3'} ${
                    here ? 'bg-sign text-sign-ink' : 'text-ink hover:bg-hall-3'
                  }`}
                >
                  <Chip gate={l.gate} lit={here} />
                  <span className="font-mono text-[15px] font-medium tracking-[0.1em] uppercase">{l.label}</span>
                  {l.sub && <span className={`ml-auto font-sans text-[16px] ${here ? 'text-sign-ink' : 'text-ink-sub'}`}>{l.sub}</span>}
                </Link>
              </li>
            );
          })}
          <li>
            <a
              href={MIGROVA}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-3 min-h-[48px] rounded-[8px] px-3 text-ink hover:bg-hall-3 ${FOCUS}`}
            >
              <span aria-hidden="true">🛂</span>
              <span className="font-mono text-[15px] font-medium tracking-[0.1em] uppercase">Passport control</span>
              <span className="ml-auto font-sans text-[16px] text-ink-sub">Migrova ↗</span>
            </a>
          </li>
        </ul>
      </nav>
      <div className="px-4 py-4 border-t border-rule flex-none">
        {user ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <UserAvatar user={user} size="lg" />
              <div className="min-w-0">
                <p className="font-sans text-[16px] font-semibold leading-tight text-ink truncate">{userName}</p>
                <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-sub">Signed in</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-[12px] font-medium tracking-[0.12em] uppercase">
              <Link href="/profile" onClick={onClose} className={`${account} text-ink`}>Crew · Profile</Link>
              <Link href="/saved" onClick={onClose} className={`${account} text-ink`}>Itinerary · Saved</Link>
              {isAdmin && (
                <Link href="/admin" onClick={onClose} className={`${account} text-sign`}>Admin</Link>
              )}
              <button type="button" onClick={onSignOut} className={`${account} text-ink-dim uppercase`}>Sign out</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={onSignIn} className="w-full min-h-[48px] rounded-[8px] bg-sign text-sign-ink font-sans text-[16px] font-bold">
            Sign in
          </button>
        )}
      </div>
    </Dialog>
  );
}
