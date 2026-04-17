'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import { useTheme } from './hooks/useTheme';

const FEATURES = [
  { icon: '🌍', title: 'Country Match', desc: 'AI finds the top 5 countries where you have the best shot — based on your nationality, skills, and visa access.' },
  { icon: '🛂', title: 'Visa Intelligence', desc: 'Detailed visa requirements, approval probability, document checklists, and embassy tips for any destination.' },
  { icon: '📍', title: 'Global Job Map', desc: 'Interactive map showing real job openings across 100+ countries. Filter by visa sponsorship, remote, and more.' },
  { icon: '🏠', title: 'Relocation Guide', desc: 'Cost of living, neighborhoods, banking setup, cultural tips, and expat communities for your target country.' },
  { icon: '📄', title: 'Resume Analyzer', desc: 'Upload your resume for a brutally honest AI grade with section-by-section feedback and rewritten bullet points.' },
  { icon: '🎤', title: 'Interview Prep', desc: '15 tailored questions plus a mock interview mode where AI scores your answers and rewrites stronger versions.' },
];

const STATS = [
  { value: '33,664', label: 'Jobs Worldwide', suffix: '+' },
  { value: '100', label: 'Countries Covered', suffix: '+' },
  { value: 'Free', label: 'Visa Intelligence', suffix: '' },
  { value: 'AI', label: 'Country Matching', suffix: '' },
];

const HOW_IT_WORKS = [
  { step: '01', icon: '👤', title: 'Tell us about you', desc: 'Your nationality, skills, and where you want to go. Takes 60 seconds.' },
  { step: '02', icon: '🎯', title: 'Get matched', desc: 'AI finds countries where you have the best visa and job access.' },
  { step: '03', icon: '🛠️', title: 'Prepare', desc: 'Visa guides, interview prep, and resume analysis — all tailored to you.' },
  { step: '04', icon: '🚀', title: 'Go', desc: 'Apply with confidence. Real jobs, real visa paths, real relocation info.' },
];

const FLOAT_CARDS = [
  { role: 'Senior Engineer', company: 'Spotify', location: 'Stockholm 🇸🇪', salary: '$120k', match: 94 },
  { role: 'Data Scientist', company: 'DeepMind', location: 'London 🇬🇧', salary: '$140k', match: 88 },
  { role: 'Product Manager', company: 'Grab', location: 'Singapore 🇸🇬', salary: '$110k', match: 91 },
];

const TESTIMONIALS = [
  { quote: "OpportuMap helped me land a role in Berlin I never would have found on LinkedIn. The visa tool saved me hours of research.", name: 'Priya S.', role: 'Data Engineer', country: '🇮🇳 India → 🇩🇪 Germany' },
  { quote: "The AI resume matching is insane. It told me exactly which jobs fit my background and which ones to skip.", name: 'Marcus W.', role: 'Software Engineer', country: '🇧🇷 Brazil → 🇳🇱 Netherlands' },
  { quote: "I relocated from Lagos to Toronto using the relocation guide. Step-by-step, everything I needed was there.", name: 'Amara O.', role: 'ML Engineer', country: '🇳🇬 Nigeria → 🇨🇦 Canada' },
];

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('revealed'); observer.unobserve(e.target); }
      }),
      { threshold: 0.06, rootMargin: '0px 0px -32px 0px' }
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

