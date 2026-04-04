'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase-browser';

const STAGES = ['idea', 'pre-seed', 'seed', 'series-a', 'series-b+'];
const SECTORS = ['AI', 'Fintech', 'HealthTech', 'CleanTech', 'SaaS', 'EdTech', 'Other'];
const TOTAL_STEPS = 5;

export default function StartupModal({ dark, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '', tagline: '', description: '',
    stage: '', sector: '',
    raise_amount: '', equity_offered: '', team_size: '', location: '',
    website: '', linkedin: '',
    pitch_deck_url: '',
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const ui = {
    bg: dark ? 'bg-[#0e0e18]' : 'bg-white',
    border: dark ? 'border-[#1e1e2e]' : 'border-zinc-200',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
    input: dark ? 'bg-[#1a1a28] border-[#2a2a3e] text-zinc-100 placeholder-zinc-600' : 'bg-zinc-50 border-zinc-300 text-zinc-900',
    pill: (a) => a ? 'bg-indigo-600 text-white border-indigo-600' : dark ? 'bg-[#1a1a28] text-zinc-400 border-[#2a2a3e] hover:border-indigo-500' : 'bg-white text-zinc-500 border-zinc-200 hover:border-indigo-400',
  };

  const handlePitchDeck = async (file) => {
    if (!file || file.type !== 'application/pdf') return;
    setUploading(true);
    try {
      const supabase = createClient();
      const fileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
      const { data, error } = await supabase.storage.from('pitch-decks').upload(fileName, file, { upsert: true });
      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage.from('pitch-decks').getPublicUrl(data.path);
        set('pitch_deck_url', publicUrl);
      }
    } catch {}
    setUploading(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/startups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          raise_amount: form.raise_amount ? Number(form.raise_amount) : null,
          equity_offered: form.equity_offered ? Number(form.equity_offered) : null,
          team_size: form.team_size ? Number(form.team_size) : null,
        }),
      });
      const data = await res.json();
      if (data.startup) { onSuccess(data.startup); onClose(); }
    } catch {}
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-lg mx-4 rounded-2xl border shadow-2xl ${ui.bg} ${ui.border}`}>
        {/* Header */}
        <div className={`px-6 pt-6 pb-4 border-b ${ui.border}`}>
          <div className="flex items-center justify-between mb-1">
            <h2 className={`text-lg font-bold ${ui.text}`}>Post your startup</h2>
            <div className="flex items-center gap-3">
              <span className={`text-xs ${ui.sub}`}>Step {step} of {TOTAL_STEPS}</span>
              <button onClick={onClose} className={`text-xs px-2 py-0.5 rounded-lg ${dark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'}`}>✕</button>
            </div>
          </div>
          <div className={`h-1 rounded-full mt-3 ${dark ? 'bg-[#1a1a28]' : 'bg-zinc-100'}`}>
            <div className="h-1 rounded-full bg-indigo-500 transition-all duration-300" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Step 1: Name + tagline */}
          {step === 1 && (
            <>
              <p className={`text-sm ${ui.sub}`}>What's your startup called?</p>
              <div>
                <label className={`text-xs font-medium mb-1 block ${ui.sub}`}>Startup name</label>
                <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. NeuralHire"
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
              </div>
              <div>
                <label className={`text-xs font-medium mb-1 block ${ui.sub}`}>One-line tagline</label>
                <input value={form.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="e.g. AI recruiter that replaces the whole hiring funnel"
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
              </div>
              <div>
                <label className={`text-xs font-medium mb-1 block ${ui.sub}`}>Description (2-4 sentences)</label>
                <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} placeholder="What problem do you solve? How? What's your traction?"
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none ${ui.input}`} />
              </div>
            </>
          )}

          {/* Step 2: Stage + sector */}
          {step === 2 && (
            <>
              <p className={`text-sm ${ui.sub}`}>Where are you in your journey?</p>
              <div>
                <label className={`text-xs font-medium mb-2 block ${ui.sub}`}>Funding stage</label>
                <div className="flex flex-wrap gap-2">
                  {STAGES.map((s) => (
                    <button key={s} onClick={() => set('stage', s)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-all ${ui.pill(form.stage === s)}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className={`text-xs font-medium mb-2 block ${ui.sub}`}>Sector</label>
                <div className="flex flex-wrap gap-2">
                  {SECTORS.map((s) => (
                    <button key={s} onClick={() => set('sector', s)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-all ${ui.pill(form.sector === s)}`}>{s}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Step 3: Raise + team */}
          {step === 3 && (
            <>
              <p className={`text-sm ${ui.sub}`}>Funding ask and team details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-medium mb-1 block ${ui.sub}`}>Raising ($)</label>
                  <input value={form.raise_amount} onChange={(e) => set('raise_amount', e.target.value)} placeholder="500000" type="number"
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
                </div>
                <div>
                  <label className={`text-xs font-medium mb-1 block ${ui.sub}`}>Equity (%)</label>
                  <input value={form.equity_offered} onChange={(e) => set('equity_offered', e.target.value)} placeholder="10" type="number"
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
                </div>
                <div>
                  <label className={`text-xs font-medium mb-1 block ${ui.sub}`}>Team size</label>
                  <input value={form.team_size} onChange={(e) => set('team_size', e.target.value)} placeholder="3" type="number"
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
                </div>
                <div>
                  <label className={`text-xs font-medium mb-1 block ${ui.sub}`}>Location</label>
                  <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="San Francisco, CA"
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
                </div>
              </div>
            </>
          )}

          {/* Step 4: Links */}
          {step === 4 && (
            <>
              <p className={`text-sm ${ui.sub}`}>Where can investors learn more?</p>
              <div>
                <label className={`text-xs font-medium mb-1 block ${ui.sub}`}>Website</label>
                <input value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://yourstartup.com"
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
              </div>
              <div>
                <label className={`text-xs font-medium mb-1 block ${ui.sub}`}>LinkedIn / Twitter (optional)</label>
                <input value={form.linkedin} onChange={(e) => set('linkedin', e.target.value)} placeholder="https://linkedin.com/company/yourstartup"
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
              </div>
            </>
          )}

          {/* Step 5: Pitch deck + review */}
          {step === 5 && (
            <>
              <p className={`text-sm ${ui.sub}`}>Upload your pitch deck (optional) and review.</p>
              <label className={`flex flex-col items-center justify-center w-full h-24 rounded-xl border-2 border-dashed cursor-pointer transition-all ${dark ? 'border-[#2a2a3e] bg-[#1a1a28] hover:border-indigo-500' : 'border-zinc-300 bg-zinc-50 hover:border-indigo-400'}`}>
                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handlePitchDeck(e.target.files?.[0])} />
                {uploading ? (
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className={`text-xs ${ui.sub}`}>Uploading...</p>
                  </div>
                ) : form.pitch_deck_url ? (
                  <p className="text-xs text-green-400 font-medium">✓ Pitch deck uploaded</p>
                ) : (
                  <div className="text-center">
                    <p className="text-lg">📊</p>
                    <p className={`text-xs ${ui.sub}`}>Upload pitch deck (PDF)</p>
                  </div>
                )}
              </label>
              <div className={`rounded-xl border p-4 ${ui.border}`}>
                <p className={`text-xs font-semibold mb-2 ${ui.text}`}>Review</p>
                <p className={`text-xs ${ui.sub}`}>{form.name} · {form.stage} · {form.sector}</p>
                {form.raise_amount && <p className={`text-xs mt-1 ${ui.sub}`}>Raising ${Number(form.raise_amount).toLocaleString()}{form.equity_offered ? ` · ${form.equity_offered}% equity` : ''}</p>}
                {form.location && <p className={`text-xs mt-1 ${ui.sub}`}>{form.location}{form.team_size ? ` · ${form.team_size} people` : ''}</p>}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${dark ? 'border-[#2a2a3e] text-zinc-300 hover:bg-[#1a1a28]' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
              Back
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button onClick={() => setStep(step + 1)}
              disabled={step === 1 && (!form.name || !form.tagline || !form.description) || step === 2 && (!form.stage || !form.sector)}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium transition-all">
              Continue
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium transition-all">
              {submitting ? 'Posting...' : 'Post Startup 🚀'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
