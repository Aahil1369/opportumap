'use client';
import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'motion/react';
import { DUR } from './tokens';

// Counts from 0 to `value` when scrolled into view. Formats with thousands
// separators. Renders the final value immediately under reduced motion.
export default function CountUp({ value, duration = DUR.slow, className, suffix = '', prefix = '' }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -15% 0px' });
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce || !inView) return;
    let raf;
    const start = performance.now();
    const ms = duration * 1000;
    // easeOutExpo to match the shared EASE feel.
    const easeOut = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms);
      setDisplay(Math.round(easeOut(t) * value));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}{display.toLocaleString('en-US')}{suffix}
    </span>
  );
}
