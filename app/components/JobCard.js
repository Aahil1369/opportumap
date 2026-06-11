'use client';

import { useState } from 'react';
import { getVisaStatus } from '../data/visaData';
import { ADZUNA_COUNTRIES } from '../data/countries';
import { matchColor } from '../data/matchJobs';

// Visa ease — much gentler penalties. A visa requirement is an obstacle, not a dealbreaker.
const VISA_EASE = {
  citizen:    100,
  free:        95,
  e_visa:      85,
  on_arrival:  78,
  required:    62,  // was 20 — having to get a visa is fine, just more work
  unknown:     75,
};

const VISA_BADGE = {
  citizen:    { label: 'Citizen' },
  free:       { label: 'No Visa' },
  e_visa:     { label: 'E-Visa' },
  on_arrival: { label: 'On Arrival' },
  required:   { label: 'Visa Req.' },
  unknown:    { label: 'Remote' },
};

export function opportunityScore(matchScore, nationality, jobCountry) {
  const visaStatus = nationality ? getVisaStatus(nationality, jobCountry) : 'unknown';
  const visaPoints = VISA_EASE[visaStatus] ?? 75;
  // Skills are 85% of the score — your skills matter most, not your passport
  return Math.round(matchScore * 0.85 + visaPoints * 0.15);
}

export function oppScoreColor(score) {
  if (score >= 75) return { label: 'Excellent' };
  if (score >= 55) return { label: 'Strong' };
  if (score >= 40) return { label: 'Good' };
  if (score >= 28) return { label: 'Fair' };
  return             { label: 'Low' };
}

function getJobFreshness(job) {
  const now = Date.now();
  // Check expires_at first (most reliable)
  if (job.expires_at) {
    const exp = new Date(job.expires_at).getTime();
    if (exp < now) return 'expired';
    if (exp - now < 7 * 24 * 60 * 60 * 1000) return 'expiring'; // <7 days left
  }
  // Fall back to posted_at age
  if (job.posted_at) {
    const posted = new Date(job.posted_at).getTime();
    const ageDays = (now - posted) / (24 * 60 * 60 * 1000);
    if (ageDays > 60) return 'expired';
    if (ageDays > 45) return 'expiring';
  }
  return 'fresh';
}

export default function JobCard({ job, profile, selected, onClick, predictedSalary }) {
  const [saved, setSaved] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem('opportumap_saved') || '[]');
      return s.includes(job.id);
    } catch { return false; }
  });

  const countryInfo = ADZUNA_COUNTRIES.find((c) => c.code === job.country);
  const visaStatus = profile?.nationality ? getVisaStatus(profile.nationality, job.country) : 'unknown';
  const visaBadge = VISA_BADGE[job.remote ? 'unknown' : (visaStatus || 'unknown')];
  const oppScore = profile ? opportunityScore(job.matchScore || 0, profile.nationality, job.country) : null;
  const oppColor = oppScore !== null ? oppScoreColor(oppScore) : null;
  const salary = job.salary !== 'Salary not listed' ? job.salary
    : predictedSalary ? `~${predictedSalary}` : null;
  const isEstimated = predictedSalary && job.salary === 'Salary not listed';
  const freshness = getJobFreshness(job);

  const handleSave = (e) => {
    e.stopPropagation();
    const next = !saved;
    setSaved(next);
    try {
      const s = JSON.parse(localStorage.getItem('opportumap_saved') || '[]');
      const updated = next ? [...s, job.id] : s.filter((id) => id !== job.id);
      localStorage.setItem('opportumap_saved', JSON.stringify(updated));
    } catch {}
  };

  return (
    <div
      onClick={onClick}
      className={`group border cursor-pointer transition-colors p-5 ${
        selected ? 'border-accent bg-paper-bg-alt' : 'border-paper-rule bg-paper-bg hover:bg-paper-bg-alt'
      } ${freshness === 'expired' ? 'opacity-50' : ''}`}
    >
      {/* Expired / expiring banners */}
      {freshness === 'expired' && (
        <div className="-mx-5 -mt-5 mb-4 px-5 py-1.5 border-b border-paper-rule font-mono text-[10px] tracking-[0.1em] uppercase text-accent">
          Deadline passed — listing may no longer be active
        </div>
      )}
      {freshness === 'expiring' && (
        <div className="-mx-5 -mt-5 mb-4 px-5 py-1.5 border-b border-paper-rule font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub">
          Closing soon
        </div>
      )}

      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-paper-ink-sub truncate">{job.company}</p>
          <h3 className="font-display text-[20px] leading-[1.15] text-paper-ink truncate mt-0.5">
            {job.title}
          </h3>
        </div>
        <button
          onClick={handleSave}
          className={`flex-shrink-0 w-7 h-7 flex items-center justify-center transition-colors border ${
            saved
              ? 'border-accent text-accent'
              : 'border-paper-rule text-paper-ink-sub hover:text-paper-ink hover:bg-paper-bg-alt'
          }`}>
          <span className="text-sm">{saved ? '♥' : '♡'}</span>
        </button>
      </div>

      {/* Location */}
      <div className="flex items-center gap-2 mb-3 font-mono text-[10px] tracking-[0.12em] uppercase text-paper-ink-sub">
        <span className="truncate">
          {countryInfo?.flag} {job.location}
        </span>
        {job.remote && (
          <span className="px-1.5 py-0.5 border border-paper-rule text-paper-ink-sub flex-shrink-0">
            Remote
          </span>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-4 font-mono text-[10px] tracking-[0.1em] uppercase">
        {profile?.nationality && !job.remote && (
          <span className="px-2 py-0.5 border border-paper-rule text-paper-ink-dim">
            {visaBadge.label}
          </span>
        )}
        {salary && (
          <span className="px-2 py-0.5 border border-paper-rule text-accent">
            {salary}{isEstimated && <span className="opacity-60 ml-0.5">est.</span>}
          </span>
        )}
      </div>

      {/* Opportunity Score */}
      {oppScore !== null && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub">Opportunity Score</span>
            <span className="font-mono text-[11px] text-accent">{oppScore} · {oppColor.label}</span>
          </div>
          <div className="h-1.5 bg-paper-rule">
            <div
              className="h-1.5 bg-accent transition-all duration-700"
              style={{ width: `${oppScore}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-1 pt-3 border-t border-paper-rule">
        {job.url ? (
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="font-mono text-[11px] px-3 py-1.5 bg-paper-ink text-paper-bg hover:bg-[#2a3a2f] transition-colors">
            Apply →
          </a>
        ) : <span />}
        {job.source && job.source !== 'adzuna' && (
          <p className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub">via {job.source}</p>
        )}
      </div>
    </div>
  );
}
