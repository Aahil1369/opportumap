'use client';

import { useState, useEffect } from 'react';
import { getVisaStatus, VISA_INFO, SETTLEMENT_INFO } from '../data/visaData';
import { ADZUNA_COUNTRIES } from '../data/countries';
import { opportunityScore, oppScoreColor } from './JobCard';
import { matchColor } from '../data/matchJobs';

const VISA_BADGE = {
  citizen:    { label: 'You are a citizen' },
  free:       { label: 'No visa required' },
  e_visa:     { label: 'E-Visa (apply online)' },
  on_arrival: { label: 'Visa on arrival' },
  required:   { label: 'Work visa required' },
  unknown:    { label: 'Remote / Worldwide' },
};

const VERDICT_CONFIG = {
  apply: {
    label: 'Strong Match — Apply Now',
  },
  maybe: {
    label: 'Possible Match — Worth a Shot',
  },
  skip: {
    label: 'Not a Great Fit',
  },
};

function OppRing({ score }) {
  const r = 36;
  const circumference = 2 * Math.PI * r;
  const dash = (score / 100) * circumference;
  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="7" className="text-paper-rule" />
        <circle cx="40" cy="40" r={r} fill="none"
          stroke="#c75d2c" strokeWidth="7"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[24px] leading-none text-accent">{score}</span>
        <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-paper-ink-sub mt-1">/100</span>
      </div>
    </div>
  );
}

