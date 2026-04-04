'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import { useTheme } from '../../hooks/useTheme';
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
  const { dark, toggleDark } = useTheme();
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

  const bg = dark ? 'bg-[#080810]' : 'bg-[#f8f8fc]';
  const text = dark ? 'text-zinc-100' : 'text-zinc-900';
  const sub = dark ? 'text-zinc-400' : 'text-zinc-500';
  const card = dark ? 'bg-[#0e0e18] border-[#1e1e2e]' : 'bg-white border-zinc-200';
  const divider = dark ? 'border-[#1e1e2e]' : 'border-zinc-200';

  if (loading) return (
    <div className={`min-h-screen ${bg}`}>
      <Navbar dark={dark} onToggleDark={toggleDark} />
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  if (!startup) return (
    <div className={`min-h-screen ${bg}`}>
      <Navbar dark={dark} onToggleDark={toggleDark} />
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-3xl">🔍</p>
        <p className={`text-sm ${text}`}>Startup not found</p>
        <Link href="/startups" className="text-indigo-400 text-xs">← Back to startups</Link>
      </div>
    </div>
  );

  const emoji = SECTOR_EMOJIS[startup.sector] || '💡';
  const isOwner = user?.id === startup.user_id;

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      <Navbar dark={dark} onToggleDark={toggleDark} />

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
        <Link href="/startups" className={`text-xs mb-6 block ${sub} hover:text-indigo-400 transition-colors`}>← Back to startups</Link>

        <div className="flex gap-8 flex-col lg:flex-row">
          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* Header */}
            <div className="flex gap-4 items-start">
              <div className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center text-2xl ${dark ? 'bg-[#1a1a28] border border-[#2a2a3e]' : 'bg-indigo-50 border border-indigo-100'}`}>
                {emoji}
              </div>
              <div>
                <h1 className={`text-2xl font-black tracking-tight ${text}`}>{startup.name}</h1>
                <p className={`text-sm mt-1 ${sub}`}>{startup.tagline}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium ${dark ? 'bg-indigo-950 text-indigo-300 border-indigo-800' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>{startup.stage}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${dark ? 'bg-[#1a1a1a] text-zinc-500' : 'bg-zinc-100 text-zinc-500'}`}>{startup.sector}</span>
                  {startup.location && <span className={`text-xs px-2 py-0.5 rounded ${dark ? 'bg-[#1a1a1a] text-zinc-500' : 'bg-zinc-100 text-zinc-500'}`}>{startup.location}{startup.team_size ? ` · ${startup.team_size} people` : ''}</span>}
                </div>
              </div>
            </div>

            {/* About */}
            <div className={`rounded-xl border p-5 ${card}`}>
              <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${sub}`}>About</p>
              <p className={`text-sm leading-relaxed ${text}`}>{startup.description}</p>
            </div>

            {/* Pitch deck */}
            {startup.pitch_deck_url ? (
              <div className={`rounded-xl border p-5 ${card}`}>
                <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${sub}`}>Pitch Deck</p>
                {interested || isOwner ? (
                  <a href={startup.pitch_deck_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all w-fit">
                    📊 View Pitch Deck →
                  </a>
                ) : (
                  <div className={`text-center py-6 rounded-xl border-2 border-dashed ${dark ? 'border-[#2a2a3e]' : 'border-zinc-300'}`}>
                    <p className="text-2xl mb-2">🔒</p>
                    <p className={`text-xs ${sub}`}>Express interest to unlock the pitch deck</p>
                    <button onClick={handleInterest}
                      className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold">
                      Express Interest to Unlock
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Right panel */}
          <div className="lg:w-56 flex-shrink-0 space-y-3">
            {/* Funding info */}
            <div className={`rounded-xl border p-4 ${card}`}>
              {startup.raise_amount ? (
                <>
                  <p className="text-2xl font-black text-emerald-400">{formatRaise(startup.raise_amount)}</p>
                  <p className={`text-xs ${sub}`}>raising</p>
                  {startup.equity_offered && (
                    <>
                      <p className={`text-lg font-bold mt-3 ${text}`}>{startup.equity_offered}% equity</p>
                    </>
                  )}
                </>
              ) : (
                <p className={`text-xs ${sub}`}>Funding ask not disclosed</p>
              )}
              <button onClick={handleUpvote} disabled={upvoting || !user}
                className={`mt-3 w-full py-2 rounded-xl border text-sm font-semibold transition-all ${
                  upvoted
                    ? dark ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-indigo-600 border-indigo-600 text-white'
                    : dark ? 'border-[#2a2a3e] text-zinc-400 hover:border-indigo-500 hover:text-indigo-400' : 'border-zinc-300 text-zinc-500 hover:border-indigo-400'
                }`}>
                ▲ {upvoteCount} {upvoted ? 'Upvoted' : 'Upvote'}
              </button>
            </div>

            {/* Actions */}
            {!isOwner && (
              <>
                <Link href={`/messages?startup=${id}&with=${startup.user_id}`}
                  className="block w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold text-center transition-all">
                  💬 Message Founder
                </Link>
                <button onClick={handleInterest} disabled={interestLoading}
                  className={`w-full py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    interested
                      ? dark ? 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10' : 'border-indigo-300 text-indigo-600 bg-indigo-50'
                      : dark ? 'border-[#2a2a3e] text-zinc-400 hover:border-indigo-500' : 'border-zinc-300 text-zinc-500 hover:border-indigo-400'
                  }`}>
                  {interested ? '⭐ Interested' : '⭐ Express Interest'} {interestCount > 0 ? `· ${interestCount}` : ''}
                </button>
              </>
            )}
            {startup.website && (
              <a href={startup.website} target="_blank" rel="noopener noreferrer"
                className={`block w-full py-2.5 rounded-xl border text-sm font-semibold text-center transition-all ${dark ? 'border-[#2a2a3e] text-zinc-400 hover:border-zinc-600' : 'border-zinc-300 text-zinc-500 hover:border-zinc-400'}`}>
                🔗 Visit Website
              </a>
            )}
            <p className={`text-xs text-center ${sub}`}>
              Posted by {startup.user_name}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
