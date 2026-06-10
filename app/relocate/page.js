'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import EditorialHero from '../components/ui/EditorialHero';
import Btn from '../components/ui/Btn';
import Footnote from '../components/ui/Footnote';
import { useScrollReveal } from '../components/ui/hooks/useScrollReveal';
import { HERO_COPY, FOOTNOTES } from '../lib/pageCopy';

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

function CostCard({ label, item }) {
  return (
    <div className="border border-paper-rule p-3">
      <p className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub mb-1">{label}</p>
      <p className="text-[14px] font-medium text-paper-ink">{item?.amount || '—'}</p>
      {item?.note && <p className="text-[12px] mt-1 text-paper-ink-sub">{item.note}</p>}
    </div>
  );
}

function Avatar({ name }) {
  const initials = (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="w-8 h-8 border border-paper-rule flex items-center justify-center font-mono font-medium text-paper-ink text-[11px] flex-shrink-0">
      {initials}
    </div>
  );
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
  useScrollReveal();
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

  const qlColor = (score) => score >= 8 ? 'text-[#5a7d3f]' : score >= 6 ? 'text-[#b5912f]' : 'text-accent';
  const langColor = (level) => level === 'none' || level === 'low' ? 'text-[#5a7d3f]' : level === 'medium' ? 'text-[#b5912f]' : 'text-accent';

  const hero = HERO_COPY.relocate;

  return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />

      <EditorialHero
        kicker={hero.kicker}
        title={hero.title}
        titleItalic={hero.italic}
        titleTail={hero.tail}
        sub={hero.sub}
        meta={['COST + NEIGHBORHOODS + SAFETY', 'BANKING, SIM, EMERGENCY NUMBERS', '~30 SECONDS']}
      />

      <main className="max-w-[1280px] mx-auto px-6 sm:px-10 pb-24 border-t border-paper-rule">
        <div className="py-14">

          {/* Search form */}
          <div className="border border-paper-rule p-6 mb-6">
            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              <div className="sm:col-span-1">
                <label className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub block mb-1.5">DESTINATION CITY / COUNTRY *</label>
                <input value={destination} onChange={(e) => setDestination(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="e.g. Berlin, Germany"
                  className="w-full px-3 py-2.5 bg-paper-bg border border-paper-rule text-paper-ink text-[13px] outline-none focus:border-accent placeholder:text-paper-ink-sub" />
              </div>
              <div>
                <label className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub block mb-1.5">
                  WHERE YOU&apos;RE FROM (OPTIONAL)
                  {profilePrefilled && <span className="ml-1.5 text-accent">· FROM PROFILE</span>}
                </label>
                <input value={origin} onChange={(e) => setOrigin(e.target.value)}
                  placeholder="e.g. Lagos, Nigeria"
                  className="w-full px-3 py-2.5 bg-paper-bg border border-paper-rule text-paper-ink text-[13px] outline-none focus:border-accent placeholder:text-paper-ink-sub" />
              </div>
              <div>
                <label className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub block mb-1.5">YOUR FIELD (OPTIONAL)</label>
                <input value={field} onChange={(e) => setField(e.target.value)}
                  placeholder="e.g. Software Engineering"
                  className="w-full px-3 py-2.5 bg-paper-bg border border-paper-rule text-paper-ink text-[13px] outline-none focus:border-accent placeholder:text-paper-ink-sub" />
              </div>
            </div>

            {/* Popular destinations */}
            <div className="mb-4">
              <p className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub mb-2">POPULAR DESTINATIONS</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_DESTINATIONS.map((d) => (
                  <button key={d.name} onClick={() => { setDestination(d.name); handleSearch(d.name); }}
                    className="px-3 py-1 border border-paper-rule font-mono text-[11px] text-paper-ink-dim hover:border-accent hover:text-accent transition-colors">
                    {d.icon} {d.name}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="mb-3 px-4 py-3 border border-accent/40 bg-paper-bg-alt text-[13px] text-paper-ink-dim">
                <span className="font-mono text-[10px] tracking-[0.12em] text-accent mr-2">// ERROR</span>
                {error}
              </div>
            )}

            <Btn variant="primary" as="button" onClick={() => handleSearch()} disabled={loading || !destination.trim()} className="w-full justify-center disabled:opacity-40">
              {loading ? (
                <span className="flex items-center justify-center gap-2 font-mono text-[11px] tracking-[0.12em]">
                  <span className="w-3.5 h-3.5 border-2 border-paper-bg border-t-transparent rounded-full animate-spin" />
                  BUILDING YOUR RELOCATION GUIDE…
                </span>
              ) : 'Generate Relocation Guide'}
            </Btn>
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-5">
              {/* Overview + quick stats */}
              <div className="border border-paper-rule p-6">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1">
                    <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-2">// DESTINATION</div>
                    <h2 className="font-display text-[28px] leading-[1.15] mb-2 text-paper-ink">{result.destination}</h2>
                    <p className="text-[14px] leading-[1.55] text-paper-ink-dim">{result.overview}</p>
                    {result.comparedToUS && (
                      <p className="text-[12px] mt-3 px-3 py-1.5 border border-paper-rule inline-block text-paper-ink-dim">
                        vs. US: {result.comparedToUS}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-row sm:flex-col gap-3">
                    {result.qualityOfLife?.score && (
                      <div className="text-center px-4 py-3 border border-paper-rule">
                        <p className={`font-display text-[28px] leading-none ${qlColor(result.qualityOfLife.score)}`}>{result.qualityOfLife.score}/10</p>
                        <p className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub mt-1">QUALITY OF LIFE</p>
                      </div>
                    )}
                    {result.languageBarrier?.level && (
                      <div className="text-center px-4 py-3 border border-paper-rule">
                        <p className={`text-[15px] font-medium capitalize ${langColor(result.languageBarrier.level)}`}>{result.languageBarrier.level}</p>
                        <p className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub mt-1">LANGUAGE BARRIER</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Budget summary */}
                {result.monthlyBudget && (
                  <div className="mt-5 pt-5 border-t border-paper-rule">
                    <p className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-3">// MONTHLY BUDGET ESTIMATES (USD)</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 border border-paper-rule">
                        <p className="font-display text-[24px] text-paper-ink">${result.monthlyBudget.budget?.toLocaleString()}</p>
                        <p className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub mt-1">BUDGET</p>
                      </div>
                      <div className="text-center p-3 border border-accent/40 bg-paper-bg-alt">
                        <p className="font-display text-[24px] text-accent">${result.monthlyBudget.comfortable?.toLocaleString()}</p>
                        <p className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub mt-1">COMFORTABLE</p>
                      </div>
                      <div className="text-center p-3 border border-paper-rule">
                        <p className="font-display text-[24px] text-paper-ink">${result.monthlyBudget.luxury?.toLocaleString()}</p>
                        <p className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub mt-1">LUXURY</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Cost breakdown */}
              {result.costBreakdown && (
                <div className="border border-paper-rule p-5">
                  <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-4">// COST OF LIVING</div>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {[
                      ['RENT — CITY CENTER (1BR)', result.costBreakdown.rent_1br_city_center],
                      ['RENT — OUTSIDE CENTER (1BR)', result.costBreakdown.rent_1br_outside_center],
                      ['GROCERIES', result.costBreakdown.groceries],
                      ['DINING OUT', result.costBreakdown.dining_out],
                      ['PUBLIC TRANSPORT', result.costBreakdown.public_transport],
                      ['UTILITIES', result.costBreakdown.utilities],
                      ['INTERNET', result.costBreakdown.internet],
                      ['HEALTHCARE', result.costBreakdown.healthcare],
                      ['GYM & ENTERTAINMENT', result.costBreakdown.gym_entertainment],
                    ].map(([label, item]) => item && (
                      <CostCard key={label} label={label} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* QoL pros/cons + job market */}
              <div className="grid sm:grid-cols-2 gap-5">
                {result.qualityOfLife && (
                  <div className="border border-paper-rule p-5">
                    <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-3">// QUALITY OF LIFE</div>
                    {result.qualityOfLife.pros?.length > 0 && (
                      <div className="mb-3">
                        <p className="font-mono text-[10px] tracking-[0.1em] text-[#5a7d3f] mb-1.5">PROS</p>
                        {result.qualityOfLife.pros.map((p, i) => (
                          <p key={i} className="text-[13px] flex gap-1.5 mb-1 text-paper-ink-dim"><span className="text-[#5a7d3f]">✓</span>{p}</p>
                        ))}
                      </div>
                    )}
                    {result.qualityOfLife.cons?.length > 0 && (
                      <div>
                        <p className="font-mono text-[10px] tracking-[0.1em] text-accent mb-1.5">CONS</p>
                        {result.qualityOfLife.cons.map((c, i) => (
                          <p key={i} className="text-[13px] flex gap-1.5 mb-1 text-paper-ink-dim"><span className="text-accent">✗</span>{c}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {result.jobMarket && (
                  <div className="border border-paper-rule p-5">
                    <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-3">// JOB MARKET FOR EXPATS</div>
                    <p className="text-[13px] leading-[1.55] mb-3 text-paper-ink-dim">{result.jobMarket.overview}</p>
                    {result.jobMarket.averageSalary && (
                      <p className="text-[13px] mb-2 text-paper-ink-dim">Avg skilled salary: <span className="font-medium text-paper-ink">{result.jobMarket.averageSalary}</span></p>
                    )}
                    {result.jobMarket.topIndustries?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {result.jobMarket.topIndustries.map((ind, i) => (
                          <span key={i} className="font-mono text-[11px] px-2 py-0.5 border border-paper-rule text-paper-ink-dim">{ind}</span>
                        ))}
                      </div>
                    )}
                    {result.jobMarket.jobSearchTips?.map((t, i) => (
                      <p key={i} className="text-[13px] flex gap-1.5 text-paper-ink-dim"><span className="text-accent">→</span>{t}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* Neighborhoods */}
              {result.neighborhoods?.length > 0 && (
                <div className="border border-paper-rule p-5">
                  <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-4">// NEIGHBORHOODS TO KNOW</div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {result.neighborhoods.map((n, i) => (
                      <div key={i} className="border border-paper-rule p-4">
                        <div className="flex justify-between items-start">
                          <p className="text-[13px] font-medium text-paper-ink">{n.name}</p>
                          {n.safetyRating && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 border border-paper-rule text-paper-ink-sub">
                              SAFETY: {n.safetyRating}/5
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] mt-1 text-paper-ink-dim">{n.vibe}</p>
                        <div className="flex gap-2 mt-2">
                          {n.avgRent && <span className="text-[12px] text-accent">~{n.avgRent}/mo</span>}
                          {n.goodFor && <span className="text-[12px] text-paper-ink-sub">· {n.goodFor}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Safety Info */}
              {result.safetyInfo && (
                <div className="border border-paper-rule p-5">
                  <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-4">// SAFETY OVERVIEW</div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`font-mono text-[11px] tracking-[0.1em] px-3 py-1.5 border ${
                      result.safetyInfo.crimeIndex === 'low' ? 'text-[#5a7d3f] border-[#5a7d3f]/40' :
                      result.safetyInfo.crimeIndex === 'medium' ? 'text-[#b5912f] border-[#b5912f]/40' :
                      'text-accent border-accent/40'
                    }`}>
                      {result.safetyInfo.crimeIndex?.toUpperCase()} CRIME
                    </span>
                    {result.safetyInfo.nightSafety && <p className="text-[13px] text-paper-ink-dim">{result.safetyInfo.nightSafety}</p>}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {result.safetyInfo.safeAreas?.length > 0 && (
                      <div>
                        <p className="font-mono text-[10px] tracking-[0.1em] text-[#5a7d3f] mb-2">SAFE AREAS</p>
                        {result.safetyInfo.safeAreas.map((a, i) => <p key={i} className="text-[13px] flex gap-1.5 mb-1 text-paper-ink-dim"><span className="text-[#5a7d3f]">✓</span>{a}</p>)}
                      </div>
                    )}
                    {result.safetyInfo.areasToAvoid?.length > 0 && (
                      <div>
                        <p className="font-mono text-[10px] tracking-[0.1em] text-accent mb-2">AREAS TO AVOID</p>
                        {result.safetyInfo.areasToAvoid.map((a, i) => <p key={i} className="text-[13px] flex gap-1.5 mb-1 text-paper-ink-dim"><span className="text-accent">✗</span>{a}</p>)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Climate */}
              {result.climate && (
                <div className="border border-paper-rule p-5">
                  <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-3">// CLIMATE & WEATHER</div>
                  {result.climate.overview && <p className="text-[13px] leading-[1.55] mb-3 text-paper-ink-dim">{result.climate.overview}</p>}
                  {result.climate.bestTimeToArrive && (
                    <p className="text-[13px] mb-3 text-paper-ink-dim">Best time to arrive: <span className="font-medium text-paper-ink">{result.climate.bestTimeToArrive}</span></p>
                  )}
                  {result.climate.whatToPack?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {result.climate.whatToPack.map((item, i) => (
                        <span key={i} className="font-mono text-[11px] px-2 py-1 border border-paper-rule text-paper-ink-dim">{item}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Work Culture */}
              {result.workCulture && (
                <div className="border border-paper-rule p-5">
                  <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-3">// WORK CULTURE</div>
                  <div className="grid sm:grid-cols-2 gap-3 mb-3">
                    {result.workCulture.typicalHours && (
                      <div className="p-3 border border-paper-rule">
                        <p className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub mb-1">HOURS</p>
                        <p className="text-[13px] font-medium text-paper-ink">{result.workCulture.typicalHours}</p>
                      </div>
                    )}
                    {result.workCulture.formality && (
                      <div className="p-3 border border-paper-rule">
                        <p className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub mb-1">DRESS CODE</p>
                        <p className="text-[13px] font-medium text-paper-ink capitalize">{result.workCulture.formality}</p>
                      </div>
                    )}
                  </div>
                  {result.workCulture.expatTreatment && <p className="text-[13px] mb-3 text-paper-ink-dim">{result.workCulture.expatTreatment}</p>}
                  {result.workCulture.tips?.map((t, i) => (
                    <p key={i} className="text-[13px] flex gap-1.5 mb-1 text-paper-ink-dim"><span className="text-accent">→</span>{t}</p>
                  ))}
                </div>
              )}

              {/* Before you move checklist */}
              {result.beforeYouMove?.length > 0 && (
                <div className="border border-paper-rule p-5">
                  <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-3">// BEFORE YOU MOVE CHECKLIST</div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {result.beforeYouMove.map((item, i) => (
                      <label key={i} className="flex items-start gap-2 cursor-pointer group">
                        <input type="checkbox" className="mt-0.5 accent-[#c75d2c]" />
                        <span className="text-[13px] text-paper-ink-dim group-hover:text-accent transition-colors">{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* First month tips + tax/healthcare */}
              <div className="grid sm:grid-cols-2 gap-5">
                {result.firstMonthTips?.length > 0 && (
                  <div className="border border-paper-rule p-5">
                    <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-3">// FIRST MONTH TIPS</div>
                    {result.firstMonthTips.map((t, i) => (
                      <p key={i} className="text-[13px] flex gap-1.5 mb-2 text-paper-ink-dim"><span className="text-[#5a7d3f] flex-shrink-0">✓</span>{t}</p>
                    ))}
                  </div>
                )}
                <div className="space-y-3">
                  {result.taxInfo && (
                    <div className="border border-paper-rule p-4">
                      <p className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-1.5">// TAX INFO FOR EXPATS</p>
                      <p className="text-[13px] text-paper-ink-dim">{result.taxInfo}</p>
                    </div>
                  )}
                  {result.healthcareInfo && (
                    <div className="border border-paper-rule p-4">
                      <p className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-1.5">// HEALTHCARE</p>
                      <p className="text-[13px] text-paper-ink-dim">{result.healthcareInfo}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Banking + SIM side by side */}
              <div className="grid sm:grid-cols-2 gap-5">
                {result.bankingSetup && (
                  <div className="border border-paper-rule p-5">
                    <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-3">// BANKING FOR EXPATS</div>
                    {result.bankingSetup.howToOpen && <p className="text-[13px] mb-3 text-paper-ink-dim">{result.bankingSetup.howToOpen}</p>}
                    {result.bankingSetup.bestBanksForExpats?.length > 0 && (
                      <div className="mb-2">
                        <p className="font-mono text-[10px] tracking-[0.1em] text-accent mb-1.5">RECOMMENDED BANKS</p>
                        <div className="flex flex-wrap gap-1.5">
                          {result.bankingSetup.bestBanksForExpats.map((b, i) => (
                            <span key={i} className="font-mono text-[11px] px-2 py-0.5 border border-paper-rule text-paper-ink-dim">{b}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.bankingSetup.alternativeApps?.length > 0 && (
                      <div>
                        <p className="font-mono text-[10px] tracking-[0.1em] text-[#5a7d3f] mb-1.5">DIGITAL ALTERNATIVES</p>
                        <div className="flex flex-wrap gap-1.5">
                          {result.bankingSetup.alternativeApps.map((a, i) => (
                            <span key={i} className="font-mono text-[11px] px-2 py-0.5 border border-paper-rule text-paper-ink-dim">{a}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {result.simAndInternet && (
                  <div className="border border-paper-rule p-5">
                    <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-3">// SIM &amp; INTERNET</div>
                    {result.simAndInternet.howToGetOnArrival && <p className="text-[13px] mb-2 text-paper-ink-dim">{result.simAndInternet.howToGetOnArrival}</p>}
                    {result.simAndInternet.avgMonthlyCost && (
                      <p className="text-[13px] mb-2 text-paper-ink-dim">Avg monthly cost: <span className="font-medium text-paper-ink">{result.simAndInternet.avgMonthlyCost}</span></p>
                    )}
                    {result.simAndInternet.internetSpeed && (
                      <p className="text-[13px] mb-2 text-paper-ink-dim">Avg speed: <span className="font-medium text-paper-ink">{result.simAndInternet.internetSpeed}</span></p>
                    )}
                    {result.simAndInternet.bestProviders?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {result.simAndInternet.bestProviders.map((p, i) => (
                          <span key={i} className="font-mono text-[11px] px-2 py-0.5 border border-paper-rule text-paper-ink-dim">{p}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Emergency Numbers */}
              {result.emergencyNumbers && (
                <div className="border border-accent/40 bg-paper-bg-alt p-5">
                  <div className="font-mono text-[10px] tracking-[0.12em] text-accent mb-3">// EMERGENCY NUMBERS</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      ['POLICE', result.emergencyNumbers.police, '🚔'],
                      ['AMBULANCE', result.emergencyNumbers.ambulance, '🚑'],
                      ['FIRE', result.emergencyNumbers.fire, '🚒'],
                      ['GENERAL', result.emergencyNumbers.generalEmergency, '📞'],
                    ].filter(([, num]) => num).map(([label, num, icon]) => (
                      <div key={label} className="text-center p-3 border border-paper-rule bg-paper-bg">
                        <p className="text-[18px] mb-1">{icon}</p>
                        <p className="font-display text-[20px] text-paper-ink">{num}</p>
                        <p className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub mt-1">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cultural Tips */}
              {result.culturalTips && (
                <div className="border border-paper-rule p-5">
                  <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-4">// CULTURAL TIPS &amp; ETIQUETTE</div>
                  {result.culturalTips.etiquette && <p className="text-[13px] mb-4 text-paper-ink-dim">{result.culturalTips.etiquette}</p>}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {result.culturalTips.dos?.length > 0 && (
                      <div>
                        <p className="font-mono text-[10px] tracking-[0.1em] text-[#5a7d3f] mb-2">DO</p>
                        {result.culturalTips.dos.map((d, i) => <p key={i} className="text-[13px] flex gap-1.5 mb-1.5 text-paper-ink-dim"><span className="text-[#5a7d3f] flex-shrink-0">✓</span>{d}</p>)}
                      </div>
                    )}
                    {result.culturalTips.donts?.length > 0 && (
                      <div>
                        <p className="font-mono text-[10px] tracking-[0.1em] text-accent mb-2">DON&apos;T</p>
                        {result.culturalTips.donts.map((d, i) => <p key={i} className="text-[13px] flex gap-1.5 mb-1.5 text-paper-ink-dim"><span className="text-accent flex-shrink-0">✗</span>{d}</p>)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Visa Path Summary */}
              {result.visaPathSummary && (
                <div className="border border-accent/40 bg-paper-bg-alt p-5">
                  <div className="font-mono text-[10px] tracking-[0.12em] text-accent mb-2">// VISA PATH FOR THIS DESTINATION</div>
                  <p className="text-[13px] leading-[1.55] text-paper-ink-dim">{result.visaPathSummary}</p>
                  <Btn variant="ghost" href="/visa" className="mt-3 inline-flex">
                    Get full visa intelligence →
                  </Btn>
                </div>
              )}

              {/* Expat communities */}
              {result.expatCommunities?.length > 0 && (
                <div className="border border-paper-rule p-5">
                  <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-4">// EXPAT COMMUNITIES &amp; RESOURCES</div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {result.expatCommunities.map((c, i) => (
                      <div key={i} className="border border-paper-rule p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[13px] font-medium text-paper-ink">{c.name}</p>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 border border-paper-rule text-paper-ink-sub flex-shrink-0">{c.type}</span>
                        </div>
                        {c.description && <p className="text-[12px] mt-1 text-paper-ink-dim">{c.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Community connections from OpportuMap */}
              {result.connections?.length > 0 && (
                <div className="border border-paper-rule p-5">
                  <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-1">// PEOPLE TALKING ABOUT {result.destination?.toUpperCase()}</div>
                  <p className="text-[13px] mb-4 mt-2 text-paper-ink-dim">From the OpportuMap community — connect with people who&apos;ve been there:</p>
                  <div className="space-y-3">
                    {result.connections.map((post) => (
                      <a key={post.id} href="/community"
                        className="flex gap-3 p-3 border border-paper-rule hover:border-accent/60 transition-colors cursor-pointer">
                        <Avatar name={post.user_name} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[13px] font-medium text-paper-ink">{post.user_name}</span>
                            <span className="font-mono text-[10px] text-paper-ink-sub">{timeAgo(post.created_at)}</span>
                          </div>
                          {post.title && <p className="text-[13px] font-medium mt-0.5 text-paper-ink">{post.title}</p>}
                          <p className="text-[12px] mt-0.5 line-clamp-2 text-paper-ink-dim">{post.content}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                  <Btn variant="ghost" href="/community" className="mt-3 mx-auto flex w-fit">
                    See all community posts →
                  </Btn>
                </div>
              )}

              <div className="border border-paper-rule p-4">
                <p className="text-[12px] text-paper-ink-sub">
                  <span className="font-medium text-paper-ink">Disclaimer:</span> Cost estimates are AI-generated based on 2024 data and may vary.
                  Always research current prices using Numbeo, Expatistan, or local sources before making relocation decisions.
                </p>
              </div>
            </div>
          )}

          <Footnote>{FOOTNOTES.relocate}</Footnote>
        </div>
      </main>
    </div>
  );
}
