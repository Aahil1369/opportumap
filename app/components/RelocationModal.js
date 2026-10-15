'use client';

// "I got the job": the relocation guide on /jobs. The visitor names the role, the company and
// where it is, and gets a plan for the move: housing and cost of living, the first legal steps,
// the work visa, people to ask on LinkedIn, and community / roommate links. Static data
// (app/data/visaData.js); no AI call. A card in the kit's Dialog (focus trap, Esc), on the
// hall's tokens.
//
//   <RelocationModal onClose returnFocusRef />

import { useState } from 'react';
import Dialog from './kit/Dialog';
import { SETTLEMENT_INFO, VISA_INFO } from '../data/visaData';
import { ADZUNA_COUNTRIES } from '../data/countries';
import './desk.css';

const LABEL = 'font-mono text-xs tracking-[0.14em] uppercase text-ink-sub';
const FIELD =
  'w-full px-3 py-2.5 border border-rule rounded-lg bg-hall-3 text-ink placeholder:text-ink-sub text-base outline-none focus:border-sign';

export default function RelocationModal({ onClose, returnFocusRef }) {
  const [jobInput, setJobInput] = useState({ title: '', company: '', city: '', country: '' });
  const [submitted, setSubmitted] = useState(false);

  const countryCode = jobInput.country;
  const countryInfo = ADZUNA_COUNTRIES.find((c) => c.code === countryCode);
  const settlement = SETTLEMENT_INFO[countryCode];
  const visa = VISA_INFO[countryCode];

  // LinkedIn searches for people at the company, and people who made the same move
  const linkedinPeople = jobInput.company
    ? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${jobInput.title} ${jobInput.company}`)}&origin=GLOBAL_SEARCH_HEADER`
    : null;
  const linkedinRelocated =
    jobInput.city || countryInfo?.label
      ? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${jobInput.title} ${jobInput.city || countryInfo?.label} relocated`)}&origin=GLOBAL_SEARCH_HEADER`
      : null;
  const linkedinCompanyPage = jobInput.company
    ? `https://www.linkedin.com/company/${encodeURIComponent(jobInput.company.toLowerCase().replace(/\s+/g, '-'))}`
    : null;

  const redditUrl = settlement?.reddit ? `https://www.reddit.com/${settlement.reddit.split(',')[0].trim()}` : null;
  const meetupUrl = settlement?.meetup ? `https://${settlement.meetup}` : null;

  const canSubmit = jobInput.country && jobInput.title;
  const set = (key) => (e) => setJobInput((p) => ({ ...p, [key]: e.target.value }));

  return (
    <Dialog open onClose={onClose} labelledBy="move-title" className="desk-move" returnFocusRef={returnFocusRef}>
      <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-rule flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="move-title" className="font-sans font-extrabold tracking-tight text-[24px] leading-[1.15] text-ink">
            I got the job
          </h2>
          <p className="text-base mt-1 text-ink-dim">Your relocation plan: visa steps, housing and people to ask.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the relocation guide"
          className="shrink-0 grid place-items-center w-11 h-11 rounded-lg text-xl leading-none text-ink-dim hover:text-ink hover:bg-hall-3"
        >
          ✕
        </button>
      </div>

      <div className="px-5 sm:px-6 py-5 space-y-5">
        {!submitted ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit) setSubmitted(true);
            }}
          >
            <p className="text-base text-ink-dim">
              Tell us about the job, even if it&apos;s not on OpportuMap. We&apos;ll build your relocation plan.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="move-role" className={`${LABEL} mb-1.5 block`}>
                  Job title *
                </label>
                <input id="move-role" value={jobInput.title} onChange={set('title')} placeholder="e.g. Software Engineer" className={FIELD} required />
              </div>
              <div>
                <label htmlFor="move-company" className={`${LABEL} mb-1.5 block`}>
                  Company
                </label>
                <input id="move-company" value={jobInput.company} onChange={set('company')} placeholder="e.g. Shopify" className={FIELD} />
              </div>
              <div>
                <label htmlFor="move-country" className={`${LABEL} mb-1.5 block`}>
                  Country *
                </label>
                <select id="move-country" value={jobInput.country} onChange={set('country')} className={FIELD} required>
                  <option value="">Select country</option>
                  {ADZUNA_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="move-city" className={`${LABEL} mb-1.5 block`}>
                  City
                </label>
                <input id="move-city" value={jobInput.city} onChange={set('city')} placeholder="e.g. London, Berlin, NYC" className={FIELD} />
              </div>
            </div>
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full min-h-12 rounded-lg bg-sign text-sign-ink hover:bg-amber disabled:opacity-45 font-mono text-base font-bold tracking-[0.12em] uppercase"
            >
              Build my relocation plan →
            </button>
          </form>
        ) : (
          <>
            <div className="border border-rule rounded-lg p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-semibold text-ink">
                  {jobInput.title}
                  {jobInput.company ? ` at ${jobInput.company}` : ''}
                </p>
                <p className="text-base mt-1 text-ink-sub">
                  {jobInput.city ? `${jobInput.city}, ` : ''}
                  {countryInfo?.label}
                </p>
              </div>
              <span className="text-2xl" aria-hidden="true">
                {countryInfo?.flag}
              </span>
            </div>

            {settlement && (
              <Section title="Housing & cost of living">
                <InfoRow label="Average rent" value={settlement.avgRent} />
                <InfoRow label="Safety" value={settlement.safety} />
                <InfoRow label="Healthcare" value={settlement.healthcare} />
                {settlement.neighborhoods && (
                  <div className="mt-3">
                    <p className={`${LABEL} mb-1.5`}>Best neighborhoods</p>
                    <ul className="space-y-1">
                      {Object.values(settlement.neighborhoods).map((desc, i) => (
                        <li key={i} className="text-base text-ink-dim">
                          • {desc}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Section>
            )}

            {settlement && (
              <Section title="Legal first steps">
                <p className="text-base leading-relaxed text-ink-dim">{settlement.legal}</p>
              </Section>
            )}

            {visa && (
              <Section title="Work visa">
                <InfoRow label="Visa type" value={visa.workVisa} />
                <InfoRow label="Apply at" value={visa.applyAt} />
                <InfoRow label="Processing time" value={visa.processingTime} />
                <p className="text-base mt-2 leading-relaxed text-ink-dim">{visa.tips}</p>
              </Section>
            )}

            <Section title="Find people on LinkedIn">
              <p className="text-base mb-3 text-ink-dim">
                Connect with people who work at {jobInput.company || 'this company'} or have relocated to {countryInfo?.label}.
                Great for roommates, local advice, and building your network before you arrive.
              </p>
              <div className="space-y-2">
                {linkedinPeople && (
                  <LinkCard
                    title={`People at ${jobInput.company}`}
                    desc={`Find colleagues who work at ${jobInput.company}: reach out before your start date`}
                    href={linkedinPeople}
                  />
                )}
                {linkedinRelocated && (
                  <LinkCard
                    title={`${jobInput.title}s who relocated to ${jobInput.city || countryInfo?.label}`}
                    desc="People who made the same move: ask them about their experience"
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

            <Section title="Community & roommates">
              <p className="text-base mb-3 text-ink-dim">
                Connect with others moving to {countryInfo?.label} around the same time: split rent, share tips, and build
                community before you land.
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
                    desc="Tech and expat events in your new city: the quickest way to meet people"
                    href={meetupUrl}
                  />
                )}
                <LinkCard
                  title="Find a roommate on SpareRoom"
                  desc="The go-to site for finding roommates internationally"
                  href="https://www.spareroom.co.uk"
                />
                <LinkCard
                  title="InterNations: expat community"
                  desc="An expat network with local groups in cities worldwide"
                  href="https://www.internations.org"
                />
              </div>
            </Section>

            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="w-full min-h-11 rounded-lg border border-rule text-ink-dim hover:bg-hall-3 hover:text-ink text-base font-medium"
            >
              ← Start over
            </button>
          </>
        )}
      </div>
    </Dialog>
  );
}

function Section({ title, children }) {
  return (
    <section className="border border-rule rounded-lg p-4">
      <h3 className={`${LABEL} mb-3`}>{title}</h3>
      {children}
    </section>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-4 mb-2">
      <span className="text-base shrink-0 w-32 text-ink-sub">{label}</span>
      <span className="text-base text-right text-ink">{value}</span>
    </div>
  );
}

function LinkCard({ title, desc, href }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 p-3 border border-rule rounded-lg hover:bg-hall-3 focus-visible:outline-2 focus-visible:outline-sign"
    >
      <div className="min-w-0">
        <p className="text-base font-medium text-ink">{title}</p>
        <p className="text-base mt-0.5 text-ink-sub">{desc}</p>
      </div>
      <span className="ml-auto text-sign text-base shrink-0 mt-0.5" aria-hidden="true">
        →
      </span>
    </a>
  );
}
