'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import JobCard from '../components/JobCard';
import JobDetailPanel from '../components/JobDetailPanel';
import Footnote from '../components/ui/Footnote';
import { scoreJob } from '../data/matchJobs';
import { FOOTNOTES } from '../lib/pageCopy';

export default function SavedJobsPage() {
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

  return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />

      {/* Compact editorial header */}
      <section className="max-w-[1280px] mx-auto px-6 sm:px-10 py-12">
        <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-paper-ink-sub mb-4 flex items-center gap-3">
          <span className="inline-block w-7 h-px bg-paper-ink-sub" />
          <span>§ SAVED</span>
        </div>
        <h1 className="font-display text-[40px] sm:text-[56px] leading-[1.0] tracking-[-0.02em] text-paper-ink">Jobs you kept.</h1>
        <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-paper-ink-sub mt-4">
          {savedIds.length > 0
            ? `${savedIds.length} job${savedIds.length !== 1 ? 's' : ''} saved · click any card to view details and apply`
            : 'Jobs you heart will appear here'}
        </p>
      </section>

      <div className="max-w-[1280px] mx-auto px-6 sm:px-10 py-6 border-t border-paper-rule">

        {/* Loading skeletons */}
        {loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border border-paper-rule bg-paper-bg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/2 bg-paper-bg-alt animate-pulse" />
                    <div className="h-2.5 w-3/4 bg-paper-bg-alt animate-pulse" />
                  </div>
                </div>
                <div className="h-2 w-1/3 bg-paper-bg-alt animate-pulse" />
                <div className="h-1.5 bg-paper-bg-alt animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state — no saved IDs at all */}
        {!loading && savedIds.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-20 h-20 flex items-center justify-center text-3xl border border-paper-rule bg-paper-bg-alt">
              ♡
            </div>
            <div>
              <p className="font-display text-[22px] leading-[1.15] mb-1 text-paper-ink">No saved jobs yet</p>
              <p className="text-[13px] text-paper-ink-sub">Tap the ♡ on any job card to save it for later</p>
            </div>
            <a href="/jobs"
              className="px-6 py-2.5 bg-paper-ink text-paper-bg hover:bg-[#2a3a2f] text-[13px] font-medium transition-colors">
              Browse Jobs →
            </a>
          </div>
        )}

        {/* Saved IDs exist but none loaded from API yet */}
        {!loading && savedIds.length > 0 && jobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <p className="text-4xl mb-2">🔍</p>
            <p className="text-[14px] font-medium text-paper-ink">Couldn&apos;t reload {savedIds.length} saved job{savedIds.length !== 1 ? 's' : ''}</p>
            <p className="text-[12px] max-w-sm text-paper-ink-sub">
              These listings may have expired or been removed. Your saves are still stored — try again or browse for new ones.
            </p>
            <div className="flex gap-3">
              <button onClick={() => window.location.reload()}
                className="px-4 py-2 border border-paper-rule text-paper-ink hover:bg-paper-bg-alt text-[13px] font-medium transition-colors">
                Retry
              </button>
              <a href="/jobs"
                className="px-4 py-2 bg-paper-ink text-paper-bg hover:bg-[#2a3a2f] text-[13px] font-medium transition-colors">
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
              <div className="border border-paper-rule bg-paper-bg-alt p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="text-[14px] font-medium text-paper-ink">See Opportunity Scores on your saved jobs</p>
                  <p className="font-mono text-[10px] tracking-[0.1em] uppercase mt-1 text-paper-ink-sub">Set up your profile to get AI match scores and visa status on every saved job.</p>
                </div>
                <a href="/jobs"
                  className="flex-shrink-0 px-4 py-2 bg-paper-ink text-paper-bg hover:bg-[#2a3a2f] text-[12px] font-medium transition-colors">
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
                    selected={selectedJob?.id === job.id}
                    predictedSalary={predictedSalaries[job.id]}
                    onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                  />
                  {/* Unsave button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleUnsave(job.id); }}
                    className="absolute top-3 right-3 opacity-0 group-hover/saved:opacity-100 transition-opacity font-mono text-[10px] tracking-[0.1em] uppercase px-2.5 py-1 border border-accent/40 text-accent bg-paper-bg hover:bg-paper-bg-alt"
                    title="Remove from saved"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <Footnote>{FOOTNOTES.saved}</Footnote>
      </div>

      {/* Job detail modal */}
      {selectedJob && (
        <JobDetailPanel
          job={selectedJob}
          profile={profile}
          predictedSalary={predictedSalaries[selectedJob?.id]}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  );
}
