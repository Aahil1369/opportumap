'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useTheme } from '../hooks/useTheme';
import { NATIONALITIES } from '../data/countries';

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
  'visa-free': { color: 'text-green-400 bg-green-500/10 border-green-500/30', icon: '✅', label: 'Visa Free' },
  'e-visa': { color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', icon: '💻', label: 'E-Visa' },
  'visa-on-arrival': { color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', icon: '🛬', label: 'Visa on Arrival' },
  'visa-required': { color: 'text-red-400 bg-red-500/10 border-red-500/30', icon: '📋', label: 'Visa Required' },
  'citizen': { color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30', icon: '🏠', label: 'Citizen' },
};

function VisaTypeCard({ visa, dark }) {
  const [open, setOpen] = useState(false);
  const ui = {
    card: dark ? 'bg-[#111113] border-[#2a2a2e]' : 'bg-zinc-50 border-zinc-200',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
    badge: dark ? 'bg-[#2a2a2e] text-zinc-400' : 'bg-zinc-200 text-zinc-600',
    diff: visa.difficulty === 'easy' ? 'text-green-400' : visa.difficulty === 'moderate' ? 'text-amber-400' : 'text-red-400',
  };

  return (
    <div className={`rounded-xl border overflow-hidden ${ui.card}`}>
      <button className="w-full p-4 text-left" onClick={() => setOpen(!open)}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={`text-sm font-semibold ${ui.text}`}>{visa.name}</p>
            <p className={`text-xs mt-0.5 ${ui.sub}`}>{visa.purpose} · {visa.duration}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {visa.difficulty && <span className={`text-xs font-medium ${ui.diff}`}>{visa.difficulty}</span>}
            <span className={`text-xs ${ui.sub}`}>{open ? '▲' : '▼'}</span>
          </div>
        </div>
        <div className="flex gap-3 mt-2.5">
          {visa.cost && <span className={`text-xs px-2 py-0.5 rounded-full ${ui.badge}`}>💰 {visa.cost}</span>}
          {visa.processingTime && <span className={`text-xs px-2 py-0.5 rounded-full ${ui.badge}`}>⏱ {visa.processingTime}</span>}
        </div>
      </button>
      {open && (
        <div className={`px-4 pb-4 border-t ${dark ? 'border-[#2a2a2e]' : 'border-zinc-200'} pt-3 space-y-3`}>
          {visa.requirements?.length > 0 && (
            <div>
              <p className={`text-xs font-semibold mb-1.5 ${ui.text}`}>Requirements</p>
              <ul className="space-y-1">
                {visa.requirements.map((r, i) => (
                  <li key={i} className={`text-xs flex gap-1.5 ${ui.sub}`}>
                    <span className="text-indigo-400 flex-shrink-0">→</span>{r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {visa.where_to_apply && (
            <div>
              <p className={`text-xs font-semibold mb-1 ${ui.text}`}>Where to Apply</p>
              <p className={`text-xs ${ui.sub}`}>{visa.where_to_apply}</p>
            </div>
          )}
          {visa.notes && <p className={`text-xs italic ${ui.sub}`}>{visa.notes}</p>}
        </div>
      )}
    </div>
  );
}

export default function VisaPage() {
  const { dark, toggleDark } = useTheme();
  const [nationality, setNationality] = useState('');
  const [targetCountry, setTargetCountry] = useState('');
  const [purpose, setPurpose] = useState('work');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profileLoaded, setProfileLoaded] = useState(false);

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

  const ui = {
    bg: dark ? 'bg-[#080810]' : 'bg-[#f8f8fc]',
    card: dark ? 'bg-[#0e0e18] border-[#1e1e2e]' : 'bg-white border-zinc-200',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
    divider: dark ? 'border-[#1e1e2e]' : 'border-zinc-100',
    input: dark ? 'bg-[#12121e] border-[#2a2a3e] text-zinc-100' : 'bg-white border-zinc-300 text-zinc-900',
    pill: (a) => a ? 'bg-indigo-600 text-white border-indigo-600' : dark ? 'bg-[#12121e] text-zinc-400 border-[#2a2a3e]' : 'bg-white text-zinc-500 border-zinc-200',
  };

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
    } catch (e) {
      setError(e.message || 'Failed to load visa information.');
    }
    setLoading(false);
  };

  const statusCfg = result ? (STATUS_CONFIG[result.currentStatus] || STATUS_CONFIG['visa-required']) : null;

  return (
    <div className={`min-h-screen ${ui.bg} transition-colors duration-300`}>
      <Navbar dark={dark} onToggleDark={toggleDark} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-10 relative">
          <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full opacity-[0.06] bg-cyan-500 blur-[80px] pointer-events-none" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-2xl shadow-lg shadow-cyan-500/30">🛂</div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400 mb-0.5">AI Tool</p>
              <h1 className={`text-3xl font-black gradient-text`}>Visa Intelligence</h1>
            </div>
          </div>
          <p className={`text-sm max-w-lg ${ui.sub}`}>
            Enter your nationality and destination — get an instant AI-powered visa guide with requirements, costs, and approval tips.
          </p>
          {profileLoaded && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              Nationality pre-filled from your profile
            </div>
          )}
        </div>

        {/* Search form */}
        <div className={`rounded-2xl border p-6 mb-6 ${ui.card}`}>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={`text-xs font-medium block mb-1.5 ${ui.sub}`}>Your Passport / Nationality</label>
              <select value={nationality} onChange={(e) => setNationality(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`}>
                <option value="">Select your nationality</option>
                {NATIONALITIES.map((n) => <option key={n.code} value={n.code}>{n.label}</option>)}
              </select>
            </div>
            <div>
              <label className={`text-xs font-medium block mb-1.5 ${ui.sub}`}>Destination Country</label>
              <select value={targetCountry} onChange={(e) => setTargetCountry(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`}>
                <option value="">Select destination</option>
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className={`text-xs font-medium block mb-2 ${ui.sub}`}>Purpose of Travel</label>
            <div className="flex flex-wrap gap-2">
              {['work', 'study', 'tourist', 'permanent residency', 'digital nomad'].map((p) => (
                <button key={p} onClick={() => setPurpose(p)}
                  className={`px-3 py-1.5 rounded-full text-xs border font-medium transition-all capitalize ${ui.pill(purpose === p)}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
          <button onClick={handleSearch} disabled={loading || !nationality || !targetCountry}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold transition-all">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analyzing visa requirements...
              </span>
            ) : 'Get Visa Intelligence Report'}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-5">
            {/* Status banner */}
            <div className={`rounded-2xl border p-5 ${ui.card}`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold ${statusCfg.color}`}>
                  <span>{statusCfg.icon}</span>
                  <span>{statusCfg.label}</span>
                </div>
                <div>
                  <p className={`text-sm font-semibold ${ui.text}`}>{result.statusSummary}</p>
                  <p className={`text-xs mt-0.5 ${ui.sub}`}>{result.overview}</p>
                </div>
              </div>
            </div>

            {/* Visa types */}
            {result.visaTypes?.length > 0 && (
              <div className={`rounded-2xl border p-5 ${ui.card}`}>
                <h3 className={`text-sm font-bold mb-4 ${ui.text}`}>Available Visa Types</h3>
                <div className="space-y-3">
                  {result.visaTypes.map((v, i) => (
                    <VisaTypeCard key={i} visa={v} dark={dark} />
                  ))}
                </div>
              </div>
            )}

            {/* Application steps */}
            {result.applicationSteps?.length > 0 && (
              <div className={`rounded-2xl border p-5 ${ui.card}`}>
                <h3 className={`text-sm font-bold mb-4 ${ui.text}`}>How to Apply — Step by Step</h3>
                <div className="space-y-3">
                  {result.applicationSteps.map((s, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {s.step || i + 1}
                      </div>
                      <div>
                        <p className={`text-xs font-semibold ${ui.text}`}>{s.title || s}</p>
                        {s.detail && <p className={`text-xs mt-0.5 ${ui.sub}`}>{s.detail}</p>}
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
                <div className={`rounded-2xl border p-5 ${ui.card}`}>
                  <h3 className={`text-sm font-bold mb-3 ${ui.text}`}>How to Guarantee Approval</h3>
                  <ul className="space-y-2.5">
                    {result.guaranteeTips.map((tip, i) => (
                      <li key={i} className="flex gap-2">
                        <span className={`text-xs flex-shrink-0 mt-0.5 ${tip.importance === 'critical' ? 'text-red-400' : tip.importance === 'important' ? 'text-amber-400' : 'text-green-400'}`}>
                          {tip.importance === 'critical' ? '⚡' : tip.importance === 'important' ? '★' : '✓'}
                        </span>
                        <span className={`text-xs leading-relaxed ${ui.sub}`}>{tip.tip || tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Rejection reasons */}
              {result.commonRejectionReasons?.length > 0 && (
                <div className={`rounded-2xl border p-5 ${ui.card}`}>
                  <h3 className={`text-sm font-bold mb-3 ${ui.text}`}>Common Rejection Reasons</h3>
                  <ul className="space-y-2">
                    {result.commonRejectionReasons.map((r, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-red-400 text-xs flex-shrink-0 mt-0.5">✗</span>
                        <span className={`text-xs leading-relaxed ${ui.sub}`}>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Path to residency */}
            {result.pathToResidency && (
              <div className={`rounded-2xl border p-5 ${ui.card}`}>
                <h3 className={`text-sm font-bold mb-2 flex items-center gap-2 ${ui.text}`}>
                  <span>🏠</span> Path to Permanent Residency / Citizenship
                </h3>
                <p className={`text-sm leading-relaxed ${ui.sub}`}>{result.pathToResidency}</p>
              </div>
            )}

            {/* Document Checklist */}
            {result.documentChecklist?.length > 0 && (
              <div className={`rounded-2xl border p-5 ${ui.card}`}>
                <h3 className={`text-sm font-bold mb-4 ${ui.text}`}>📋 Document Checklist</h3>
                <div className="space-y-2">
                  {result.documentChecklist.map((doc, i) => (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${dark ? 'bg-[#0a0a14]' : 'bg-zinc-50'}`}>
                      <input type="checkbox" className="mt-0.5 flex-shrink-0" />
                      <div>
                        <p className={`text-xs font-semibold ${ui.text}`}>{doc.document}</p>
                        <p className={`text-xs mt-0.5 ${ui.sub}`}>Format: <span className="text-indigo-400">{doc.format}</span>{doc.notes ? ` · ${doc.notes}` : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline + Financial */}
            <div className="grid sm:grid-cols-2 gap-5">
              {result.timeline && (
                <div className={`rounded-2xl border p-5 ${ui.card}`}>
                  <h3 className={`text-sm font-bold mb-3 ${ui.text}`}>⏱ Application Timeline</h3>
                  <div className="space-y-2">
                    <div className={`flex justify-between text-xs ${ui.sub}`}>
                      <span>Apply how far in advance</span>
                      <span className={`font-semibold ${ui.text}`}>{result.timeline.applyHowFarInAdvance}</span>
                    </div>
                    <div className={`flex justify-between text-xs ${ui.sub}`}>
                      <span>Typical approval time</span>
                      <span className={`font-semibold ${ui.text}`}>{result.timeline.typicalApprovalTime}</span>
                    </div>
                    <div className={`flex justify-between text-xs ${ui.sub}`}>
                      <span>Urgent processing</span>
                      <span className={result.timeline.urgentOptionAvailable ? 'text-green-400 font-semibold text-xs' : 'text-red-400 font-semibold text-xs'}>
                        {result.timeline.urgentOptionAvailable ? 'Available' : 'Not available'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {result.financialRequirements && (
                <div className={`rounded-2xl border p-5 ${ui.card}`}>
                  <h3 className={`text-sm font-bold mb-3 ${ui.text}`}>💰 Financial Requirements</h3>
                  {result.financialRequirements.minimumBankBalance && (
                    <p className={`text-xs mb-2 ${ui.sub}`}>Min bank balance: <span className={`font-semibold ${ui.text}`}>{result.financialRequirements.minimumBankBalance}</span></p>
                  )}
                  {result.financialRequirements.proofFormat && (
                    <p className={`text-xs mb-2 ${ui.sub}`}>Proof required: <span className="text-indigo-400">{result.financialRequirements.proofFormat}</span></p>
                  )}
                  {result.financialRequirements.notes && (
                    <p className={`text-xs ${ui.sub}`}>{result.financialRequirements.notes}</p>
                  )}
                </div>
              )}
            </div>

            {/* Language Requirements */}
            {result.languageRequirements?.required && (
              <div className={`rounded-2xl border p-5 ${ui.card}`}>
                <h3 className={`text-sm font-bold mb-3 ${ui.text}`}>🗣 Language Requirements</h3>
                {result.languageRequirements.tests?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {result.languageRequirements.tests.map((t, i) => (
                      <span key={i} className={`text-xs px-2 py-1 rounded-full ${dark ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'}`}>{t}</span>
                    ))}
                  </div>
                )}
                {result.languageRequirements.notes && <p className={`text-xs ${ui.sub}`}>{result.languageRequirements.notes}</p>}
              </div>
            )}

            {/* Interview Tips */}
            {result.interviewTips?.length > 0 && (
              <div className={`rounded-2xl border p-5 ${ui.card}`}>
                <h3 className={`text-sm font-bold mb-3 ${ui.text}`}>🎤 Consulate Interview Tips</h3>
                <ul className="space-y-2">
                  {result.interviewTips.map((tip, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-indigo-400 text-xs flex-shrink-0 mt-0.5">→</span>
                      <span className={`text-xs leading-relaxed ${ui.sub}`}>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Success Rate Factors */}
            {result.successRateFactors?.length > 0 && (
              <div className={`rounded-2xl border p-5 ${ui.card}`}>
                <h3 className={`text-sm font-bold mb-3 ${ui.text}`}>🎯 What Actually Gets You Approved</h3>
                <ul className="space-y-2">
                  {result.successRateFactors.map((f, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-green-400 text-xs flex-shrink-0 mt-0.5">✓</span>
                      <span className={`text-xs leading-relaxed ${ui.sub}`}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recent Policy Changes */}
            {result.recentPolicyChanges?.length > 0 && (
              <div className={`rounded-2xl border p-5 ${ui.card} ${dark ? 'border-blue-500/20' : 'border-blue-200'}`}>
                <h3 className={`text-sm font-bold mb-3 text-blue-400`}>🔔 Recent Policy Changes</h3>
                <ul className="space-y-1.5">
                  {result.recentPolicyChanges.map((c, i) => (
                    <li key={i} className={`text-xs flex gap-1.5 ${ui.sub}`}><span className="text-blue-400 flex-shrink-0">•</span>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Important notes + official site */}
            {(result.importantNotes?.length > 0 || result.officialWebsite) && (
              <div className={`rounded-2xl border p-5 ${ui.card}`}>
                {result.importantNotes?.length > 0 && (
                  <>
                    <h3 className={`text-sm font-bold mb-3 ${ui.text}`}>Important Notes</h3>
                    <ul className="space-y-1.5 mb-4">
                      {result.importantNotes.map((n, i) => (
                        <li key={i} className={`text-xs flex gap-1.5 ${ui.sub}`}>
                          <span className="text-amber-400 flex-shrink-0">ℹ</span>{n}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {result.officialWebsite && (
                  <div className={`pt-3 border-t ${ui.divider}`}>
                    <p className={`text-xs ${ui.sub}`}>
                      Official resource: <span className="text-indigo-400">{result.officialWebsite}</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className={`rounded-2xl border p-4 ${dark ? 'border-amber-500/20 bg-amber-500/5' : 'border-amber-200 bg-amber-50'}`}>
              <p className="text-xs text-amber-500">
                <span className="font-semibold">Disclaimer:</span> This information is AI-generated for guidance only.
                Always verify with official government sources and consult a licensed immigration attorney for your specific situation.
                Visa rules change frequently.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
