'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import CountryMatchCard from '../components/CountryMatchCard';
import EditorialHero from '../components/ui/EditorialHero';
import Btn from '../components/ui/Btn';
import Footnote from '../components/ui/Footnote';
import { useScrollReveal } from '../components/ui/hooks/useScrollReveal';
import { HERO_COPY, FOOTNOTES } from '../lib/pageCopy';

export default function MatchPage() {
  useScrollReveal();
  const [matches, setMatches] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [hasProfile, setHasProfile] = useState(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/user-profile');
        const data = await res.json();
        if (data.profile && data.profile.nationality) {
          setProfile(data.profile);
          setHasProfile(true);
        } else {
          const saved = localStorage.getItem('opportumap_profile');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.nationality) {
              setProfile(parsed);
              setHasProfile(true);
            } else {
              setHasProfile(false);
            }
          } else {
            setHasProfile(false);
          }
        }
      } catch {
        setHasProfile(false);
      }
    }
    loadProfile();
  }, []);

  async function findMatches() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/country-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMatches(data.matches);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (profile) findMatches();
  }, [profile]);

  const hero = HERO_COPY.match;

  return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />

      <EditorialHero
        kicker={hero.kicker}
        title={hero.title}
        titleItalic={hero.italic}
        titleTail={hero.tail}
        sub={hero.sub}
        meta={['100+ COUNTRIES SCANNED', 'RANKED BY VISA + ROLE FIT', '~60 SECONDS']}
      />

      <main className="max-w-[1280px] mx-auto px-6 sm:px-10 pb-24 border-t border-paper-rule">
        <div className="py-14">
          {hasProfile === false && (
            <div className="border border-paper-rule bg-paper-bg-alt p-10 max-w-[640px]">
              <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-4">// NO PROFILE FOUND</div>
              <h2 className="font-display text-[28px] leading-[1.15] mb-3">Set up your profile first.</h2>
              <p className="text-[14px] text-paper-ink-dim leading-[1.55] mb-2">
                We need your nationality and skills to find the countries where you actually have a shot.
              </p>
              <p className="text-[13px] text-paper-ink-sub leading-[1.5]">
                Click your avatar in the top-right, or sign in to get started.
              </p>
            </div>
          )}

          {loading && (
            <div className="py-20 text-center">
              <div className="font-mono text-[11px] tracking-[0.12em] text-paper-ink-sub animate-pulse">
                ANALYZING YOUR PROFILE ACROSS 100+ COUNTRIES…
              </div>
            </div>
          )}

          {error && (
            <div className="border border-accent/40 bg-paper-bg-alt p-8 max-w-[520px]">
              <div className="font-mono text-[10px] tracking-[0.12em] text-accent mb-3">// ERROR</div>
              <p className="text-[14px] text-paper-ink-dim mb-5">{error}</p>
              <Btn variant="primary" as="button" onClick={findMatches}>Try again</Btn>
            </div>
          )}

          {matches && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {matches.map((match, i) => (
                  <CountryMatchCard key={match.country_code || i} match={match} rank={i + 1} />
                ))}
              </div>
              <div className="pt-10">
                <Btn variant="secondary" as="button" onClick={findMatches}>Refresh matches</Btn>
              </div>
            </>
          )}

          <Footnote>{FOOTNOTES.match}</Footnote>
        </div>
      </main>
    </div>
  );
}
