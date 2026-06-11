'use client';

import { useState } from 'react';
import { SETTLEMENT_INFO, VISA_INFO } from '../data/visaData';
import { ADZUNA_COUNTRIES } from '../data/countries';

export default function RelocationModal({ onClose }) {
  const [jobInput, setJobInput] = useState({ title: '', company: '', city: '', country: '' });
  const [submitted, setSubmitted] = useState(false);

  const countryCode = jobInput.country;
  const countryInfo = ADZUNA_COUNTRIES.find(c => c.code === countryCode);
  const settlement = SETTLEMENT_INFO[countryCode];
  const visa = VISA_INFO[countryCode];

  // Generate LinkedIn search URLs
  const linkedinPeople = jobInput.company
    ? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${jobInput.title} ${jobInput.company}`)}&origin=GLOBAL_SEARCH_HEADER`
    : null;
  const linkedinRelocated = jobInput.city || countryInfo?.label
    ? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${jobInput.title} ${jobInput.city || countryInfo?.label} relocated`)}&origin=GLOBAL_SEARCH_HEADER`
    : null;
  const linkedinCompanyPage = jobInput.company
    ? `https://www.linkedin.com/company/${encodeURIComponent(jobInput.company.toLowerCase().replace(/\s+/g, '-'))}`
    : null;

  const redditUrl = settlement?.reddit
    ? `https://www.reddit.com/${settlement.reddit.split(',')[0].trim()}`
    : null;
  const meetupUrl = settlement?.meetup
    ? `https://${settlement.meetup}`
    : null;

  const canSubmit = jobInput.country && jobInput.title;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl border border-paper-rule bg-paper-bg shadow-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-paper-rule flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-display text-[24px] leading-[1.1] text-paper-ink">I got the job</h2>
            <p className="text-[12px] mt-1 text-paper-ink-sub">Full relocation guide, visa steps, and community connections</p>
          </div>
          <button onClick={onClose} className="text-lg leading-none px-2 text-paper-ink-sub hover:text-paper-ink transition-colors">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {!submitted ? (
            <>
              <p className="text-[13px] text-paper-ink-dim">
                Tell us about the job — even if it&apos;s not on OpportuMap. We&apos;ll build your complete relocation plan.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-mono text-[10px] tracking-[0.1em] uppercase mb-1.5 block text-paper-ink-sub">Job title *</label>
                  <input value={jobInput.title} onChange={(e) => setJobInput(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Software Engineer"
                    className="w-full px-3 py-2.5 border border-paper-rule bg-paper-bg text-paper-ink placeholder-paper-ink-sub text-[13px] outline-none focus:border-accent transition-colors" />
                </div>
                <div>
                  <label className="font-mono text-[10px] tracking-[0.1em] uppercase mb-1.5 block text-paper-ink-sub">Company</label>
                  <input value={jobInput.company} onChange={(e) => setJobInput(p => ({ ...p, company: e.target.value }))}
                    placeholder="e.g. Google"
                    className="w-full px-3 py-2.5 border border-paper-rule bg-paper-bg text-paper-ink placeholder-paper-ink-sub text-[13px] outline-none focus:border-accent transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-mono text-[10px] tracking-[0.1em] uppercase mb-1.5 block text-paper-ink-sub">Country *</label>
                  <select value={jobInput.country} onChange={(e) => setJobInput(p => ({ ...p, country: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-paper-rule bg-paper-bg text-paper-ink text-[13px] outline-none focus:border-accent transition-colors">
                    <option value="">Select country</option>
                    {ADZUNA_COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-mono text-[10px] tracking-[0.1em] uppercase mb-1.5 block text-paper-ink-sub">City</label>
                  <input value={jobInput.city} onChange={(e) => setJobInput(p => ({ ...p, city: e.target.value }))}
                    placeholder="e.g. London, Berlin, NYC"
                    className="w-full px-3 py-2.5 border border-paper-rule bg-paper-bg text-paper-ink placeholder-paper-ink-sub text-[13px] outline-none focus:border-accent transition-colors" />
                </div>
              </div>
              <button onClick={() => canSubmit && setSubmitted(true)} disabled={!canSubmit}
                className="w-full py-2.5 bg-paper-ink text-paper-bg hover:bg-[#2a3a2f] disabled:opacity-40 text-[13px] font-medium transition-colors">
                Generate my relocation guide →
              </button>
            </>
          ) : (
            <>
              {/* Job header */}
              <div className="border border-paper-rule p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[14px] font-medium text-paper-ink">{jobInput.title}{jobInput.company ? ` at ${jobInput.company}` : ''}</p>
                    <p className="text-[12px] mt-1 text-paper-ink-sub">{jobInput.city ? `${jobInput.city}, ` : ''}{countryInfo?.flag} {countryInfo?.label}</p>
                  </div>
                  <span className="text-2xl">{countryInfo?.flag}</span>
                </div>
              </div>

              {/* Housing */}
              {settlement && (
                <Section title="Housing &amp; Cost of Living">
                  <InfoRow label="Average rent" value={settlement.avgRent} />
                  <InfoRow label="Safety" value={settlement.safety} />
                  <InfoRow label="Healthcare" value={settlement.healthcare} />
                  {settlement.neighborhoods && (
                    <div className="mt-3">
                      <p className="font-mono text-[10px] tracking-[0.1em] uppercase mb-1.5 text-paper-ink-sub">Best neighborhoods</p>
                      {Object.values(settlement.neighborhoods).map((desc, i) => (
                        <p key={i} className="text-[12px] mb-1 text-paper-ink-dim">• {desc}</p>
                      ))}
                    </div>
                  )}
                </Section>
              )}

              {/* Legal */}
              {settlement && (
                <Section title="Legal First Steps">
                  <p className="text-[12px] leading-relaxed text-paper-ink-dim">{settlement.legal}</p>
                </Section>
              )}

              {/* Visa */}
              {visa && (
                <Section title="Work Visa">
                  <InfoRow label="Visa type" value={visa.workVisa} />
                  <InfoRow label="Apply at" value={visa.applyAt} />
                  <InfoRow label="Processing time" value={visa.processingTime} />
                  <p className="text-[12px] mt-2 leading-relaxed text-paper-ink-dim">{visa.tips}</p>
                </Section>
              )}

              {/* LinkedIn connections */}
              <Section title="Find People on LinkedIn">
                <p className="text-[12px] mb-3 text-paper-ink-dim">
                  Connect with people who work at {jobInput.company || 'this company'} or have relocated to {countryInfo?.label}. Great for roommates, local advice, and building your network before you arrive.
                </p>
                <div className="space-y-2">
                  {linkedinPeople && (
                    <LinkCard
                      title={`People at ${jobInput.company}`}
                      desc={`Find colleagues who work at ${jobInput.company} — reach out before your start date`}
                      href={linkedinPeople}
                    />
                  )}
                  {linkedinRelocated && (
                    <LinkCard
                      title={`${jobInput.title}s who relocated to ${jobInput.city || countryInfo?.label}`}
                      desc="People who made the same move — ask them about their experience"
                      href={linkedinRelocated}
                    />
                  )}
                  {linkedinCompanyPage && (
                    <LinkCard
                      title={`${jobInput.company} company page`}
                      desc="Follow for updates, see current employees, find your future team"
                      href={linkedinCompanyPage}
                    />
                  )}
                </div>
              </Section>

              {/* Community */}
              <Section title="Community &amp; Roommates">
                <p className="text-[12px] mb-3 text-paper-ink-dim">
                  Connect with others moving to {countryInfo?.label} around the same time — split rent, share tips, and build community before you land.
                </p>
                <div className="space-y-2">
                  {redditUrl && (
                    <LinkCard
                      title={`Reddit: ${settlement?.reddit?.split(',')[0]?.trim()}`}
                      desc="Ask questions, read real expat experiences, find roommates"
                      href={redditUrl}
                    />
                  )}
                  {meetupUrl && (
                    <LinkCard
                      title="Find local Meetups"
                      desc="Tech and expat events in your new city — best way to meet people fast"
                      href={`https://${settlement?.meetup}`}
                    />
                  )}
                  <LinkCard
                    title="Find a roommate on SpareRoom"
                    desc="The go-to site for finding roommates internationally"
                    href={`https://www.spareroom.co.uk`}
                  />
                  <LinkCard
                    title="Internations — expat community"
                    desc="Official expat network in 420+ cities worldwide"
                    href="https://www.internations.org"
                  />
                </div>
              </Section>

              <button onClick={() => setSubmitted(false)}
                className="w-full py-2 border border-paper-rule text-paper-ink-dim hover:bg-paper-bg-alt text-[12px] font-medium transition-colors">
                ← Start over
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="border border-paper-rule p-4">
      <p className="font-mono text-[10px] tracking-[0.12em] uppercase mb-3 text-paper-ink-sub">{title}</p>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-4 mb-2">
      <span className="text-[12px] flex-shrink-0 w-28 text-paper-ink-sub">{label}</span>
      <span className="text-[12px] text-right text-paper-ink">{value}</span>
    </div>
  );
}

function LinkCard({ title, desc, href }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="flex items-start gap-3 p-3 border border-paper-rule hover:bg-paper-bg-alt transition-colors">
      <div>
        <p className="text-[12px] font-medium text-paper-ink">{title}</p>
        <p className="text-[12px] mt-0.5 text-paper-ink-sub">{desc}</p>
      </div>
      <span className="ml-auto text-accent text-[12px] flex-shrink-0 mt-0.5">→</span>
    </a>
  );
}
