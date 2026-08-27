'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import PassportHero from './components/ui/PassportHero';
import SectionHead from './components/ui/SectionHead';
import Btn from './components/ui/Btn';
import Glyph from './components/ui/Glyph';
import Footnote from './components/ui/Footnote';
import Reveal from './components/motion/Reveal';
import Stagger from './components/motion/Stagger';
import StaggerItem from './components/motion/StaggerItem';
import CountUp from './components/motion/CountUp';
import { useScrollReveal } from './components/ui/hooks/useScrollReveal';
import { HERO_COPY, FOOTNOTES } from './lib/pageCopy';

const TOOLS = [
  { n: '01', tag: 'RSM', href: '/resume',       glyph: 'document',   name: 'Resume Grader',  desc: 'Brutally honest. Average is 35–55, not 75.' },
  { n: '02', tag: 'CVR', href: '/cover-letter', glyph: 'envelope',   name: 'Cover Letter',   desc: 'Paste the job, pick a tone. We draft.' },
  { n: '03', tag: 'INT', href: '/interview',    glyph: 'microphone', name: 'Interview Prep', desc: '15 tailored questions + AI mock interview.' },
  { n: '04', tag: 'MGV', href: 'https://migrova.netlify.app', external: true, glyph: 'globe-wire', name: 'Migrova ↗', desc: 'Moving abroad? Visas, relocation, legal guidance — our sibling app.' },
];

const HOW_IT_WORKS = [
  { n: '01', title: 'Tell us about you', body: 'Nationality, skills, where you want to go. 60 seconds.' },
  { n: '02', title: 'Get matched',       body: 'We surface the jobs that fit your skills and visa needs.' },
  { n: '03', title: 'Prepare',           body: 'Visa guides, resume grade, interview prep — all tailored.' },
  { n: '04', title: 'Go',                body: 'Apply with confidence. Real jobs, real visa paths.' },
];

const STATS = [
  { value: 100,   label: 'Countries mapped' },
  { value: 33664, label: 'Live roles', live: true },
  { value: 6,     label: 'Continents' },
];

const TESTIMONIALS = [
  { quote: 'OpportuMap helped me land a role in Berlin I never would have found on LinkedIn. The sponsorship signals saved me hours.', name: 'Priya S.',  role: 'Data Engineer',      move: 'IN → DE' },
  { quote: 'The AI resume matching is insane. It told me exactly which jobs fit my background.',                                       name: 'Marcus W.', role: 'Software Engineer',  move: 'BR → NL' },
  { quote: 'The resume grader was brutal — and right. Fixed what it flagged and started getting callbacks.',                           name: 'Amara O.',  role: 'ML Engineer',        move: 'NG → CA' },
];

