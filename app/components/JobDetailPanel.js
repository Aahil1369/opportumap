'use client';

import { getVisaStatus, VISA_INFO, SETTLEMENT_INFO } from '../data/visaData';
import { ADZUNA_COUNTRIES } from '../data/countries';
import { opportunityScore, oppScoreColor } from './JobCard';
import { matchColor } from '../data/matchJobs';

const VISA_BADGE = {
  citizen: { label: 'You are a citizen', color: 'text-sky-400 bg-sky-400/10 border-sky-400/20' },
  free: { label: 'No visa required', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
  e_visa: { label: 'E-Visa (apply online)', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  on_arrival: { label: 'Visa on arrival', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  required: { label: 'Work visa required', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  unknown: { label: 'Remote / Worldwide', color: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20' },
};

function Section({ title, children, dark }) {
  return (
    <div className={`rounded-xl border p-4 ${dark ? 'border-[#2a2a2e] bg-[#16161a]' : 'border-zinc-100 bg-zinc-50'}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>{title}</p>
      {children}
    </div>
  );
}

export default function JobDetailPanel({ job, profile, dark, predictedSalary, onClose }) {
  if (!job) return null;

  const countryInfo = ADZUNA_COUNTRIES.find((c) => c.code === job.country);
  const visaStatus = profile?.nationality && !job.remote ? getVisaStatus(profile.nationality, job.country) : 'unknown';
  const visaBadge = VISA_BADGE[visaStatus || 'unknown'];
  const visaInfo = VISA_INFO?.[job.country];
  const settlement = SETTLEMENT_INFO?.[job.country];
  const mc = profile?.skills && job.matchScore > 0 ? matchColor(job.matchScore) : null;
  const oppScore = profile ? opportunityScore(job.matchScore, profile.nationality, job.country) : null;
  const oppColor = oppScore !== null ? oppScoreColor(oppScore) : null;
  const salary = job.salary !== 'Salary not listed' ? job.salary
    : predictedSalary ? `~${predictedSalary} (AI estimate)` : 'Not listed';

  const ui = {
    bg: dark ? 'bg-[#1a1a1d]' : 'bg-white',
    border: dark ? 'border-[#2a2a2e]' : 'border-zinc-200',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
  };

  // Strip HTML from description
  const cleanDesc = job.description
    ? job.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1000)
    : null;

  return (
    <div className={`flex flex-col h-full overflow-y-auto ${ui.bg}`}>
      {/* Header */}
      <div className={`flex items-start justify-between gap-3 p-5 border-b ${ui.border} flex-shrink-0`}>
        <div className="min-w-0 flex-1">
          <p className={`text-xs mb-1 ${ui.sub}`}>{countryInfo?.flag} {job.company}</p>
          <h2 className={`text-lg font-bold leading-tight mb-1 ${ui.text}`}>{job.title}</h2>
          <p className={`text-sm ${ui.sub}`}>{job.location}</p>
        </div>
        <button onClick={onClose}
          className={`flex-shrink-0 text-lg transition-colors mt-0.5 ${dark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-300 hover:text-zinc-600'}`}>
          ✕
        </button>
      </div>

      <div className="p-5 space-y-4 flex-1">

        {/* Opportunity Score */}
        {oppScore !== null && (
          <Section title="Opportunity Score" dark={dark}>
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="26" fill="none" stroke={dark ? '#2a2a2e' : '#e4e4e7'} strokeWidth="8" />
                  <circle cx="32" cy="32" r="26" fill="none"
                    stroke={oppScore >= 70 ? '#4ade80' : oppScore >= 50 ? '#facc15' : oppScore >= 30 ? '#fb923c' : '#f87171'}
                    strokeWidth="8"
                    strokeDasharray={`${(oppScore / 100) * 163} 163`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${oppColor.ring}`}>
                  {oppScore}
                </span>
              </div>
              <div>
                <p className={`text-sm font-semibold ${oppColor.ring}`}>{oppColor.label} opportunity</p>
                <p className={`text-xs mt-1 ${ui.sub}`}>
                  {mc ? `${job.matchScore}% skills match` : 'No profile set'}
                  {profile?.nationality && !job.remote && ` · Visa: ${visaBadge.label}`}
                </p>
              </div>
            </div>
          </Section>
        )}

        {/* Salary */}
        <Section title="Compensation" dark={dark}>
          <p className={`text-base font-bold ${ui.text}`}>{salary}</p>
          {settlement?.avgRent && (
            <p className={`text-xs mt-1 ${ui.sub}`}>Avg rent in {countryInfo?.label}: {settlement.avgRent}</p>
          )}
        </Section>

        {/* Visa status */}
        {profile?.nationality && (
          <Section title="Visa Status for You" dark={dark}>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold mb-3 ${visaBadge.color}`}>
              🛂 {visaBadge.label}
            </div>
            {visaInfo && (
              <div className="space-y-2">
                <div>
                  <p className={`text-xs font-medium ${ui.text}`}>Work Visa Type</p>
                  <p className={`text-xs mt-0.5 ${ui.sub}`}>{visaInfo.workVisa}</p>
                </div>
                <div>
                  <p className={`text-xs font-medium ${ui.text}`}>Processing Time</p>
                  <p className={`text-xs mt-0.5 ${ui.sub}`}>{visaInfo.processingTime}</p>
                </div>
                <div>
                  <p className={`text-xs font-medium ${ui.text}`}>Apply At</p>
                  <p className={`text-xs mt-0.5 ${ui.sub}`}>{visaInfo.applyAt}</p>
                </div>
                <div>
                  <p className={`text-xs font-medium ${ui.text}`}>Tips</p>
                  <p className={`text-xs mt-0.5 ${ui.sub}`}>{visaInfo.tips}</p>
                </div>
              </div>
            )}
            {visaStatus === 'free' || visaStatus === 'citizen' ? (
              <p className={`text-xs mt-2 ${dark ? 'text-green-400' : 'text-green-600'}`}>
                You can work here without a work visa from your home country.
              </p>
            ) : null}
          </Section>
        )}

        {/* Description */}
        {cleanDesc && (
          <Section title="About the Role" dark={dark}>
            <p className={`text-xs leading-relaxed ${ui.sub}`}>{cleanDesc}{job.description?.length > 1000 ? '...' : ''}</p>
          </Section>
        )}

        {/* Settlement info */}
        {settlement && (
          <Section title={`Living in ${countryInfo?.label || job.country.toUpperCase()}`} dark={dark}>
            <div className="space-y-1.5">
              {settlement.avgRent && <p className={`text-xs ${ui.sub}`}>🏠 Avg rent: {settlement.avgRent}</p>}
              {settlement.safety && <p className={`text-xs ${ui.sub}`}>🛡️ Safety: {settlement.safety}</p>}
              {settlement.healthcare && <p className={`text-xs ${ui.sub}`}>🏥 Healthcare: {settlement.healthcare}</p>}
              {settlement.neighborhoods?.length > 0 && (
                <p className={`text-xs ${ui.sub}`}>📍 Popular areas: {settlement.neighborhoods.join(', ')}</p>
              )}
            </div>
          </Section>
        )}

        {/* Apply button */}
        <a href={job.url} target="_blank" rel="noopener noreferrer"
          className="block w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold text-center transition-all">
          Apply Now →
        </a>

        <p className={`text-xs text-center ${ui.sub}`}>
          via {job.source || 'adzuna'} · {countryInfo?.flag} {countryInfo?.label || job.country?.toUpperCase()}
        </p>
      </div>
    </div>
  );
}
