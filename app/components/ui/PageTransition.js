'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function PageTransition() {
  const pathname = usePathname();
  const [running, setRunning] = useState(false);
  useEffect(() => {
    setRunning(true);
    const t = setTimeout(() => setRunning(false), 260);
    return () => clearTimeout(t);
  }, [pathname]);
  return <div className={`page-transition-bar${running ? ' running' : ''}`} />;
}