export default function Home() {
  useScrollReveal();
  const [profile, setProfile] = useState(null);

  // Scroll-drawn connector line for the "how it works" row.
  const howRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress: howProgress } = useScroll({ target: howRef, offset: ['start 85%', 'end 60%'] });
  const lineScale = useTransform(howProgress, [0, 1], [0, 1]);

  useEffect(() => {
    fetch('/api/user-profile')
      .then((r) => r.json())
      .then((d) => { if (d.profile?.nationality) setProfile(d.profile); })
      .catch(() => {});
  }, []);

  // Render the marketing homepage immediately (server-rendered into the HTML so it
  // paints instantly). Swap to the personalized dashboard only if a profile loads.
  if (profile) return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />
      <Dashboard profile={profile} />
    </div>
  );

  const hero = HERO_COPY.home;

  return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />

      <PassportHero
        kicker={hero.kicker}
        title={hero.title}
        titleItalic={hero.italic}
        titleTail={hero.tail}
        sub={hero.sub}
        cta={<Btn variant="primary" href="/jobs" magnetic>Browse jobs →</Btn>}
        secondaryCta={<Btn variant="secondary" href="/map">Spin the map</Btn>}
      />

      <Reveal as="section" className="max-w-[1280px] mx-auto px-6 sm:px-10 py-12 border-t border-paper-rule">
        <div className="grid grid-cols-3 gap-6 sm:gap-10">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col">
              <div className="font-display text-[40px] sm:text-[56px] leading-none text-paper-ink tabular-nums flex items-center gap-3">
                <CountUp value={s.value} />
                {s.live && <span className="om-live-dot" aria-hidden />}
              </div>
              <div className="mt-3 font-mono text-[10px] tracking-[0.14em] uppercase text-paper-ink-sub">{s.label}</div>
            </div>
          ))}
        </div>
      </Reveal>

      <section className="max-w-[1280px] mx-auto px-6 sm:px-10 py-20 border-t border-paper-rule">
        <Reveal>
          <SectionHead
            number={1}
            kicker="TOOLS"
            title="Your global career toolkit."
            sub="Three career tools plus our visa & relocation sibling, Migrova."
          />
        </Reveal>
        <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 mt-14 border-t border-l border-paper-rule">
          {TOOLS.map((t) => {
            const Cmp = t.external ? 'a' : Link;
            const extra = t.external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
            return (
              <StaggerItem key={t.href} className="border-r border-b border-paper-rule">
                <Cmp href={t.href} {...extra}
                  className="tool-card-underline group block h-full p-8 bg-paper-bg hover:bg-paper-bg-alt hover:-translate-y-1 transition-[background-color,transform] duration-300 will-change-transform">
                  <div className="text-paper-ink mb-6"><Glyph name={t.glyph} size={36} /></div>
                  <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-2">№ {t.n} — {t.tag}</div>
                  <div className="font-display text-[22px] leading-[1.15] mb-2">{t.name}</div>
                  <div className="text-[13px] text-paper-ink-dim leading-[1.5]">{t.desc}</div>
                </Cmp>
              </StaggerItem>
            );
          })}
        </Stagger>
      </section>

      <section ref={howRef} className="max-w-[1280px] mx-auto px-6 sm:px-10 py-20 border-t border-paper-rule">
        <Reveal>
          <SectionHead number={2} kicker="HOW IT WORKS" title="Set up in two minutes." />
        </Reveal>
        <div className="relative mt-14">
          {!reduceMotion && (
            <motion.div
              aria-hidden
              className="absolute left-0 right-0 top-0 h-px bg-accent origin-left z-10"
              style={{ scaleX: lineScale }}
            />
          )}
          <Stagger as="ol" className="grid grid-cols-1 md:grid-cols-4 gap-0 border-t border-l border-paper-rule">
            {HOW_IT_WORKS.map((s) => (
              <StaggerItem as="li" key={s.n} className="p-8 border-r border-b border-paper-rule">
                <div className="font-display italic text-[32px] text-accent mb-3">№{s.n}</div>
                <div className="font-display text-[20px] mb-2">{s.title}</div>
                <div className="text-[13px] text-paper-ink-dim leading-[1.5]">{s.body}</div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="max-w-[1280px] mx-auto px-6 sm:px-10 py-20 border-t border-paper-rule">
        <Reveal>
          <SectionHead number={3} kicker="FIELD REPORTS" title="What readers have done." />
        </Reveal>
        <Stagger className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-l border-paper-rule">
          {TESTIMONIALS.map((t) => (
            <StaggerItem as="figure" key={t.name} className="p-8 border-r border-b border-paper-rule">
              <blockquote className="font-display text-[20px] leading-[1.35] text-paper-ink mb-6">&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="font-mono text-[11px] tracking-[0.08em] text-paper-ink-sub">
                {t.name.toUpperCase()} · {t.role.toUpperCase()} · {t.move}
              </figcaption>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="max-w-[1280px] mx-auto px-6 sm:px-10 py-28 border-t border-paper-rule">
        <Reveal className="max-w-[780px]">
          <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-paper-ink-sub mb-6">§ 04 · BEGIN</div>
          <h2 className="font-display text-[48px] sm:text-[64px] leading-[1.02] tracking-[-0.015em] mb-8">
            60 seconds from here to <em className="italic text-accent">somewhere new</em>.
          </h2>
          <div className="flex flex-wrap gap-3">
            <Btn variant="primary" href="/jobs" magnetic>Browse jobs →</Btn>
            <Btn variant="ghost" href="/jobs">Browse jobs</Btn>
          </div>
          <Footnote>{FOOTNOTES.home}</Footnote>
        </Reveal>
      </section>

      <footer className="border-t border-paper-rule px-6 sm:px-10 py-10 font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub flex flex-wrap justify-between gap-4 max-w-[1280px] mx-auto">
        <span>© OpportuMap 2026</span>
        <span>A sibling of <a href="https://migrova.netlify.app" target="_blank" rel="noopener noreferrer" className="hover:text-accent underline">Migrova</a></span>
        <span><Link href="/contact" className="hover:text-accent">Contact</Link> · <a href="https://migrova.netlify.app" target="_blank" rel="noopener noreferrer" className="hover:text-accent">Migrova</a></span>
      </footer>
    </div>
  );
}
