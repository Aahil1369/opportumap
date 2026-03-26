'use client';

import Link from 'next/link';
import Navbar from './components/Navbar';
import { useTheme } from './hooks/useTheme';

const FEATURES = [
  {
    icon: '🗺️',
    title: 'Interactive Global Map',
    desc: 'Explore 1,500+ live jobs pinned across 21 countries on an interactive 3D globe.',
  },
  {
    icon: '🤖',
    title: 'AI Resume Matching',
    desc: 'Upload your resume and our AI extracts your skills to rank jobs by how well they match you.',
  },
  {
    icon: '🛂',
    title: 'Visa Intelligence',
    desc: 'Pin colors show your visa status for every country based on your nationality — instantly.',
  },
  {
    icon: '💰',
    title: 'Salary Prediction',
    desc: "When a job doesn't list salary, our AI estimates what it pays based on role, company, and location.",
  },
  {
    icon: '📄',
    title: 'Resume Parsing',
    desc: 'Claude AI scans your PDF resume to extract skills, experience level, and a professional summary.',
  },
  {
    icon: '✈️',
    title: 'Relocation Guide',
    desc: 'Got the job? Get a step-by-step relocation plan: housing, legal steps, work visa, and community.',
  },
];

const STATS = [
  { value: '1,500+', label: 'Live Jobs' },
  { value: '21', label: 'Countries' },
  { value: '30+', label: 'Nationalities' },
  { value: 'AI', label: 'Powered' },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Create your profile', desc: 'Tell us your nationality, experience, and what kind of role you want.' },
  { step: '02', title: 'Upload your resume', desc: 'AI extracts your skills and matches you to the most relevant opportunities.' },
  { step: '03', title: 'Explore & filter', desc: 'Browse the map or job list. Filter by country, sort by match score or salary.' },
  { step: '04', title: 'Apply with confidence', desc: 'See visa requirements, salary estimates, and relocation info before you apply.' },
];

export default function Home() {
  const { dark, toggleDark } = useTheme();

  const ui = {
    bg: dark ? 'bg-[#0e0e10]' : 'bg-[#f5f5f7]',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
    card: dark ? 'bg-[#1a1a1d] border-[#2a2a2e]' : 'bg-white border-zinc-200',
    divider: dark ? 'border-[#2a2a2e]' : 'border-zinc-200',
  };

  return (
    <div className={`min-h-screen ${ui.bg} transition-colors duration-300`}>
      <Navbar dark={dark} onToggleDark={toggleDark} />

      {/* Hero */}
      <section className="px-4 sm:px-8 pt-20 pb-16 sm:pt-28 sm:pb-24 max-w-5xl mx-auto text-center">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium mb-6 ${dark ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400' : 'border-indigo-200 bg-indigo-50 text-indigo-600'}`}>
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          AI-Powered Global Job Discovery
        </div>
        <h1 className={`text-4xl sm:text-6xl font-bold tracking-tight leading-tight mb-6 ${ui.text}`}>
          Find your next role{' '}
          <span className="text-indigo-500">anywhere in the world</span>
        </h1>
        <p className={`text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed ${ui.sub}`}>
          OpportuMap aggregates thousands of jobs across 21 countries, matches them to your resume with AI,
          and shows you visa requirements, salary estimates, and relocation guides — all in one place.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/jobs"
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-500/20">
            Browse Jobs
          </Link>
          <Link href="/map"
            className={`px-6 py-3 rounded-xl border font-semibold text-sm transition-all ${dark ? 'border-[#2a2a2e] text-zinc-300 hover:bg-[#1a1a1d]' : 'border-zinc-200 text-zinc-700 hover:bg-white'}`}>
            Explore Map
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className={`border-y ${ui.divider}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className={`text-3xl sm:text-4xl font-bold text-indigo-500 mb-1`}>{s.value}</p>
              <p className={`text-sm ${ui.sub}`}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-4 sm:px-8 py-16 sm:py-24 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className={`text-2xl sm:text-3xl font-bold mb-3 ${ui.text}`}>Everything you need to go global</h2>
          <p className={`text-sm sm:text-base ${ui.sub}`}>From discovery to relocation — OpportuMap has you covered.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className={`rounded-2xl border p-6 transition-all hover:border-indigo-500/40 ${ui.card}`}>
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className={`text-sm font-semibold mb-2 ${ui.text}`}>{f.title}</h3>
              <p className={`text-xs leading-relaxed ${ui.sub}`}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className={`border-t ${ui.divider} px-4 sm:px-8 py-16 sm:py-24`}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className={`text-2xl sm:text-3xl font-bold mb-3 ${ui.text}`}>How it works</h2>
            <p className={`text-sm sm:text-base ${ui.sub}`}>Set up in minutes, get matched instantly.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="text-center">
                <div className={`text-4xl font-bold text-indigo-500/20 mb-3`}>{step.step}</div>
                <h3 className={`text-sm font-semibold mb-2 ${ui.text}`}>{step.title}</h3>
                <p className={`text-xs leading-relaxed ${ui.sub}`}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={`border-t ${ui.divider} px-4 sm:px-8 py-16 sm:py-24`}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className={`text-2xl sm:text-3xl font-bold mb-4 ${ui.text}`}>Ready to explore global opportunities?</h2>
          <p className={`text-sm sm:text-base mb-8 ${ui.sub}`}>
            No account required. Start as a guest, upload your resume, and get matched in seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/jobs"
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-500/20">
              Get Started — It's Free
            </Link>
            <Link href="/contact"
              className={`px-6 py-3 rounded-xl border font-semibold text-sm transition-all ${dark ? 'border-[#2a2a2e] text-zinc-300 hover:bg-[#1a1a1d]' : 'border-zinc-200 text-zinc-700 hover:bg-white'}`}>
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`border-t ${ui.divider} px-4 sm:px-8 py-8`}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className={`text-sm font-semibold ${ui.text}`}>OpportuMap</span>
          </div>
          <div className="flex items-center gap-5">
            {[
              { href: '/', label: 'Home' },
              { href: '/jobs', label: 'Jobs' },
              { href: '/map', label: 'Map' },
              { href: '/contact', label: 'Contact' },
            ].map((l) => (
              <Link key={l.href} href={l.href} className={`text-xs hover:text-indigo-400 transition-colors ${ui.sub}`}>
                {l.label}
              </Link>
            ))}
          </div>
          <p className={`text-xs ${ui.sub}`}>© {new Date().getFullYear()} OpportuMap</p>
        </div>
      </footer>
    </div>
  );
}
