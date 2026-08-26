'use client';
import { motion, useReducedMotion } from 'motion/react';
import { EASE, DUR, RISE, VIEWPORT } from './tokens';

// Fades + rises its child into place when scrolled into view.
export default function Reveal({ children, as = 'div', delay = 0, y = RISE, className, ...rest }) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as] || motion.div;
  if (reduce) {
    const Tag = as;
    return <Tag className={className} {...rest}>{children}</Tag>;
  }
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: DUR.base, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}
