'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Navbar from '../components/Navbar';
import ProfileModal from '../components/ProfileModal';
import ChatWidget from '../components/ChatWidget';
import RelocationModal from '../components/RelocationModal';
import { useTheme } from '../hooks/useTheme';
import { ADZUNA_COUNTRIES, NATIONALITIES } from '../data/countries';
import { scoreJob, matchColor } from '../data/matchJobs';

const SORT_OPTIONS = [
  { value: 'match', label: 'Best match' },
  { value: 'salary', label: 'Salary (high)' },
  { value: 'default', label: 'Default' },
];

function buildQueryFromProfile(profile) {
  if (!profile) return 'software engineer';
  const parts = [];
  if (profile.skills) {
    const skills = profile.skills.split(',').map((s) => s.trim()).filter(Boolean);
    parts.push(...skills.slice(0, 4));
  }
  if (profile.jobTypes?.length) {
    const jt = profile.jobTypes[0]
      .replace('Software Engineering', 'software engineer')
      .replace('Data Science / ML', 'data scientist machine learning')
      .replace('Product Management', 'product manager')
      .replace('Design', 'UX designer')
      .replace('DevOps / Cloud', 'devops cloud engineer')
      .replace('Research', 'research engineer')
      .replace('Finance / Fintech', 'fintech engineer')
      .replace('Other', '');
    if (jt) parts.unshift(jt);
  }
  return parts.slice(0, 5).join(' ') || 'software engineer';
}

