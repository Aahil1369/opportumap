'use client';
import { useEffect } from 'react';

// Reveals elements with the `.reveal` class (adds `.revealed`).
// - Elements already in/near the viewport are revealed immediately, so above-the-
//   fold content is NEVER left invisible waiting on an observer.
// - Elements below the fold are revealed as they scroll into view.
// - Dynamically-added `.reveal` content (async results, pagination) is picked up
//   via a MutationObserver.
export function useScrollReveal() {
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('revealed');
          io.unobserve(e.target);
        }
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    const process = () => {
      const vh = window.innerHeight || document.documentElement.clientHeight || 0;
      document.querySelectorAll('.reveal:not(.revealed)').forEach((el) => {
        const r = el.getBoundingClientRect();
        const inView = r.top < vh && r.bottom > 0;
        if (inView) {
          el.classList.add('revealed'); // visible now — reveal directly, no IO dependency
        } else {
          io.observe(el); // below the fold — reveal on scroll
        }
      });
    };

    // Defer one frame so the initial `.reveal` (opacity:0) state paints first and
    // the fade-in transition actually plays for above-the-fold content.
    const raf = requestAnimationFrame(process);
    const mo = new MutationObserver(() => process());
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      mo.disconnect();
    };
  }, []);
}
