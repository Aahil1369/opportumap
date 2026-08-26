'use client';
import { useEffect } from 'react';

// Reveals elements with the `.reveal` class as they scroll into view (adds
// `.revealed`). Also watches for elements added to the DOM later (async results,
// route content, etc.) via a MutationObserver, so dynamically-rendered `.reveal`
// blocks don't get stuck invisible.
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

    const observeAll = () => {
      document.querySelectorAll('.reveal:not(.revealed)').forEach((el) => io.observe(el));
    };
    observeAll();

    const mo = new MutationObserver(() => observeAll());
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
}
