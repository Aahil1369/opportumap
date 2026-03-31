'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '../components/Navbar';
import ProfileModal from '../components/ProfileModal';
import { useTheme } from '../hooks/useTheme';
import { ADZUNA_COUNTRIES } from '../data/countries';
import { VISA_COLORS } from '../data/visaData';
import { scoreJob } from '../data/matchJobs';

const MapWrapper = dynamic(() => import('../components/MapWrapper'), { ssr: false });

function buildQueryFromProfile(profile) {
  if (!profile) return 'software engineer';
  const parts = [];
  if (profile.skills) {
    const skills = profile.skills.split(',').map((s) => s.trim()).filter(Boolean);
    parts.push(...skills.slice(0, 3));
  }
  if (profile.jobTypes?.length) {
    const jt = profile.jobTypes[0]
      .replace('Software Engineering', 'software engineer')
      .replace('Data Science / ML', 'data scientist')
      .replace('Product Management', 'product manager')
      .replace('Design', 'designer')
      .replace('DevOps / Cloud', 'devops')
      .replace('Research', 'researcher')
      .replace('Finance / Fintech', 'fintech')
      .replace('Other', '');
    if (jt) parts.unshift(jt);
  }
  return parts.slice(0, 4).join(' ') || 'software engineer';
}

export default function MapPage() {
  const { dark, toggleDark } = useTheme();
  const [profile, setProfile] = useState(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem('opportumap_profile');
    return saved ? JSON.parse(saved) : null;
  });
  const [showProfile, setShowProfile] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(() => {
    if (typeof window === 'undefined') return 'software engineer';
    const saved = localStorage.getItem('opportumap_profile');
    if (saved) return buildQueryFromProfile(JSON.parse(saved));
    return 'software engineer';
  });
  const [input, setInput] = useState(() => {
    if (typeof window === 'undefined') return 'software engineer';
    const saved = localStorage.getItem('opportumap_profile');
    if (saved) return buildQueryFromProfile(JSON.parse(saved));
    return 'software engineer';
  });
  const mapRef = useRef(null);

  useEffect(() => {
    if (!query) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const preferred = profile?.preferredCountries;
    const countriesParam = preferred?.length ? `&countries=${preferred.join(',')}` : '';
    fetch(`/api/jobs?q=${encodeURIComponent(query)}${countriesParam}`)
      .then((r) => r.json())
      .then((data) => { setJobs(data.jobs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [query, profile?.preferredCountries]);

  const scoredJobs = useMemo(
    () => jobs.map((job) => ({ ...job, matchScore: scoreJob(job, profile) })),
    [jobs, profile]
  );

  const handleSaveProfile = (p) => {
    setProfile(p);
    localStorage.setItem('opportumap_profile', JSON.stringify(p));
    setShowProfile(false);
    const q = buildQueryFromProfile(p);
    setQuery(q);
    setInput(q);
  };

  const ui = {
    bg: dark ? 'bg-[#0e0e10]' : 'bg-[#f5f5f7]',
    card: dark ? 'bg-[#1a1a1d] border-[#2a2a2e]' : 'bg-white border-zinc-200',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
    divider: dark ? 'border-[#2a2a2e]' : 'border-zinc-200',
    toggle: dark ? 'bg-[#2a2a2e] text-zinc-300 hover:bg-[#333]' : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300',
    input: dark ? 'bg-[#2a2a2e] border-[#3a3a3e] text-zinc-100 placeholder-zinc-500' : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400',
  };

  return (
    <div className={`flex flex-col h-screen ${ui.bg} transition-colors duration-300`}>
      {showProfile && <ProfileModal onSave={handleSaveProfile} dark={dark} initialProfile={profile} onClose={() => setShowProfile(false)} />}
      <Navbar dark={dark} onToggleDark={toggleDark} />

      {/* Map controls bar */}
      <div className={`flex items-center gap-3 px-4 sm:px-6 py-2.5 border-b ${ui.divider} flex-shrink-0`}>
        <form onSubmit={(e) => { e.preventDefault(); setQuery(input); }} className="flex gap-2 flex-1 max-w-md">
          <input value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Search jobs on map..."
            className={`flex-1 px-3 py-1.5 rounded-lg border text-xs outline-none focus:ring-2 focus:ring-indigo-500/40 ${ui.input}`} />
          <button type="submit"
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors">
            Search
          </button>
        </form>

        <div className={`hidden sm:flex items-center gap-2 text-xs ${ui.sub}`}>
          {loading ? (
            <span>Loading...</span>
          ) : (
            <span>{scoredJobs.length.toLocaleString()} jobs</span>
          )}
        </div>

        {profile?.nationality && (
          <div className="hidden sm:flex items-center gap-2 flex-wrap">
            {Object.entries(VISA_COLORS).filter(([k]) => k !== 'unknown').map(([status, info]) => (
              <div key={status} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: info.hex }} />
                <span className={`text-xs ${ui.sub}`}>{info.emoji} {info.label}</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => setShowProfile(true)}
          className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${ui.toggle}`}>
          {profile ? '👤 Profile' : 'Set up profile'}
        </button>
      </div>

      {/* Full-screen map */}
      <div className="flex-1 relative">
        {loading && (
          <div className={`absolute inset-0 flex items-center justify-center z-10 ${dark ? 'bg-[#0e0e10]/70' : 'bg-white/70'} backdrop-blur-sm`}>
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className={`text-xs ${ui.sub}`}>Fetching jobs...</p>
            </div>
          </div>
        )}
        <MapWrapper ref={mapRef} dark={dark} jobs={scoredJobs} nationality={profile?.nationality} />
      </div>
    </div>
  );
}
