'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import Btn from '../../components/ui/Btn';
import Footnote from '../../components/ui/Footnote';
import { FOOTNOTES } from '../../lib/pageCopy';
import { createClient } from '../../../lib/supabase-browser';

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

export default function StartupDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [startup, setStartup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [upvoted, setUpvoted] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(0);
  const [interested, setInterested] = useState(false);
  const [interestCount, setInterestCount] = useState(0);
  const [upvoting, setUpvoting] = useState(false);
  const [interestLoading, setInterestLoading] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    fetch(`/api/startups/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.startup) {
          setStartup(d.startup);
          setUpvoteCount(d.startup.upvote_count ?? 0);
          setInterestCount(d.startup.interest_count ?? 0);
        }
        setLoading(false);
      });
  }, [id]);

  const handleUpvote = async () => {
    if (!user) return;
    setUpvoting(true);
    const res = await fetch(`/api/startups/${id}/upvote`, { method: 'POST' });
    const data = await res.json();
    if (data.count !== undefined) { setUpvoted(data.upvoted); setUpvoteCount(data.count); }
    setUpvoting(false);
  };

  const handleInterest = async () => {
    if (!user) return;
    setInterestLoading(true);
    const res = await fetch(`/api/startups/${id}/interest`, { method: 'POST' });
    const data = await res.json();
    if (data.count !== undefined) { setInterested(data.interested); setInterestCount(data.count); }
    setInterestLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />
      <div className="flex items-center justify-center h-64">
        <div className="font-mono text-[11px] tracking-[0.12em] text-paper-ink-sub animate-pulse">
          LOADING STARTUP…
        </div>
      </div>
    </div>
  );

  if (!startup) return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub">// NOT FOUND</div>
        <p className="text-[14px] text-paper-ink-dim">Startup not found</p>
        <Link href="/startups" className="font-mono text-[11px] tracking-[0.1em] text-accent">← Back to startups</Link>
      </div>
    </div>
  );

  const emoji = SECTOR_EMOJIS[startup.sector] || '💡';
  const isOwner = user?.id === startup.user_id;

  const stats = [
    { label: 'STAGE', value: startup.stage },
    { label: 'SECTOR', value: startup.sector },
    startup.location ? { label: 'LOCATION', value: startup.location } : null,
    startup.team_size ? { label: 'TEAM', value: `${startup.team_size} people` } : null,
    startup.raise_amount ? { label: 'RAISING', value: formatRaise(startup.raise_amount), accent: true } : null,
    startup.equity_offered ? { label: 'EQUITY', value: `${startup.equity_offered}%` } : null,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />

      <section className="max-w-[1280px] mx-auto px-6 sm:px-10 py-14">
        <Link href="/startups" className="font-mono text-[11px] tracking-[0.1em] text-paper-ink-sub hover:text-accent transition-colors mb-6 inline-block">
          ← Back to startups
        </Link>
        <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-paper-ink-sub mb-3">
          § STARTUP · {startup.stage} {emoji}
        </div>
        <h1 className="font-display text-[48px] sm:text-[64px] leading-[1.02] text-paper-ink">{startup.name}</h1>
        {startup.tagline && (
          <p className="text-[15px] sm:text-[17px] text-paper-ink-dim leading-[1.5] mt-4 max-w-[68ch]">{startup.tagline}</p>
        )}
      </section>

      <main className="max-w-[1280px] mx-auto px-6 sm:px-10 pb-24 border-t border-paper-rule">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 py-14">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-10">
            {/* Stat grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-paper-rule border border-paper-rule">
              {stats.map((s) => (
                <div key={s.label} className="bg-paper-bg px-4 py-4">
                  <div className="font-mono text-[9px] tracking-[0.12em] text-paper-ink-sub mb-1.5">{s.label}</div>
                  <div className={`text-[14px] font-medium ${s.accent ? 'text-accent' : 'text-paper-ink'}`}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* About */}
            <div>
              <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-3">// ABOUT</div>
              <p className="text-[14px] sm:text-[15px] leading-[1.7] text-paper-ink-dim max-w-[68ch]">{startup.description}</p>
            </div>

            {/* Pitch deck */}
            {startup.pitch_deck_url ? (
              <div>
                <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-3">// PITCH DECK</div>
                {interested || isOwner ? (
                  <Btn as="a" href={startup.pitch_deck_url} target="_blank" rel="noopener noreferrer" variant="primary">
                    📊 View Pitch Deck →
                  </Btn>
                ) : (
                  <div className="border border-dashed border-paper-rule p-8 text-center max-w-[420px]">
                    <p className="text-[24px] mb-2">🔒</p>
                    <p className="text-[13px] text-paper-ink-sub mb-4">Express interest to unlock the pitch deck</p>
                    <Btn as="button" variant="secondary" onClick={handleInterest} disabled={interestLoading}>
                      Express Interest to Unlock
                    </Btn>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Right panel */}
          <div className="space-y-3">
            {/* Funding info */}
            <div className="border border-paper-rule p-5">
              {startup.raise_amount ? (
                <>
                  <p className="font-display text-[36px] leading-none text-accent">{formatRaise(startup.raise_amount)}</p>
                  <p className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mt-2">RAISING</p>
                  {startup.equity_offered && (
                    <p className="text-[15px] font-medium text-paper-ink mt-3">{startup.equity_offered}% equity</p>
                  )}
                </>
              ) : (
                <p className="text-[13px] text-paper-ink-sub">Funding ask not disclosed</p>
              )}
              <button
                onClick={handleUpvote}
                disabled={upvoting || !user}
                className={`mt-4 w-full py-2.5 font-mono text-[12px] tracking-[0.08em] transition-colors ${
                  upvoted
                    ? 'bg-paper-ink text-paper-bg'
                    : 'border border-paper-rule text-paper-ink hover:bg-paper-bg-alt'
                } disabled:opacity-50`}
              >
                ▲ <span className="text-accent">{upvoteCount}</span> {upvoted ? 'Upvoted' : 'Upvote'}
              </button>
            </div>

            {/* Actions */}
            {!isOwner && (
              <>
                <Btn
                  as="a"
                  href={`/messages?startup=${id}&with=${startup.user_id}`}
                  variant="primary"
                  className="w-full justify-center"
                >
                  💬 Message Founder
                </Btn>
                <button
                  onClick={handleInterest}
                  disabled={interestLoading}
                  className={`w-full py-2.5 font-mono text-[12px] tracking-[0.08em] transition-colors ${
                    interested
                      ? 'bg-paper-ink text-paper-bg'
                      : 'border border-paper-rule text-paper-ink hover:bg-paper-bg-alt'
                  } disabled:opacity-50`}
                >
                  {interested ? '⭐ Interested' : '⭐ Express Interest'} {interestCount > 0 ? <span className="text-accent">· {interestCount}</span> : ''}
                </button>
              </>
            )}
            {startup.website && (
              <a
                href={startup.website}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-2.5 border border-paper-rule text-paper-ink hover:bg-paper-bg-alt transition-colors text-center font-mono text-[12px] tracking-[0.08em]"
              >
                🔗 Visit Website
              </a>
            )}
            <p className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub text-center pt-2">
              Posted by {startup.user_name}
            </p>
          </div>
        </div>

        <Footnote>{FOOTNOTES.startups}</Footnote>
      </main>
    </div>
  );
}
