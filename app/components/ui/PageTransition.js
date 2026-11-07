'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

// The 2px sign-yellow bar along the top (globals.css .page-transition-bar): it grows on every
// route change and shrinks 260 ms later. The grow starts on the next frame and schedules the
// shrink itself, so the effect never sets state synchronously (react-hooks/set-state-in-effect)
// and a page opened in a background tab cannot leave the bar stuck open.
export default function PageTransition() {
  const pathname = usePathname();
  const [running, setRunning] = useState(false);
  useEffect(() => {
    let stop;
    const start = requestAnimationFrame(() => {
      setRunning(true);
      stop = setTimeout(() => setRunning(false), 260);
    });
    return () => {
      cancelAnimationFrame(start);
      clearTimeout(stop);
    };
  }, [pathname]);
  return <div className={`page-transition-bar${running ? ' running' : ''}`} />;
}
