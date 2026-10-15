'use client';

// A homepage beat that plays once, when it scrolls into view. The server (and reduced motion)
// renders the final state; after hydration a beat still below the fold is "armed" (home.css moves
// it to where its motion starts), then plays when it comes into view. A beat already on screen
// at load just stays final, so nothing flashes. `seen` turns true the first time it is in view,
// under reduced motion too (beats that load data use it).
//
//   const { state, seen } = useBeat(ref)       state: null (final) | 'armed' | 'play'
//   <Beat as="section" className="gw">…</Beat>  data-beat={state} on the element

import { useEffect, useRef, useState } from 'react';

// In view = its top has passed 85% of the viewport's height (works for a beat of any height).
export function useBeat(ref, { rootMargin = '0px 0px -15% 0px' } = {}) {
  const [state, setState] = useState(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let first = true;
    let armed = false;
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (first) {
          first = false;
          const bottom = entry.rootBounds?.bottom ?? window.innerHeight * 0.85;
          if (!still && entry.boundingClientRect.top >= bottom) {
            armed = true;
            setState('armed');
          }
        }
        if (!entry.isIntersecting) return;
        io.disconnect();
        setSeen(true);
        if (armed) raf = requestAnimationFrame(() => setState('play'));
      },
      { rootMargin },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [ref, rootMargin]);

  return { state, seen };
}

export default function Beat({ as: Tag = 'section', children, ...rest }) {
  const ref = useRef(null);
  const { state } = useBeat(ref);
  return (
    <Tag ref={ref} data-beat={state ?? undefined} {...rest}>
      {children}
    </Tag>
  );
}
