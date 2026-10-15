// Pieces shared by the night navbar (Navbar.js) and its phone drawer (NavDrawer.js).

import Link from 'next/link';
import { displayName } from '../../lib/displayName.js';

export const MIGROVA = 'https://migrova.netlify.app';

export const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sign';

/** The current page is `href` or below it (/startups/123 lights Startups). */
export const isHere = (pathname, href) => pathname === href || pathname?.startsWith(`${href}/`);

export function UserAvatar({ user, size = 'sm' }) {
  const name = displayName(user);
  const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const sz = size === 'lg' ? 'w-10 h-10 text-[13px]' : 'w-7 h-7 text-[11px]';
  if (avatar) return <img src={avatar} alt="" className={`${sz} rounded-[6px] object-cover`} />;
  return (
    <span aria-hidden="true" className={`${sz} rounded-[6px] bg-sign text-sign-ink flex items-center justify-center font-sans font-extrabold`}>
      {initials}
    </span>
  );
}

/** The letter chip of a gate sign; `lit` when the sign around it is the yellow plate. */
export function Chip({ gate, lit }) {
  if (!gate) return null;
  return (
    <span
      aria-hidden="true"
      className={`inline-grid place-items-center min-w-[22px] h-[22px] px-[5px] rounded-[4px] font-sans text-[12px] font-extrabold tracking-normal ${
        lit ? 'bg-sign-ink text-sign' : 'bg-hall-3 text-sign ring-1 ring-inset ring-rule'
      }`}
    >
      {gate}
    </span>
  );
}

export function Logo({ className = '', onClick }) {
  return (
    <Link href="/" onClick={onClick} className={`inline-flex items-center gap-2 font-sans text-[18px] font-extrabold tracking-[-0.01em] text-ink ${className}`}>
      <span aria-hidden="true" className="inline-block w-3 h-3 rounded-[3px] bg-sign" />
      opportumap
    </Link>
  );
}
