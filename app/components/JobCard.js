'use client';

import { useState } from 'react';
import { getVisaStatus, VISA_COLORS } from '../data/visaData';
import { ADZUNA_COUNTRIES } from '../data/countries';
import { matchColor } from '../data/matchJobs';

const VISA_EASE = {
  citizen: 100,
  free: 90,
  e_visa: 60,
  on_arrival: 50,
  required: 20,
  unknown: 40,
};

const VISA_BADGE = {
  citizen: { label: 'Citizen', color: 'text-sky-400 bg-sky-400/10 border-sky-400/20' },
  free: { label: 'No Visa', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
  e_visa: { label: 'E-Visa', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  on_arrival: { label: 'On Arrival', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  required: { label: 'Visa Required', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  unknown: { label: 'Remote', color: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20' },
};

export function opportunityScore(matchScore, nationality, jobCountry) {
  const visaStatus = nationality ? getVisaStatus(nationality, jobCountry) : 'unknown';
  const visaPoints = VISA_EASE[visaStatus] ?? 40;
  return Math.round(matchScore * 0.6 + visaPoints * 0.4);
}

export function oppScoreColor(score) {
  if (score >= 70) return { ring: 'text-green-400', label: 'Excellent', bg: 'bg-green-400' };
  if (score >= 50) return { ring: 'text-yellow-400', label: 'Good', bg: 'bg-yellow-400' };
  if (score >= 30) return { ring: 'text-orange-400', label: 'Fair', bg: 'bg-orange-400' };
  return { ring: 'text-red-400', label: 'Hard', bg: 'bg-red-400' };
}

function CompanyInitials({ company, size = 40 }) {
  const initials = (company || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const colors = [
    'bg-indigo-500', 'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
    'bg-rose-500', 'bg-amber-500', 'bg-cyan-500', 'bg-pink-500',
  ];
  const color = colors[(company || '').charCodeAt(0) % colors.length];

  return (
    <div
      className={`${color} rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

export default function JobCard({ job, profile, dark, selected, onClick, predictedSalary }) {
  const [saved, setSaved] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem('opportumap_saved') || '[]');
      return s.includes(job.id);
    } catch { return false; }
  });

  const countryInfo = ADZUNA_COUNTRIES.find((c) => c.code === job.country);
  const visaStatus = profile?.nationality ? getVisaStatus(profile.nationality, job.country) : 'unknown';
  const visaBadge = VISA_BADGE[job.remote ? 'unknown' : (visaStatus || 'unknown')];
  const mc = profile?.skills && job.matchScore > 0 ? matchColor(job.matchScore) : null;
  const oppScore = profile ? opportunityScore(job.matchScore, profile.nationality, job.country) : null;
  const oppColor = oppScore !== null ? oppScoreColor(oppScore) : null;
  const salary = job.salary !== 'Salary not listed' ? job.salary
    : predictedSalary ? `~${predictedSalary}` : null;

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

  const ui = {
    card: selected
      ? dark ? 'bg-[#1e1e24] border-indigo-500/60 shadow-lg shadow-indigo-500/10' : 'bg-indigo-50 border-indigo-400'
      : dark ? 'bg-[#1a1a1d] border-[#2a2a2e] hover:border-[#3a3a3e]' : 'bg-white border-zinc-200 hover:border-zinc-300',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border p-4 cursor-pointer transition-all group ${ui.card}`}
    >
      {/* Top row: logo + company + save */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <CompanyInitials company={job.company} size={42} />
          <div className="min-w-0">
            <p className={`text-xs font-medium truncate ${ui.sub}`}>{job.company}</p>
            <p className={`text-sm font-semibold leading-tight truncate group-hover:text-indigo-400 transition-colors ${ui.text}`}>
              {job.title}
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          className={`flex-shrink-0 text-base transition-colors ${saved ? 'text-indigo-400' : dark ? 'text-zinc-600 hover:text-zinc-300' : 'text-zinc-300 hover:text-zinc-500'}`}
          title={saved ? 'Unsave' : 'Save job'}
        >
          {saved ? '♥' : '♡'}
        </button>
      </div>

      {/* Location row */}
      <p className={`text-xs mb-3 truncate ${ui.sub}`}>
        {countryInfo?.flag} {job.location}
        {job.remote && <span className="ml-1 text-emerald-400 font-medium">· Remote</span>}
      </p>

      {/* Badges row */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {/* Visa badge - only show if user has a nationality set */}
        {profile?.nationality && !job.remote && (
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${visaBadge.color}`}>
            🛂 {visaBadge.label}
          </span>
        )}
        {job.remote && (
          <span className="text-xs px-2 py-0.5 rounded-full border text-emerald-400 bg-emerald-400/10 border-emerald-400/20 font-medium">
            🌐 Remote
          </span>
        )}
        {salary && (
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
            predictedSalary && job.salary === 'Salary not listed'
              ? dark ? 'text-zinc-400 bg-zinc-800/50 border-zinc-700' : 'text-zinc-500 bg-zinc-100 border-zinc-200'
              : dark ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' : 'text-indigo-600 bg-indigo-50 border-indigo-100'
          }`}>
            💰 {salary}
            {predictedSalary && job.salary === 'Salary not listed' && <span className="opacity-60 ml-1">est.</span>}
          </span>
        )}
      </div>

      {/* Opportunity Score bar */}
      {oppScore !== null && (
        <div className="mt-1">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-medium ${ui.sub}`}>Opportunity Score</span>
            <span className={`text-xs font-bold ${oppColor.ring}`}>{oppScore} · {oppColor.label}</span>
          </div>
          <div className={`h-1.5 rounded-full ${dark ? 'bg-[#2a2a2e]' : 'bg-zinc-100'}`}>
            <div
              className={`h-1.5 rounded-full transition-all ${oppColor.bg}`}
              style={{ width: `${oppScore}%` }}
            />
          </div>
        </div>
      )}

      {/* Source tag */}
      {job.source && job.source !== 'adzuna' && (
        <p className={`text-xs mt-2 ${dark ? 'text-zinc-600' : 'text-zinc-300'}`}>via {job.source}</p>
      )}
    </div>
  );
}
