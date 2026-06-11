'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Btn from './ui/Btn';
import Glyph from './ui/Glyph';
import SectionHead from './ui/SectionHead';
import TerminalPanel from './ui/TerminalPanel';
import MonoRow from './ui/MonoRow';
import Tag from './ui/Tag';
import Footnote from './ui/Footnote';
import { FOOTNOTES } from '../lib/pageCopy';

const NEXT_STEPS = [
  { glyph: 'compass',  title: 'New country match', body: 'Fresh visa data landed this week.',         href: '/match' },
  { glyph: 'passport', title: 'Visa report',       body: 'Generate or re-read for a target country.', href: '/visa' },
  { glyph: 'document', title: 'Resume grade',      body: 'Re-upload for a new 1–100 grade.',          href: '/resume' },
];

export default function Dashboard({ profile }) {
  const name = (profile?.first_name || profile?.name || 'there').split(' ')[0] || 'there';
  const countries = profile?.preferredCountries || [];

  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const country = countries[0] || '';
        const skills = Array.isArray(profile.skills)
          ? profile.skills[0] || ''
          : (profile.skills || '').split(',')[0] || '';
        const jobType = (profile.jobTypes || [])[0] || '';
        const query = skills || jobType;
        const q = query ? `&query=${encodeURIComponent(query.trim())}` : '';
        const res = await fetch(`/api/jobs?country=${encodeURIComponent(country)}${q}&sort=date`);
        const data = await res.json();
        setRecent((data.jobs || []).slice(0, 6));
      } catch {
        setRecent([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [profile]);

  return (
    <main className="max-w-[1280px] mx-auto px-6 sm:px-10 py-16">
      <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-paper-ink-sub mb-4">§ WELCOME BACK</div>
      <h1 className="font-display text-[56px] sm:text-[72px] leading-[0.98] tracking-[-0.02em] mb-6">
        Hello, <em className="italic text-accent">{name}</em>.
      </h1>
      <p className="text-[17px] text-paper-ink-dim max-w-[56ch] mb-8">
        Your profile is saved. Here’s what’s worth your time today.
      </p>
      <div className="flex flex-wrap gap-3 mb-10">
        <Btn variant="primary" href="/match" magnetic>Re-run country match</Btn>
        <Btn variant="secondary" href="/jobs">Browse fresh jobs</Btn>
        <Btn variant="ghost" href="/profile">Edit profile</Btn>
      </div>

      {countries.length > 0 && (
        <div className="mb-14 flex flex-wrap gap-2">
          {countries.map((c) => (
            <Link key={c} href="/visa" className="hover:opacity-80">
              <Tag variant="outline">{c}</Tag>
            </Link>
          ))}
        </div>
      )}

      <SectionHead number={1} kicker="TODAY" title="Worth your 10 minutes." className="mb-10" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-l border-paper-rule">
        {NEXT_STEPS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="tool-card-underline block p-8 border-r border-b border-paper-rule hover:bg-paper-bg-alt transition-colors"
          >
            <div className="mb-5 text-paper-ink"><Glyph name={c.glyph} size={32} /></div>
            <div className="font-display text-[22px] mb-2">{c.title}</div>
            <div className="text-[13px] text-paper-ink-dim leading-[1.5]">{c.body}</div>
          </Link>
        ))}
      </div>

      <div className="mt-16">
        <SectionHead number={2} kicker="LIVE FEED" title="Fresh jobs in your corridor." className="mb-10" />
        <TerminalPanel label={`// ROLES · ${countries[0]?.toUpperCase() || 'ALL'}`} right={loading ? '...' : `${recent.length}`}>
          {loading && <div className="font-mono text-[11px] text-term-ink-sub py-4">Loading…</div>}
          {!loading && recent.length === 0 && (
            <div className="font-mono text-[11px] text-term-ink-sub py-4">No fresh roles. Broaden your filters on <Link href="/jobs" className="text-accent hover:underline">/jobs</Link>.</div>
          )}
          {recent.map((job, i) => (
            <MonoRow
              key={i}
              href={job.url || job.redirect_url || '#'}
              label={<>
                <span>{(job.title || 'role').toLowerCase().replace(/\s+/g, '.')}</span>
                <br />
                <span className="text-term-ink-sub text-[10px]">
                  {(job.company?.display_name || job.company || 'company').toLowerCase()}
                  {' · '}
                  {(job.location?.display_name || job.location || '').toLowerCase()}
                </span>
              </>}
              value={job.salary_is_predicted || job.salary_min ? '$—' : ''}
              accent={false}
            />
          ))}
        </TerminalPanel>
      </div>

      <Footnote>{FOOTNOTES.profile}</Footnote>
    </main>
  );
}
