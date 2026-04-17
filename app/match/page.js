'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import CountryMatchCard from '../components/CountryMatchCard';
import { useTheme } from '../hooks/useTheme';

export default function MatchPage() {
  const { dark, toggleDark } = useTheme();
  const isDark = dark;
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

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#080810] text-zinc-100' : 'bg-white text-zinc-900'}`}>
      <Navbar dark={dark} onToggleDark={toggleDark} />
      <main className="max-w-4xl mx-auto px-6 pt-28 pb-16">
        <div className="text-center mb-12">
          <h1 className={`text-4xl md:text-5xl font-bold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Your Country Match
          </h1>
          <p className={`text-lg ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            AI-powered recommendations based on your nationality, skills, and goals.
          </p>
        </div>

        {hasProfile === false && (
          <div className={`text-center p-8 rounded-xl border ${
            isDark ? 'bg-[#12121e] border-[#2a2a3e]' : 'bg-zinc-50 border-zinc-200'
          }`}>
            <p className={`text-lg mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              Set up your profile first so we can find your best matches.
            </p>
            <p className={`text-sm mb-6 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
              Click your avatar in the top-right, or sign in to get started.
            </p>
          </div>
        )}

        {loading && (
          <div className="text-center py-16">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className={`text-lg ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Analyzing your profile across 100+ countries...
            </p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={findMatches}
              className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors">
              Try Again
            </button>
          </div>
        )}

        {matches && (
          <div className="space-y-4">
            {matches.map((match, i) => (
              <CountryMatchCard key={match.country_code || i} match={match} isDark={isDark} />
            ))}
            <div className="text-center pt-8">
              <button onClick={findMatches}
                className={`px-6 py-2 rounded-lg border font-medium transition-colors ${
                  isDark
                    ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                    : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                }`}>
                Refresh Matches
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
