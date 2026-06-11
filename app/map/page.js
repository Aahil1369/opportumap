'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '../components/Navbar';
import ProfileModal from '../components/ProfileModal';
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

  return (
    <div className="flex flex-col h-screen bg-paper-bg text-paper-ink">
      {showProfile && <ProfileModal onSave={handleSaveProfile} initialProfile={profile} onClose={() => setShowProfile(false)} />}
      <Navbar />

      {/* Map controls bar */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-2.5 border-b border-paper-rule flex-shrink-0 bg-paper-bg">
        <div className="hidden md:block font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub flex-shrink-0">
          § WORLD MAP
        </div>

        <form onSubmit={(e) => { e.preventDefault(); setQuery(input); }} className="flex gap-2 flex-1 max-w-md">
          <input value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Search jobs on map..."
            className="flex-1 px-3 py-1.5 border border-paper-rule bg-paper-bg text-paper-ink placeholder-paper-ink-sub text-xs outline-none focus:border-accent" />
          <button type="submit"
            className="px-3 py-1.5 border border-paper-ink bg-paper-ink text-paper-bg text-xs font-medium font-sans tracking-[0.01em] hover:bg-[#2a3a2f] transition-colors">
            Search
          </button>
        </form>

        <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] text-paper-ink-sub">
          {loading ? (
            <span className="animate-pulse">LOADING…</span>
          ) : (
            <span>{scoredJobs.length.toLocaleString()} JOBS</span>
          )}
        </div>

        {profile?.nationality && (
          <div className="hidden sm:flex items-center gap-3 flex-wrap font-mono text-[10px] tracking-[0.08em] text-paper-ink-sub">
            {Object.entries(VISA_COLORS).filter(([k]) => k !== 'unknown').map(([status, info]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div className="w-2 h-2" style={{ backgroundColor: info.hex }} />
                <span>{info.label}</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => setShowProfile(true)}
          className="flex-shrink-0 px-3 py-1.5 border border-paper-rule font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-dim hover:border-accent hover:text-accent transition-colors">
          {profile ? 'Profile' : 'Set up profile'}
        </button>
      </div>

      {/* Full-screen map */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-paper-bg/70 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="font-mono text-[11px] tracking-[0.1em] text-paper-ink-sub">FETCHING JOBS…</p>
            </div>
          </div>
        )}
        <MapWrapper ref={mapRef} dark={true} jobs={scoredJobs} nationality={profile?.nationality} />
      </div>
    </div>
  );
}
