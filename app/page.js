'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import EditorialHero from './components/ui/EditorialHero';
import TerminalPanel from './components/ui/TerminalPanel';
import SectionHead from './components/ui/SectionHead';
import Btn from './components/ui/Btn';
import Glyph from './components/ui/Glyph';
import Footnote from './components/ui/Footnote';
import MonoRow from './components/ui/MonoRow';
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

const TESTIMONIALS = [
  { quote: 'OpportuMap helped me land a role in Berlin I never would have found on LinkedIn. The visa tool saved me hours.', name: 'Priya S.',  role: 'Data Engineer',      move: 'IN → DE' },
  { quote: 'The AI resume matching is insane. It told me exactly which jobs fit my background.',                             name: 'Marcus W.', role: 'Software Engineer',  move: 'BR → NL' },
  { quote: 'I relocated from Lagos to Toronto using the relocation guide. Step-by-step, everything I needed.',               name: 'Amara O.',  role: 'ML Engineer',        move: 'NG → CA' },
];

const LIVE_JOBS = [
  { role: 'senior.engineer',   co: 'spotify',  loc: 'stockholm 🇸🇪', amt: '$120k' },
  { role: 'data.scientist',    co: 'deepmind', loc: 'london 🇬🇧',    amt: '$140k' },
  { role: 'product.manager',   co: 'grab',     loc: 'singapore 🇸🇬', amt: '$110k' },
  { role: 'ml.engineer',       co: 'deepl',    loc: 'berlin 🇩🇪',    amt: '$105k' },
  { role: 'frontend.engineer', co: 'klarna',   loc: 'stockholm 🇸🇪', amt: '$95k'  },
];

export default function Home() {
  useScrollReveal();
  const [profile, setProfile] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch('/api/user-profile')
      .then((r) => r.json())
      .then((d) => { if (d.profile?.nationality) setProfile(d.profile); })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  if (checking) return <div className="min-h-screen bg-paper-bg"><Navbar /></div>;
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

      <EditorialHero
        kicker={hero.kicker}
        title={hero.title}
        titleItalic={hero.italic}
        titleTail={hero.tail}
        sub={hero.sub}
        meta={['OPPORTUMAP · EST. 2026', 'V 0.4 · GROWING', 'DALLAS → THE WORLD']}
        cta={<Btn variant="primary" href="/jobs" magnetic>Browse jobs →</Btn>}
        secondaryCta={<Btn variant="secondary" href="/map">Spin the map</Btn>}
        rightPanel={
          <TerminalPanel label="// LIVE FEED · /JOBS" right="∞">
            {LIVE_JOBS.map((j, i) => (
              <MonoRow
                key={i}
                label={<><span>{j.role}</span><br /><span className="text-term-ink-sub text-[10px]">{j.co} · {j.loc}</span></>}
                meta="VISA ✓"
                value={j.amt}
                accent
              />
            ))}
          </TerminalPanel>
        }
      />

      <section className="max-w-[1280px] mx-auto px-6 sm:px-10 py-20 border-t border-paper-rule">
        <SectionHead
          number={1}
          kicker="TOOLS"
          title="Your global career toolkit."
          sub="Three career tools plus our visa & relocation sibling, Migrova."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 mt-14 border-t border-l border-paper-rule">
          {TOOLS.map((t) => {
            const Cmp = t.external ? 'a' : Link;
            const extra = t.external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
            return (
              <Cmp key={t.href} href={t.href} {...extra}
                className="tool-card-underline group block p-8 border-r border-b border-paper-rule bg-paper-bg hover:bg-paper-bg-alt transition-colors">
                <div className="text-paper-ink mb-6"><Glyph name={t.glyph} size={36} /></div>
                <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-2">№ {t.n} — {t.tag}</div>
                <div className="font-display text-[22px] leading-[1.15] mb-2">{t.name}</div>
                <div className="text-[13px] text-paper-ink-dim leading-[1.5]">{t.desc}</div>
              </Cmp>
            );
          })}
        </div>
      </section>

      <section className="max-w-[1280px] mx-auto px-6 sm:px-10 py-20 border-t border-paper-rule">
        <SectionHead number={2} kicker="HOW IT WORKS" title="Set up in two minutes." />
        <ol className="mt-14 grid grid-cols-1 md:grid-cols-4 gap-0 border-t border-l border-paper-rule">
          {HOW_IT_WORKS.map((s) => (
            <li key={s.n} className="p-8 border-r border-b border-paper-rule">
              <div className="font-display italic text-[32px] text-accent mb-3">№{s.n}</div>
              <div className="font-display text-[20px] mb-2">{s.title}</div>
              <div className="text-[13px] text-paper-ink-dim leading-[1.5]">{s.body}</div>
            </li>
          ))}
        </ol>
      </section>

      <section className="max-w-[1280px] mx-auto px-6 sm:px-10 py-20 border-t border-paper-rule">
        <SectionHead number={3} kicker="FIELD REPORTS" title="What readers have done." />
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-l border-paper-rule">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="p-8 border-r border-b border-paper-rule">
              <blockquote className="font-display text-[20px] leading-[1.35] text-paper-ink mb-6">&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="font-mono text-[11px] tracking-[0.08em] text-paper-ink-sub">
                {t.name.toUpperCase()} · {t.role.toUpperCase()} · {t.move}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="max-w-[1280px] mx-auto px-6 sm:px-10 py-28 border-t border-paper-rule">
        <div className="max-w-[780px]">
          <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-paper-ink-sub mb-6">§ 04 · BEGIN</div>
          <h2 className="font-display text-[48px] sm:text-[64px] leading-[1.02] tracking-[-0.015em] mb-8">
            60 seconds from here to <em className="italic text-accent">somewhere new</em>.
          </h2>
          <div className="flex flex-wrap gap-3">
            <Btn variant="primary" href="/jobs" magnetic>Browse jobs →</Btn>
            <Btn variant="ghost" href="/jobs">Browse jobs</Btn>
          </div>
          <Footnote>{FOOTNOTES.home}</Footnote>
        </div>
      </section>

      <footer className="border-t border-paper-rule px-6 sm:px-10 py-10 font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub flex flex-wrap justify-between gap-4 max-w-[1280px] mx-auto">
        <span>© OpportuMap 2026</span>
        <span>A sibling of <a href="https://migrova.netlify.app" className="hover:text-accent underline">Migrova</a></span>
        <span><Link href="/contact" className="hover:text-accent">Contact</Link> · <a href="https://migrova.netlify.app" className="hover:text-accent">Migrova</a></span>
      </footer>
    </div>
  );
}
