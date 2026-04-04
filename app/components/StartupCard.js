'use client';

import Link from 'next/link';

const STAGE_COLORS = {
  'idea':       'bg-zinc-800 text-zinc-400 border-zinc-700',
  'pre-seed':   'bg-indigo-950 text-indigo-400 border-indigo-800',
  'seed':       'bg-indigo-950 text-indigo-300 border-indigo-700',
  'series-a':   'bg-violet-950 text-violet-300 border-violet-700',
  'series-b+':  'bg-purple-950 text-purple-300 border-purple-700',
};

const SECTOR_EMOJIS = {
  'AI': '🤖', 'Fintech': '💳', 'HealthTech': '🏥', 'CleanTech': '🌱',
  'SaaS': '☁️', 'EdTech': '📚', 'Other': '💡',
};

function formatRaise(amount) {
  if (!amount) return null;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

export default function StartupCard({ startup, featured = false, dark }) {
  const stageClass = STAGE_COLORS[startup.stage] || 'bg-zinc-800 text-zinc-400 border-zinc-700';
  const emoji = SECTOR_EMOJIS[startup.sector] || '💡';

  return (
    <Link href={`/startups/${startup.id}`}
      className={`block rounded-xl border p-4 transition-all hover:border-indigo-500/40 group ${
        featured
          ? dark ? 'bg-[#111118] border-indigo-500/30' : 'bg-white border-indigo-300'
          : dark ? 'bg-[#111118] border-[#1e1e2e]' : 'bg-white border-zinc-200'
      }`}>
      {featured && (
        <div className={`text-[10px] font-bold px-2 py-0.5 rounded mb-2 inline-block ${dark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
          ✦ FEATURED
        </div>
      )}
      <div className="flex gap-3 items-start">
        <div className={`w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center text-lg ${dark ? 'bg-[#1a1a28] border border-[#2a2a3e]' : 'bg-indigo-50 border border-indigo-100'}`}>
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={`text-sm font-bold truncate ${dark ? 'text-zinc-100' : 'text-zinc-900'}`}>{startup.name}</p>
              <p className={`text-xs mt-0.5 line-clamp-2 ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>{startup.tagline}</p>
            </div>
            <div className={`text-xs flex-shrink-0 font-semibold ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              ▲ {startup.upvote_count ?? 0}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${stageClass}`}>
              {startup.stage}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${dark ? 'bg-[#1a1a1a] text-zinc-500' : 'bg-zinc-100 text-zinc-500'}`}>
              {startup.sector}
            </span>
            {startup.location && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${dark ? 'bg-[#1a1a1a] text-zinc-500' : 'bg-zinc-100 text-zinc-500'}`}>
                {startup.location}
              </span>
            )}
            {startup.raise_amount && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${dark ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                {formatRaise(startup.raise_amount)}{startup.equity_offered ? ` · ${startup.equity_offered}%` : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
