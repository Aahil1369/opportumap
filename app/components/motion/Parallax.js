'use client';
import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';

// Translates its child on vertical scroll for depth. `speed` is the fraction of
// the element's travel to offset: positive drifts up as you scroll (moves faster),
// negative drifts down (moves slower). Keep small (0.05-0.25).
export default function Parallax({ children, speed = 0.15, className, ...rest }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [`${speed * 100}%`, `${-speed * 100}%`]);

  if (reduce) {
    return <div className={className} {...rest}>{children}</div>;
  }
  return (
    <motion.div ref={ref} className={className} style={{ y, willChange: 'transform' }} {...rest}>
      {children}
    </motion.div>
  );
}