export default function JobsPage() {
  const { dark, toggleDark } = useTheme();
  const [profile, setProfile] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showRelocation, setShowRelocation] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [input, setInput] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'remote' | 'onsite'
  const [sortBy, setSortBy] = useState('match');
  const [predictedSalaries, setPredictedSalaries] = useState({});
  const [page, setPage] = useState(1);
  const PER_PAGE = 30;

  // Load profile
  useEffect(() => {
    const saved = localStorage.getItem('opportumap_profile');
    if (saved) {
      const p = JSON.parse(saved);
      setProfile(p);
      const autoQ = buildQueryFromProfile(p);
      setQuery(autoQ);
      setInput(autoQ);
    } else {
      setQuery('software engineer');
      setInput('software engineer');
    }
  }, []);

  // Fetch jobs when query or preferred countries change
  useEffect(() => {
    if (!query) return;
    setLoading(true);
    setPage(1);
    const preferred = profile?.preferredCountries;
    const countriesParam = preferred?.length ? `&countries=${preferred.join(',')}` : '';
    fetch(`/api/jobs?q=${encodeURIComponent(query)}${countriesParam}`)
      .then((r) => r.json())
      .then((data) => { setJobs(data.jobs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [query, profile?.preferredCountries]);

  // AI salary prediction for jobs without salary
  useEffect(() => {
    if (!jobs.length) return;
    jobs.filter((j) => j.salary === 'Salary not listed').slice(0, 50).forEach((job) => {
      if (predictedSalaries[job.id]) return;
      fetch('/api/predict-salary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: job.title, company: job.company, location: job.location, country: job.country }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.display) setPredictedSalaries((prev) => ({ ...prev, [job.id]: data.display }));
        })
        .catch(() => {});
    });
  }, [jobs]);

  const scoredJobs = useMemo(
    () => jobs.map((job) => ({ ...job, matchScore: scoreJob(job, profile) })),
    [jobs, profile]
  );

  const filtered = useMemo(() => {
    let list = countryFilter === 'all' ? scoredJobs : scoredJobs.filter((j) => j.country === countryFilter);
    if (typeFilter === 'remote') list = list.filter((j) => j.remote);
    if (typeFilter === 'onsite') list = list.filter((j) => !j.remote);
    if (sortBy === 'match' && profile?.skills) list = [...list].sort((a, b) => b.matchScore - a.matchScore);
    else if (sortBy === 'salary') {
      list = [...list].sort((a, b) => {
        const av = a.salary !== 'Salary not listed' ? parseInt(a.salary.replace(/\D/g, '')) : 0;
        const bv = b.salary !== 'Salary not listed' ? parseInt(b.salary.replace(/\D/g, '')) : 0;
        return bv - av;
      });
    }
    return list;
  }, [scoredJobs, countryFilter, typeFilter, sortBy, profile]);

  const paginated = filtered.slice(0, page * PER_PAGE);

  const handleSaveProfile = (p) => {
    setProfile(p);
    localStorage.setItem('opportumap_profile', JSON.stringify(p));
    setShowProfile(false);
    const autoQ = buildQueryFromProfile(p);
    setQuery(autoQ);
    setInput(autoQ);
  };

  const ui = {
    bg: dark ? 'bg-[#0e0e10]' : 'bg-[#f5f5f7]',
    card: dark ? 'bg-[#1a1a1d] border-[#2a2a2e]' : 'bg-white border-zinc-200',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
    divider: dark ? 'border-[#2a2a2e]' : 'border-zinc-200',
    toggle: dark ? 'bg-[#2a2a2e] text-zinc-300 hover:bg-[#333]' : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300',
    badge: dark ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border border-indigo-100',
    input: dark ? 'bg-[#2a2a2e] border-[#3a3a3e] text-zinc-100 placeholder-zinc-500' : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400',
    pill: (a) => a ? 'bg-indigo-600 text-white' : dark ? 'bg-[#2a2a2e] text-zinc-400 hover:bg-[#333]' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200',
    select: dark ? 'bg-[#2a2a2e] border-[#3a3a3e] text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600',
    remoteBadge: dark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  };

  return (
    <div className={`min-h-screen ${ui.bg} transition-colors duration-300`}>
      {showProfile && <ProfileModal onSave={handleSaveProfile} dark={dark} initialProfile={profile} onClose={() => setShowProfile(false)} />}
      {showRelocation && <RelocationModal onClose={() => setShowRelocation(false)} dark={dark} />}
      <ChatWidget dark={dark} profile={profile} />
      <Navbar dark={dark} onToggleDark={toggleDark} />

      <main className="px-4 sm:px-8 py-6 sm:py-10 max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight mb-1 ${ui.text}`}>
              {profile?.name ? `Jobs for you, ${profile.name}` : 'Explore Jobs'}
            </h1>
            <p className={`text-sm ${ui.sub}`}>
              {loading ? 'Fetching jobs...' : `${filtered.length.toLocaleString()} jobs found across ${new Set(filtered.map((j) => j.country)).size} countries`}
              {profile?.skills && !loading && ' · Sorted by AI match score'}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowRelocation(true)}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all">
              I got the job ✈️
            </button>
            <button onClick={() => setShowProfile(true)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${ui.toggle}`}>
              {profile ? '👤 Profile' : 'Set up profile'}
            </button>
          </div>
        </div>

        {/* Profile banner if no profile */}
        {!profile && (
          <div className={`rounded-2xl border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${dark ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-indigo-200 bg-indigo-50'}`}>
            <div>
              <p className={`text-sm font-semibold ${ui.text}`}>Get AI-powered job matches</p>
              <p className={`text-xs mt-0.5 ${ui.sub}`}>Upload your resume and we'll rank these jobs based on how well they match your skills.</p>
            </div>
            <button onClick={() => setShowProfile(true)}
              className="flex-shrink-0 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all">
              Set up profile
            </button>
          </div>
        )}

        {/* Search */}
        <form onSubmit={(e) => { e.preventDefault(); setQuery(input); }} className="flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Search roles, skills, companies..."
            className={`flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${ui.input}`} />
          <button type="submit"
            className="px-4 sm:px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
            Search
          </button>
        </form>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setCountryFilter('all')}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${ui.pill(countryFilter === 'all')}`}>
              All Countries
            </button>
            {ADZUNA_COUNTRIES.filter((c) => jobs.some((j) => j.country === c.code)).map((c) => (
              <button key={c.code} onClick={() => setCountryFilter(c.code)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${ui.pill(countryFilter === c.code)}`}>
                {c.flag} <span className="hidden sm:inline">{c.label}</span>
                <span className="sm:hidden">{c.code.toUpperCase()}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex rounded-lg border overflow-hidden ${ui.divider}`}>
              {['all', 'remote', 'onsite'].map((t) => (
                <button key={t} onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1 text-xs font-medium transition-all capitalize ${typeFilter === t ? 'bg-indigo-600 text-white' : ui.sub}`}>
                  {t}
                </button>
              ))}
            </div>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              className={`px-3 py-1.5 rounded-xl border text-xs outline-none ${ui.select}`}>
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Job grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={`rounded-2xl border p-5 space-y-3 ${ui.card}`}>
                <div className={`h-4 w-3/4 rounded ${dark ? 'bg-zinc-800' : 'bg-zinc-200'} animate-pulse`} />
                <div className={`h-3 w-1/2 rounded ${dark ? 'bg-zinc-800' : 'bg-zinc-200'} animate-pulse`} />
                <div className={`h-3 w-1/3 rounded ${dark ? 'bg-zinc-800' : 'bg-zinc-200'} animate-pulse`} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className={`text-center py-20 ${ui.sub}`}>
            <p className="text-3xl mb-3">🔍</p>
            <p className="text-sm font-medium">No jobs found</p>
            <p className="text-xs mt-1">Try a different search or remove country filters</p>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginated.map((job) => {
                const salary = job.salary !== 'Salary not listed' ? job.salary
                  : predictedSalaries[job.id] ? `~${predictedSalaries[job.id]}` : null;
                const mc = profile?.skills && job.matchScore > 0 ? matchColor(job.matchScore) : null;
                const countryInfo = ADZUNA_COUNTRIES.find((c) => c.code === job.country);

                return (
                  <a key={job.id} href={job.url} target="_blank" rel="noopener noreferrer"
                    className={`rounded-2xl border p-5 flex flex-col gap-3 transition-all hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 group ${ui.card}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold leading-snug mb-1 group-hover:text-indigo-400 transition-colors ${ui.text}`}>
                          {job.title}
                        </p>
                        <p className={`text-xs truncate ${ui.sub}`}>
                          {countryInfo?.flag} {job.company} · {job.location}
                        </p>
                      </div>
                      {mc && (
                        <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full border font-semibold ${mc.bg} ${mc.text}`}>
                          {job.matchScore}%
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {job.remote && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${ui.remoteBadge}`}>Remote</span>
                      )}
                      {salary ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          predictedSalaries[job.id] && job.salary === 'Salary not listed'
                            ? dark ? 'bg-zinc-800/50 text-zinc-400 border-zinc-700' : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                            : ui.badge
                        }`}>
                          {salary}
                          {predictedSalaries[job.id] && job.salary === 'Salary not listed' && (
                            <span className="ml-1 opacity-60">AI est.</span>
                          )}
                        </span>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${dark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                          estimating...
                        </span>
                      )}
                      {job.source && job.source !== 'adzuna' && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${dark ? 'bg-zinc-800/50 text-zinc-500 border-zinc-700' : 'bg-zinc-100 text-zinc-400 border-zinc-200'}`}>
                          via {job.source}
                        </span>
                      )}
                    </div>

                    <div className={`text-xs font-medium text-indigo-400 group-hover:text-indigo-300 transition-colors mt-auto`}>
                      View job →
                    </div>
                  </a>
                );
              })}
            </div>

            {/* Load more */}
            {paginated.length < filtered.length && (
              <div className="text-center pt-4">
                <button onClick={() => setPage((p) => p + 1)}
                  className={`px-6 py-2.5 rounded-xl border text-sm font-medium transition-all ${dark ? 'border-[#2a2a2e] text-zinc-300 hover:bg-[#1a1a1d]' : 'border-zinc-200 text-zinc-700 hover:bg-white'}`}>
                  Load more ({filtered.length - paginated.length} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
