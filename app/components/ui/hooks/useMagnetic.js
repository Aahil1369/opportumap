'use client';
import { useEffect, useRef } from 'react';

export function useMagnetic({ radius = 80, strength = 5 } = {}) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let rafId;
    function onMove(e) {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > radius) {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => { el.style.transform = 'translate(0,0)'; });
        return;
      }
      const pull = (1 - dist / radius) * strength;
      const tx = (dx / dist) * pull;
      const ty = (dy / dist) * pull;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => { el.style.transform = `translate(${tx}px, ${ty}px)`; });
    }
    function onLeave() {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => { el.style.transform = 'translate(0,0)'; });
    }
    window.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(rafId);
    };
  }, [radius, strength]);
  return ref;
}
