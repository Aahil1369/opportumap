'use client';

import { useState } from 'react';
import { NATIONALITIES, ADZUNA_COUNTRIES } from '../data/countries';
import Btn from './ui/Btn';

const EXPERIENCE_LEVELS = [
  { value: 'student', label: 'Student / No experience' },
  { value: '0-2', label: '0–2 years' },
  { value: '3-5', label: '3–5 years' },
  { value: '5-10', label: '5–10 years' },
  { value: '10+', label: '10+ years' },
];

const JOB_TYPES = ['Software Engineering', 'Data Science / ML', 'Product Management', 'Design', 'DevOps / Cloud', 'Research', 'Finance / Fintech', 'Other'];

const TOTAL_STEPS = 5;

export default function ProfileModal({ onSave, initialProfile, onClose, welcome = false }) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState(initialProfile || {
    name: '', nationality: '', currentCountry: '', experience: '', jobTypes: [], skills: '', preferredCountries: [],
  });
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeScanning, setResumeScanning] = useState(false);
  const [resumeSummary, setResumeSummary] = useState(initialProfile?.resumeSummary || '');
  const [rememberOnDevice, setRememberOnDevice] = useState(initialProfile?.rememberOnDevice ?? false);

  const pillClass = (active) => active
    ? 'bg-paper-ink text-paper-bg border-paper-ink'
    : 'bg-paper-bg text-paper-ink-sub border-paper-rule hover:border-accent hover:text-paper-ink';

  const set = (key, val) => setProfile((p) => ({ ...p, [key]: val }));
  const toggleJobType = (t) => set('jobTypes', profile.jobTypes.includes(t) ? profile.jobTypes.filter((x) => x !== t) : [...profile.jobTypes, t]);
  const toggleCountry = (c) => set('preferredCountries', profile.preferredCountries?.includes(c) ? profile.preferredCountries.filter((x) => x !== c) : [...(profile.preferredCountries || []), c]);

  const handleResumeUpload = async (file) => {
    if (!file || file.type !== 'application/pdf') return;
    setResumeFile(file);
    setResumeScanning(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      const res = await fetch('/api/resume', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.skills) set('skills', data.skills);
      if (data.summary) setResumeSummary(data.summary);
      if (data.experience) set('experience', data.experience);
    } catch (e) {
      console.error('Resume scan failed', e);
    }
    setResumeScanning(false);
  };

  const handleSave = () => {
    onSave({ ...profile, resumeSummary, rememberOnDevice });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-paper-bg border border-paper-rule">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-paper-rule">
          {welcome && (
            <div className="mb-4 px-4 py-3 border border-accent/40 bg-paper-bg-alt">
              <p className="font-mono text-[10px] tracking-[0.12em] text-accent mb-1">// WELCOME TO OPPORTUMAP</p>
              <p className="text-[13px] text-paper-ink-dim leading-[1.5]">Takes 60 seconds — unlocks AI job matching, visa filters, and opportunity scores.</p>
            </div>
          )}
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-[24px] leading-[1.15] text-paper-ink">
              {welcome ? 'Quick profile setup' : initialProfile?.name ? 'Edit your profile' : 'Set up your profile'}
            </h2>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub">// STEP {step} OF {TOTAL_STEPS}</span>
              {onClose && (
                <button onClick={onClose} className="font-mono text-[10px] tracking-[0.08em] text-paper-ink-sub hover:text-accent transition-colors">
                  SKIP ✕
                </button>
              )}
            </div>
          </div>
          <div className="h-px bg-paper-rule">
            <div className="h-px bg-accent transition-all duration-300" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Step 1: Identity */}
          {step === 1 && (
            <>
              <p className="text-[13px] text-paper-ink-dim leading-[1.5]">Tell us about yourself so we can personalize visa requirements and job matches.</p>
              <div>
                <label className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-1.5 block">YOUR NAME</label>
                <input value={profile.name} onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. Alex" className="w-full px-3 py-2.5 bg-paper-bg border border-paper-rule text-paper-ink text-sm outline-none focus:border-accent transition-colors" />
              </div>
              <div>
                <label className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-1.5 block">YOUR NATIONALITY (PASSPORT)</label>
                <select value={profile.nationality} onChange={(e) => set('nationality', e.target.value)}
                  className="w-full px-3 py-2.5 bg-paper-bg border border-paper-rule text-paper-ink text-sm outline-none focus:border-accent transition-colors">
                  <option value="">Select nationality</option>
                  {NATIONALITIES.map((n) => <option key={n.code} value={n.code}>{n.label}</option>)}
                </select>
              </div>
              <div>
                <label className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-1.5 block">WHERE DO YOU CURRENTLY LIVE?</label>
                <input value={profile.currentCountry} onChange={(e) => set('currentCountry', e.target.value)}
                  placeholder="e.g. United States, Uganda, Pakistan" className="w-full px-3 py-2.5 bg-paper-bg border border-paper-rule text-paper-ink text-sm outline-none focus:border-accent transition-colors" />
              </div>
            </>
          )}

          {/* Step 2: Experience */}
          {step === 2 && (
            <>
              <p className="text-[13px] text-paper-ink-dim leading-[1.5]">Help us match you to the right opportunities.</p>
              <div>
                <label className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-2 block">YEARS OF EXPERIENCE</label>
                <div className="flex flex-wrap gap-2">
                  {EXPERIENCE_LEVELS.map((e) => (
                    <button key={e.value} onClick={() => set('experience', e.value)}
                      className={`px-3 py-1.5 text-xs border transition-colors ${pillClass(profile.experience === e.value)}`}>
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-2 block">INTERESTED IN (SELECT ALL THAT APPLY)</label>
                <div className="flex flex-wrap gap-2">
                  {JOB_TYPES.map((t) => (
                    <button key={t} onClick={() => toggleJobType(t)}
                      className={`px-3 py-1.5 text-xs border transition-colors ${pillClass(profile.jobTypes.includes(t))}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Step 3: Preferred countries */}
          {step === 3 && (
            <>
              <p className="text-[13px] text-paper-ink-dim leading-[1.5]">Which countries are you open to working in? We&apos;ll fetch jobs from these countries.</p>
              <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto">
                {ADZUNA_COUNTRIES.map((c) => (
                  <button key={c.code} onClick={() => toggleCountry(c.code)}
                    className={`px-3 py-1.5 text-xs border transition-colors ${pillClass(profile.preferredCountries?.includes(c.code))}`}>
                    {c.flag} {c.label}
                  </button>
                ))}
              </div>
              {(profile.preferredCountries?.length === 0 || !profile.preferredCountries) && (
                <p className="font-mono text-[11px] text-paper-ink-sub">Select at least one, or skip to use all 21 countries.</p>
              )}
            </>
          )}

          {/* Step 4: Resume upload */}
          {step === 4 && (
            <>
              <p className="text-[13px] text-paper-ink-dim leading-[1.5]">Upload your resume so our AI can extract your skills and match you to jobs automatically.</p>
              <label className="flex flex-col items-center justify-center w-full h-32 border border-dashed border-paper-rule bg-paper-bg-alt hover:border-accent cursor-pointer transition-colors">
                <input type="file" accept="application/pdf" className="hidden"
                  onChange={(e) => handleResumeUpload(e.target.files?.[0])} />
                {resumeScanning ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    <p className="font-mono text-[11px] text-paper-ink-sub">Scanning resume with AI...</p>
                  </div>
                ) : resumeFile ? (
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-2xl">📄</p>
                    <p className="text-[13px] font-medium text-paper-ink">{resumeFile.name}</p>
                    <p className="font-mono text-[11px] text-accent">Scanned successfully</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-2xl">📎</p>
                    <p className="text-[13px] font-medium text-paper-ink">Click to upload your resume</p>
                    <p className="font-mono text-[11px] text-paper-ink-sub">PDF only</p>
                  </div>
                )}
              </label>
              {resumeSummary && (
                <div className="border border-paper-rule p-3">
                  <p className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-1.5">// AI SUMMARY</p>
                  <p className="text-[13px] text-paper-ink-dim leading-[1.5]">{resumeSummary}</p>
                </div>
              )}
            </>
          )}

          {/* Step 5: Skills + summary */}
          {step === 5 && (
            <>
              <p className="text-[13px] text-paper-ink-dim leading-[1.5]">Review and add any missing skills.</p>
              <div>
                <label className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-1.5 block">SKILLS (COMMA SEPARATED)</label>
                <textarea value={profile.skills} onChange={(e) => set('skills', e.target.value)} rows={3}
                  placeholder="e.g. Python, React, Machine Learning, SQL, AWS"
                  className="w-full px-3 py-2.5 bg-paper-bg border border-paper-rule text-paper-ink text-sm outline-none focus:border-accent transition-colors resize-none" />
              </div>
              <div className="border border-paper-rule p-4">
                <p className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-2">// PROFILE SUMMARY</p>
                <p className="text-[13px] text-paper-ink-dim leading-[1.5]">{profile.name || 'You'} · {NATIONALITIES.find(n => n.code === profile.nationality)?.label || '—'} · {profile.currentCountry || '—'}</p>
                <p className="text-[13px] text-paper-ink-dim leading-[1.5] mt-1">{profile.experience || '—'} experience · {profile.jobTypes.join(', ') || '—'}</p>
                {profile.skills && <p className="text-[13px] text-paper-ink-dim leading-[1.5] mt-1">Skills: {profile.skills}</p>}
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={rememberOnDevice}
                  onChange={(e) => setRememberOnDevice(e.target.checked)}
                  className="w-4 h-4 accent-[#c75d2c]"
                />
                <span className="font-mono text-[11px] text-paper-ink-sub">Remember my profile on this device</span>
              </label>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)}
              className="flex-1 py-2.5 border border-paper-rule text-paper-ink text-sm font-medium hover:bg-paper-bg-alt transition-colors">
              Back
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <Btn as="button" variant="primary" onClick={() => setStep(step + 1)} disabled={step === 1 && !profile.nationality}
              className="flex-1 justify-center disabled:opacity-40">
              {step === 4 && !resumeFile ? 'Skip for now' : 'Continue'}
            </Btn>
          ) : (
            <Btn as="button" variant="primary" onClick={handleSave} className="flex-1 justify-center">
              Save profile
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}
