'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Navbar from '../components/Navbar';
import ProfileModal from '../components/ProfileModal';
import ChatWidget from '../components/ChatWidget';
import RelocationModal from '../components/RelocationModal';
import JobCard from '../components/JobCard';
import JobDetailPanel from '../components/JobDetailPanel';
import { useTheme } from '../hooks/useTheme';
import { ADZUNA_COUNTRIES } from '../data/countries';
import { scoreJob } from '../data/matchJobs';

function jobFreshness(job) {
  const now = Date.now();
  if (job.expires_at) {
    const exp = new Date(job.expires_at).getTime();
    if (exp < now) return 'expired';
  }
  if (job.posted_at) {
    const ageDays = (now - new Date(job.posted_at).getTime()) / 86400000;
    if (ageDays > 60) return 'expired';
  }
  return 'fresh';
}
import { getVisaStatus } from '../data/visaData';
import { createClient } from '../../lib/supabase-browser';

const JOB_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'tech', label: '💻 Tech' },
  { value: 'healthcare', label: '🏥 Healthcare' },
  { value: 'finance', label: '💰 Finance' },
  { value: 'engineering', label: '⚙️ Engineering' },
  { value: 'marketing', label: '📣 Marketing' },
  { value: 'design', label: '🎨 Design' },
  { value: 'education', label: '📚 Education' },
  { value: 'legal', label: '⚖️ Legal' },
  { value: 'science', label: '🔬 Science' },
  { value: 'operations', label: '📦 Operations' },
  { value: 'hr', label: '🧑‍💼 HR' },
  { value: 'media', label: '🎬 Media' },
];

const VISA_FILTER_OPTIONS = [
  { value: 'all', label: 'All Visa' },
  { value: 'easy', label: 'No visa / E-visa' },
  { value: 'required', label: 'Visa required' },
];

