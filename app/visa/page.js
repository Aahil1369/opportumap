'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import EditorialHero from '../components/ui/EditorialHero';
import Btn from '../components/ui/Btn';
import Footnote from '../components/ui/Footnote';
import { useScrollReveal } from '../components/ui/hooks/useScrollReveal';
import { HERO_COPY, FOOTNOTES } from '../lib/pageCopy';
import { NATIONALITIES } from '../data/countries';
import VisaProbabilityMeter from '../components/VisaProbabilityMeter';

const COUNTRIES = [
  { code: 'us', label: 'United States 🇺🇸' },
  { code: 'gb', label: 'United Kingdom 🇬🇧' },
  { code: 'ca', label: 'Canada 🇨🇦' },
  { code: 'au', label: 'Australia 🇦🇺' },
  { code: 'de', label: 'Germany 🇩🇪' },
  { code: 'fr', label: 'France 🇫🇷' },
  { code: 'nl', label: 'Netherlands 🇳🇱' },
  { code: 'se', label: 'Sweden 🇸🇪' },
  { code: 'no', label: 'Norway 🇳🇴' },
  { code: 'dk', label: 'Denmark 🇩🇰' },
  { code: 'ch', label: 'Switzerland 🇨🇭' },
  { code: 'sg', label: 'Singapore 🇸🇬' },
  { code: 'jp', label: 'Japan 🇯🇵' },
  { code: 'kr', label: 'South Korea 🇰🇷' },
  { code: 'ae', label: 'UAE 🇦🇪' },
  { code: 'nz', label: 'New Zealand 🇳🇿' },
  { code: 'ie', label: 'Ireland 🇮🇪' },
  { code: 'es', label: 'Spain 🇪🇸' },
  { code: 'pt', label: 'Portugal 🇵🇹' },
  { code: 'at', label: 'Austria 🇦🇹' },
  { code: 'be', label: 'Belgium 🇧🇪' },
  { code: 'in', label: 'India 🇮🇳' },
  { code: 'br', label: 'Brazil 🇧🇷' },
  { code: 'mx', label: 'Mexico 🇲🇽' },
  { code: 'za', label: 'South Africa 🇿🇦' },
  { code: 'ng', label: 'Nigeria 🇳🇬' },
  { code: 'ke', label: 'Kenya 🇰🇪' },
  { code: 'eg', label: 'Egypt 🇪🇬' },
  { code: 'gh', label: 'Ghana 🇬🇭' },
  { code: 'cn', label: 'China 🇨🇳' },
  { code: 'my', label: 'Malaysia 🇲🇾' },
  { code: 'th', label: 'Thailand 🇹🇭' },
];

const STATUS_CONFIG = {
  'visa-free': { icon: '✅', label: 'Visa Free' },
  'e-visa': { icon: '💻', label: 'E-Visa' },
  'visa-on-arrival': { icon: '🛬', label: 'Visa on Arrival' },
  'visa-required': { icon: '📋', label: 'Visa Required' },
  'citizen': { icon: '🏠', label: 'Citizen' },
};

