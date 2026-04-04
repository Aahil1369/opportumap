'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import JobCard from '../components/JobCard';
import JobDetailPanel from '../components/JobDetailPanel';
import { useTheme } from '../hooks/useTheme';
import { scoreJob } from '../data/matchJobs';

export default function SavedJobsPage() {
  const { dark, toggleDark } = useTheme();
  const [savedIds, setSavedIds] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [predictedSalaries, setPredictedSalaries] = useState({});
  const [loading, setLoading] = useState(true);

  // Load profile + saved IDs from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('opportumap_profile');
      if (raw) setProfile(JSON.parse(raw));
    } catch {}
    try {
      const ids = JSON.parse(localStorage.getItem('opportumap_saved') || '[]');
      setSavedIds(ids);
    } catch {}
  }, []);

  // Fetch saved jobs from the jobs API once we have the IDs
  useEffect(() => {
    if (savedIds.length === 0) { setLoading(false); return; }
    setLoading(true);

    // Fetch a broad set of jobs then filter by saved IDs
    // We search multiple times to maximise hit rate across saved job sources
    const sources = ['software engineer', 'data scientist', 'product manager', 'designer', 'engineer'];
    Promise.allSettled(
      sources.map((q) => fetch(`/api/jobs?q=${encodeURIComponent(q)}`).then((r) => r.json()))
    ).then((results) => {
      const all = results.flatMap((r) => r.status === 'fulfilled' ? (r.value.jobs || []) : []);
      // Deduplicate
      const seen = new Set();
      const deduped = all.filter((j) => { if (seen.has(j.id)) return false; seen.add(j.id); return true; });
      // Keep only saved ones
      const saved = deduped.filter((j) => savedIds.includes(j.id));
      setJobs(saved.map((j) => ({ ...j, matchScore: scoreJob(j, profile) })));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [savedIds]);

  // AI salary prediction for saved jobs without salary
  useEffect(() => {
    if (!jobs.length) return;
    jobs.filter((j) => j.salary === 'Salary not listed').forEach((job) => {
      if (predictedSalaries[job.id]) return;
      fetch('/api/predict-salary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: job.title, company: job.company, location: job.location, country: job.country }),
      })
        .then((r) => r.json())
        .then((d) => { if (d.display) setPredictedSalaries((prev) => ({ ...prev, [job.id]: d.display })); })
        .catch(() => {});
    });
  }, [jobs]);

  const handleUnsave = (jobId) => {
    try {
      const updated = savedIds.filter((id) => id !== jobId);
      setSavedIds(updated);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      localStorage.setItem('opportumap_saved', JSON.stringify(updated));
      if (selectedJob?.id === jobId) setSelectedJob(null);
    } catch {}
  };

  const ui = {
    bg: dark ? 'bg-[#080810]' : 'bg-[#f5f5f7]',
    card: dark ? 'bg-[#0e0e18] border-[#1e1e2e]' : 'bg-white border-zinc-200',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
    divider: dark ? 'border-[#1e1e2e]' : 'border-zinc-200',
  };

  return (
    <div className={`min-h-screen ${ui.bg} transition-colors duration-300`}>
      <Navbar dark={dark} onToggleDark={toggleDark} />

      {/* Header */}
      <div className={`relative overflow-hidden border-b ${ui.divider}`}>
        {dark && (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-rose-950/40 via-[#080810] to-indigo-950/30 pointer-events-none" />
            <div className="absolute -top-10 right-0 w-64 h-64 bg-rose-600/8 rounded-full blur-3xl pointer-events-none" />
          </>
        )}
        <div className="relative max-w-5xl mx-auto px-4 sm:px-8 py-10">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-4 text-xs font-medium ${dark ? 'border-rose-500/30 bg-rose-500/10 text-rose-400' : 'border-rose-200 bg-rose-50 text-rose-600'}`}>
            ♥ Saved Jobs
          </div>
          <h1 className={`text-3xl font-black mb-2 ${dark ? 'gradient-text' : 'text-zinc-900'}`}>
            Your Saved Jobs
          </h1>
          <p className={`text-sm ${ui.sub}`}>
            {savedIds.length > 0
              ? `${savedIds.length} job${savedIds.length !== 1 ? 's' : ''} saved · click any card to view details and apply`
              : 'Jobs you heart will appear here'}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">

        {/* Loading skeletons */}
        {loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
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
        )}

        {/* Empty state — no saved IDs at all */}
        {!loading && savedIds.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl ${dark ? 'bg-[#0e0e18]' : 'bg-white'} border ${ui.divider} shadow-lg`}>
              ♡
            </div>
            <div>
              <p className={`text-lg font-bold mb-1 ${ui.text}`}>No saved jobs yet</p>
              <p className={`text-sm ${ui.sub}`}>Tap the ♡ on any job card to save it for later</p>
            </div>
            <a href="/jobs"
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-500/25 hover:scale-105">
              Browse Jobs →
            </a>
          </div>
        )}

        {/* Saved IDs exist but none loaded from API yet */}
        {!loading && savedIds.length > 0 && jobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <p className={`text-4xl mb-2`}>🔍</p>
            <p className={`text-sm font-semibold ${ui.text}`}>Couldn&apos;t reload {savedIds.length} saved job{savedIds.length !== 1 ? 's' : ''}</p>
            <p className={`text-xs max-w-sm ${ui.sub}`}>
              These listings may have expired or been removed. Your saves are still stored — try again or browse for new ones.
            </p>
            <div className="flex gap-3">
              <button onClick={() => window.location.reload()}
                className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${dark ? 'border-[#1e1e2e] text-zinc-300 hover:bg-[#0e0e18]' : 'border-zinc-200 text-zinc-600 hover:bg-white'}`}>
                Retry
              </button>
              <a href="/jobs"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all">
                Browse Jobs
              </a>
            </div>
          </div>
        )}

        {/* Job grid */}
        {!loading && jobs.length > 0 && (
          <>
            {/* Profile nudge if no profile */}
            {!profile && (
              <div className={`rounded-2xl border p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${dark ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-indigo-200 bg-indigo-50'}`}>
                <div>
                  <p className={`text-sm font-semibold ${ui.text}`}>See Opportunity Scores on your saved jobs</p>
                  <p className={`text-xs mt-0.5 ${ui.sub}`}>Set up your profile to get AI match scores and visa status on every saved job.</p>
                </div>
                <a href="/jobs"
                  className="flex-shrink-0 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all">
                  Set up profile
                </a>
              </div>
            )}

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.map((job) => (
                <div key={job.id} className="relative group/saved">
                  <JobCard
                    job={job}
                    profile={profile}
                    dark={dark}
                    selected={selectedJob?.id === job.id}
                    predictedSalary={predictedSalaries[job.id]}
                    onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                  />
                  {/* Unsave button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleUnsave(job.id); }}
                    className={`absolute top-3 right-3 opacity-0 group-hover/saved:opacity-100 transition-all text-xs px-2.5 py-1 rounded-full border font-medium ${dark ? 'border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20' : 'border-red-200 text-red-500 bg-red-50 hover:bg-red-100'}`}
                    title="Remove from saved"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Job detail modal */}
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
  );
}
