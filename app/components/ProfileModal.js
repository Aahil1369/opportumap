'use client';

// The profile editor, five short steps: who you are, experience, countries, résumé, skills.
// Opened from /jobs ("Set up profile" / "Edit profile"), from the navbar after a first sign-in
// and from /map. It is a kit Dialog in the dark hall: role="dialog" + aria-modal, focus moves in
// and Tab stays inside, Esc or a tap on the backdrop closes it (the same as Skip), focus goes back
// to the opener (returnFocusRef). The backdrop is flat (no blur over a board that is flipping);
// fields, pills and buttons are 16px (no iPhone zoom on focus) and at least 44px tall.
// onSave gets one object: the profile, its résumé summary and rememberOnDevice
// (lib/saveProfile.js stores it). `open` defaults to true: a parent mounts it while it is wanted.

import { useId, useRef, useState } from 'react';
import Dialog from './kit/Dialog';
import { NATIONALITIES, ADZUNA_COUNTRIES } from '../data/countries';
import { MAX_RESUME_LABEL, scanErrorFor, validateResumeFile } from '../../lib/departures/resumeVerdict';
import './ProfileModal.css';

const EXPERIENCE_LEVELS = [
  { value: 'student', label: 'Student / No experience' },
  { value: '0-2', label: '0–2 years' },
  { value: '3-5', label: '3–5 years' },
  { value: '5-10', label: '5–10 years' },
  { value: '10+', label: '10+ years' },
];

const JOB_TYPES = ['Software Engineering', 'Data Science / ML', 'Product Management', 'Design', 'DevOps / Cloud', 'Research', 'Finance / Fintech', 'Other'];

const TOTAL_STEPS = 5;

// What the résumé step says when the scan could not run at all; every other failure is the
// scanner's own line (scanErrorFor, as on /resume).
const SCAN_OFFLINE = "Couldn't reach the resume scanner. Check your connection and try again, or type your skills on the last step.";
const SCAN_ODD = 'The resume scanner sent back an unreadable answer. Try again, or type your skills on the last step.';

const list = (v) => (Array.isArray(v) ? v : []);

function startFrom(initial) {
  const p = initial && typeof initial === 'object' ? initial : {};
  return {
    ...p,
    name: p.name || '',
    nationality: p.nationality || '',
    currentCountry: p.currentCountry || '',
    experience: p.experience || '',
    jobTypes: list(p.jobTypes),
    skills: p.skills || '',
    preferredCountries: list(p.preferredCountries),
  };
}

