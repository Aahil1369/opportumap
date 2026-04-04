'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import StartupCard from '../components/StartupCard';
import StartupModal from '../components/StartupModal';
import { useTheme } from '../hooks/useTheme';
import { createClient } from '../../lib/supabase-browser';

const STAGES = ['idea', 'pre-seed', 'seed', 'series-a', 'series-b+'];
const SECTORS = ['AI', 'Fintech', 'HealthTech', 'CleanTech', 'SaaS', 'EdTech', 'Other'];

const SECTOR_COUNTS = { 'AI': 0, 'Fintech': 0, 'HealthTech': 0, 'CleanTech': 0, 'SaaS': 0, 'EdTech': 0, 'Other': 0 };

export default function StartupsPage() {
  const { dark, toggleDark } = useTheme();
  const [startups, setStartups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState('');
  const [sector, setSector] = useState('');
  const [sort, setSort] = useState('newest');
  const [showModal, setShowModal] = useState(false);
  const [user, setUser] = useState(null);
  const [sectorCounts, setSectorCounts] = useState(SECTOR_COUNTS);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (stage) params.set('stage', stage);
    if (sector) params.set('sector', sector);
    params.set('sort', sort);
    fetch(`/api/startups?${params}`)
      .then((r) => r.json())
      .then((d) => {
        const list = d.startups ?? [];
        setStartups(list);
        // compute sector counts
        const counts = { ...SECTOR_COUNTS };
        list.forEach((s) => { if (counts[s.sector] !== undefined) counts[s.sector]++; });
        setSectorCounts(counts);
        setLoading(false);
      });
  }, [stage, sector, sort]);

  const bg = dark ? 'bg-[#080810]' : 'bg-[#f8f8fc]';
  const text = dark ? 'text-zinc-100' : 'text-zinc-900';
  const sub = dark ? 'text-zinc-400' : 'text-zinc-500';
  const card = dark ? 'bg-[#0e0e18] border-[#1e1e2e]' : 'bg-white border-zinc-200';
  const divider = dark ? 'border-[#1e1e2e]' : 'border-zinc-200';
  const pillBase = 'text-xs px-3 py-1 rounded-full border transition-all cursor-pointer';
  const pillActive = 'bg-indigo-600 text-white border-indigo-600';
  const pillInactive = dark ? 'border-[#2a2a3e] text-zinc-400 hover:border-indigo-500' : 'border-zinc-300 text-zinc-500 hover:border-indigo-400';

  const totalRaise = startups.reduce((s, x) => s + (x.raise_amount || 0), 0);
  const formatRaise = (n) => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(1)}M` : `$${(n/1_000).toFixed(0)}K`;

  const featured = startups.find((s) => s.upvote_count > 0) || startups[0];

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      <Navbar dark={dark} onToggleDark={toggleDark} />
      {showModal && <StartupModal dark={dark} onClose={() => setShowModal(false)} onSuccess={(s) => setStartups((prev) => [s, ...prev])} />}

      {/* Header */}
      <div className={`border-b ${divider}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-2">Startup Discovery</p>
              <h1 className={`text-3xl font-black tracking-tight ${text}`}>Find your next investment.</h1>
              <p className={`text-sm mt-1 ${sub}`}>{startups.length} startups seeking funding · updated daily</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowModal(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all">
                + Post Startup
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mt-5">
            <button onClick={() => setSort(sort === 'trending' ? 'newest' : 'trending')}
              className={`${pillBase} ${sort === 'trending' ? pillActive : pillInactive}`}>
              🔥 Trending
            </button>
            {STAGES.map((s) => (
              <button key={s} onClick={() => setStage(stage === s ? '' : s)}
                className={`${pillBase} ${stage === s ? pillActive : pillInactive}`}>{s}</button>
            ))}
            <div className={`w-px h-5 self-center ${dark ? 'bg-[#2a2a3e]' : 'bg-zinc-300'}`} />
            {SECTORS.map((s) => (
              <button key={s} onClick={() => setSector(sector === s ? '' : s)}
                className={`${pillBase} ${sector === s ? pillActive : pillInactive}`}>{s}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 flex gap-6">

        {/* Cards */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : startups.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-3xl mb-3">🚀</p>
              <p className={`text-sm font-semibold ${text}`}>No startups yet</p>
              <p className={`text-xs mt-1 ${sub}`}>Be the first to post your startup.</p>
              <button onClick={() => setShowModal(true)} className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold">
                Post Startup
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {featured && (
                <StartupCard startup={featured} featured dark={dark} />
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {startups.filter((s) => s.id !== featured?.id).map((s) => (
                  <StartupCard key={s.id} startup={s} dark={dark} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block w-52 flex-shrink-0 space-y-4">
          <div className={`rounded-xl border p-4 ${card}`}>
            <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${text}`}>Hot Sectors</p>
            <div className="space-y-2">
              {Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]).map(([sec, count]) => (
                <button key={sec} onClick={() => setSector(sector === sec ? '' : sec)}
                  className={`w-full flex justify-between items-center text-xs transition-all ${sector === sec ? 'text-indigo-400' : sub} hover:text-indigo-400`}>
                  <span>{sec}</span>
                  <span className="font-semibold">{count}</span>
                </button>
              ))}
            </div>
          </div>
          <div className={`rounded-xl border p-4 ${card}`}>
            <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${text}`}>This Week</p>
            <div>
              <p className={`text-2xl font-black ${text}`}>{startups.length}</p>
              <p className={`text-xs ${sub}`}>startups listed</p>
            </div>
            {totalRaise > 0 && (
              <div className="mt-3">
                <p className="text-2xl font-black text-emerald-400">{formatRaise(totalRaise)}</p>
                <p className={`text-xs ${sub}`}>total sought</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
