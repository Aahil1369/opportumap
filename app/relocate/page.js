'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useTheme } from '../hooks/useTheme';

const POPULAR_DESTINATIONS = [
  { name: 'Toronto, Canada', icon: '🇨🇦' },
  { name: 'London, UK', icon: '🇬🇧' },
  { name: 'Berlin, Germany', icon: '🇩🇪' },
  { name: 'Dubai, UAE', icon: '🇦🇪' },
  { name: 'Singapore', icon: '🇸🇬' },
  { name: 'Amsterdam, Netherlands', icon: '🇳🇱' },
  { name: 'Sydney, Australia', icon: '🇦🇺' },
  { name: 'Tokyo, Japan', icon: '🇯🇵' },
  { name: 'New York, USA', icon: '🇺🇸' },
  { name: 'Lisbon, Portugal', icon: '🇵🇹' },
  { name: 'Stockholm, Sweden', icon: '🇸🇪' },
  { name: 'Nairobi, Kenya', icon: '🇰🇪' },
];

function CostCard({ label, item, dark }) {
  const ui = {
    card: dark ? 'bg-[#0a0a14] border-[#1e1e2e]' : 'bg-zinc-50 border-zinc-200',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
  };
  return (
    <div className={`rounded-xl border p-3 ${ui.card}`}>
      <p className={`text-xs ${ui.sub} mb-1`}>{label}</p>
      <p className={`text-sm font-bold ${ui.text}`}>{item?.amount || '—'}</p>
      {item?.note && <p className={`text-xs mt-1 ${ui.sub}`}>{item.note}</p>}
    </div>
  );
}

