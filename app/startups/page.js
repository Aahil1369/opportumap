'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import StartupCard from '../components/StartupCard';
import StartupModal from '../components/StartupModal';
import EditorialHero from '../components/ui/EditorialHero';
import Btn from '../components/ui/Btn';
import Footnote from '../components/ui/Footnote';
import { useScrollReveal } from '../components/ui/hooks/useScrollReveal';
import { HERO_COPY, FOOTNOTES } from '../lib/pageCopy';
import { createClient } from '../../lib/supabase-browser';

const STAGES = ['idea', 'pre-seed', 'seed', 'series-a', 'series-b+'];
const SECTORS = ['AI', 'Fintech', 'HealthTech', 'CleanTech', 'SaaS', 'EdTech', 'Other'];

const SECTOR_COUNTS = { 'AI': 0, 'Fintech': 0, 'HealthTech': 0, 'CleanTech': 0, 'SaaS': 0, 'EdTech': 0, 'Other': 0 };

export default function StartupsPage() {
  useScrollReveal();
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

  const pillBase = 'font-mono text-[11px] px-3 py-1.5 transition-colors cursor-pointer';
  const pillActive = 'bg-paper-ink text-paper-bg';
  const pillInactive = 'border border-paper-rule text-paper-ink hover:bg-paper-bg-alt';

  const totalRaise = startups.reduce((s, x) => s + (x.raise_amount || 0), 0);
  const formatRaise = (n) => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(1)}M` : `$${(n/1_000).toFixed(0)}K`;

  const featured = startups.find((s) => s.upvote_count > 0) || startups[0];

  const hero = HERO_COPY.startups;

  return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />
      {showModal && <StartupModal onClose={() => setShowModal(false)} onSuccess={(s) => setStartups((prev) => [s, ...prev])} />}

      <EditorialHero
        kicker={hero.kicker}
        title={hero.title}
        titleItalic={hero.italic}
        titleTail={hero.tail}
        sub={hero.sub}
        meta={[`${startups.length} STARTUPS LISTED`, 'UPDATED DAILY', 'MESSAGE FOUNDERS DIRECTLY']}
        cta={<Btn variant="primary" as="button" onClick={() => setShowModal(true)}>+ Post startup</Btn>}
      />

      <main className="max-w-[1280px] mx-auto px-6 sm:px-10 pb-24 border-t border-paper-rule">
        <div className="py-14">

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-8">
            <button onClick={() => setSort(sort === 'trending' ? 'newest' : 'trending')}
              className={`${pillBase} ${sort === 'trending' ? pillActive : pillInactive}`}>
              TRENDING
            </button>
            {STAGES.map((s) => (
              <button key={s} onClick={() => setStage(stage === s ? '' : s)}
                className={`${pillBase} ${stage === s ? pillActive : pillInactive}`}>{s.toUpperCase()}</button>
            ))}
            <div className="w-px h-5 self-center bg-paper-rule" />
            {SECTORS.map((s) => (
              <button key={s} onClick={() => setSector(sector === s ? '' : s)}
                className={`${pillBase} ${sector === s ? pillActive : pillInactive}`}>{s.toUpperCase()}</button>
            ))}
          </div>

          {/* Content */}
          <div className="flex gap-10">

            {/* Cards */}
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="font-mono text-[11px] tracking-[0.12em] text-paper-ink-sub animate-pulse">
                    LOADING STARTUPS…
                  </div>
                </div>
              ) : startups.length === 0 ? (
                <div className="border border-paper-rule bg-paper-bg-alt p-10 text-center max-w-[520px]">
                  <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-4">// NOTHING POSTED YET</div>
                  <h2 className="font-display text-[24px] leading-[1.15] mb-3">No startups yet.</h2>
                  <p className="text-[13px] text-paper-ink-dim leading-[1.5] mb-5">Be the first to post your startup.</p>
                  <Btn variant="primary" as="button" onClick={() => setShowModal(true)}>Post startup</Btn>
                </div>
              ) : (
                <div className="space-y-3">
                  {featured && (
                    <StartupCard startup={featured} featured />
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {startups.filter((s) => s.id !== featured?.id).map((s) => (
                      <StartupCard key={s.id} startup={s} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="hidden lg:block w-56 flex-shrink-0 space-y-5">
              <div className="border border-paper-rule p-5">
                <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-3">// HOT SECTORS</div>
                <div className="space-y-2">
                  {Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]).map(([sec, count]) => (
                    <button key={sec} onClick={() => setSector(sector === sec ? '' : sec)}
                      className={`w-full flex justify-between items-center text-[13px] transition-colors ${sector === sec ? 'text-accent' : 'text-paper-ink-dim'} hover:text-accent`}>
                      <span>{sec}</span>
                      <span className="font-mono text-[11px]">{count}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="border border-paper-rule p-5">
                <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-3">// THIS WEEK</div>
                <div>
                  <p className="font-display text-[28px] leading-none text-paper-ink">{startups.length}</p>
                  <p className="text-[12px] text-paper-ink-sub mt-1">startups listed</p>
                </div>
                {totalRaise > 0 && (
                  <div className="mt-4 pt-4 border-t border-paper-rule">
                    <p className="font-display text-[28px] leading-none text-accent">{formatRaise(totalRaise)}</p>
                    <p className="text-[12px] text-paper-ink-sub mt-1">total sought</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Footnote>{FOOTNOTES.startups}</Footnote>
        </div>
      </main>
    </div>
  );
}
