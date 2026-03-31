'use client';

import { useState } from 'react';
import { NATIONALITIES, ADZUNA_COUNTRIES } from '../data/countries';

const EXPERIENCE_LEVELS = [
  { value: 'student', label: 'Student / No experience' },
  { value: '0-2', label: '0–2 years' },
  { value: '3-5', label: '3–5 years' },
  { value: '5-10', label: '5–10 years' },
  { value: '10+', label: '10+ years' },
];

const JOB_TYPES = ['Software Engineering', 'Data Science / ML', 'Product Management', 'Design', 'DevOps / Cloud', 'Research', 'Finance / Fintech', 'Other'];

const TOTAL_STEPS = 5;

export default function ProfileModal({ onSave, dark, initialProfile, onClose }) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState(initialProfile || {
    name: '', nationality: '', currentCountry: '', experience: '', jobTypes: [], skills: '', preferredCountries: [],
  });
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeScanning, setResumeScanning] = useState(false);
  const [resumeSummary, setResumeSummary] = useState(initialProfile?.resumeSummary || '');
  const [rememberOnDevice, setRememberOnDevice] = useState(initialProfile?.rememberOnDevice ?? false);

  const ui = {
    bg: dark ? 'bg-[#1a1a1d]' : 'bg-white',
    border: dark ? 'border-[#2a2a2e]' : 'border-zinc-200',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
    input: dark ? 'bg-[#2a2a2e] border-[#3a3a3e] text-zinc-100 placeholder-zinc-500' : 'bg-zinc-50 border-zinc-300 text-zinc-900',
    pill: (active) => active
      ? 'bg-indigo-600 text-white border-indigo-600'
      : dark ? 'bg-[#2a2a2e] text-zinc-400 border-[#3a3a3e] hover:border-indigo-500' : 'bg-white text-zinc-500 border-zinc-200 hover:border-indigo-400',
    uploadBox: dark ? 'border-[#3a3a3e] bg-[#2a2a2e] hover:border-indigo-500' : 'border-zinc-300 bg-zinc-50 hover:border-indigo-400',
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-lg mx-4 rounded-2xl border shadow-2xl ${ui.bg} ${ui.border}`}>

        {/* Header */}
        <div className={`px-6 pt-6 pb-4 border-b ${ui.border}`}>
          <div className="flex items-center justify-between mb-1">
            <h2 className={`text-lg font-bold ${ui.text}`}>
              {initialProfile ? 'Edit your profile' : 'Set up your profile'}
            </h2>
            <div className="flex items-center gap-3">
              <span className={`text-xs ${ui.sub}`}>Step {step} of {TOTAL_STEPS}</span>
              {onClose && (
                <button onClick={onClose} className={`text-xs px-2 py-0.5 rounded-lg transition-all ${dark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'}`}>
                  Skip ✕
                </button>
              )}
            </div>
          </div>
          <div className={`h-1 rounded-full mt-3 ${dark ? 'bg-[#2a2a2e]' : 'bg-zinc-100'}`}>
            <div className="h-1 rounded-full bg-indigo-500 transition-all duration-300" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Step 1: Identity */}
          {step === 1 && (
            <>
              <p className={`text-sm ${ui.sub}`}>Tell us about yourself so we can personalize visa requirements and job matches.</p>
              <div>
                <label className={`text-xs font-medium mb-1 block ${ui.sub}`}>Your name</label>
                <input value={profile.name} onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. Alex" className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
              </div>
              <div>
                <label className={`text-xs font-medium mb-1 block ${ui.sub}`}>Your nationality (passport)</label>
                <select value={profile.nationality} onChange={(e) => set('nationality', e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`}>
                  <option value="">Select nationality</option>
                  {NATIONALITIES.map((n) => <option key={n.code} value={n.code}>{n.label}</option>)}
                </select>
              </div>
              <div>
                <label className={`text-xs font-medium mb-1 block ${ui.sub}`}>Where do you currently live?</label>
                <input value={profile.currentCountry} onChange={(e) => set('currentCountry', e.target.value)}
                  placeholder="e.g. United States, Uganda, Pakistan" className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
              </div>
            </>
          )}

          {/* Step 2: Experience */}
          {step === 2 && (
            <>
              <p className={`text-sm ${ui.sub}`}>Help us match you to the right opportunities.</p>
              <div>
                <label className={`text-xs font-medium mb-2 block ${ui.sub}`}>Years of experience</label>
                <div className="flex flex-wrap gap-2">
                  {EXPERIENCE_LEVELS.map((e) => (
                    <button key={e.value} onClick={() => set('experience', e.value)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-all ${ui.pill(profile.experience === e.value)}`}>
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={`text-xs font-medium mb-2 block ${ui.sub}`}>Interested in (select all that apply)</label>
                <div className="flex flex-wrap gap-2">
                  {JOB_TYPES.map((t) => (
                    <button key={t} onClick={() => toggleJobType(t)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-all ${ui.pill(profile.jobTypes.includes(t))}`}>
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
              <p className={`text-sm ${ui.sub}`}>Which countries are you open to working in? We&apos;ll fetch jobs from these countries.</p>
              <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto">
                {ADZUNA_COUNTRIES.map((c) => (
                  <button key={c.code} onClick={() => toggleCountry(c.code)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-all ${ui.pill(profile.preferredCountries?.includes(c.code))}`}>
                    {c.flag} {c.label}
                  </button>
                ))}
              </div>
              {(profile.preferredCountries?.length === 0 || !profile.preferredCountries) && (
                <p className={`text-xs ${ui.sub}`}>Select at least one, or skip to use all 21 countries.</p>
              )}
            </>
          )}

          {/* Step 4: Resume upload */}
          {step === 4 && (
            <>
              <p className={`text-sm ${ui.sub}`}>Upload your resume so our AI can extract your skills and match you to jobs automatically.</p>
              <label className={`flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed cursor-pointer transition-all ${ui.uploadBox}`}>
                <input type="file" accept="application/pdf" className="hidden"
                  onChange={(e) => handleResumeUpload(e.target.files?.[0])} />
                {resumeScanning ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className={`text-xs ${ui.sub}`}>Scanning resume with AI...</p>
                  </div>
                ) : resumeFile ? (
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-2xl">📄</p>
                    <p className={`text-xs font-medium ${ui.text}`}>{resumeFile.name}</p>
                    <p className={`text-xs text-green-400`}>Scanned successfully</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-2xl">📎</p>
                    <p className={`text-xs font-medium ${ui.text}`}>Click to upload your resume</p>
                    <p className={`text-xs ${ui.sub}`}>PDF only</p>
                  </div>
                )}
              </label>
              {resumeSummary && (
                <div className={`rounded-xl border p-3 ${ui.border}`}>
                  <p className={`text-xs font-semibold mb-1 ${ui.text}`}>AI Summary</p>
                  <p className={`text-xs leading-relaxed ${ui.sub}`}>{resumeSummary}</p>
                </div>
              )}
            </>
          )}

          {/* Step 5: Skills + summary */}
          {step === 5 && (
            <>
              <p className={`text-sm ${ui.sub}`}>Review and add any missing skills.</p>
              <div>
                <label className={`text-xs font-medium mb-1 block ${ui.sub}`}>Skills (comma separated)</label>
                <textarea value={profile.skills} onChange={(e) => set('skills', e.target.value)} rows={3}
                  placeholder="e.g. Python, React, Machine Learning, SQL, AWS"
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none ${ui.input}`} />
              </div>
              <div className={`rounded-xl border p-4 ${ui.border}`}>
                <p className={`text-xs font-semibold mb-2 ${ui.text}`}>Profile summary</p>
                <p className={`text-xs ${ui.sub}`}>{profile.name || 'You'} · {NATIONALITIES.find(n => n.code === profile.nationality)?.label || '—'} · {profile.currentCountry || '—'}</p>
                <p className={`text-xs mt-1 ${ui.sub}`}>{profile.experience || '—'} experience · {profile.jobTypes.join(', ') || '—'}</p>
                {profile.skills && <p className={`text-xs mt-1 ${ui.sub}`}>Skills: {profile.skills}</p>}
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={rememberOnDevice}
                  onChange={(e) => setRememberOnDevice(e.target.checked)}
                  className="w-4 h-4 rounded accent-indigo-600"
                />
                <span className={`text-xs ${ui.sub}`}>Remember my profile on this device</span>
              </label>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${dark ? 'border-[#3a3a3e] text-zinc-300 hover:bg-[#2a2a2e]' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
              Back
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button onClick={() => setStep(step + 1)} disabled={step === 1 && !profile.nationality}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium transition-all">
              {step === 4 && !resumeFile ? 'Skip for now' : 'Continue'}
            </button>
          ) : (
            <button onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all">
              Save profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
