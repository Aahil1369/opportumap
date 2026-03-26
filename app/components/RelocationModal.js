'use client';

import { useState } from 'react';
import { SETTLEMENT_INFO, VISA_INFO } from '../data/visaData';
import { ADZUNA_COUNTRIES } from '../data/countries';

export default function RelocationModal({ onClose, dark }) {
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

  const ui = {
    bg: dark ? 'bg-[#1a1a1d]' : 'bg-white',
    border: dark ? 'border-[#2a2a2e]' : 'border-zinc-200',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
    input: dark ? 'bg-[#2a2a2e] border-[#3a3a3e] text-zinc-100 placeholder-zinc-500' : 'bg-zinc-50 border-zinc-300 text-zinc-900',
    card: dark ? 'bg-[#111113] border-[#2a2a2e]' : 'bg-zinc-50 border-zinc-200',
    link: 'text-indigo-400 hover:text-indigo-300 underline underline-offset-2 text-xs transition-colors',
  };

  const canSubmit = jobInput.country && jobInput.title;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl max-h-[92vh] flex flex-col ${ui.bg} ${ui.border}`}>

        {/* Header */}
        <div className={`px-6 pt-5 pb-4 border-b ${ui.border} flex items-center justify-between flex-shrink-0`}>
          <div>
            <h2 className={`text-lg font-bold ${ui.text}`}>I got the job 🎉</h2>
            <p className={`text-xs mt-0.5 ${ui.sub}`}>Full relocation guide, visa steps, and community connections</p>
          </div>
          <button onClick={onClose} className={`text-lg leading-none px-2 ${ui.sub} hover:text-white`}>✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {!submitted ? (
            <>
              <p className={`text-sm ${ui.sub}`}>
                Tell us about the job — even if it's not on OpportuMap. We'll build your complete relocation plan.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-medium mb-1 block ${ui.sub}`}>Job title *</label>
                  <input value={jobInput.title} onChange={(e) => setJobInput(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Software Engineer"
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
                </div>
                <div>
                  <label className={`text-xs font-medium mb-1 block ${ui.sub}`}>Company</label>
                  <input value={jobInput.company} onChange={(e) => setJobInput(p => ({ ...p, company: e.target.value }))}
                    placeholder="e.g. Google"
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-medium mb-1 block ${ui.sub}`}>Country *</label>
                  <select value={jobInput.country} onChange={(e) => setJobInput(p => ({ ...p, country: e.target.value }))}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`}>
                    <option value="">Select country</option>
                    {ADZUNA_COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`text-xs font-medium mb-1 block ${ui.sub}`}>City</label>
                  <input value={jobInput.city} onChange={(e) => setJobInput(p => ({ ...p, city: e.target.value }))}
                    placeholder="e.g. London, Berlin, NYC"
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
                </div>
              </div>
              <button onClick={() => canSubmit && setSubmitted(true)} disabled={!canSubmit}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium transition-all">
                Generate my relocation guide →
              </button>
            </>
          ) : (
            <>
              {/* Job header */}
              <div className={`rounded-xl border p-4 ${ui.card}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`text-sm font-bold ${ui.text}`}>{jobInput.title}{jobInput.company ? ` at ${jobInput.company}` : ''}</p>
                    <p className={`text-xs mt-0.5 ${ui.sub}`}>{jobInput.city ? `${jobInput.city}, ` : ''}{countryInfo?.flag} {countryInfo?.label}</p>
                  </div>
                  <span className="text-2xl">{countryInfo?.flag}</span>
                </div>
              </div>

              {/* Housing */}
              {settlement && (
                <Section title="🏠 Housing & Cost of Living" ui={ui}>
                  <InfoRow label="Average rent" value={settlement.avgRent} ui={ui} />
                  <InfoRow label="Safety" value={settlement.safety} ui={ui} />
                  <InfoRow label="Healthcare" value={settlement.healthcare} ui={ui} />
                  {settlement.neighborhoods && (
                    <div className="mt-3">
                      <p className={`text-xs font-semibold mb-1.5 ${ui.sub}`}>Best neighborhoods</p>
                      {Object.values(settlement.neighborhoods).map((desc, i) => (
                        <p key={i} className={`text-xs mb-1 ${ui.sub}`}>• {desc}</p>
                      ))}
                    </div>
                  )}
                </Section>
              )}

              {/* Legal */}
              {settlement && (
                <Section title="📋 Legal First Steps" ui={ui}>
                  <p className={`text-xs leading-relaxed ${ui.sub}`}>{settlement.legal}</p>
                </Section>
              )}

              {/* Visa */}
              {visa && (
                <Section title="✈️ Work Visa" ui={ui}>
                  <InfoRow label="Visa type" value={visa.workVisa} ui={ui} />
                  <InfoRow label="Apply at" value={visa.applyAt} ui={ui} />
                  <InfoRow label="Processing time" value={visa.processingTime} ui={ui} />
                  <p className={`text-xs mt-2 leading-relaxed ${ui.sub}`}>💡 {visa.tips}</p>
                </Section>
              )}

              {/* LinkedIn connections */}
              <Section title="🔗 Find People on LinkedIn" ui={ui}>
                <p className={`text-xs mb-3 ${ui.sub}`}>
                  Connect with people who work at {jobInput.company || 'this company'} or have relocated to {countryInfo?.label}. Great for roommates, local advice, and building your network before you arrive.
                </p>
                <div className="space-y-2">
                  {linkedinPeople && (
                    <LinkCard
                      icon="👥"
                      title={`People at ${jobInput.company}`}
                      desc={`Find colleagues who work at ${jobInput.company} — reach out before your start date`}
                      href={linkedinPeople}
                      ui={ui}
                    />
                  )}
                  {linkedinRelocated && (
                    <LinkCard
                      icon="✈️"
                      title={`${jobInput.title}s who relocated to ${jobInput.city || countryInfo?.label}`}
                      desc="People who made the same move — ask them about their experience"
                      href={linkedinRelocated}
                      ui={ui}
                    />
                  )}
                  {linkedinCompanyPage && (
                    <LinkCard
                      icon="🏢"
                      title={`${jobInput.company} company page`}
                      desc="Follow for updates, see current employees, find your future team"
                      href={linkedinCompanyPage}
                      ui={ui}
                    />
                  )}
                </div>
              </Section>

              {/* Community */}
              <Section title="🤝 Community & Roommates" ui={ui}>
                <p className={`text-xs mb-3 ${ui.sub}`}>
                  Connect with others moving to {countryInfo?.label} around the same time — split rent, share tips, and build community before you land.
                </p>
                <div className="space-y-2">
                  {redditUrl && (
                    <LinkCard
                      icon="💬"
                      title={`Reddit: ${settlement?.reddit?.split(',')[0]?.trim()}`}
                      desc="Ask questions, read real expat experiences, find roommates"
                      href={redditUrl}
                      ui={ui}
                    />
                  )}
                  {meetupUrl && (
                    <LinkCard
                      icon="🗺️"
                      title="Find local Meetups"
                      desc="Tech and expat events in your new city — best way to meet people fast"
                      href={`https://${settlement?.meetup}`}
                      ui={ui}
                    />
                  )}
                  <LinkCard
                    icon="🏠"
                    title="Find a roommate on SpareRoom"
                    desc="The go-to site for finding roommates internationally"
                    href={`https://www.spareroom.co.uk`}
                    ui={ui}
                  />
                  <LinkCard
                    icon="🌍"
                    title="Internations — expat community"
                    desc="Official expat network in 420+ cities worldwide"
                    href="https://www.internations.org"
                    ui={ui}
                  />
                </div>
              </Section>

              <button onClick={() => setSubmitted(false)}
                className={`w-full py-2 rounded-xl border text-xs font-medium transition-all ${dark ? 'border-[#3a3a3e] text-zinc-400 hover:bg-[#2a2a2e]' : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'}`}>
                ← Start over
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children, ui }) {
  return (
    <div className={`rounded-xl border p-4 ${ui.card}`}>
      <p className={`text-sm font-semibold mb-3 ${ui.text}`}>{title}</p>
      {children}
    </div>
  );
}

function InfoRow({ label, value, ui }) {
  return (
    <div className="flex justify-between items-start gap-4 mb-2">
      <span className={`text-xs flex-shrink-0 w-28 ${ui.sub}`}>{label}</span>
      <span className={`text-xs text-right ${ui.text}`}>{value}</span>
    </div>
  );
}

function LinkCard({ icon, title, desc, href, ui }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${ui.card} hover:border-indigo-500/50`}>
      <span className="text-lg flex-shrink-0">{icon}</span>
      <div>
        <p className={`text-xs font-semibold ${ui.text}`}>{title}</p>
        <p className={`text-xs mt-0.5 ${ui.sub}`}>{desc}</p>
      </div>
      <span className="ml-auto text-indigo-400 text-xs flex-shrink-0 mt-0.5">→</span>
    </a>
  );
}
