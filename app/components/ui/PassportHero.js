'use client';
import Parallax from '../motion/Parallax';

// A coded (crisp, no-typo) visa stamp in the terracotta accent ink.
function VisaStamp({ className = '' }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden
      style={{ color: 'var(--accent)', fontFamily: 'var(--font-jb-mono), monospace' }}>
      <defs>
        <path id="stamp-top" d="M 28 100 A 72 72 0 0 1 172 100" />
        <path id="stamp-bottom" d="M 36 100 A 64 64 0 0 0 164 100" />
      </defs>
      <circle cx="100" cy="100" r="84" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.85" />
      <circle cx="100" cy="100" r="74" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.55" />
      <text fill="currentColor" fontSize="15" fontWeight="700" letterSpacing="3.5" opacity="0.9">
        <textPath href="#stamp-top" startOffset="50%" textAnchor="middle">OPPORTUMAP</textPath>
      </text>
      <text fill="currentColor" fontSize="10.5" letterSpacing="4" opacity="0.82">
        <textPath href="#stamp-bottom" startOffset="50%" textAnchor="middle">ENTRY · GRANTED</textPath>
      </text>
      {/* globe glyph */}
      <g stroke="currentColor" strokeWidth="2" fill="none" opacity="0.9">
        <circle cx="100" cy="94" r="21" />
        <ellipse cx="100" cy="94" rx="8" ry="21" />
        <line x1="79" y1="94" x2="121" y2="94" />
        <line x1="83" y1="82" x2="117" y2="82" />
        <line x1="83" y1="106" x2="117" y2="106" />
      </g>
      <text x="100" y="140" fill="currentColor" fontSize="10" letterSpacing="2.5" textAnchor="middle" opacity="0.82">EST · 2026</text>
    </svg>
  );
}

// Homepage hero: content is server-rendered + CSS-animated (instant open); the
// passport image parallaxes on scroll and a visa stamp thunks down over it.
export default function PassportHero({ kicker, title, titleItalic, titleTail, sub, cta, secondaryCta }) {
  return (
    <section className="relative">
      <div className="noise-overlay" aria-hidden />
      <div className="relative max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-16 items-center px-6 sm:px-10 py-16 sm:py-24">
        {/* Left — content (instant-visible, staggered CSS entrance) */}
        <div className="hero-anim">
          {kicker && (
            <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-paper-ink-sub mb-6 flex items-center gap-3">
              <span className="inline-block w-7 h-px bg-paper-ink-sub" />
              <span>{kicker}</span>
            </div>
          )}
          <h1 className="font-display text-[52px] sm:text-[72px] leading-[0.98] tracking-[-0.02em] font-normal text-paper-ink mb-6">
            {title}
            {titleItalic && <> <em className="italic text-accent">{titleItalic}</em> </>}
            {titleTail}
          </h1>
          {sub && <p className="text-[16px] sm:text-[17px] leading-[1.55] text-paper-ink-dim max-w-[52ch] mb-8">{sub}</p>}
          <div className="flex flex-wrap items-center gap-[10px]">{cta}{secondaryCta}</div>
          <div className="mt-10 pt-5 border-t border-paper-rule font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub flex flex-wrap gap-x-8 gap-y-2">
            <span>OPPORTUMAP · EST. 2026</span>
            <span>V 0.4 · GROWING</span>
            <span>DALLAS → THE WORLD</span>
          </div>
        </div>

        {/* Right — passport visual: parallax image + stamped visa */}
        <div className="relative">
          <Parallax speed={0.09}>
            <div className="relative overflow-hidden border border-paper-rule shadow-[0_40px_80px_-40px_rgba(29,41,32,0.55)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/passport-hero.webp"
                alt="An OpportuMap passport resting on an antique world map"
                width={1600}
                height={900}
                className="w-full h-auto block select-none"
                loading="eager"
              />
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-paper-bg/25 via-transparent to-transparent" />
            </div>
          </Parallax>
          <VisaStamp className="visa-stamp absolute -top-7 -right-3 sm:-right-6 w-[132px] sm:w-[176px] h-auto" />
        </div>
      </div>
    </section>
  );
}