export default function ProfileModal({ open = true, onSave, initialProfile, onClose, welcome = false, returnFocusRef }) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState(() => startFrom(initialProfile));
  const [resumeFile, setResumeFile] = useState(null);
  const [scan, setScan] = useState('idle'); // 'idle' | 'scanning' | 'done' | 'failed'
  const [scanError, setScanError] = useState(''); // what 'failed' says
  const [resumeSummary, setResumeSummary] = useState(initialProfile?.resumeSummary || '');
  const [rememberOnDevice, setRememberOnDevice] = useState(initialProfile?.rememberOnDevice ?? false);
  const nationalityRef = useRef(null);
  const nextRef = useRef(null);

  const uid = useId();
  const id = (name) => `${uid}-${name}`;

  const set = (key, val) => setProfile((p) => ({ ...p, [key]: val }));
  const toggle = (key, v) =>
    setProfile((p) => ({ ...p, [key]: p[key].includes(v) ? p[key].filter((x) => x !== v) : [...p[key], v] }));

  const handleResumeUpload = async (file) => {
    if (!file) return;
    const failWith = (message) => {
      setScanError(message);
      setScan('failed');
    };
    // /resume's upload rules (a PDF, at most MAX_RESUME_LABEL, not empty), before any upload.
    const check = validateResumeFile(file);
    if (!check.ok) {
      setResumeFile(null);
      failWith(check.error);
      return;
    }
    setResumeFile(file);
    setScanError('');
    setScan('scanning');
    let res;
    let data = null;
    try {
      const formData = new FormData();
      formData.append('resume', file);
      res = await fetch('/api/resume', { method: 'POST', body: formData });
      data = await res.json().catch(() => null);
    } catch {
      failWith(SCAN_OFFLINE);
      return;
    }
    // Not OK: the route's own line (429 busy, 422 unreadable, 415 not a PDF…), or a plain one for
    // the status when the body is not the route's (scanErrorFor; a 413 can only be the platform's now).
    if (!res.ok) {
      failWith(scanErrorFor(res.status, data?.error, file.size));
      return;
    }
    if (!data || typeof data !== 'object') {
      failWith(SCAN_ODD);
      return;
    }
    if (data.skills) set('skills', data.skills);
    if (data.summary) setResumeSummary(data.summary);
    if (data.experience) set('experience', data.experience);
    setScan('done');
  };

  const handleSave = () => {
    onSave({ ...profile, resumeSummary, rememberOnDevice });
  };

  // Step 1 needs a passport country: until then Continue says why, and takes you to the field.
  const blocked = step === 1 && !profile.nationality;
  const next = () => {
    if (blocked) {
      nationalityRef.current?.focus();
      return;
    }
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };
  const back = () => {
    // Back disappears on step 1: keep focus in the dialog, on the button that is still there.
    if (step === 2) nextRef.current?.focus({ preventScroll: true });
    setStep((s) => Math.max(1, s - 1));
  };

  const editing = !welcome && !!initialProfile?.name;
  const title = welcome ? 'Quick profile setup' : editing ? 'Edit your profile' : 'Set up your profile';
  const nationalityLabel = NATIONALITIES.find((n) => n.code === profile.nationality)?.label;
  const experienceLabel = EXPERIENCE_LEVELS.find((e) => e.value === profile.experience)?.label;

  return (
    <Dialog open={open} onClose={onClose} labelledBy={id('title')} returnFocusRef={returnFocusRef} className="pm">
      <header className="pm-head">
        <div className="pm-headline">
          <div className="pm-titles">
            <p className="pm-kicker" aria-live="polite">
              PROFILE · STEP {step} OF {TOTAL_STEPS}
            </p>
            <h2 id={id('title')} className="pm-title">
              {title}
            </h2>
          </div>
          {onClose && (
            <button type="button" className="pm-x" onClick={onClose}>
              {editing ? 'Close' : 'Skip'}
              <span aria-hidden="true">✕</span>
            </button>
          )}
        </div>
        <div className="pm-progress" aria-hidden="true">
          <span style={{ transform: `scaleX(${step / TOTAL_STEPS})` }} />
        </div>
      </header>

      <div className="pm-body">
        {welcome && step === 1 && (
          <p className="pm-welcome">Takes about a minute. It unlocks AI job matching, visa filters and opportunity scores.</p>
        )}

        {/* Step 1: Identity */}
        {step === 1 && (
          <>
            <p className="pm-text">Tell us about yourself so we can personalize visa requirements and job matches.</p>
            <div className="pm-field">
              <label htmlFor={id('name')} className="pm-label">
                Your name
              </label>
              <input
                id={id('name')}
                className="pm-input"
                value={profile.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Alex"
                autoComplete="given-name"
                maxLength={80}
              />
            </div>
            <div className="pm-field">
              <label htmlFor={id('nationality')} className="pm-label">
                Your nationality (passport)
              </label>
              <div className="pm-select">
                <select
                  ref={nationalityRef}
                  id={id('nationality')}
                  className="pm-input"
                  value={profile.nationality}
                  onChange={(e) => set('nationality', e.target.value)}
                  aria-describedby={blocked ? id('need') : undefined}
                >
                  <option value="">Select nationality</option>
                  {NATIONALITIES.map((n) => (
                    <option key={n.code} value={n.code}>
                      {n.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="pm-field">
              <label htmlFor={id('home')} className="pm-label">
                Where do you live now?
              </label>
              <input
                id={id('home')}
                className="pm-input"
                value={profile.currentCountry}
                onChange={(e) => set('currentCountry', e.target.value)}
                placeholder="e.g. United States, Uganda, Pakistan"
                autoComplete="country-name"
                maxLength={80}
              />
            </div>
          </>
        )}

        {/* Step 2: Experience */}
        {step === 2 && (
          <>
            <p className="pm-text">Help us match you to the right opportunities.</p>
            <div className="pm-field">
              <p id={id('exp')} className="pm-label">
                Years of experience
              </p>
              <div className="pm-pills" role="group" aria-labelledby={id('exp')}>
                {EXPERIENCE_LEVELS.map((e) => (
                  <button
                    key={e.value}
                    type="button"
                    className="pm-pill"
                    aria-pressed={profile.experience === e.value}
                    onClick={() => set('experience', e.value)}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="pm-field">
              <p id={id('types')} className="pm-label">
                Interested in (pick any)
              </p>
              <div className="pm-pills" role="group" aria-labelledby={id('types')}>
                {JOB_TYPES.map((t) => (
                  <button key={t} type="button" className="pm-pill" aria-pressed={profile.jobTypes.includes(t)} onClick={() => toggle('jobTypes', t)}>
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
            <p id={id('where')} className="pm-text">
              Which countries are you open to working in? We&apos;ll fetch jobs from these countries.
            </p>
            <div className="pm-pills" role="group" aria-labelledby={id('where')}>
              {ADZUNA_COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  className="pm-pill"
                  aria-pressed={profile.preferredCountries.includes(c.code)}
                  onClick={() => toggle('preferredCountries', c.code)}
                >
                  <span aria-hidden="true">{c.flag}</span> {c.label}
                </button>
              ))}
            </div>
            {profile.preferredCountries.length === 0 && <p className="pm-hint">Pick none to search every country.</p>}
          </>
        )}

        {/* Step 4: Resume upload */}
        {step === 4 && (
          <>
            <p className="pm-text">Upload your resume so our AI can extract your skills and match you to jobs automatically.</p>
            <div className="pm-upload">
              <input
                id={id('resume')}
                className="pm-file"
                type="file"
                accept="application/pdf,.pdf"
                aria-describedby={id('resume-state')}
                onChange={(e) => handleResumeUpload(e.target.files?.[0])}
              />
              <label htmlFor={id('resume')} className="pm-drop">
                <span className="pm-drop-main">{resumeFile ? resumeFile.name : 'Choose your resume'}</span>
                <span className="pm-drop-sub">{resumeFile ? 'Choose another PDF' : `PDF up to ${MAX_RESUME_LABEL}`}</span>
              </label>
              <p id={id('resume-state')} className="pm-hint pm-scan" role="status">
                {scan === 'scanning'
                  ? 'Scanning your resume with AI…'
                  : scan === 'done'
                    ? 'Scanned. Your skills are on the last step.'
                    : scan === 'failed'
                      ? scanError
                      : ''}
              </p>
            </div>
            {resumeSummary && (
              <div className="pm-box">
                <p className="pm-label">AI summary</p>
                <p className="pm-text">{resumeSummary}</p>
              </div>
            )}
          </>
        )}

        {/* Step 5: Skills + summary */}
        {step === 5 && (
          <>
            <p className="pm-text">Review and add any missing skills.</p>
            <div className="pm-field">
              <label htmlFor={id('skills')} className="pm-label">
                Skills (comma separated)
              </label>
              <textarea
                id={id('skills')}
                className="pm-input pm-area"
                value={profile.skills}
                onChange={(e) => set('skills', e.target.value)}
                rows={3}
                placeholder="e.g. Python, React, Machine Learning, SQL, AWS"
                maxLength={1000}
              />
            </div>
            <div className="pm-box">
              <p className="pm-label">Profile summary</p>
              <p className="pm-text">
                {profile.name || 'You'} · {nationalityLabel || '—'} · {profile.currentCountry || '—'}
              </p>
              <p className="pm-text">
                {experienceLabel || profile.experience || '—'} · {profile.jobTypes.join(', ') || '—'}
              </p>
              {profile.skills && <p className="pm-text">Skills: {profile.skills}</p>}
            </div>
            <label className="pm-check">
              <input type="checkbox" checked={rememberOnDevice} onChange={(e) => setRememberOnDevice(e.target.checked)} />
              <span>Remember my profile on this device</span>
            </label>
          </>
        )}
      </div>

      <footer className="pm-foot">
        {blocked && (
          <p id={id('need')} className="pm-need">
            Choose your nationality to continue.
          </p>
        )}
        <div className="pm-actions">
          {step > 1 && (
            <button type="button" className="pm-btn pm-btn-ghost" onClick={back}>
              Back
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button
              ref={nextRef}
              type="button"
              className="pm-btn pm-btn-sign"
              onClick={next}
              aria-disabled={blocked || undefined}
              aria-describedby={blocked ? id('need') : undefined}
            >
              {step === 4 && !resumeFile ? 'Skip for now' : 'Continue'}
            </button>
          ) : (
            <button ref={nextRef} type="button" className="pm-btn pm-btn-sign" onClick={handleSave}>
              Save profile
            </button>
          )}
        </div>
      </footer>
    </Dialog>
  );
}