export default function Home() {
  const { dark, toggleDark } = useTheme();
  useScrollReveal();

  const bg = dark ? 'bg-[#080810]' : 'bg-[#f8f8fc]';
  const text = dark ? 'text-zinc-100' : 'text-zinc-900';
  const sub = dark ? 'text-zinc-400' : 'text-zinc-500';
  const card = dark ? 'bg-[#12121a] border-[#1e1e2e]' : 'bg-white border-zinc-200';
  const divider = dark ? 'border-[#1e1e2e]' : 'border-zinc-200';

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300 overflow-x-hidden`}>
      <Navbar dark={dark} onToggleDark={toggleDark} />

      {/* ─── HERO ─── */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-4 sm:px-8 pt-16 pb-24 overflow-hidden">


        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: dark
            ? 'linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)'
            : 'linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-medium mb-8 animate-fade-scale"
            style={{ borderColor: 'rgba(99,102,241,0.35)', background: 'rgba(99,102,241,0.08)', color: '#818cf8' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
            Built by an immigrant, for the world
          </div>

          {/* Headline */}
          <h1 className={`text-5xl sm:text-7xl font-black tracking-tight leading-[1.05] mb-6 animate-fade-scale ${text}`}
            style={{ animationDelay: '0.1s' }}>
            Find opportunities you can<br />
            <span className="text-indigo-400">actually access</span>
          </h1>

          {/* Sub */}
          <p className={`text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-scale ${sub}`}
            style={{ animationDelay: '0.2s' }}>
            Jobs, visas, and relocation intel across 100 countries. Built for people from everywhere else.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-scale"
            style={{ animationDelay: '0.3s' }}>
            <Link href="/match"
              className="group px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95">
              Find Your Country Match →
            </Link>
            <Link href="/map"
              className={`px-8 py-3.5 rounded-2xl border font-semibold text-sm transition-all hover:scale-105 active:scale-95 ${dark ? 'border-[#2a2a3e] text-zinc-300 hover:bg-[#1a1a2e]' : 'border-zinc-300 text-zinc-700 hover:bg-white hover:shadow-md'}`}>
              Explore Map 🌍
            </Link>
          </div>

          {/* Floating job cards */}
          <div className="relative mt-16 h-48 hidden lg:block">
            {FLOAT_CARDS.map((c, i) => (
              <div key={i}
                className={`absolute rounded-2xl p-4 shadow-2xl w-56 ${dark ? 'glass-dark' : 'glass-light'} animate-float`}
                style={{
                  left: i === 0 ? '2%' : i === 1 ? '38%' : '68%',
                  top: i === 1 ? '-20px' : '10px',
                  animationDelay: `${i * 1.5}s`,
                  animationDuration: `${6 + i}s`,
                }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-sm">💼</div>
                  <div>
                    <p className={`text-xs font-bold ${text}`}>{c.role}</p>
                    <p className={`text-xs ${sub}`}>{c.company}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${sub}`}>{c.location}</span>
                  <span className="text-xs font-semibold text-green-400">{c.salary}</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="flex-1 h-1 rounded-full bg-indigo-500/20">
                    <div className="h-1 rounded-full bg-indigo-500" style={{ width: `${c.match}%` }} />
                  </div>
                  <span className="text-xs text-indigo-400 font-semibold">{c.match}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── STATS ─── */}
      <section className={`border-y ${divider} relative overflow-hidden`}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: dark ? 'rgba(99,102,241,0.03)' : 'rgba(99,102,241,0.02)' }} />
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {STATS.map((s, i) => (
            <div key={s.label} className={`reveal reveal-delay-${i + 1}`}>
              <p className="text-4xl sm:text-5xl font-black text-indigo-400 mb-1">{s.value}{s.suffix}</p>
              <p className={`text-sm font-medium ${sub}`}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── TOOLS STRIP ─── */}
      <section className={`border-b ${divider} px-4 sm:px-8 py-8`}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-1">AI Tools</p>
              <h2 className={`text-lg font-black ${text}`}>Your global career toolkit</h2>
            </div>
            <Link href="/match" className={`text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors hidden sm:block`}>Find your match →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { href: '/match', icon: '🎯', label: 'Country Match', desc: 'Find your best fit', color: 'from-indigo-500 to-violet-600', glow: 'group-hover:shadow-indigo-500/20' },
              { href: '/visa', icon: '🛂', label: 'Visa Intelligence', desc: 'Know your status fast', color: 'from-cyan-500 to-blue-600', glow: 'group-hover:shadow-cyan-500/20' },
              { href: '/relocate', icon: '✈️', label: 'Relocation Guide', desc: 'City-by-city plan', color: 'from-rose-500 to-pink-600', glow: 'group-hover:shadow-rose-500/20' },
              { href: '/resume', icon: '📄', label: 'Resume Analyzer', desc: 'Brutal honest AI grade', color: 'from-green-500 to-emerald-600', glow: 'group-hover:shadow-green-500/20' },
              { href: '/interview', icon: '🎤', label: 'Interview Prep', desc: 'AI mock interviews', color: 'from-emerald-500 to-teal-600', glow: 'group-hover:shadow-emerald-500/20' },
            ].map((tool) => (
              <Link key={tool.href} href={tool.href}
                className={`group relative rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${tool.glow} ${dark ? 'bg-[#0e0e18] border-[#1e1e2e] hover:border-indigo-500/30' : 'bg-white border-zinc-200 hover:border-indigo-200'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform duration-200 ${dark ? 'bg-[#1a1a28] border border-[#2a2a3e]' : 'bg-zinc-100 border border-zinc-200'}`}>
                  {tool.icon}
                </div>
                <p className={`text-xs font-bold mb-0.5 ${text}`}>{tool.label}</p>
                <p className={`text-[10px] leading-relaxed ${sub}`}>{tool.desc}</p>
                <div className="absolute bottom-3 right-3 text-indigo-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">→</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES — Bento Grid ─── */}
      <section className="px-4 sm:px-8 py-20 sm:py-28 max-w-6xl mx-auto">
        <div className="text-center mb-14 reveal">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-3">Features</p>
          <h2 className={`text-3xl sm:text-4xl font-black mb-4 ${text}`}>Everything to go global</h2>
          <p className={`text-base max-w-xl mx-auto ${sub}`}>From discovery to relocation — OpportuMap handles every step of your international career journey.</p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-auto">

          {/* Large card — spans 2 cols */}
          <div className={`reveal reveal-delay-1 lg:col-span-2 rounded-3xl border p-8 transition-all duration-200 hover:-translate-y-1 ${dark ? 'bg-[#0e0e18] border-[#1e1e2e]' : 'bg-white border-zinc-200 hover:shadow-md'} overflow-hidden`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-5 ${dark ? 'bg-[#1a1a28] border border-[#2a2a3e]' : 'bg-zinc-100 border border-zinc-200'}`}>{FEATURES[0].icon}</div>
            <h3 className={`text-xl font-black mb-3 ${text}`}>{FEATURES[0].title}</h3>
            <p className={`text-sm leading-relaxed max-w-md ${sub}`}>{FEATURES[0].desc}</p>
            <div className="mt-6 flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {['🇩🇪','🇯🇵','🇸🇬','🇨🇦','🇧🇷'].map((f,i) => (
                  <div key={i} className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm ${dark ? 'border-[#0e0e18] bg-[#1e1e2e]' : 'border-white bg-zinc-100'}`}>{f}</div>
                ))}
              </div>
              <span className={`text-xs ${sub}`}>100+ countries mapped</span>
            </div>
          </div>

          {/* Regular card */}
          <div className={`reveal reveal-delay-2 rounded-3xl border p-6 transition-all duration-200 hover:-translate-y-1 ${dark ? 'bg-[#0e0e18] border-[#1e1e2e]' : 'bg-white border-zinc-200 hover:shadow-md'}`}>
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl mb-4 ${dark ? 'bg-[#1a1a28] border border-[#2a2a3e]' : 'bg-zinc-100 border border-zinc-200'}`}>{FEATURES[1].icon}</div>
            <h3 className={`text-sm font-bold mb-2 ${text}`}>{FEATURES[1].title}</h3>
            <p className={`text-xs leading-relaxed ${sub}`}>{FEATURES[1].desc}</p>
          </div>

          {/* Regular card */}
          <div className={`reveal reveal-delay-3 rounded-3xl border p-6 transition-all duration-200 hover:-translate-y-1 ${dark ? 'bg-[#0e0e18] border-[#1e1e2e]' : 'bg-white border-zinc-200 hover:shadow-md'}`}>
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl mb-4 ${dark ? 'bg-[#1a1a28] border border-[#2a2a3e]' : 'bg-zinc-100 border border-zinc-200'}`}>{FEATURES[2].icon}</div>
            <h3 className={`text-sm font-bold mb-2 ${text}`}>{FEATURES[2].title}</h3>
            <p className={`text-xs leading-relaxed ${sub}`}>{FEATURES[2].desc}</p>
          </div>

          {/* Large card — spans 2 cols on the right */}
          <div className={`reveal reveal-delay-1 lg:col-span-2 rounded-3xl border p-8 transition-all duration-200 hover:-translate-y-1 ${dark ? 'bg-[#0e0e18] border-[#1e1e2e]' : 'bg-white border-zinc-200 hover:shadow-md'} overflow-hidden`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-5 ${dark ? 'bg-[#1a1a28] border border-[#2a2a3e]' : 'bg-zinc-100 border border-zinc-200'}`}>{FEATURES[3].icon}</div>
            <h3 className={`text-xl font-black mb-3 ${text}`}>{FEATURES[3].title}</h3>
            <p className={`text-sm leading-relaxed max-w-md ${sub}`}>{FEATURES[3].desc}</p>
            <div className="mt-6 flex items-center gap-3">
              {['Senior Engineer · $142k', 'Data Scientist · $118k', 'PM · $95k'].map((ex, i) => (
                <div key={i} className={`text-xs px-3 py-1.5 rounded-full border font-medium ${dark ? 'border-amber-500/20 bg-amber-500/8 text-amber-400' : 'border-amber-200 bg-amber-50 text-amber-600'}`}>{ex}</div>
              ))}
            </div>
          </div>

          {/* Regular card */}
          <div className={`reveal reveal-delay-2 rounded-3xl border p-6 transition-all duration-200 hover:-translate-y-1 ${dark ? 'bg-[#0e0e18] border-[#1e1e2e]' : 'bg-white border-zinc-200 hover:shadow-md'}`}>
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl mb-4 ${dark ? 'bg-[#1a1a28] border border-[#2a2a3e]' : 'bg-zinc-100 border border-zinc-200'}`}>{FEATURES[4].icon}</div>
            <h3 className={`text-sm font-bold mb-2 ${text}`}>{FEATURES[4].title}</h3>
            <p className={`text-xs leading-relaxed ${sub}`}>{FEATURES[4].desc}</p>
          </div>

          {/* Regular card */}
          <div className={`reveal reveal-delay-3 rounded-3xl border p-6 transition-all duration-200 hover:-translate-y-1 ${dark ? 'bg-[#0e0e18] border-[#1e1e2e]' : 'bg-white border-zinc-200 hover:shadow-md'}`}>
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl mb-4 ${dark ? 'bg-[#1a1a28] border border-[#2a2a3e]' : 'bg-zinc-100 border border-zinc-200'}`}>{FEATURES[5].icon}</div>
            <h3 className={`text-sm font-bold mb-2 ${text}`}>{FEATURES[5].title}</h3>
            <p className={`text-xs leading-relaxed ${sub}`}>{FEATURES[5].desc}</p>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className={`border-t ${divider} px-4 sm:px-8 py-20 sm:py-28`}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-3">How It Works</p>
            <h2 className={`text-3xl sm:text-4xl font-black mb-4 ${text}`}>Set up in 2 minutes</h2>
            <p className={`text-base ${sub}`}>No credit card. No setup fee. Start finding global jobs immediately.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Connecting line */}
            <div className="absolute top-8 left-[12%] right-[12%] h-px hidden lg:block"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.4), rgba(167,139,250,0.4), transparent)' }} />
            {HOW_IT_WORKS.map((s, i) => (
              <div key={s.step} className={`reveal reveal-delay-${i + 1} text-center relative`}>
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 ${dark ? 'bg-[#1a1a28] border border-[#2a2a3e]' : 'bg-zinc-100 border border-zinc-200'}`}>
                  {s.icon}
                </div>
                <span className="text-xs font-bold text-indigo-400 tracking-widest">{s.step}</span>
                <h3 className={`text-sm font-bold mt-1 mb-2 ${text}`}>{s.title}</h3>
                <p className={`text-xs leading-relaxed ${sub}`}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className={`border-t ${divider} px-4 sm:px-8 py-20 sm:py-28`}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-3">Community</p>
            <h2 className={`text-3xl sm:text-4xl font-black mb-4 ${text}`}>Real people, real moves</h2>
            <p className={`text-base ${sub}`}>Join thousands discovering global opportunities with OpportuMap.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div key={i}
                className={`reveal reveal-delay-${i + 1} rounded-2xl border p-6 transition-all hover:-translate-y-1 ${dark ? 'bg-[#0e0e18] border-[#1e1e2e] hover:border-indigo-500/30' : 'bg-white border-zinc-200 hover:border-indigo-300 hover:shadow-lg'}`}>
                <div className="flex gap-0.5 mb-4">
                  {[1,2,3,4,5].map((s) => <span key={s} className="text-amber-400 text-sm">★</span>)}
                </div>
                <p className={`text-sm leading-relaxed mb-5 ${sub}`}>&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${dark ? 'bg-[#1a1a28] border border-[#2a2a3e] text-indigo-400' : 'bg-indigo-100 border border-indigo-200 text-indigo-600'}`}>
                    {t.name.split(' ').map((w) => w[0]).join('')}
                  </div>
                  <div>
                    <p className={`text-xs font-semibold ${text}`}>{t.name} · {t.role}</p>
                    <p className={`text-xs ${sub}`}>{t.country}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TOOLS SHOWCASE ─── */}
      <section className={`border-t ${divider} px-4 sm:px-8 py-20 sm:py-28`}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-3">AI Tools</p>
            <h2 className={`text-3xl sm:text-4xl font-black mb-4 ${text}`}>Powerful tools at your fingertips</h2>
            <p className={`text-base max-w-xl mx-auto ${sub}`}>Five AI-powered tools to take you from application to relocation.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { href: '/resume', icon: '📄', label: 'Resume Analyzer', desc: 'Brutally honest AI grade with red flags, clichés detected, and bullet rewrites.', color: 'from-green-500 to-emerald-600' },
              { href: '/cover-letter', icon: '✉️', label: 'Cover Letter Generator', desc: 'Paste a job description and get a tailored cover letter in seconds.', color: 'from-violet-500 to-purple-600' },
              { href: '/interview', icon: '🎤', label: 'Interview Prep', desc: '15 tailored questions + AI mock interview that grades your actual answers.', color: 'from-emerald-500 to-teal-600' },
              { href: '/visa', icon: '🛂', label: 'Visa Intelligence', desc: 'Full visa report: document checklist, timeline, financial requirements, and approval tips.', color: 'from-cyan-500 to-blue-600' },
              { href: '/relocate', icon: '✈️', label: 'Relocation Guide', desc: 'Cost breakdown, safety info, banking, SIM, emergency numbers, and cultural tips.', color: 'from-rose-500 to-pink-600' },
            ].map((tool, i) => (
              <Link key={tool.href} href={tool.href}
                className={`reveal reveal-delay-${(i % 3) + 1} group block rounded-2xl border p-6 transition-all hover:-translate-y-1 hover:shadow-xl ${dark ? 'bg-[#0e0e18] border-[#1e1e2e] hover:border-indigo-500/30 hover:shadow-indigo-500/10' : 'bg-white border-zinc-200 hover:border-indigo-300 hover:shadow-indigo-500/10'}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform ${dark ? 'bg-[#1a1a28] border border-[#2a2a3e]' : 'bg-zinc-100 border border-zinc-200'}`}>
                  {tool.icon}
                </div>
                <h3 className={`text-sm font-bold mb-1 ${text}`}>{tool.label}</h3>
                <p className={`text-xs leading-relaxed ${sub}`}>{tool.desc}</p>
                <div className="mt-4 text-indigo-400 text-xs font-semibold group-hover:translate-x-1 transition-transform inline-block">Try it →</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="px-4 sm:px-8 py-20 sm:py-28">
        <div className="max-w-3xl mx-auto reveal">
          <div className="relative rounded-3xl overflow-hidden p-10 sm:p-16 text-center"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #0891b2 100%)' }}>
            {/* Noise texture overlay */}
            <div className="absolute inset-0 opacity-[0.15]"
              style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />
            <div className="relative z-10">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200 mb-4">Start for free</p>
              <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 leading-tight">
                Opportunity shouldn&apos;t depend on your passport
              </h2>
              <p className="text-indigo-100 text-base mb-8 max-w-md mx-auto">
                Join thousands of people using OpportuMap to find jobs, visas, and new homes across 100+ countries.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/match"
                  className="px-8 py-3.5 rounded-2xl bg-white text-indigo-700 font-bold text-sm hover:bg-indigo-50 transition-all hover:scale-105 shadow-xl">
                  Find Your Match — It&apos;s Free
                </Link>
                <Link href="/map"
                  className="px-8 py-3.5 rounded-2xl border border-white/30 text-white font-semibold text-sm hover:bg-white/10 transition-all hover:scale-105">
                  Explore the Map
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className={`border-t ${divider} px-4 sm:px-8 py-10`}>
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className={`text-sm font-bold ${text}`}>OpportuMap</span>
              </div>
              <p className={`text-xs leading-relaxed ${sub}`}>Global opportunities for people from everywhere.</p>
            </div>
            <div>
              <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${sub}`}>Discover</p>
              <div className="space-y-2">
                {[{ href: '/jobs', l: 'Browse Jobs' }, { href: '/map', l: 'Global Map' }, { href: '/community', l: 'Community' }].map((i) => (
                  <Link key={i.href} href={i.href} className={`block text-xs hover:text-indigo-400 transition-colors ${sub}`}>{i.l}</Link>
                ))}
              </div>
            </div>
            <div>
              <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${sub}`}>Tools</p>
              <div className="space-y-2">
                {[{ href: '/resume', l: 'Resume Analyzer' }, { href: '/visa', l: 'Visa Intelligence' }, { href: '/relocate', l: 'Relocation Guide' }].map((i) => (
                  <Link key={i.href} href={i.href} className={`block text-xs hover:text-indigo-400 transition-colors ${sub}`}>{i.l}</Link>
                ))}
              </div>
            </div>
            <div>
              <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${sub}`}>Company</p>
              <div className="space-y-2">
                {[{ href: '/contact', l: 'Contact' }, { href: '/profile', l: 'My Profile' }].map((i) => (
                  <Link key={i.href} href={i.href} className={`block text-xs hover:text-indigo-400 transition-colors ${sub}`}>{i.l}</Link>
                ))}
              </div>
            </div>
          </div>
          <div className={`border-t ${divider} pt-6 flex flex-col sm:flex-row items-center justify-between gap-2`}>
            <p className={`text-xs ${sub}`}>© {new Date().getFullYear()} OpportuMap · Built with AI for global job seekers</p>
            <p className={`text-xs ${sub}`}>33,664 jobs · 100 countries · Built by an immigrant</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
