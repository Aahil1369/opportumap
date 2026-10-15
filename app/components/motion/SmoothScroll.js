'use client';
import { useEffect } from 'react';
import Lenis from 'lenis';

// Momentum smooth scroll for the whole document. No-ops when the user prefers
// reduced motion. Renders nothing; it just drives window scrolling.
export default function SmoothScroll() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    let rafId;
    const raf = (time) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    // <html> is h-full, so it never changes size and Lenis's own observer on it never fires when
    // the page grows after load (a letter written, results shown). Its scroll limit would stay at
    // the first page height and clamp every wheel scroll there. The body grows with the page, so
    // re-measure when it does (sizes only: a smooth scroll in progress carries on).
    const grows = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => lenis.dimensions.resize());
    grows?.observe(document.body);

    return () => {
      grows?.disconnect();
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return null;
}