export default function JobDetailPanel({ job, profile, predictedSalary, onClose }) {
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

  return (
    /* Full-screen modal overlay */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal container */}
      <div
        className="relative w-full max-w-2xl max-h-[92vh] border border-paper-rule bg-paper-bg shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative flex items-start gap-4 px-6 pt-5 pb-5 border-b border-paper-rule flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-paper-ink-sub mb-1">{job.company}</p>
                <h2 className="font-display text-[26px] leading-[1.1] text-paper-ink">{job.title}</h2>
                <div className="flex items-center gap-2 mt-2 flex-wrap font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub">
                  <span>{countryInfo?.flag} {job.location}</span>
                  {job.remote && <span className="px-1.5 py-0.5 border border-paper-rule">Remote</span>}
                  {postedDate && <span>· Posted {postedDate}</span>}
                </div>
              </div>
              <button onClick={onClose}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-sm border border-paper-rule text-paper-ink-sub hover:text-paper-ink hover:bg-paper-bg-alt transition-colors">
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
              <div className="border border-paper-rule bg-paper-bg-alt p-4">
                <div className="flex items-center gap-2 mb-3">
                  <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-paper-ink-sub">AI Career Advice</p>
                  {verdictCfg && (
                    <span className="ml-auto font-mono text-[10px] tracking-[0.1em] uppercase px-2.5 py-0.5 border border-paper-rule text-accent">
                      {verdictCfg.label}
                    </span>
                  )}
                </div>

                {adviceLoading && (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[0,1,2].map((i) => (
                        <div key={i} className="w-1.5 h-1.5 bg-accent animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                    <span className="text-[12px] text-paper-ink-sub">Analyzing your profile...</span>
                  </div>
                )}

                {!adviceLoading && advice && (
                  <>
                    <p className="text-[14px] font-medium mb-3 leading-snug text-paper-ink">{advice.headline}</p>
                    <div className="space-y-1.5 mb-3">
                      {(advice.reasons || []).map((r, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-accent text-[10px] mt-1 flex-shrink-0">●</span>
                          <p className="text-[13px] leading-relaxed text-paper-ink-dim">{r}</p>
                        </div>
                      ))}
                    </div>
                    {advice.tips?.length > 0 && (
                      <div className="border border-paper-rule p-3 bg-paper-bg">
                        <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub mb-1.5">Tips if you apply</p>
                        {advice.tips.map((t, i) => (
                          <p key={i} className="text-[13px] text-paper-ink-dim mb-0.5">→ {t}</p>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {!adviceLoading && !advice && !profile && (
                  <p className="text-[13px] text-paper-ink-sub">Set up your profile to get personalized AI advice for every job.</p>
                )}
              </div>
            )}

            {/* Opportunity Score + Salary row */}
            <div className="grid grid-cols-2 gap-3">
              {oppScore !== null && (
                <div className="border border-paper-rule p-4 flex items-center gap-4">
                  <OppRing score={oppScore} />
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-paper-ink-sub mb-1">Opp. Score</p>
                    <p className="text-[12px] text-paper-ink-dim">{job.matchScore || 0}% skill match</p>
                    {profile?.nationality && !job.remote && (
                      <p className="text-[12px] mt-1 text-paper-ink-dim">{visaBadge.label}</p>
                    )}
                  </div>
                </div>
              )}

              <div className={`border border-paper-rule p-4 ${oppScore === null ? 'col-span-2' : ''}`}>
                <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-paper-ink-sub mb-2">Compensation</p>
                {salary ? (
                  <>
                    <p className="font-display text-[22px] leading-none text-paper-ink">{salary}</p>
                    {isEstimated && <p className="text-[12px] mt-1 text-paper-ink-sub">AI estimate</p>}
                  </>
                ) : (
                  <p className="text-[13px] text-paper-ink-sub">Not listed</p>
                )}
                {settlement?.avgRent && (
                  <p className="text-[12px] mt-2 text-paper-ink-dim">Rent ~{settlement.avgRent}/mo</p>
                )}
              </div>
            </div>

            {/* Job Description */}
            {cleanDesc && (
              <div className="border border-paper-rule p-5">
                <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-paper-ink-sub mb-3">About the Role</p>
                <p className="text-[13px] leading-relaxed text-paper-ink-dim">{cleanDesc}</p>
              </div>
            )}

            {/* Cost of Living */}
            {settlement && (
              <div className="border border-paper-rule p-5">
                <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-paper-ink-sub mb-4">
                  Living in {countryInfo?.label || job.country.toUpperCase()}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {settlement.avgRent && (
                    <div className="border border-paper-rule p-3">
                      <p className="text-[12px] text-paper-ink-sub mb-0.5">Avg Rent (1BR)</p>
                      <p className="text-[14px] font-medium text-paper-ink">{settlement.avgRent}</p>
                    </div>
                  )}
                  {settlement.safety && (
                    <div className="border border-paper-rule p-3">
                      <p className="text-[12px] text-paper-ink-sub mb-0.5">Safety</p>
                      <p className="text-[14px] font-medium text-paper-ink">{settlement.safety}</p>
                    </div>
                  )}
                  {settlement.healthcare && (
                    <div className="border border-paper-rule p-3 col-span-2">
                      <p className="text-[12px] text-paper-ink-sub mb-0.5">Healthcare</p>
                      <p className="text-[13px] text-paper-ink">{settlement.healthcare}</p>
                    </div>
                  )}
                  {settlement.neighborhoods?.length > 0 && (
                    <div className="border border-paper-rule p-3 col-span-2">
                      <p className="text-[12px] text-paper-ink-sub mb-1.5">Popular neighborhoods</p>
                      <div className="flex flex-wrap gap-1.5 font-mono text-[10px] tracking-[0.1em] uppercase">
                        {settlement.neighborhoods.map((n) => (
                          <span key={n} className="px-2 py-0.5 border border-paper-rule text-paper-ink-dim">{n}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Visa Status */}
            {profile?.nationality && (
              <div className="border border-paper-rule p-5">
                <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-paper-ink-sub mb-3">Visa Status for You</p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-paper-rule font-mono text-[11px] tracking-[0.1em] uppercase text-accent mb-4">
                  {visaBadge.label}
                </div>
                {visaInfo && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      ['Work Visa Type', visaInfo.workVisa],
                      ['Processing Time', visaInfo.processingTime],
                      ['Apply At', visaInfo.applyAt],
                      ['Tips', visaInfo.tips],
                    ].filter(([, v]) => v).map(([label, value]) => (
                      <div key={label} className="border border-paper-rule p-3">
                        <p className="text-[12px] text-paper-ink-sub mb-0.5">{label}</p>
                        <p className="text-[13px] font-medium text-paper-ink">{value}</p>
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
        <div className="flex-shrink-0 px-6 py-4 border-t border-paper-rule bg-paper-bg/95 backdrop-blur-sm">
          <div className="flex gap-3">
            {job.url ? (
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3.5 bg-paper-ink text-paper-bg hover:bg-[#2a3a2f] font-medium text-[14px] text-center transition-colors"
              >
                Apply for this Job →
              </a>
            ) : (
              <div className="flex-1 py-3.5 border border-paper-rule text-paper-ink-sub font-medium text-[14px] text-center cursor-not-allowed">
                No Apply Link
              </div>
            )}
            <button
              onClick={onClose}
              className="px-5 py-3.5 border border-paper-rule text-paper-ink-dim hover:bg-paper-bg-alt font-medium text-[14px] transition-colors"
            >
              Not for me
            </button>
          </div>
          <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-center mt-2 text-paper-ink-sub">
            via {job.source || 'adzuna'} · {countryInfo?.flag} {countryInfo?.label || job.country?.toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  );
}
