'use client';

import Link from 'next/link';

const STAGE_DOTS = {
  'idea':       'bg-paper-ink-sub',
  'pre-seed':   'bg-[#5a7d3f]',
  'seed':       'bg-[#5a7d3f]',
  'series-a':   'bg-[#b5912f]',
  'series-b+':  'bg-accent',
};

function formatRaise(amount) {
  if (!amount) return null;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

export default function StartupCard({ startup, featured = false }) {
  const stageDot = STAGE_DOTS[startup.stage] || 'bg-paper-ink-sub';

  return (
    <Link href={`/startups/${startup.id}`}
      className="group block border border-paper-rule bg-paper-bg hover:bg-paper-bg-alt transition-colors p-5">
      {featured && (
        <div className="font-mono text-[9px] tracking-[0.12em] text-accent mb-2">// FEATURED</div>
      )}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-display text-[20px] leading-[1.15] text-paper-ink truncate">{startup.name}</h3>
          <p className="text-[13px] text-paper-ink-dim leading-[1.45] mt-1 line-clamp-2">{startup.tagline}</p>
        </div>
        <div className="font-mono text-[11px] text-accent shrink-0">
          ▲ {startup.upvote_count ?? 0}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub">
        <span className="inline-flex items-center gap-1.5 border border-paper-rule px-1.5 py-0.5">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${stageDot}`} />
          {startup.stage?.toUpperCase()}
        </span>
        <span className="border border-paper-rule px-1.5 py-0.5">{startup.sector?.toUpperCase()}</span>
        {startup.location && (
          <span className="border border-paper-rule px-1.5 py-0.5">{startup.location.toUpperCase()}</span>
        )}
        {startup.raise_amount && (
          <span className="border border-paper-rule px-1.5 py-0.5 text-accent">
            {formatRaise(startup.raise_amount)}{startup.equity_offered ? ` · ${startup.equity_offered}%` : ''}
          </span>
        )}
      </div>
    </Link>
  );
}
