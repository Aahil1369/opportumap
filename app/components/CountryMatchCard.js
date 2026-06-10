'use client';

import Link from 'next/link';

export default function CountryMatchCard({ match, rank }) {
  const difficultyDot = {
    'Easy': 'bg-[#5a7d3f]',
    'Moderate': 'bg-[#b5912f]',
    'Hard': 'bg-accent',
    'Very Hard': 'bg-[#a33417]',
  }[match.visa_difficulty] || 'bg-paper-ink-sub';

  const stats = [
    { label: 'VISA', value: match.visa_difficulty, dot: difficultyDot },
    { label: 'JOBS', value: match.job_availability },
    { label: 'COST', value: match.cost_of_living },
    { label: 'LANG', value: match.language_barrier },
  ];

  return (
    <div className="group border border-paper-rule bg-paper-bg hover:bg-paper-bg-alt transition-colors p-7">
      <div className="flex items-start justify-between mb-5">
        <div className="min-w-0">
          {rank != null && (
            <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-2">
              № {String(rank).padStart(2, '0')} — MATCH
            </div>
          )}
          <h3 className="font-display text-[26px] leading-[1.1] text-paper-ink">{match.country_name}</h3>
          <p className="text-[13px] text-paper-ink-dim leading-[1.5] mt-1 max-w-[52ch]">{match.top_reason}</p>
        </div>
        <div className="flex items-baseline gap-1 ml-5 shrink-0">
          <span className="font-display text-[40px] leading-none text-accent">{match.match_score}</span>
          <span className="font-mono text-[11px] text-paper-ink-sub">/100</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-paper-rule border border-paper-rule mb-5">
        {stats.map((s) => (
          <div key={s.label} className="bg-paper-bg px-3 py-3">
            <div className="font-mono text-[9px] tracking-[0.12em] text-paper-ink-sub mb-1.5">{s.label}</div>
            <div className="flex items-center gap-1.5">
              {s.dot && <span className={`inline-block w-1.5 h-1.5 rounded-full ${s.dot}`} />}
              <span className="text-[13px] font-medium text-paper-ink">{s.value}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[13px] text-paper-ink-dim leading-[1.5] mb-5">
        <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub mr-2">Visa path</span>
        {match.visa_path}
      </p>

      <div className="flex flex-wrap gap-2 font-mono text-[11px]">
        <Link href="/visa" className="px-3 py-1.5 bg-paper-ink text-paper-bg hover:bg-[#2a3a2f] transition-colors">Visa details →</Link>
        <Link href="/relocate" className="px-3 py-1.5 border border-paper-rule text-paper-ink hover:bg-paper-bg-alt transition-colors">Relocation</Link>
        <Link href="/jobs" className="px-3 py-1.5 border border-paper-rule text-paper-ink hover:bg-paper-bg-alt transition-colors">Jobs</Link>
      </div>
    </div>
  );
}
