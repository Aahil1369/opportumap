'use client';

import { useState } from 'react';
import { getVisaStatus, VISA_COLORS } from '../data/visaData';
import { ADZUNA_COUNTRIES } from '../data/countries';
import { matchColor } from '../data/matchJobs';

const VISA_EASE = {
  citizen: 100, free: 90, e_visa: 60, on_arrival: 50, required: 20, unknown: 40,
};

const VISA_BADGE = {
  citizen:    { label: 'Citizen',    color: 'text-sky-400 bg-sky-400/10 border-sky-400/20' },
  free:       { label: 'No Visa',    color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  e_visa:     { label: 'E-Visa',     color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  on_arrival: { label: 'On Arrival', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  required:   { label: 'Visa Req.',  color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  unknown:    { label: 'Remote',     color: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20' },
};

const COMPANY_GRADIENTS = [
  'from-indigo-500 to-violet-600',
  'from-violet-500 to-purple-600',
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-blue-600',
  'from-pink-500 to-rose-600',
];

export function opportunityScore(matchScore, nationality, jobCountry) {
  const visaStatus = nationality ? getVisaStatus(nationality, jobCountry) : 'unknown';
  const visaPoints = VISA_EASE[visaStatus] ?? 40;
  return Math.round(matchScore * 0.6 + visaPoints * 0.4);
}

export function oppScoreColor(score) {
  if (score >= 70) return { text: 'text-emerald-400', bar: 'from-emerald-500 to-teal-500', label: 'Excellent' };
  if (score >= 50) return { text: 'text-amber-400',   bar: 'from-amber-500 to-orange-400', label: 'Good' };
  if (score >= 30) return { text: 'text-orange-400',  bar: 'from-orange-500 to-red-400',   label: 'Fair' };
  return             { text: 'text-red-400',           bar: 'from-red-500 to-rose-600',     label: 'Hard' };
}

function CompanyLogo({ company, size = 44 }) {
  const initials = (company || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const gradient = COMPANY_GRADIENTS[(company || '').charCodeAt(0) % COMPANY_GRADIENTS.length];
  return (
    <div
      className={`bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center text-white font-black flex-shrink-0 shadow-lg`}
      style={{ width: size, height: size, fontSize: size * 0.32 }}
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
  const oppScore = profile ? opportunityScore(job.matchScore || 0, profile.nationality, job.country) : null;
  const oppColor = oppScore !== null ? oppScoreColor(oppScore) : null;
  const salary = job.salary !== 'Salary not listed' ? job.salary
    : predictedSalary ? `~${predictedSalary}` : null;
  const isEstimated = predictedSalary && job.salary === 'Salary not listed';

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

  const cardBase = `rounded-2xl border cursor-pointer transition-all duration-200 overflow-hidden group`;
  const cardStyle = selected
    ? dark
      ? 'bg-[#12121e] border-indigo-500/60 shadow-xl shadow-indigo-500/15 ring-1 ring-indigo-500/30'
      : 'bg-indigo-50/80 border-indigo-400 shadow-lg shadow-indigo-500/10'
    : dark
      ? 'bg-[#0e0e18] border-[#1e1e2e] hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-0.5'
      : 'bg-white border-zinc-200 hover:border-indigo-300/60 hover:shadow-xl hover:shadow-indigo-500/8 hover:-translate-y-0.5';

  const text = dark ? 'text-zinc-100' : 'text-zinc-900';
  const sub  = dark ? 'text-zinc-400' : 'text-zinc-500';

  return (
    <div onClick={onClick} className={`${cardBase} ${cardStyle}`}>
      {/* Top accent line on selected */}
      {selected && <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500" />}

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <CompanyLogo company={job.company} size={42} />
            <div className="min-w-0">
              <p className={`text-xs font-medium truncate ${sub}`}>{job.company}</p>
              <p className={`text-sm font-bold leading-snug truncate transition-colors group-hover:text-indigo-400 ${text}`}>
                {job.title}
              </p>
            </div>
          </div>
          <button
            onClick={handleSave}
            className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              saved
                ? 'text-indigo-400 bg-indigo-500/10'
                : dark ? 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5' : 'text-zinc-300 hover:text-zinc-500 hover:bg-zinc-50'
            }`}>
            <span className="text-sm">{saved ? '♥' : '♡'}</span>
          </button>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 mb-3">
          <span className={`text-xs truncate ${sub}`}>
            {countryInfo?.flag} {job.location}
          </span>
          {job.remote && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex-shrink-0">
              Remote
            </span>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {profile?.nationality && !job.remote && (
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${visaBadge.color}`}>
              🛂 {visaBadge.label}
            </span>
          )}
          {salary && (
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
              isEstimated
                ? dark ? 'text-zinc-400 border-zinc-700 bg-zinc-800/50' : 'text-zinc-500 border-zinc-200 bg-zinc-50'
                : 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10'
            }`}>
              💰 {salary}{isEstimated && <span className="opacity-60 text-xs ml-0.5">est.</span>}
            </span>
          )}
        </div>

        {/* Opportunity Score */}
        {oppScore !== null && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs ${sub}`}>Opportunity Score</span>
              <span className={`text-xs font-bold ${oppColor.text}`}>{oppScore}% · {oppColor.label}</span>
            </div>
            <div className={`h-1.5 rounded-full overflow-hidden ${dark ? 'bg-white/6' : 'bg-zinc-100'}`}>
              <div
                className={`h-1.5 rounded-full bg-gradient-to-r ${oppColor.bar} transition-all duration-700`}
                style={{ width: `${oppScore}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-1 pt-3 border-t" style={{ borderColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
          {job.url ? (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold transition-all hover:scale-105 shadow-md shadow-indigo-500/20">
              Apply →
            </a>
          ) : <span />}
          {job.source && job.source !== 'adzuna' && (
            <p className={`text-xs ${dark ? 'text-zinc-600' : 'text-zinc-400'}`}>via {job.source}</p>
          )}
        </div>
      </div>
    </div>
  );
}
