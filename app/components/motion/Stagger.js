'use client';
import { motion, useReducedMotion } from 'motion/react';
import { STAGGER, VIEWPORT } from './tokens';

// Container that staggers the entrance of its <StaggerItem> children.
export default function Stagger({ children, as = 'div', gap = STAGGER, className, ...rest }) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as] || motion.div;
  if (reduce) {
    const Tag = as;
    return <Tag className={className} {...rest}>{children}</Tag>;
  }
  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
      variants={{ show: { transition: { staggerChildren: gap } } }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}