function Avatar({ name }) {
  const initials = (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const colors = ['bg-indigo-500', 'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-pink-500'];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return <div className={`w-8 h-8 ${color} rounded-full flex items-center justify-center font-bold text-white text-xs flex-shrink-0`}>{initials}</div>;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1) return 'today';
  if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function RelocatePage() {
  const { dark, toggleDark } = useTheme();
  const [destination, setDestination] = useState('');
  const [origin, setOrigin] = useState('');
  const [field, setField] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profilePrefilled, setProfilePrefilled] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('opportumap_profile');
      if (raw) {
        const p = JSON.parse(raw);
        if (p.currentCountry && !origin) {
          setOrigin(p.currentCountry);
          setProfilePrefilled(true);
        }
        if (p.jobTypes?.length && !field) {
          setField(p.jobTypes[0].replace('Software Engineering', 'Software Engineering').replace('Data Science / ML', 'Data Science'));
        }
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ui = {
    bg: dark ? 'bg-[#080810]' : 'bg-[#f5f5f7]',
    card: dark ? 'bg-[#0e0e18] border-[#1e1e2e]' : 'bg-white border-zinc-200',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
    divider: dark ? 'border-[#1e1e2e]' : 'border-zinc-100',
    input: dark ? 'bg-[#1a1a2e] border-[#2a2a3e] text-zinc-100 placeholder-zinc-500' : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400',
  };

  const handleSearch = async (dest) => {
    const d = dest || destination;
    if (!d.trim()) { setError('Please enter a destination.'); return; }
    setDestination(d);
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/relocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: d, origin: origin || undefined, field: field || undefined }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(e.message || 'Failed to load relocation guide.');
    }
    setLoading(false);
  };

  const qlColor = (score) => score >= 8 ? 'text-green-400' : score >= 6 ? 'text-amber-400' : 'text-red-400';
  const langColor = (level) => level === 'none' || level === 'low' ? 'text-green-400' : level === 'medium' ? 'text-amber-400' : 'text-red-400';

  return (
    <div className={`min-h-screen ${ui.bg} transition-colors duration-300`}>
      <Navbar dark={dark} onToggleDark={toggleDark} />

      {/* Gradient header */}
      <div className={`relative overflow-hidden border-b ${ui.divider}`}>
        {dark && (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-violet-950/50 via-[#080810] to-indigo-950/40 pointer-events-none" />
            <div className="absolute -top-12 right-0 w-72 h-72 bg-violet-600/8 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-8 left-20 w-48 h-48 bg-indigo-600/6 rounded-full blur-3xl pointer-events-none" />
          </>
        )}
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-4 text-xs font-medium ${dark ? 'border-violet-500/30 bg-violet-500/10 text-violet-400' : 'border-violet-200 bg-violet-50 text-violet-600'}`}>
            ✈️ Relocation Intelligence
          </div>
          <h1 className={`text-3xl font-black mb-2 ${dark ? 'gradient-text' : 'text-zinc-900'}`}>
            Relocation Guide
          </h1>
          <p className={`text-sm max-w-xl ${ui.sub}`}>
            Get a full cost breakdown, neighborhood guide, job market overview, and connect with people in your field already living there.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Search form */}
        <div className={`rounded-2xl border p-6 mb-6 ${ui.card}`}>
          <div className="grid sm:grid-cols-3 gap-3 mb-4">
            <div className="sm:col-span-1">
              <label className={`text-xs font-medium block mb-1.5 ${ui.sub}`}>Destination city / country *</label>
              <input value={destination} onChange={(e) => setDestination(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="e.g. Berlin, Germany"
                className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
            </div>
            <div>
              <label className={`text-xs font-medium block mb-1.5 ${ui.sub}`}>
                Where you&apos;re from (optional)
                {profilePrefilled && <span className="ml-1.5 text-emerald-400 text-xs">· from profile</span>}
              </label>
              <input value={origin} onChange={(e) => setOrigin(e.target.value)}
                placeholder="e.g. Lagos, Nigeria"
                className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
            </div>
            <div>
              <label className={`text-xs font-medium block mb-1.5 ${ui.sub}`}>Your field (optional)</label>
              <input value={field} onChange={(e) => setField(e.target.value)}
                placeholder="e.g. Software Engineering"
                className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
            </div>
          </div>

          {/* Popular destinations */}
          <div className="mb-4">
            <p className={`text-xs mb-2 ${ui.sub}`}>Popular destinations:</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_DESTINATIONS.map((d) => (
                <button key={d.name} onClick={() => { setDestination(d.name); handleSearch(d.name); }}
                  className={`px-3 py-1 rounded-full text-xs border font-medium transition-all ${dark ? 'border-[#2a2a3e] text-zinc-400 hover:border-indigo-500/50 hover:text-indigo-400' : 'border-zinc-200 text-zinc-500 hover:border-indigo-300 hover:text-indigo-600'}`}>
                  {d.icon} {d.name}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
          <button onClick={() => handleSearch()} disabled={loading || !destination.trim()}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold transition-all">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Building your relocation guide...
              </span>
            ) : 'Generate Relocation Guide'}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-5">
            {/* Overview + quick stats */}
            <div className={`rounded-2xl border p-6 ${ui.card}`}>
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-1">
                  <h2 className={`text-xl font-bold mb-2 ${ui.text}`}>{result.destination}</h2>
                  <p className={`text-sm leading-relaxed ${ui.sub}`}>{result.overview}</p>
                  {result.comparedToUS && (
                    <p className={`text-xs mt-2 px-3 py-1.5 rounded-lg inline-block ${dark ? 'bg-[#1a1a2e] text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`}>
                      vs. US: {result.comparedToUS}
                    </p>
                  )}
                </div>
                <div className="flex flex-row sm:flex-col gap-3">
                  {result.qualityOfLife?.score && (
                    <div className={`text-center px-4 py-3 rounded-xl border ${ui.card}`}>
                      <p className={`text-2xl font-black ${qlColor(result.qualityOfLife.score)}`}>{result.qualityOfLife.score}/10</p>
                      <p className={`text-xs ${ui.sub}`}>Quality of Life</p>
                    </div>
                  )}
                  {result.languageBarrier?.level && (
                    <div className={`text-center px-4 py-3 rounded-xl border ${ui.card}`}>
                      <p className={`text-base font-bold capitalize ${langColor(result.languageBarrier.level)}`}>{result.languageBarrier.level}</p>
                      <p className={`text-xs ${ui.sub}`}>Language Barrier</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Budget summary */}
              {result.monthlyBudget && (
                <div className={`mt-5 pt-5 border-t ${ui.divider}`}>
                  <p className={`text-xs font-semibold mb-3 ${ui.text}`}>Monthly Budget Estimates (USD)</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className={`text-center p-3 rounded-xl ${dark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
                      <p className={`text-lg font-black text-blue-400`}>${result.monthlyBudget.budget?.toLocaleString()}</p>
                      <p className={`text-xs ${ui.sub}`}>Budget</p>
                    </div>
                    <div className={`text-center p-3 rounded-xl ${dark ? 'bg-indigo-900/30 border border-indigo-500/20' : 'bg-indigo-50 border border-indigo-200'}`}>
                      <p className={`text-lg font-black text-indigo-400`}>${result.monthlyBudget.comfortable?.toLocaleString()}</p>
                      <p className={`text-xs ${ui.sub}`}>Comfortable</p>
                    </div>
                    <div className={`text-center p-3 rounded-xl ${dark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
                      <p className={`text-lg font-black text-purple-400`}>${result.monthlyBudget.luxury?.toLocaleString()}</p>
                      <p className={`text-xs ${ui.sub}`}>Luxury</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cost breakdown */}
            {result.costBreakdown && (
              <div className={`rounded-2xl border p-5 ${ui.card}`}>
                <h3 className={`text-sm font-bold mb-4 ${ui.text}`}>💰 Full Cost Breakdown</h3>
                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    ['Rent — City Center (1BR)', result.costBreakdown.rent_1br_city_center],
                    ['Rent — Outside Center (1BR)', result.costBreakdown.rent_1br_outside_center],
                    ['Groceries', result.costBreakdown.groceries],
                    ['Dining Out', result.costBreakdown.dining_out],
                    ['Public Transport', result.costBreakdown.public_transport],
                    ['Utilities', result.costBreakdown.utilities],
                    ['Internet', result.costBreakdown.internet],
                    ['Healthcare', result.costBreakdown.healthcare],
                    ['Gym & Entertainment', result.costBreakdown.gym_entertainment],
                  ].map(([label, item]) => item && (
                    <CostCard key={label} label={label} item={item} dark={dark} />
                  ))}
                </div>
              </div>
            )}

            {/* QoL pros/cons + language */}
            <div className="grid sm:grid-cols-2 gap-5">
              {result.qualityOfLife && (
                <div className={`rounded-2xl border p-5 ${ui.card}`}>
                  <h3 className={`text-sm font-bold mb-3 ${ui.text}`}>Quality of Life</h3>
                  {result.qualityOfLife.pros?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-green-400 font-semibold mb-1.5">Pros</p>
                      {result.qualityOfLife.pros.map((p, i) => (
                        <p key={i} className={`text-xs flex gap-1.5 mb-1 ${ui.sub}`}><span className="text-green-400">✓</span>{p}</p>
                      ))}
                    </div>
                  )}
                  {result.qualityOfLife.cons?.length > 0 && (
                    <div>
                      <p className="text-xs text-red-400 font-semibold mb-1.5">Cons</p>
                      {result.qualityOfLife.cons.map((c, i) => (
                        <p key={i} className={`text-xs flex gap-1.5 mb-1 ${ui.sub}`}><span className="text-red-400">✗</span>{c}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {result.jobMarket && (
                <div className={`rounded-2xl border p-5 ${ui.card}`}>
                  <h3 className={`text-sm font-bold mb-3 ${ui.text}`}>Job Market for Expats</h3>
                  <p className={`text-xs leading-relaxed mb-3 ${ui.sub}`}>{result.jobMarket.overview}</p>
                  {result.jobMarket.averageSalary && (
                    <p className={`text-xs mb-2 ${ui.sub}`}>Avg skilled salary: <span className={`font-semibold ${ui.text}`}>{result.jobMarket.averageSalary}</span></p>
                  )}
                  {result.jobMarket.topIndustries?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {result.jobMarket.topIndustries.map((ind, i) => (
                        <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${dark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>{ind}</span>
                      ))}
                    </div>
                  )}
                  {result.jobMarket.jobSearchTips?.map((t, i) => (
                    <p key={i} className={`text-xs flex gap-1.5 ${ui.sub}`}><span className="text-indigo-400">→</span>{t}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Neighborhoods */}
            {result.neighborhoods?.length > 0 && (
              <div className={`rounded-2xl border p-5 ${ui.card}`}>
                <h3 className={`text-sm font-bold mb-4 ${ui.text}`}>🏘 Neighborhoods to Know</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {result.neighborhoods.map((n, i) => (
                    <div key={i} className={`rounded-xl p-4 border ${dark ? 'border-[#1e1e2e] bg-[#0a0a14]' : 'border-zinc-100 bg-zinc-50'}`}>
                      <div className="flex justify-between items-start">
                        <p className={`text-xs font-semibold ${ui.text}`}>{n.name}</p>
                        {n.safetyRating && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${dark ? 'bg-[#1a1a2e] text-zinc-400' : 'bg-zinc-200 text-zinc-600'}`}>
                            Safety: {n.safetyRating}/5
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-1 ${ui.sub}`}>{n.vibe}</p>
                      <div className="flex gap-2 mt-2">
                        {n.avgRent && <span className={`text-xs ${dark ? 'text-indigo-400' : 'text-indigo-600'}`}>~{n.avgRent}/mo</span>}
                        {n.goodFor && <span className={`text-xs ${ui.sub}`}>· {n.goodFor}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Safety Info */}
            {result.safetyInfo && (
              <div className={`rounded-2xl border p-5 ${ui.card}`}>
                <h3 className={`text-sm font-bold mb-4 ${ui.text}`}>🛡 Safety Overview</h3>
                <div className="flex items-center gap-3 mb-4">
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
                    result.safetyInfo.crimeIndex === 'low' ? 'text-green-400 border-green-500/30 bg-green-500/10' :
                    result.safetyInfo.crimeIndex === 'medium' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
                    'text-red-400 border-red-500/30 bg-red-500/10'
                  }`}>
                    {result.safetyInfo.crimeIndex?.toUpperCase()} CRIME
                  </span>
                  {result.safetyInfo.nightSafety && <p className={`text-xs ${ui.sub}`}>{result.safetyInfo.nightSafety}</p>}
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {result.safetyInfo.safeAreas?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-green-400 mb-2">Safe Areas</p>
                      {result.safetyInfo.safeAreas.map((a, i) => <p key={i} className={`text-xs flex gap-1.5 mb-1 ${ui.sub}`}><span className="text-green-400">✓</span>{a}</p>)}
                    </div>
                  )}
                  {result.safetyInfo.areasToAvoid?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-400 mb-2">Areas to Avoid</p>
                      {result.safetyInfo.areasToAvoid.map((a, i) => <p key={i} className={`text-xs flex gap-1.5 mb-1 ${ui.sub}`}><span className="text-red-400">✗</span>{a}</p>)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Climate */}
            {result.climate && (
              <div className={`rounded-2xl border p-5 ${ui.card}`}>
                <h3 className={`text-sm font-bold mb-3 ${ui.text}`}>🌤 Climate & Weather</h3>
                {result.climate.overview && <p className={`text-xs leading-relaxed mb-3 ${ui.sub}`}>{result.climate.overview}</p>}
                {result.climate.bestTimeToArrive && (
                  <p className={`text-xs mb-3 ${ui.sub}`}>Best time to arrive: <span className={`font-semibold ${ui.text}`}>{result.climate.bestTimeToArrive}</span></p>
                )}
                {result.climate.whatToPack?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {result.climate.whatToPack.map((item, i) => (
                      <span key={i} className={`text-xs px-2 py-1 rounded-full ${dark ? 'bg-[#1a1a2e] text-zinc-400' : 'bg-zinc-100 text-zinc-600'}`}>{item}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Work Culture */}
            {result.workCulture && (
              <div className={`rounded-2xl border p-5 ${ui.card}`}>
                <h3 className={`text-sm font-bold mb-3 ${ui.text}`}>💼 Work Culture</h3>
                <div className="grid sm:grid-cols-2 gap-3 mb-3">
                  {result.workCulture.typicalHours && (
                    <div className={`p-3 rounded-xl ${dark ? 'bg-[#0a0a14]' : 'bg-zinc-50'}`}>
                      <p className={`text-xs ${ui.sub} mb-1`}>Hours</p>
                      <p className={`text-xs font-semibold ${ui.text}`}>{result.workCulture.typicalHours}</p>
                    </div>
                  )}
                  {result.workCulture.formality && (
                    <div className={`p-3 rounded-xl ${dark ? 'bg-[#0a0a14]' : 'bg-zinc-50'}`}>
                      <p className={`text-xs ${ui.sub} mb-1`}>Dress Code</p>
                      <p className={`text-xs font-semibold ${ui.text} capitalize`}>{result.workCulture.formality}</p>
                    </div>
                  )}
                </div>
                {result.workCulture.expatTreatment && <p className={`text-xs mb-3 ${ui.sub}`}>{result.workCulture.expatTreatment}</p>}
                {result.workCulture.tips?.map((t, i) => (
                  <p key={i} className={`text-xs flex gap-1.5 mb-1 ${ui.sub}`}><span className="text-indigo-400">→</span>{t}</p>
                ))}
              </div>
            )}

            {/* Before you move checklist */}
            {result.beforeYouMove?.length > 0 && (
              <div className={`rounded-2xl border p-5 ${ui.card}`}>
                <h3 className={`text-sm font-bold mb-3 ${ui.text}`}>📋 Before You Move Checklist</h3>
                <div className="grid sm:grid-cols-2 gap-2">
                  {result.beforeYouMove.map((item, i) => (
                    <label key={i} className="flex items-start gap-2 cursor-pointer group">
                      <input type="checkbox" className="mt-0.5 rounded" />
                      <span className={`text-xs ${ui.sub} group-hover:text-indigo-400 transition-colors`}>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* First month tips + tax/healthcare */}
            <div className="grid sm:grid-cols-2 gap-5">
              {result.firstMonthTips?.length > 0 && (
                <div className={`rounded-2xl border p-5 ${ui.card}`}>
                  <h3 className={`text-sm font-bold mb-3 ${ui.text}`}>🗓 First Month Tips</h3>
                  {result.firstMonthTips.map((t, i) => (
                    <p key={i} className={`text-xs flex gap-1.5 mb-2 ${ui.sub}`}><span className="text-green-400 flex-shrink-0">✓</span>{t}</p>
                  ))}
                </div>
              )}
              <div className="space-y-3">
                {result.taxInfo && (
                  <div className={`rounded-2xl border p-4 ${ui.card}`}>
                    <p className={`text-xs font-semibold mb-1 ${ui.text}`}>💸 Tax Info for Expats</p>
                    <p className={`text-xs ${ui.sub}`}>{result.taxInfo}</p>
                  </div>
                )}
                {result.healthcareInfo && (
                  <div className={`rounded-2xl border p-4 ${ui.card}`}>
                    <p className={`text-xs font-semibold mb-1 ${ui.text}`}>🏥 Healthcare</p>
                    <p className={`text-xs ${ui.sub}`}>{result.healthcareInfo}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Banking + SIM side by side */}
            <div className="grid sm:grid-cols-2 gap-5">
              {result.bankingSetup && (
                <div className={`rounded-2xl border p-5 ${ui.card}`}>
                  <h3 className={`text-sm font-bold mb-3 ${ui.text}`}>🏦 Banking for Expats</h3>
                  {result.bankingSetup.howToOpen && <p className={`text-xs mb-3 ${ui.sub}`}>{result.bankingSetup.howToOpen}</p>}
                  {result.bankingSetup.bestBanksForExpats?.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-indigo-400 mb-1">Recommended Banks</p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.bankingSetup.bestBanksForExpats.map((b, i) => (
                          <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${dark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>{b}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.bankingSetup.alternativeApps?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-green-400 mb-1">Digital Alternatives</p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.bankingSetup.alternativeApps.map((a, i) => (
                          <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${dark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'}`}>{a}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {result.simAndInternet && (
                <div className={`rounded-2xl border p-5 ${ui.card}`}>
                  <h3 className={`text-sm font-bold mb-3 ${ui.text}`}>📱 SIM & Internet</h3>
                  {result.simAndInternet.howToGetOnArrival && <p className={`text-xs mb-2 ${ui.sub}`}>{result.simAndInternet.howToGetOnArrival}</p>}
                  {result.simAndInternet.avgMonthlyCost && (
                    <p className={`text-xs mb-2 ${ui.sub}`}>Avg monthly cost: <span className={`font-semibold ${ui.text}`}>{result.simAndInternet.avgMonthlyCost}</span></p>
                  )}
                  {result.simAndInternet.internetSpeed && (
                    <p className={`text-xs mb-2 ${ui.sub}`}>Avg speed: <span className={`font-semibold ${ui.text}`}>{result.simAndInternet.internetSpeed}</span></p>
                  )}
                  {result.simAndInternet.bestProviders?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {result.simAndInternet.bestProviders.map((p, i) => (
                        <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${dark ? 'bg-[#1a1a2e] text-zinc-400' : 'bg-zinc-100 text-zinc-600'}`}>{p}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Emergency Numbers */}
            {result.emergencyNumbers && (
              <div className={`rounded-2xl border p-5 ${dark ? 'border-red-500/20 bg-red-500/5' : 'border-red-200 bg-red-50'}`}>
                <h3 className={`text-sm font-bold mb-3 text-red-400`}>🆘 Emergency Numbers</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    ['Police', result.emergencyNumbers.police, '🚔'],
                    ['Ambulance', result.emergencyNumbers.ambulance, '🚑'],
                    ['Fire', result.emergencyNumbers.fire, '🚒'],
                    ['General', result.emergencyNumbers.generalEmergency, '📞'],
                  ].filter(([, num]) => num).map(([label, num, icon]) => (
                    <div key={label} className={`text-center p-3 rounded-xl ${dark ? 'bg-[#0a0a14]' : 'bg-white'}`}>
                      <p className="text-lg mb-1">{icon}</p>
                      <p className={`text-sm font-black ${ui.text}`}>{num}</p>
                      <p className={`text-xs ${ui.sub}`}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cultural Tips */}
            {result.culturalTips && (
              <div className={`rounded-2xl border p-5 ${ui.card}`}>
                <h3 className={`text-sm font-bold mb-4 ${ui.text}`}>🤝 Cultural Tips & Etiquette</h3>
                {result.culturalTips.etiquette && <p className={`text-xs mb-4 ${ui.sub}`}>{result.culturalTips.etiquette}</p>}
                <div className="grid sm:grid-cols-2 gap-4">
                  {result.culturalTips.dos?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-green-400 mb-2">Do</p>
                      {result.culturalTips.dos.map((d, i) => <p key={i} className={`text-xs flex gap-1.5 mb-1.5 ${ui.sub}`}><span className="text-green-400 flex-shrink-0">✓</span>{d}</p>)}
                    </div>
                  )}
                  {result.culturalTips.donts?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-400 mb-2">Don&apos;t</p>
                      {result.culturalTips.donts.map((d, i) => <p key={i} className={`text-xs flex gap-1.5 mb-1.5 ${ui.sub}`}><span className="text-red-400 flex-shrink-0">✗</span>{d}</p>)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Visa Path Summary */}
            {result.visaPathSummary && (
              <div className={`rounded-2xl border p-5 ${dark ? 'border-indigo-500/20 bg-indigo-500/5' : 'border-indigo-200 bg-indigo-50'}`}>
                <h3 className={`text-sm font-bold mb-2 text-indigo-400`}>🛂 Visa Path for This Destination</h3>
                <p className={`text-xs leading-relaxed ${ui.sub}`}>{result.visaPathSummary}</p>
                <a href="/visa" className="inline-block mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  Get full visa intelligence →
                </a>
              </div>
            )}

            {/* Expat communities */}
            {result.expatCommunities?.length > 0 && (
              <div className={`rounded-2xl border p-5 ${ui.card}`}>
                <h3 className={`text-sm font-bold mb-4 ${ui.text}`}>🌐 Expat Communities & Resources</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {result.expatCommunities.map((c, i) => (
                    <div key={i} className={`rounded-xl p-3 border ${dark ? 'border-[#1e1e2e] bg-[#0a0a14]' : 'border-zinc-100 bg-zinc-50'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-semibold ${ui.text}`}>{c.name}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${dark ? 'bg-[#1a1a2e] text-zinc-500' : 'bg-zinc-200 text-zinc-500'}`}>{c.type}</span>
                      </div>
                      {c.description && <p className={`text-xs mt-1 ${ui.sub}`}>{c.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Community connections from OpportuMap */}
            {result.connections?.length > 0 && (
              <div className={`rounded-2xl border p-5 ${ui.card}`}>
                <h3 className={`text-sm font-bold mb-1 ${ui.text}`}>💬 People Talking About {result.destination}</h3>
                <p className={`text-xs mb-4 ${ui.sub}`}>From the OpportuMap community — connect with people who&apos;ve been there:</p>
                <div className="space-y-3">
                  {result.connections.map((post) => (
                    <a key={post.id} href="/community"
                      className={`flex gap-3 p-3 rounded-xl border transition-all cursor-pointer ${dark ? 'border-[#1e1e2e] bg-[#0a0a14] hover:border-indigo-500/30' : 'border-zinc-100 bg-zinc-50 hover:border-indigo-200'}`}>
                      <Avatar name={post.user_name} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-semibold ${ui.text}`}>{post.user_name}</span>
                          <span className={`text-xs ${ui.sub}`}>{timeAgo(post.created_at)}</span>
                        </div>
                        {post.title && <p className={`text-xs font-medium mt-0.5 ${ui.text}`}>{post.title}</p>}
                        <p className={`text-xs mt-0.5 line-clamp-2 ${ui.sub}`}>{post.content}</p>
                      </div>
                    </a>
                  ))}
                </div>
                <a href="/community"
                  className={`mt-3 block text-center text-xs text-indigo-400 hover:text-indigo-300 transition-colors`}>
                  See all community posts →
                </a>
              </div>
            )}

            <div className={`rounded-2xl border p-4 ${dark ? 'border-amber-500/20 bg-amber-500/5' : 'border-amber-200 bg-amber-50'}`}>
              <p className="text-xs text-amber-500">
                <span className="font-semibold">Disclaimer:</span> Cost estimates are AI-generated based on 2024 data and may vary.
                Always research current prices using Numbeo, Expatistan, or local sources before making relocation decisions.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
