'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase-browser';
import Btn from './ui/Btn';

const STAGES = ['idea', 'pre-seed', 'seed', 'series-a', 'series-b+'];
const SECTORS = ['AI', 'Fintech', 'HealthTech', 'CleanTech', 'SaaS', 'EdTech', 'Other'];
const TOTAL_STEPS = 5;

const inputClass = 'w-full px-3 py-2.5 border bg-paper-bg border-paper-rule text-paper-ink placeholder-paper-ink-sub text-[13px] outline-none focus:border-accent transition-colors';
const labelClass = 'font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-1.5 block';

function pillClass(active) {
  return `font-mono text-[11px] px-3 py-1.5 transition-colors ${active ? 'bg-paper-ink text-paper-bg' : 'border border-paper-rule text-paper-ink hover:bg-paper-bg-alt'}`;
}

export default function StartupModal({ onClose, onSuccess }) {
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
      <div className="w-full max-w-lg mx-4 border bg-paper-bg border-paper-rule">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-paper-rule">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display text-[22px] leading-[1.15] text-paper-ink">Post your startup</h2>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub">STEP {step} OF {TOTAL_STEPS}</span>
              <button onClick={onClose} className="font-mono text-[11px] text-paper-ink-sub hover:text-paper-ink transition-colors">✕</button>
            </div>
          </div>
          <div className="h-1 mt-3 bg-paper-rule">
            <div className="h-1 bg-accent transition-all duration-300" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Step 1: Name + tagline */}
          {step === 1 && (
            <>
              <p className="text-[13px] text-paper-ink-dim">What's your startup called?</p>
              <div>
                <label className={labelClass}>STARTUP NAME</label>
                <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. NeuralHire"
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>ONE-LINE TAGLINE</label>
                <input value={form.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="e.g. AI recruiter that replaces the whole hiring funnel"
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>DESCRIPTION (2-4 SENTENCES)</label>
                <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} placeholder="What problem do you solve? How? What's your traction?"
                  className={`${inputClass} resize-none`} />
              </div>
            </>
          )}

          {/* Step 2: Stage + sector */}
          {step === 2 && (
            <>
              <p className="text-[13px] text-paper-ink-dim">Where are you in your journey?</p>
              <div>
                <label className={labelClass}>FUNDING STAGE</label>
                <div className="flex flex-wrap gap-2">
                  {STAGES.map((s) => (
                    <button key={s} onClick={() => set('stage', s)}
                      className={pillClass(form.stage === s)}>{s.toUpperCase()}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>SECTOR</label>
                <div className="flex flex-wrap gap-2">
                  {SECTORS.map((s) => (
                    <button key={s} onClick={() => set('sector', s)}
                      className={pillClass(form.sector === s)}>{s.toUpperCase()}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Step 3: Raise + team */}
          {step === 3 && (
            <>
              <p className="text-[13px] text-paper-ink-dim">Funding ask and team details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>RAISING ($)</label>
                  <input value={form.raise_amount} onChange={(e) => set('raise_amount', e.target.value)} placeholder="500000" type="number"
                    className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>EQUITY (%)</label>
                  <input value={form.equity_offered} onChange={(e) => set('equity_offered', e.target.value)} placeholder="10" type="number"
                    className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>TEAM SIZE</label>
                  <input value={form.team_size} onChange={(e) => set('team_size', e.target.value)} placeholder="3" type="number"
                    className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>LOCATION</label>
                  <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="San Francisco, CA"
                    className={inputClass} />
                </div>
              </div>
            </>
          )}

          {/* Step 4: Links */}
          {step === 4 && (
            <>
              <p className="text-[13px] text-paper-ink-dim">Where can investors learn more?</p>
              <div>
                <label className={labelClass}>WEBSITE</label>
                <input value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://yourstartup.com"
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>LINKEDIN / TWITTER (OPTIONAL)</label>
                <input value={form.linkedin} onChange={(e) => set('linkedin', e.target.value)} placeholder="https://linkedin.com/company/yourstartup"
                  className={inputClass} />
              </div>
            </>
          )}

          {/* Step 5: Pitch deck + review */}
          {step === 5 && (
            <>
              <p className="text-[13px] text-paper-ink-dim">Upload your pitch deck (optional) and review.</p>
              <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-paper-rule bg-paper-bg-alt hover:border-accent cursor-pointer transition-colors">
                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handlePitchDeck(e.target.files?.[0])} />
                {uploading ? (
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    <p className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub">UPLOADING…</p>
                  </div>
                ) : form.pitch_deck_url ? (
                  <p className="font-mono text-[11px] text-[#5a7d3f]">✓ Pitch deck uploaded</p>
                ) : (
                  <div className="text-center">
                    <p className="font-mono text-[10px] tracking-[0.1em] text-paper-ink-sub">UPLOAD PITCH DECK (PDF)</p>
                  </div>
                )}
              </label>
              <div className="border border-paper-rule p-4">
                <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-2">// REVIEW</div>
                <p className="text-[13px] text-paper-ink-dim">{form.name} · {form.stage} · {form.sector}</p>
                {form.raise_amount && <p className="text-[13px] text-paper-ink-dim mt-1">Raising ${Number(form.raise_amount).toLocaleString()}{form.equity_offered ? ` · ${form.equity_offered}% equity` : ''}</p>}
                {form.location && <p className="text-[13px] text-paper-ink-dim mt-1">{form.location}{form.team_size ? ` · ${form.team_size} people` : ''}</p>}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          {step > 1 && (
            <Btn variant="secondary" as="button" className="flex-1 justify-center" onClick={() => setStep(step - 1)}>
              Back
            </Btn>
          )}
          {step < TOTAL_STEPS ? (
            <Btn variant="primary" as="button" className="flex-1 justify-center disabled:opacity-40"
              disabled={step === 1 && (!form.name || !form.tagline || !form.description) || step === 2 && (!form.stage || !form.sector)}
              onClick={() => setStep(step + 1)}>
              Continue
            </Btn>
          ) : (
            <Btn variant="primary" as="button" className="flex-1 justify-center disabled:opacity-40" disabled={submitting} onClick={handleSubmit}>
              {submitting ? 'Posting…' : 'Post startup →'}
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}