function VisaTypeCard({ visa }) {
  const [open, setOpen] = useState(false);
  const diffColor = visa.difficulty === 'easy' ? 'text-[#5a7d3f]' : visa.difficulty === 'moderate' ? 'text-[#b5912f]' : 'text-accent';

  return (
    <div className="border border-paper-rule bg-paper-bg">
      <button className="w-full p-4 text-left" onClick={() => setOpen(!open)}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[14px] font-medium text-paper-ink">{visa.name}</p>
            <p className="text-[12px] text-paper-ink-sub mt-0.5">{visa.purpose} · {visa.duration}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {visa.difficulty && <span className={`font-mono text-[11px] tracking-[0.1em] uppercase ${diffColor}`}>{visa.difficulty}</span>}
            <span className="text-[11px] text-paper-ink-sub">{open ? '▲' : '▼'}</span>
          </div>
        </div>
        <div className="flex gap-3 mt-2.5 font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub">
          {visa.cost && <span className="px-2 py-0.5 border border-paper-rule">💰 {visa.cost}</span>}
          {visa.processingTime && <span className="px-2 py-0.5 border border-paper-rule">⏱ {visa.processingTime}</span>}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-paper-rule pt-3 space-y-3">
          {visa.requirements?.length > 0 && (
            <div>
              <p className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-1.5">REQUIREMENTS</p>
              <ul className="space-y-1">
                {visa.requirements.map((r, i) => (
                  <li key={i} className="text-[12px] flex gap-1.5 text-paper-ink-dim">
                    <span className="text-accent flex-shrink-0">→</span>{r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {visa.where_to_apply && (
            <div>
              <p className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-1">WHERE TO APPLY</p>
              <p className="text-[12px] text-paper-ink-dim">{visa.where_to_apply}</p>
            </div>
          )}
          {visa.notes && <p className="text-[12px] italic text-paper-ink-sub">{visa.notes}</p>}
        </div>
      )}
    </div>
  );
}

export default function VisaPage() {
  useScrollReveal();
  const [nationality, setNationality] = useState('');
  const [targetCountry, setTargetCountry] = useState('');
  const [purpose, setPurpose] = useState('work');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [probData, setProbData] = useState(null);
  const [probLoading, setProbLoading] = useState(false);

  // Pre-fill nationality from saved profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch('/api/user-profile');
        const { profile } = await res.json();
        if (profile?.nationality) { setNationality(profile.nationality); setProfileLoaded(true); return; }
      } catch {}
      const saved = localStorage.getItem('opportumap_profile');
      if (saved) {
        const p = JSON.parse(saved);
        if (p.nationality) { setNationality(p.nationality); setProfileLoaded(true); }
      }
    };
    loadProfile();
  }, []);

  const handleSearch = async () => {
    if (!nationality || !targetCountry) { setError('Please select both your nationality and destination country.'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/visa-intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nationality, targetCountry, purpose }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);

      // Parallel probability fetch
      setProbLoading(true);
      setProbData(null);
      const savedProfile = (() => { try { const p = localStorage.getItem('opportumap_profile'); return p ? JSON.parse(p) : null; } catch { return null; } })();
      fetch('/api/visa-probability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nationality: nationality,
          destination: targetCountry,
          purpose: purpose,
          profile: savedProfile,
        }),
      })
        .then(r => r.json())
        .then(d => { if (!d.error) setProbData(d); })
        .catch(() => {})
        .finally(() => setProbLoading(false));
    } catch (e) {
      setError(e.message || 'Failed to load visa information.');
    }
    setLoading(false);
  };

  const statusCfg = result ? (STATUS_CONFIG[result.currentStatus] || STATUS_CONFIG['visa-required']) : null;

  const hero = HERO_COPY.visa;

  return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />

      <EditorialHero
        kicker={hero.kicker}
        title={hero.title}
        titleItalic={hero.italic}
        titleTail={hero.tail}
        sub={hero.sub}
        meta={['BY NATIONALITY + DESTINATION', 'CHECKLISTS + TIMELINES', 'APPROVAL PROBABILITY']}
      />

      <main className="max-w-[1280px] mx-auto px-6 sm:px-10 pb-24 border-t border-paper-rule">
        <div className="py-14">
          {profileLoaded && (
            <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 border border-paper-rule font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5a7d3f] inline-block" />
              Nationality pre-filled from your profile
            </div>
          )}

          {/* Search form */}
          <div className="border border-paper-rule bg-paper-bg-alt p-6 mb-6 max-w-[720px]">
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub block mb-1.5">YOUR PASSPORT / NATIONALITY</label>
                <select value={nationality} onChange={(e) => setNationality(e.target.value)}
                  className="w-full px-3 py-2.5 bg-paper-bg border border-paper-rule text-paper-ink text-[13px] outline-none focus:border-accent">
                  <option value="">Select your nationality</option>
                  {NATIONALITIES.map((n) => <option key={n.code} value={n.code}>{n.label}</option>)}
                </select>
              </div>
              <div>
                <label className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub block mb-1.5">DESTINATION COUNTRY</label>
                <select value={targetCountry} onChange={(e) => setTargetCountry(e.target.value)}
                  className="w-full px-3 py-2.5 bg-paper-bg border border-paper-rule text-paper-ink text-[13px] outline-none focus:border-accent">
                  <option value="">Select destination</option>
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub block mb-2">PURPOSE OF TRAVEL</label>
              <div className="flex flex-wrap gap-2">
                {['work', 'study', 'tourist', 'permanent residency', 'digital nomad'].map((p) => (
                  <button key={p} onClick={() => setPurpose(p)}
                    className={`px-3 py-1.5 text-[12px] border font-medium transition-colors capitalize ${
                      purpose === p
                        ? 'bg-paper-ink text-paper-bg border-paper-ink'
                        : 'bg-paper-bg text-paper-ink-dim border-paper-rule hover:bg-paper-bg-alt'
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-[12px] text-accent mb-3">{error}</p>}
            <Btn variant="primary" as="button" onClick={handleSearch} disabled={loading || !nationality || !targetCountry}
              className="w-full justify-center disabled:opacity-40">
              {loading ? (
                <span className="flex items-center justify-center gap-2 font-mono text-[11px] tracking-[0.12em]">
                  <span className="w-3.5 h-3.5 border-2 border-paper-bg border-t-transparent rounded-full animate-spin" />
                  ANALYZING VISA REQUIREMENTS…
                </span>
              ) : 'Get Visa Intelligence Report'}
            </Btn>
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-5">
              {/* Status banner */}
              <div className="border border-paper-rule bg-paper-bg-alt p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 border border-paper-rule font-mono text-[11px] tracking-[0.1em] uppercase text-paper-ink">
                    <span>{statusCfg.icon}</span>
                    <span>{statusCfg.label}</span>
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-paper-ink">{result.statusSummary}</p>
                    <p className="text-[12px] mt-0.5 text-paper-ink-sub">{result.overview}</p>
                  </div>
                </div>
              </div>

              {/* Probability meter */}
              {probLoading && (
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span className="font-mono text-[11px] tracking-[0.12em] text-paper-ink-sub">CALCULATING APPROVAL PROBABILITY…</span>
                </div>
              )}
              {probData && <VisaProbabilityMeter data={probData} />}

              {/* Visa types */}
              {result.visaTypes?.length > 0 && (
                <div className="border border-paper-rule bg-paper-bg-alt p-5">
                  <h3 className="font-display text-[22px] leading-[1.15] mb-4 text-paper-ink">Available Visa Types</h3>
                  <div className="space-y-3">
                    {result.visaTypes.map((v, i) => (
                      <VisaTypeCard key={i} visa={v} />
                    ))}
                  </div>
                </div>
              )}

              {/* Application steps */}
              {result.applicationSteps?.length > 0 && (
                <div className="border border-paper-rule bg-paper-bg-alt p-5">
                  <h3 className="font-display text-[22px] leading-[1.15] mb-4 text-paper-ink">How to Apply — Step by Step</h3>
                  <div className="space-y-3">
                    {result.applicationSteps.map((s, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-6 h-6 bg-paper-ink text-paper-bg font-mono text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {s.step || i + 1}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-paper-ink">{s.title || s}</p>
                          {s.detail && <p className="text-[12px] mt-0.5 text-paper-ink-sub">{s.detail}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Two col: tips + rejection reasons */}
              <div className="grid sm:grid-cols-2 gap-5">
                {/* Guarantee tips */}
                {result.guaranteeTips?.length > 0 && (
                  <div className="border border-paper-rule bg-paper-bg-alt p-5">
                    <h3 className="font-display text-[22px] leading-[1.15] mb-3 text-paper-ink">How to Guarantee Approval</h3>
                    <ul className="space-y-2.5">
                      {result.guaranteeTips.map((tip, i) => (
                        <li key={i} className="flex gap-2">
                          <span className={`text-[12px] flex-shrink-0 mt-0.5 ${tip.importance === 'critical' ? 'text-accent' : tip.importance === 'important' ? 'text-[#b5912f]' : 'text-[#5a7d3f]'}`}>
                            {tip.importance === 'critical' ? '⚡' : tip.importance === 'important' ? '★' : '✓'}
                          </span>
                          <span className="text-[12px] leading-relaxed text-paper-ink-dim">{tip.tip || tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Rejection reasons */}
                {result.commonRejectionReasons?.length > 0 && (
                  <div className="border border-paper-rule bg-paper-bg-alt p-5">
                    <h3 className="font-display text-[22px] leading-[1.15] mb-3 text-paper-ink">Common Rejection Reasons</h3>
                    <ul className="space-y-2">
                      {result.commonRejectionReasons.map((r, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-accent text-[12px] flex-shrink-0 mt-0.5">✗</span>
                          <span className="text-[12px] leading-relaxed text-paper-ink-dim">{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Path to residency */}
              {result.pathToResidency && (
                <div className="border border-paper-rule bg-paper-bg-alt p-5">
                  <h3 className="font-display text-[22px] leading-[1.15] mb-2 flex items-center gap-2 text-paper-ink">
                    <span>🏠</span> Path to Permanent Residency / Citizenship
                  </h3>
                  <p className="text-[13px] leading-relaxed text-paper-ink-dim">{result.pathToResidency}</p>
                </div>
              )}

              {/* Document Checklist */}
              {result.documentChecklist?.length > 0 && (
                <div className="border border-paper-rule bg-paper-bg-alt p-5">
                  <h3 className="font-display text-[22px] leading-[1.15] mb-4 text-paper-ink">📋 Document Checklist</h3>
                  <div className="space-y-2">
                    {result.documentChecklist.map((doc, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 border border-paper-rule bg-paper-bg">
                        <input type="checkbox" className="mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[13px] font-medium text-paper-ink">{doc.document}</p>
                          <p className="text-[12px] mt-0.5 text-paper-ink-sub">Format: <span className="text-accent">{doc.format}</span>{doc.notes ? ` · ${doc.notes}` : ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline + Financial */}
              <div className="grid sm:grid-cols-2 gap-5">
                {result.timeline && (
                  <div className="border border-paper-rule bg-paper-bg-alt p-5">
                    <h3 className="font-display text-[22px] leading-[1.15] mb-3 text-paper-ink">⏱ Application Timeline</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[12px] text-paper-ink-sub">
                        <span>Apply how far in advance</span>
                        <span className="font-medium text-paper-ink">{result.timeline.applyHowFarInAdvance}</span>
                      </div>
                      <div className="flex justify-between text-[12px] text-paper-ink-sub">
                        <span>Typical approval time</span>
                        <span className="font-medium text-paper-ink">{result.timeline.typicalApprovalTime}</span>
                      </div>
                      <div className="flex justify-between text-[12px] text-paper-ink-sub">
                        <span>Urgent processing</span>
                        <span className={`font-medium text-[12px] ${result.timeline.urgentOptionAvailable ? 'text-[#5a7d3f]' : 'text-accent'}`}>
                          {result.timeline.urgentOptionAvailable ? 'Available' : 'Not available'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {result.financialRequirements && (
                  <div className="border border-paper-rule bg-paper-bg-alt p-5">
                    <h3 className="font-display text-[22px] leading-[1.15] mb-3 text-paper-ink">💰 Financial Requirements</h3>
                    {result.financialRequirements.minimumBankBalance && (
                      <p className="text-[12px] mb-2 text-paper-ink-sub">Min bank balance: <span className="font-medium text-paper-ink">{result.financialRequirements.minimumBankBalance}</span></p>
                    )}
                    {result.financialRequirements.proofFormat && (
                      <p className="text-[12px] mb-2 text-paper-ink-sub">Proof required: <span className="text-accent">{result.financialRequirements.proofFormat}</span></p>
                    )}
                    {result.financialRequirements.notes && (
                      <p className="text-[12px] text-paper-ink-sub">{result.financialRequirements.notes}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Language Requirements */}
              {result.languageRequirements?.required && (
                <div className="border border-paper-rule bg-paper-bg-alt p-5">
                  <h3 className="font-display text-[22px] leading-[1.15] mb-3 text-paper-ink">🗣 Language Requirements</h3>
                  {result.languageRequirements.tests?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2 font-mono text-[11px] tracking-[0.1em]">
                      {result.languageRequirements.tests.map((t, i) => (
                        <span key={i} className="px-2 py-1 border border-paper-rule text-paper-ink-dim">{t}</span>
                      ))}
                    </div>
                  )}
                  {result.languageRequirements.notes && <p className="text-[12px] text-paper-ink-sub">{result.languageRequirements.notes}</p>}
                </div>
              )}

              {/* Interview Tips */}
              {result.interviewTips?.length > 0 && (
                <div className="border border-paper-rule bg-paper-bg-alt p-5">
                  <h3 className="font-display text-[22px] leading-[1.15] mb-3 text-paper-ink">🎤 Consulate Interview Tips</h3>
                  <ul className="space-y-2">
                    {result.interviewTips.map((tip, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-accent text-[12px] flex-shrink-0 mt-0.5">→</span>
                        <span className="text-[12px] leading-relaxed text-paper-ink-dim">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Success Rate Factors */}
              {result.successRateFactors?.length > 0 && (
                <div className="border border-paper-rule bg-paper-bg-alt p-5">
                  <h3 className="font-display text-[22px] leading-[1.15] mb-3 text-paper-ink">🎯 What Actually Gets You Approved</h3>
                  <ul className="space-y-2">
                    {result.successRateFactors.map((f, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-[#5a7d3f] text-[12px] flex-shrink-0 mt-0.5">✓</span>
                        <span className="text-[12px] leading-relaxed text-paper-ink-dim">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recent Policy Changes */}
              {result.recentPolicyChanges?.length > 0 && (
                <div className="border border-paper-rule bg-paper-bg-alt p-5">
                  <h3 className="font-mono text-[10px] tracking-[0.12em] text-accent mb-3">// RECENT POLICY CHANGES</h3>
                  <ul className="space-y-1.5">
                    {result.recentPolicyChanges.map((c, i) => (
                      <li key={i} className="text-[12px] flex gap-1.5 text-paper-ink-dim"><span className="text-accent flex-shrink-0">•</span>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Important notes + official site */}
              {(result.importantNotes?.length > 0 || result.officialWebsite) && (
                <div className="border border-paper-rule bg-paper-bg-alt p-5">
                  {result.importantNotes?.length > 0 && (
                    <>
                      <h3 className="font-display text-[22px] leading-[1.15] mb-3 text-paper-ink">Important Notes</h3>
                      <ul className="space-y-1.5 mb-4">
                        {result.importantNotes.map((n, i) => (
                          <li key={i} className="text-[12px] flex gap-1.5 text-paper-ink-dim">
                            <span className="text-[#b5912f] flex-shrink-0">ℹ</span>{n}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {result.officialWebsite && (
                    <div className="pt-3 border-t border-paper-rule">
                      <p className="text-[12px] text-paper-ink-sub">
                        Official resource: <span className="text-accent">{result.officialWebsite}</span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="border border-paper-rule bg-paper-bg-alt p-4">
                <p className="text-[12px] text-paper-ink-sub">
                  <span className="font-medium text-paper-ink">Disclaimer:</span> This information is AI-generated for guidance only.
                  Always verify with official government sources and consult a licensed immigration attorney for your specific situation.
                  Visa rules change frequently.
                </p>
              </div>
            </div>
          )}

          <Footnote>{FOOTNOTES.visa}</Footnote>
        </div>
      </main>
    </div>
  );
}
