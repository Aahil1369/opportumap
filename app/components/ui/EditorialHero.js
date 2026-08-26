'use client';
import { useItalicReveal } from './hooks/useItalicReveal';
import Parallax from '../motion/Parallax';

// The entrance is CSS-driven (`.hero-anim` in globals.css) rather than framer, so
// the hero renders visible in the server HTML and animates via the stylesheet —
// it paints instantly instead of waiting for the JS bundle to hydrate. The right
// panel keeps a subtle scroll parallax (which never hides content).
export default function EditorialHero({
  kicker, title, titleItalic, titleTail, sub, meta = [],
  cta, secondaryCta, rightPanel, className = '', animate = true,
}) {
  const italicRef = useItalicReveal();
  const leftClass = animate ? 'hero-anim' : '';

  return (
    <section className={`relative ${className}`}>
      <div className="noise-overlay" aria-hidden />
      <div className="relative grid grid-cols-1 lg:grid-cols-[1.3fr_0.9fr] gap-10 lg:gap-14 items-end px-6 sm:px-10 py-14 sm:py-20">
        <div className={leftClass}>
          {kicker && (
            <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-paper-ink-sub mb-6 flex items-center gap-3">
              <span className="inline-block w-7 h-px bg-paper-ink-sub" />
              <span>{kicker}</span>
            </div>
          )}
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
          </h1>
          {sub && <p className="text-[16px] sm:text-[17px] leading-[1.55] text-paper-ink-dim max-w-[56ch] mb-8">{sub}</p>}
          <div className="flex flex-wrap items-center gap-[10px]">
            {cta}
            {secondaryCta}
          </div>
          {meta.length > 0 && (
            <div className="mt-10 pt-5 border-t border-paper-rule font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub flex flex-wrap gap-x-8 gap-y-2">
              {meta.map((m, i) => <span key={i}>{m}</span>)}
            </div>
          )}
        </div>
        {rightPanel && (
          animate
            ? <Parallax speed={0.08}>{rightPanel}</Parallax>
            : <div>{rightPanel}</div>
        )}
      </div>
    </section>
  );
}
