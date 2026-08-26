'use client';
import { useItalicReveal } from './hooks/useItalicReveal';
import { motion, useReducedMotion } from 'motion/react';
import { EASE, DUR, STAGGER } from '../motion/tokens';
import Parallax from '../motion/Parallax';

// Entrance choreography (used only when `animate` is true — homepage opts in;
// every other page renders the plain markup unchanged).
const container = { hidden: {}, show: { transition: { staggerChildren: STAGGER, delayChildren: 0.08 } } };
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE } },
};

export default function EditorialHero({
  kicker, title, titleItalic, titleTail, sub, meta = [],
  cta, secondaryCta, rightPanel, className = '', animate = true,
}) {
  const italicRef = useItalicReveal();
  const reduce = useReducedMotion();
  const on = animate && !reduce;

  // When animating, wrap each block in a motion item; otherwise return it plain
  // so non-animated consumers get byte-identical output.
  const wrap = (node, key) => (on ? <motion.div key={key} variants={item}>{node}</motion.div> : node);

  const kickerEl = kicker && wrap(
    <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-paper-ink-sub mb-6 flex items-center gap-3">
      <span className="inline-block w-7 h-px bg-paper-ink-sub" />
      <span>{kicker}</span>
    </div>, 'kicker');

  const titleEl = wrap(
    <h1 className="font-display text-[56px] sm:text-[72px] leading-[0.98] tracking-[-0.02em] font-normal text-paper-ink mb-6">
      {title}
      {titleItalic && (
        <>
          {' '}
          <em ref={italicRef} className="italic-draw italic text-accent font-display">{titleItalic}</em>
          {' '}
        </>
      )}
      {titleTail}
    </h1>, 'title');

  const subEl = sub && wrap(
    <p className="text-[16px] sm:text-[17px] leading-[1.55] text-paper-ink-dim max-w-[56ch] mb-8">{sub}</p>, 'sub');

  const ctaEl = wrap(
    <div className="flex flex-wrap items-center gap-[10px]">
      {cta}
      {secondaryCta}
    </div>, 'cta');

  const metaEl = meta.length > 0 && wrap(
    <div className="mt-10 pt-5 border-t border-paper-rule font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub flex flex-wrap gap-x-8 gap-y-2">
      {meta.map((m, i) => <span key={i}>{m}</span>)}
    </div>, 'meta');

  const Left = on ? motion.div : 'div';
  const leftProps = on ? { variants: container, initial: 'hidden', animate: 'show' } : {};

  return (
    <section className={`relative ${className}`}>
      <div className="noise-overlay" aria-hidden />
      <div className="relative grid grid-cols-1 lg:grid-cols-[1.3fr_0.9fr] gap-10 lg:gap-14 items-end px-6 sm:px-10 py-14 sm:py-20">
        <Left {...leftProps}>
          {kickerEl}
          {titleEl}
          {subEl}
          {ctaEl}
          {metaEl}
        </Left>
        {rightPanel && (
          on ? (
            <Parallax speed={0.1}>
              <motion.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DUR.slow, ease: EASE, delay: 0.35 }}
              >
                {rightPanel}
              </motion.div>
            </Parallax>
          ) : (
            <div>{rightPanel}</div>
          )
        )}
      </div>
    </section>
  );
}
