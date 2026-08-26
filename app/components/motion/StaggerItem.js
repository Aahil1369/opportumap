'use client';
import { motion, useReducedMotion } from 'motion/react';
import { EASE, DUR, RISE } from './tokens';

// Child of <Stagger>. Rises/fades in when the parent triggers.
export default function StaggerItem({ children, as = 'div', y = RISE, className, ...rest }) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as] || motion.div;
  if (reduce) {
    const Tag = as;
    return <Tag className={className} {...rest}>{children}</Tag>;
  }
  return (
    <MotionTag
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE } },
      }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}
