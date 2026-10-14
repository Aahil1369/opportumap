'use client';

// A signature moment plays once: on mount (the first frame after hydration) or the first time
// it scrolls into view. Children is a function of { play, reduced }: render the final state
// when `play` is false (that is also what the server sends), animate when it turns true. It
// turns true at most once and never under prefers-reduced-motion, where the final state simply
// stays. `onPlay` runs once, when `play` turns true (never under reduced motion).
//
//   <SignatureMoment playWhen="inView">
//     {({ play }) => <FlapBoard columns={…} rows={…} play={play} />}
//   </SignatureMoment>

import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from './useReducedMotion';

export default function SignatureMoment({
  children,
  playWhen = 'mount',
  onPlay,
  as: Tag = 'div',
  className,
  threshold = 0.3,
  rootMargin = '0px',
  ...rest
}) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef(null);
  const [played, setPlayed] = useState(false);
  const onPlayRef = useRef(onPlay);
  useEffect(() => {
    onPlayRef.current = onPlay;
  });

  useEffect(() => {
    if (reduced || played) return undefined;
    let live = true;
    const go = () => {
      if (!live) return;
      live = false;
      setPlayed(true);
      onPlayRef.current?.();
    };
    const el = ref.current;
    if (playWhen !== 'inView' || !el || typeof IntersectionObserver === 'undefined') {
      const id = requestAnimationFrame(go);
      return () => {
        live = false;
        cancelAnimationFrame(id);
      };
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          go();
        }
      },
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => {
      live = false;
      io.disconnect();
    };
  }, [reduced, played, playWhen, threshold, rootMargin]);

  const play = played && !reduced;
  return (
    <Tag ref={ref} className={className} {...rest}>
      {typeof children === 'function' ? children({ play, reduced }) : children}
    </Tag>
  );
}
