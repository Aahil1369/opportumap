'use client';

import { useState, useEffect } from 'react';
import { getVisaStatus, VISA_INFO, SETTLEMENT_INFO } from '../data/visaData';
import { ADZUNA_COUNTRIES } from '../data/countries';
import { opportunityScore, oppScoreColor } from './JobCard';
import { matchColor } from '../data/matchJobs';

const VISA_BADGE = {
  citizen:    { label: 'You are a citizen',    color: 'text-sky-400 bg-sky-400/10 border-sky-400/20',     icon: '🏠' },
  free:       { label: 'No visa required',      color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: '✅' },
  e_visa:     { label: 'E-Visa (apply online)', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',  icon: '🌐' },
  on_arrival: { label: 'Visa on arrival',       color: 'text-orange-400 bg-orange-400/10 border-orange-400/20', icon: '🛬' },
  required:   { label: 'Work visa required',    color: 'text-red-400 bg-red-400/10 border-red-400/20',     icon: '📋' },
  unknown:    { label: 'Remote / Worldwide',    color: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20',  icon: '🌍' },
};

const VERDICT_CONFIG = {
  apply: {
    bg: 'from-emerald-500/15 to-teal-500/10',
    border: 'border-emerald-500/25',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    icon: '✅',
    label: 'Strong Match — Apply Now',
    dot: 'bg-emerald-400',
  },
  maybe: {
    bg: 'from-amber-500/15 to-orange-500/10',
    border: 'border-amber-500/25',
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    icon: '⚡',
    label: 'Possible Match — Worth a Shot',
    dot: 'bg-amber-400',
  },
  skip: {
    bg: 'from-red-500/12 to-rose-500/8',
    border: 'border-red-500/20',
    badge: 'bg-red-500/10 text-red-400 border-red-500/20',
    icon: '⚠️',
    label: 'Not a Great Fit',
    dot: 'bg-red-400',
  },
};

const COMPANY_GRADIENTS = [
  'from-indigo-500 to-violet-600', 'from-violet-500 to-purple-600',
  'from-blue-500 to-indigo-600', 'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600', 'from-amber-500 to-orange-600',
  'from-cyan-500 to-blue-600', 'from-pink-500 to-rose-600',
];

function CompanyLogo({ company, size = 52 }) {
  const initials = (company || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const gradient = COMPANY_GRADIENTS[(company || '').charCodeAt(0) % COMPANY_GRADIENTS.length];
  return (
    <div
      className={`bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center text-white font-black flex-shrink-0 shadow-xl`}
      style={{ width: size, height: size, fontSize: size * 0.3 }}
    >
      {initials}
    </div>
  );
}

function OppRing({ score, color }) {
  const circumference = 2 * Math.PI * 36;
  const dash = (score / 100) * circumference;
  const strokeColor = score >= 70 ? '#4ade80' : score >= 50 ? '#facc15' : score >= 30 ? '#fb923c' : '#f87171';
  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
        <circle cx="40" cy="40" r="36" fill="none"
          stroke={strokeColor} strokeWidth="7"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-xl font-black ${color.text}`}>{score}</span>
        <span className={`text-xs font-semibold ${color.text} opacity-70`}>{color.label}</span>
      </div>
    </div>
  );
}

export default function JobDetailPanel({ job, profile, dark, predictedSalary, onClose }) {
  const [advice, setAdvice] = useState(null);
  const [adviceLoading, setAdviceLoading] = useState(false);

  useEffect(() => {
    if (!job) return;
    setAdvice(null);
    if (!profile) return;
    setAdviceLoading(true);
    fetch('/api/job-advice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job, profile }),
    })
      .then((r) => r.json())
      .then((d) => { setAdvice(d); setAdviceLoading(false); })
      .catch(() => setAdviceLoading(false));
  }, [job?.id, profile]);

  if (!job) return null;

  const countryInfo = ADZUNA_COUNTRIES.find((c) => c.code === job.country);
  const visaStatus = profile?.nationality && !job.remote ? getVisaStatus(profile.nationality, job.country) : 'unknown';
  const visaBadge = VISA_BADGE[visaStatus || 'unknown'];
  const visaInfo = VISA_INFO?.[job.country];
  const settlement = SETTLEMENT_INFO?.[job.country];
  const oppScore = profile ? opportunityScore(job.matchScore || 0, profile.nationality, job.country) : null;
  const oppColor = oppScore !== null ? oppScoreColor(oppScore) : null;
  const salary = job.salary !== 'Salary not listed' ? job.salary
    : predictedSalary ? `~${predictedSalary}` : null;
  const isEstimated = !job.salary || job.salary === 'Salary not listed';

  const cleanDesc = job.description
    ? job.description.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim()
    : null;

  const postedDate = job.posted_at
    ? new Date(job.posted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  const verdictCfg = advice?.verdict ? VERDICT_CONFIG[advice.verdict] || VERDICT_CONFIG.maybe : null;

  const ui = {
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
    card: dark ? 'bg-[#0a0a12] border-[#1e1e2e]' : 'bg-zinc-50 border-zinc-200',
    divider: dark ? 'border-[#1e1e2e]' : 'border-zinc-100',
  };

  return (
    /* Full-screen modal overlay */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      {/* Modal container */}
      <div
        className={`relative w-full max-w-2xl max-h-[92vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${dark ? 'bg-[#080810] border-[#1e1e2e] shadow-black/60' : 'bg-white border-zinc-200 shadow-zinc-200/80'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient top strip */}
        <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 flex-shrink-0" />

        {/* Header */}
        <div className={`relative flex items-start gap-4 px-6 pt-5 pb-5 border-b flex-shrink-0 ${ui.divider}`}>
          {dark && <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/30 to-transparent pointer-events-none" />}
          <CompanyLogo company={job.company} size={52} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className={`text-xs font-medium mb-0.5 ${ui.sub}`}>{job.company}</p>
                <h2 className={`text-xl font-black leading-tight ${ui.text}`}>{job.title}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-sm ${ui.sub}`}>{countryInfo?.flag} {job.location}</span>
                  {job.remote && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">Remote</span>}
                  {postedDate && <span className={`text-xs ${ui.sub}`}>· Posted {postedDate}</span>}
                </div>
              </div>
              <button onClick={onClose}
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${dark ? 'text-zinc-500 hover:text-zinc-200 hover:bg-white/8' : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'}`}>
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">

            {/* AI Verdict */}
            {profile && (
              <div className={`rounded-2xl border p-4 bg-gradient-to-br ${verdictCfg ? verdictCfg.bg : (dark ? 'from-indigo-950/40 to-violet-950/20' : 'from-indigo-50 to-violet-50')} ${verdictCfg ? verdictCfg.border : (dark ? 'border-indigo-500/20' : 'border-indigo-200')}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm">{verdictCfg ? verdictCfg.icon : '🤖'}</span>
                  <p className={`text-xs font-bold uppercase tracking-widest ${ui.sub}`}>AI Career Advice</p>
                  {verdictCfg && (
                    <span className={`ml-auto text-xs px-2.5 py-0.5 rounded-full border font-semibold ${verdictCfg.badge}`}>
                      {verdictCfg.label}
                    </span>
                  )}
                </div>

                {adviceLoading && (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[0,1,2].map((i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${dark ? 'bg-indigo-400' : 'bg-indigo-500'} animate-bounce`} style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                    <span className={`text-xs ${ui.sub}`}>Analyzing your profile...</span>
                  </div>
                )}

                {!adviceLoading && advice && (
                  <>
                    <p className={`text-sm font-semibold mb-3 leading-snug ${ui.text}`}>{advice.headline}</p>
                    <div className="space-y-1.5 mb-3">
                      {(advice.reasons || []).map((r, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${verdictCfg?.dot || 'bg-indigo-400'}`} />
                          <p className={`text-xs leading-relaxed ${ui.sub}`}>{r}</p>
                        </div>
                      ))}
                    </div>
                    {advice.tips?.length > 0 && (
                      <div className={`rounded-xl p-3 ${dark ? 'bg-white/4' : 'bg-white/80'}`}>
                        <p className={`text-xs font-semibold mb-1.5 ${ui.text}`}>💡 Tips if you apply:</p>
                        {advice.tips.map((t, i) => (
                          <p key={i} className={`text-xs ${ui.sub} mb-0.5`}>→ {t}</p>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {!adviceLoading && !advice && !profile && (
                  <p className={`text-xs ${ui.sub}`}>Set up your profile to get personalized AI advice for every job.</p>
                )}
              </div>
            )}

            {/* Opportunity Score + Salary row */}
            <div className="grid grid-cols-2 gap-3">
              {oppScore !== null && (
                <div className={`rounded-2xl border p-4 flex items-center gap-4 ${ui.card}`}>
                  <OppRing score={oppScore} color={oppColor} />
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${ui.sub}`}>Opp. Score</p>
                    <p className={`text-xs ${ui.sub}`}>{job.matchScore || 0}% skill match</p>
                    {profile?.nationality && !job.remote && (
                      <p className={`text-xs mt-1 ${ui.sub}`}>🛂 {visaBadge.label}</p>
                    )}
                  </div>
                </div>
              )}

              <div className={`rounded-2xl border p-4 ${ui.card} ${oppScore === null ? 'col-span-2' : ''}`}>
                <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${ui.sub}`}>Compensation</p>
                {salary ? (
                  <>
                    <p className={`text-lg font-black ${ui.text}`}>{salary}</p>
                    {isEstimated && <p className={`text-xs mt-0.5 ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>AI estimate</p>}
                  </>
                ) : (
                  <p className={`text-sm ${ui.sub}`}>Not listed</p>
                )}
                {settlement?.avgRent && (
                  <p className={`text-xs mt-2 ${ui.sub}`}>🏠 Rent ~{settlement.avgRent}/mo</p>
                )}
              </div>
            </div>

            {/* Job Description */}
            {cleanDesc && (
              <div className={`rounded-2xl border p-5 ${ui.card}`}>
                <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${ui.sub}`}>About the Role</p>
                <p className={`text-sm leading-relaxed ${ui.sub}`}>{cleanDesc}</p>
              </div>
            )}

            {/* Cost of Living */}
            {settlement && (
              <div className={`rounded-2xl border p-5 ${ui.card}`}>
                <p className={`text-xs font-semibold uppercase tracking-widest mb-4 ${ui.sub}`}>
                  🏙️ Living in {countryInfo?.label || job.country.toUpperCase()}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {settlement.avgRent && (
                    <div className={`rounded-xl p-3 ${dark ? 'bg-[#080810]' : 'bg-white'} border ${ui.divider}`}>
                      <p className={`text-xs ${ui.sub} mb-0.5`}>Avg Rent (1BR)</p>
                      <p className={`text-sm font-bold ${ui.text}`}>{settlement.avgRent}</p>
                    </div>
                  )}
                  {settlement.safety && (
                    <div className={`rounded-xl p-3 ${dark ? 'bg-[#080810]' : 'bg-white'} border ${ui.divider}`}>
                      <p className={`text-xs ${ui.sub} mb-0.5`}>Safety</p>
                      <p className={`text-sm font-bold ${ui.text}`}>{settlement.safety}</p>
                    </div>
                  )}
                  {settlement.healthcare && (
                    <div className={`rounded-xl p-3 col-span-2 ${dark ? 'bg-[#080810]' : 'bg-white'} border ${ui.divider}`}>
                      <p className={`text-xs ${ui.sub} mb-0.5`}>Healthcare</p>
                      <p className={`text-sm ${ui.text}`}>{settlement.healthcare}</p>
                    </div>
                  )}
                  {settlement.neighborhoods?.length > 0 && (
                    <div className={`rounded-xl p-3 col-span-2 ${dark ? 'bg-[#080810]' : 'bg-white'} border ${ui.divider}`}>
                      <p className={`text-xs ${ui.sub} mb-1.5`}>Popular neighborhoods</p>
                      <div className="flex flex-wrap gap-1.5">
                        {settlement.neighborhoods.map((n) => (
                          <span key={n} className={`text-xs px-2 py-0.5 rounded-full ${dark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>{n}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Visa Status */}
            {profile?.nationality && (
              <div className={`rounded-2xl border p-5 ${ui.card}`}>
                <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${ui.sub}`}>Visa Status for You</p>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold mb-4 ${visaBadge.color}`}>
                  {visaBadge.icon} {visaBadge.label}
                </div>
                {visaInfo && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      ['Work Visa Type', visaInfo.workVisa],
                      ['Processing Time', visaInfo.processingTime],
                      ['Apply At', visaInfo.applyAt],
                      ['Tips', visaInfo.tips],
                    ].filter(([, v]) => v).map(([label, value]) => (
                      <div key={label} className={`rounded-xl p-3 ${dark ? 'bg-[#080810]' : 'bg-white'} border ${ui.divider}`}>
                        <p className={`text-xs ${ui.sub} mb-0.5`}>{label}</p>
                        <p className={`text-xs font-medium ${ui.text}`}>{value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Spacer for sticky footer */}
            <div className="h-2" />
          </div>
        </div>

        {/* Sticky footer CTA */}
        <div className={`flex-shrink-0 px-6 py-4 border-t ${ui.divider} ${dark ? 'bg-[#080810]/90' : 'bg-white/90'} backdrop-blur-sm`}>
          <div className="flex gap-3">
            {job.url ? (
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm text-center transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
              >
                Apply for this Job →
              </a>
            ) : (
              <div className="flex-1 py-3.5 rounded-2xl bg-zinc-700/50 text-zinc-400 font-bold text-sm text-center cursor-not-allowed">
                No Apply Link
              </div>
            )}
            <button
              onClick={onClose}
              className={`px-5 py-3.5 rounded-2xl border font-semibold text-sm transition-all ${dark ? 'border-[#1e1e2e] text-zinc-400 hover:bg-white/5 hover:text-zinc-200' : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700'}`}
            >
              Not for me
            </button>
          </div>
          <p className={`text-xs text-center mt-2 ${dark ? 'text-zinc-600' : 'text-zinc-400'}`}>
            via {job.source || 'adzuna'} · {countryInfo?.flag} {countryInfo?.label || job.country?.toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  );
}