function buildQueryFromProfile(profile) {
  if (!profile) return 'software engineer';
  const parts = [];
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
    if (jt) parts.push(jt);
  }
  if (profile.skills) {
    const skills = profile.skills.split(',').map((s) => s.trim()).filter(Boolean);
    parts.push(...skills.slice(0, 3));
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
  const [typeFilter, setTypeFilter] = useState('all');
  const [visaFilter, setVisaFilter] = useState('all');
  const [remoteFilter, setRemoteFilter] = useState('all'); // 'all' | 'remote' | 'onsite'
  const [sortBy, setSortBy] = useState('default');
  const [predictedSalaries, setPredictedSalaries] = useState({});
  const [selectedJob, setSelectedJob] = useState(null);
  const [savedOnly, setSavedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [hideExpired, setHideExpired] = useState(true);
  const [authUser, setAuthUser] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const PER_PAGE = 24;
  const supabase = createClient();

  // Load profile — from Supabase if logged in, else localStorage
  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      setAuthUser(user);

      if (user) {
        // Try Supabase profile first
        try {
          const res = await fetch('/api/user-profile');
          const { profile: remoteProfile } = await res.json();
          if (remoteProfile) {
            setProfile(remoteProfile);
            setQuery(buildQueryFromProfile(remoteProfile));
            setInput(buildQueryFromProfile(remoteProfile));
            return;
          }
        } catch {}
        // Pre-fill name from Google if no saved profile
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || '';
        const localRaw = localStorage.getItem('opportumap_profile');
        if (localRaw) {
          const p = { ...JSON.parse(localRaw), name: JSON.parse(localRaw).name || name };
          setProfile(p);
          setQuery(buildQueryFromProfile(p));
          setInput(buildQueryFromProfile(p));
          return;
        }
        // New user — no profile anywhere → prompt to set one up
        setProfile({ name, nationality: '', currentCountry: '', experience: '', jobTypes: [], skills: '', preferredCountries: [] });
        setShowWelcome(true);
      } else {
        const localRaw = localStorage.getItem('opportumap_profile');
        if (localRaw) {
          const p = JSON.parse(localRaw);
          setProfile(p);
          setQuery(buildQueryFromProfile(p));
          setInput(buildQueryFromProfile(p));
          return;
        }
      }
      setQuery('software engineer');
      setInput('software engineer');
    }
    loadProfile();
  }, []);

  // Fetch jobs
  useEffect(() => {
    if (!query) return;
    setLoading(true);
    setPage(1);
    setSelectedJob(null);
    const preferred = profile?.preferredCountries;
    const countriesParam = preferred?.length ? `&countries=${preferred.join(',')}` : '';
    fetch(`/api/jobs?q=${encodeURIComponent(query)}${countriesParam}`)
      .then((r) => r.json())
      .then((data) => { setJobs(data.jobs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [query, profile?.preferredCountries]);

  // AI salary prediction (batch, max 60 at a time)
  useEffect(() => {
    if (!jobs.length) return;
    jobs.filter((j) => j.salary === 'Salary not listed').slice(0, 60).forEach((job) => {
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

  const expiredCount = useMemo(
    () => scoredJobs.filter((j) => jobFreshness(j) === 'expired').length,
    [scoredJobs]
  );

  const filtered = useMemo(() => {
    let list = [...scoredJobs];

    if (hideExpired) list = list.filter((j) => jobFreshness(j) !== 'expired');
    if (countryFilter !== 'all') list = list.filter((j) => j.country === countryFilter);
    if (remoteFilter === 'remote') list = list.filter((j) => j.remote);
    if (remoteFilter === 'onsite') list = list.filter((j) => !j.remote);

    if (typeFilter !== 'all') {
      const typeMap = {
        tech: ['software', 'developer', 'engineer', 'frontend', 'backend', 'fullstack', 'devops', 'cloud', 'data', 'ml', 'ai', 'platform', 'sre', 'web', 'mobile', 'ios', 'android', 'python', 'java', 'react', 'node', 'typescript', 'golang', 'rust', 'php', 'ruby', 'scala', 'kotlin', 'swift', 'security', 'cyber', 'network', 'it ', 'systems'],
        healthcare: ['doctor', 'physician', 'nurse', 'pharmacist', 'dentist', 'surgeon', 'medical', 'health', 'clinical', 'physiotherapist', 'therapist', 'radiologist', 'cardiologist', 'pediatr', 'psychiatr', 'psycholog', 'paramedic', 'optometrist', 'veterinar', 'healthcare', 'hospital', 'care'],
        finance: ['finance', 'financial', 'accountant', 'auditor', 'banker', 'quant', 'fintech', 'risk', 'compliance', 'actuar', 'credit', 'portfolio', 'wealth', 'payroll', 'budget', 'tax', 'treasury', 'investment', 'trading'],
        engineering: ['mechanical', 'civil', 'electrical', 'chemical', 'aerospace', 'structural', 'environmental', 'biomedical', 'industrial', 'manufacturing', 'process', 'quality engineer', 'materials', 'petroleum', 'mining', 'construction', 'architect', 'surveyor'],
        marketing: ['marketing', 'seo', 'social media', 'content', 'growth', 'brand', 'sales', 'account executive', 'business development', 'copywriter', 'public relations', 'communications', 'email marketing', 'customer success'],
        design: ['design', 'ux', 'ui ', 'figma', 'visual', 'creative director', 'art director', 'motion', 'graphic', 'illustrat', 'animator', '3d artist'],
        education: ['teacher', 'professor', 'lecturer', 'researcher', 'curriculum', 'instructional', 'principal', 'education', 'academic', 'librarian', 'tutor', 'school', 'university'],
        legal: ['lawyer', 'attorney', 'legal', 'paralegal', 'compliance', 'contract', 'intellectual property', 'corporate law'],
        science: ['scientist', 'biolog', 'chemist', 'physicist', 'geolog', 'marine', 'environmental science', 'climate', 'materials science', 'biotech', 'pharmaceutical', 'food science', 'research scientist'],
        operations: ['operations', 'supply chain', 'logistics', 'procurement', 'warehouse', 'inventory', 'program manager', 'project manager', 'coordinator', 'facilities', 'real estate', 'property'],
        hr: ['hr ', 'human resources', 'talent', 'recruiter', 'people ops', 'hr business', 'compensation', 'learning and development', 'organisational'],
        media: ['journalist', 'editor', 'video', 'film', 'photograph', 'animator', 'game designer', 'music', 'media', 'broadcast', 'reporter'],
      };
      const keywords = typeMap[typeFilter] || [];
      list = list.filter((j) => {
        const t = `${j.title} ${j.company} ${j.description || ''}`.toLowerCase();
        return keywords.some((k) => t.includes(k));
      });
    }

    if (visaFilter !== 'all' && profile?.nationality) {
      list = list.filter((j) => {
        if (j.remote) return visaFilter === 'easy';
        const status = getVisaStatus(profile.nationality, j.country);
        if (visaFilter === 'easy') return ['citizen', 'free', 'e_visa', 'on_arrival'].includes(status);
        if (visaFilter === 'required') return status === 'required';
        return true;
      });
    }

    if (savedOnly) {
      try {
        const saved = JSON.parse(localStorage.getItem('opportumap_saved') || '[]');
        list = list.filter((j) => saved.includes(j.id));
      } catch {}
    }

    // Sort
    if (sortBy === 'opportunity' && profile) {
      list = [...list].sort((a, b) => {
        const as_ = Math.round(a.matchScore * 0.6 + getVisaEase(profile.nationality, a) * 0.4);
        const bs_ = Math.round(b.matchScore * 0.6 + getVisaEase(profile.nationality, b) * 0.4);
        return bs_ - as_;
      });
    } else if (sortBy === 'match') {
      list = [...list].sort((a, b) => b.matchScore - a.matchScore);
    } else if (sortBy === 'salary') {
      list = [...list].sort((a, b) => {
        const av = a.salary !== 'Salary not listed' ? parseInt(a.salary.replace(/\D/g, '')) : 0;
        const bv = b.salary !== 'Salary not listed' ? parseInt(b.salary.replace(/\D/g, '')) : 0;
        return bv - av;
      });
    }

    return list;
  }, [scoredJobs, countryFilter, remoteFilter, typeFilter, visaFilter, sortBy, savedOnly, hideExpired, profile]);

  function getVisaEase(nationality, job) {
    const EASE = { citizen: 100, free: 90, e_visa: 60, on_arrival: 50, required: 20, unknown: 40 };
    if (!nationality || job.remote) return 40;
    const status = getVisaStatus(nationality, job.country);
    return EASE[status] ?? 40;
  }

  const paginated = filtered.slice(0, page * PER_PAGE);
  const activeCountries = ADZUNA_COUNTRIES.filter((c) => jobs.some((j) => j.country === c.code));

  const handleSaveProfile = (p) => {
    setProfile(p);
    // Save to Supabase if logged in
    if (authUser) {
      fetch('/api/user-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile: p }) }).catch(() => {});
    }
    // Save to localStorage only if user opted in
    if (p.rememberOnDevice) {
      localStorage.setItem('opportumap_profile', JSON.stringify(p));
    } else {
      localStorage.removeItem('opportumap_profile');
    }
    setShowProfile(false);
    const autoQ = buildQueryFromProfile(p);
    setQuery(autoQ);
    setInput(autoQ);
  };

  const ui = {
    bg: dark ? 'bg-[#080810]' : 'bg-[#f5f5f7]',
    sidebar: dark ? 'bg-[#0e0e18] border-[#1e1e2e]' : 'bg-white border-zinc-200',
    card: dark ? 'bg-[#0e0e18] border-[#1e1e2e]' : 'bg-white border-zinc-200',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
    divider: dark ? 'border-[#1e1e2e]' : 'border-zinc-200',
    input: dark ? 'bg-[#0e0e18] border-[#2a2a3e] text-zinc-100 placeholder-zinc-500' : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400',
    select: dark ? 'bg-[#1a1a2e] border-[#2a2a3e] text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600',
    pill: (a) => a
      ? 'bg-indigo-600 text-white border-indigo-600'
      : dark ? 'bg-[#1a1a2e] text-zinc-400 border-[#1e1e2e] hover:border-indigo-500/40' : 'bg-white text-zinc-600 border-zinc-200 hover:border-indigo-400',
    toggle: dark ? 'bg-[#1a1a2e] text-zinc-300 hover:bg-[#222235]' : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300',
  };

  const FilterSidebar = () => (
    <div className={`rounded-2xl border overflow-hidden flex-shrink-0 ${ui.sidebar}`}>
      <div className={`px-4 py-3 border-b ${ui.divider}`}>
        <p className={`text-xs font-semibold uppercase tracking-widest ${ui.sub}`}>Filters</p>
      </div>

      <div className="p-4 space-y-5">
        {/* Sort */}
        <div>
          <p className={`text-xs font-semibold mb-2 ${ui.text}`}>Sort by</p>
          <div className="space-y-1.5">
            {[
              { value: 'opportunity', label: 'Opportunity Score' },
              { value: 'match', label: 'Skills Match' },
              { value: 'salary', label: 'Salary' },
              { value: 'default', label: 'Latest' },
            ].map((o) => (
              <button key={o.value} onClick={() => setSortBy(o.value)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${ui.pill(sortBy === o.value)}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Job type */}
        <div>
          <p className={`text-xs font-semibold mb-2 ${ui.text}`}>Job Type</p>
          <div className="space-y-1.5">
            {JOB_TYPES.map((t) => (
              <button key={t.value} onClick={() => setTypeFilter(t.value)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${ui.pill(typeFilter === t.value)}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Work mode */}
        <div>
          <p className={`text-xs font-semibold mb-2 ${ui.text}`}>Work Mode</p>
          <div className="space-y-1.5">
            {[
              { value: 'all', label: 'All' },
              { value: 'remote', label: '🌐 Remote only' },
              { value: 'onsite', label: '🏢 On-site only' },
            ].map((o) => (
              <button key={o.value} onClick={() => setRemoteFilter(o.value)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${ui.pill(remoteFilter === o.value)}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Visa filter (only show if profile has nationality) */}
        {profile?.nationality && (
          <div>
            <p className={`text-xs font-semibold mb-2 ${ui.text}`}>Visa Status</p>
            <div className="space-y-1.5">
              {VISA_FILTER_OPTIONS.map((o) => (
                <button key={o.value} onClick={() => setVisaFilter(o.value)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${ui.pill(visaFilter === o.value)}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Country */}
        <div>
          <p className={`text-xs font-semibold mb-2 ${ui.text}`}>Country</p>
          <div className="space-y-1.5">
            <button onClick={() => setCountryFilter('all')}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${ui.pill(countryFilter === 'all')}`}>
              All Countries
            </button>
            {activeCountries.map((c) => (
              <button key={c.code} onClick={() => setCountryFilter(c.code)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${ui.pill(countryFilter === c.code)}`}>
                {c.flag} {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Saved jobs */}
        <button onClick={() => setSavedOnly((s) => !s)}
          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${ui.pill(savedOnly)}`}>
          ♥ Saved jobs only
        </button>

        {/* Expired jobs */}
        <button onClick={() => setHideExpired((s) => !s)}
          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${ui.pill(!hideExpired)}`}>
          ⏰ Show expired{expiredCount > 0 ? ` (${expiredCount})` : ''}
        </button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${ui.bg} transition-colors duration-300`}>
      {(showProfile || showWelcome) && (
        <ProfileModal
          onSave={handleSaveProfile}
          dark={dark}
          initialProfile={profile}
          onClose={() => { setShowProfile(false); setShowWelcome(false); }}
          welcome={showWelcome}
        />
      )}
      {showRelocation && <RelocationModal onClose={() => setShowRelocation(false)} dark={dark} />}
      <ChatWidget dark={dark} profile={profile} />
      <Navbar dark={dark} onToggleDark={toggleDark} />

      {/* Search header */}
      <div className={`relative border-b ${ui.divider} px-4 sm:px-8 py-5 overflow-hidden`}>
        {dark && (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-[#080810] to-violet-950/30 pointer-events-none" />
            <div className="absolute -top-10 -left-10 w-64 h-64 bg-indigo-600/8 rounded-full blur-3xl pointer-events-none" />
          </>
        )}
        <div className="relative max-w-7xl mx-auto space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🌐</span>
            <h1 className={`text-lg font-bold ${dark ? 'gradient-text' : 'text-zinc-900'}`}>Global Jobs</h1>
            {profile?.name && <span className={`text-xs px-2 py-0.5 rounded-full border ${dark ? 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10' : 'border-indigo-200 text-indigo-600 bg-indigo-50'}`}>for {profile.name}</span>}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); setQuery(input); setPage(1); }}
            className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">🔍</span>
              <input value={input} onChange={(e) => setInput(e.target.value)}
                placeholder="Job title, skills, company..."
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${ui.input}`} />
            </div>
            <button type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20">
              Search
            </button>
            <button type="button" onClick={() => setShowProfile(true)}
              className={`px-3 py-2.5 rounded-xl border text-sm transition-all hidden sm:flex items-center gap-1.5 ${dark ? 'border-[#1e1e2e] text-zinc-300 hover:bg-[#0e0e18]' : 'border-zinc-200 text-zinc-600 hover:bg-white'}`}>
              👤 {profile?.name || 'Profile'}
            </button>
          </form>

        </div>
      </div>

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5">
        {/* Stats row */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className={`text-sm font-semibold ${ui.text}`}>
              {loading ? 'Loading...' : `${filtered.length.toLocaleString()} jobs`}
            </p>
            <p className={`text-xs ${ui.sub}`}>
              {profile?.name ? `Matched for ${profile.name}` : 'Set up your profile for AI matching'}
              {!loading && ` · across ${new Set(filtered.map(j => j.country)).size} countries`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowRelocation(true)}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all hidden sm:block">
              ✈️ I got the job
            </button>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`lg:hidden px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${dark ? 'border-[#1e1e2e] text-zinc-300' : 'border-zinc-200 text-zinc-600'}`}>
              ⚙️ Filters
            </button>
          </div>
        </div>

        {/* No profile banner */}
        {!profile && (
          <div className={`rounded-2xl border p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${dark ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-indigo-200 bg-indigo-50'}`}>
            <div>
              <p className={`text-sm font-semibold ${ui.text}`}>Unlock AI-powered Opportunity Scores</p>
              <p className={`text-xs mt-0.5 ${ui.sub}`}>Upload your resume to see visa status, match %, and Opportunity Scores on every job.</p>
            </div>
            <button onClick={() => setShowProfile(true)}
              className="flex-shrink-0 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all">
              Set up profile
            </button>
          </div>
        )}

        {/* Mobile filter drawer */}
        {showFilters && (
          <div className="lg:hidden mb-4">
            <FilterSidebar />
          </div>
        )}

        <div className="flex gap-5">
          {/* Left sidebar - desktop */}
          <div className="hidden lg:block w-52 flex-shrink-0">
            <div className="sticky top-20">
              <FilterSidebar />
            </div>
          </div>

          {/* Job list — always full width now (no right panel) */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className={`rounded-2xl border p-4 space-y-3 ${ui.card}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${dark ? 'bg-zinc-800' : 'bg-zinc-200'} animate-pulse`} />
                      <div className="flex-1 space-y-2">
                        <div className={`h-3 w-1/2 rounded ${dark ? 'bg-zinc-800' : 'bg-zinc-200'} animate-pulse`} />
                        <div className={`h-2.5 w-3/4 rounded ${dark ? 'bg-zinc-800' : 'bg-zinc-200'} animate-pulse`} />
                      </div>
                    </div>
                    <div className={`h-2 w-1/3 rounded ${dark ? 'bg-zinc-800' : 'bg-zinc-200'} animate-pulse`} />
                    <div className={`h-1.5 rounded-full ${dark ? 'bg-zinc-800' : 'bg-zinc-200'} animate-pulse`} />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className={`text-center py-20 ${ui.sub}`}>
                <p className="text-4xl mb-3">🌍</p>
                <p className="text-sm font-medium">No jobs match your filters</p>
                <p className="text-xs mt-1">Try adjusting the filters or search term</p>
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 gap-3">
                  {paginated.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      profile={profile}
                      dark={dark}
                      selected={selectedJob?.id === job.id}
                      predictedSalary={predictedSalaries[job.id]}
                      onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                    />
                  ))}
                </div>
                {paginated.length < filtered.length && (
                  <div className="text-center pt-5">
                    <button onClick={() => setPage((p) => p + 1)}
                      className={`px-6 py-2.5 rounded-xl border text-sm font-medium transition-all ${dark ? 'border-[#1e1e2e] text-zinc-300 hover:bg-[#0e0e18]' : 'border-zinc-200 text-zinc-700 hover:bg-white'}`}>
                      Load more · {filtered.length - paginated.length} remaining
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Full-screen job detail modal (all screen sizes) */}
        {selectedJob && (
          <JobDetailPanel
            job={selectedJob}
            profile={profile}
            dark={dark}
            predictedSalary={predictedSalaries[selectedJob?.id]}
            onClose={() => setSelectedJob(null)}
          />
        )}
      </div>
    </div>
  );
}
