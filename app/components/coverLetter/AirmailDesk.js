'use client';

// /cover-letter — the airmail desk. Everything below the hall header:
//  - the desk: the job description, an optional resume PDF, the tone (three luggage tags) and
//    who the letter is from (the saved profile: the account's, else the one on this device);
//  - the letter: an editable <textarea>. Copy and Download use the text as edited
//    (letterText). Regenerate keeps it on screen, dimmed, while the new version is written;
//  - the envelope: on Copy or Download the letter folds into a PAR AVION envelope (Envelope.js),
//    once per letter, and at once under reduced motion. "Open the letter" brings it back.
//
// Every answer from the API is checked (res.ok, then a shape check) before it is used; errors
// show where they happened (the desk, or the letter).

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  DEFAULT_TONE,
  TONES,
  fitToText,
  isEdited,
  letterErrorFor,
  letterText,
  normalizeLetterResult,
  profileForLetter,
  resumeAttachError,
  senderLine,
  toneOf,
  wordCount,
} from '../../../lib/departures/coverLetter';
import { MAX_RESUME_LABEL, sizeLabel } from '../../../lib/departures/resumeVerdict';
import { createLatest } from '../../../lib/departures/createLatest';
import { usePrefersReducedMotion } from '../kit/useReducedMotion';
import Envelope from './Envelope';
import './coverLetter.css';

const TIMEOUT_MS = 60_000;
const MAX_JOB_DESCRIPTION = 6000;
const FILE_NAME = 'cover-letter.txt';
const SEAL_MS = 2400; // the fold's length, plus room: the actions wake even if animationend never comes
const COPY_FALLBACK =
  'Your browser didn’t let the page copy. The letter is selected — press Ctrl+C (⌘C on a Mac), or tap Copy on the selection.';
const EMPTY = 'The letter is empty. Write it back in, or regenerate it.';

const useLayout = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** What to say about a non-OK answer: letterErrorFor words it from the status (and a 400's text). */
async function errorFrom(response, opts) {
  let error;
  try {
    error = (await response.json())?.error;
  } catch {
    // not JSON (a platform error page): worded from the status alone
  }
  return letterErrorFor(response.status, error, opts);
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
/** "14 OCT 26", for the postmark (short enough to sit inside its ring). */
function postmarkDate(d) {
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
}

/** The browser's older copy path, on a hidden textarea holding exactly `text`. */
function copyBySelection(text) {
  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') return false;
  const active = document.activeElement;
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.top = '0';
  area.style.left = '-9999px';
  area.style.fontSize = '16px'; // no iOS zoom
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  area.remove();
  if (active && typeof active.focus === 'function') active.focus({ preventScroll: true });
  return ok;
}

// ── Small parts ─────────────────────────────────────────────────────────────────────────────

// A lamp that blinks while a letter is written; held still while it is off screen.
function Lamp() {
  const ref = useRef(null);
  const [off, setOff] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => setOff(!e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <span ref={ref} className="cl-lamp" data-off={off ? '' : undefined} aria-hidden="true" />;
}

function Alert({ message }) {
  return (
    <p className="cl-error" role="alert">
      <span className="cl-error-w">RETURNED</span> {message}
    </p>
  );
}

function Procedure() {
  return (
    <ol className="cl-proc" aria-label="How the airmail desk works">
      <li>
        <span className="cl-proc-k">1 · THE DESK</span>
        <span className="cl-proc-t">Paste the job, pick a tone tag, attach your resume if you like.</span>
      </li>
      <li>
        <span className="cl-proc-k">2 · THE LETTER</span>
        <span className="cl-proc-t">A draft written for that role. Edit it right on the page.</span>
      </li>
      <li>
        <span className="cl-proc-k">3 · AIRMAIL</span>
        <span className="cl-proc-t">Copy or download it, and it’s sealed for sending.</span>
      </li>
    </ol>
  );
}

/** The profile the letter is written from: the account's (Supabase), else this device's. */
function useSender() {
  const [sender, setSender] = useState({ ready: false, profile: null, source: null });
  useEffect(() => {
    let live = true;
    (async () => {
      let remote = null;
      try {
        const res = await fetch('/api/user-profile', { cache: 'no-store' });
        if (res.ok) remote = profileForLetter((await res.json().catch(() => null))?.profile);
      } catch {
        // offline, or no account: the profile on this device, if there is one
      }
      let local = null;
      if (!remote) {
        try {
          local = profileForLetter(JSON.parse(window.localStorage.getItem('opportumap_profile') || 'null'));
        } catch {
          local = null; // storage blocked or not JSON
        }
      }
      if (live) setSender({ ready: true, profile: remote ?? local, source: remote ? 'account' : local ? 'device' : null });
    })();
    return () => {
      live = false;
    };
  }, []);
  return sender;
}

// ── The desk ────────────────────────────────────────────────────────────────────────────────

export default function AirmailDesk() {
  const reduced = usePrefersReducedMotion();
  const sender = useSender();
  const [jobDescription, setJobDescription] = useState('');
  const [tone, setTone] = useState(DEFAULT_TONE);
  const [resume, setResume] = useState(null); // the attached PDF (a File)
  const [resumeError, setResumeError] = useState('');
  const [formError, setFormError] = useState('');
  const [writing, setWriting] = useState(null); // { tone, again } while a letter is on its way
  const [result, setResult] = useState(null); // { letter, subject, keywords, notes, tone, version }
  const [edited, setEdited] = useState(null); // the textarea's text once the user types; null = as written
  const [letterError, setLetterError] = useState('');
  const [news, setNews] = useState(''); // polite announcements about the letter
  const [seal, setSeal] = useState(null); // { how, play, busy, date } while the letter is in its envelope

  const [latest] = useState(createLatest);
  const abortRef = useRef(null);
  const version = useRef(0);
  const folded = useRef(new Set()); // letter versions whose fold has played
  const focusNext = useRef(null);
  const refs = {
    jd: useRef(null),
    pick: useRef(null),
    file: useRef(null),
    heading: useRef(null),
    letter: useRef(null),
    sealed: useRef(null),
    stage: useRef(null),
  };
  const letterAlertRef = useRef(null);

  // Nothing lands after the page is gone.
  useEffect(
    () => () => {
      latest.next();
      abortRef.current?.abort();
    },
    [latest],
  );

  // Focus follows the letter: its heading when it lands, the envelope's line when it is sealed,
  // the letter again when it is opened.
  useEffect(() => {
    const target = focusNext.current;
    if (!target) return;
    const el = refs[target]?.current;
    if (!el) return;
    focusNext.current = null;
    if (target !== 'sealed') {
      el.focus();
      return;
    }
    el.focus({ preventScroll: true });
    // The page just got shorter (the letter folded away): bring the envelope into view, with
    // room above it for the sheet that folds in.
    const stage = refs.stage.current?.getBoundingClientRect();
    if (stage && (stage.top < 72 || stage.bottom > window.innerHeight)) {
      refs.stage.current.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    }
  });

  // A problem with the letter shows above it; the buttons that cause one ride along the bottom
  // of the screen, so bring it into view.
  useEffect(() => {
    if (!letterError) return;
    const el = letterAlertRef.current;
    const box = el?.getBoundingClientRect();
    if (box && (box.top < 64 || box.bottom > window.innerHeight)) {
      el.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
    }
  }, [letterError, reduced]);

  // The envelope's actions wake when the postmark lands, or after SEAL_MS whatever happens.
  const sealBusy = Boolean(seal?.busy);
  useEffect(() => {
    if (!sealBusy) return undefined;
    const t = setTimeout(() => setSeal((s) => (s ? { ...s, busy: false } : s)), SEAL_MS);
    return () => clearTimeout(t);
  }, [sealBusy]);

  // The letter grows with its text, so the page scrolls and the letter never does. fitToText
  // measures it without the page ever getting shorter, so typing near the end of a long letter
  // never moves the page. Because it never scrolls itself, the letter carries no
  // data-lenis-prevent: the wheel over it scrolls the page as smoothly as anywhere else.
  const shown = edited ?? result?.letter ?? '';
  const fittedWidth = useRef(0);
  useLayout(() => {
    const el = refs.letter.current;
    if (el && !seal) fittedWidth.current = fitToText(el);
  }, [shown, seal, result]);

  // A resize re-fits the letter only when its width changed: on a phone the toolbars showing and
  // hiding resize the window, but never the letter's lines.
  const letterOpen = Boolean(result) && !seal;
  useEffect(() => {
    if (!letterOpen) return undefined;
    const refit = () => {
      const el = refs.letter.current;
      if (el && el.clientWidth !== fittedWidth.current) fittedWidth.current = fitToText(el);
    };
    window.addEventListener('resize', refit);
    return () => window.removeEventListener('resize', refit);
  }, [letterOpen, refs.letter]);

  // ── The resume ──
  const pickResume = () => refs.file.current?.click();
  const onPickResume = (e) => {
    const picked = e.target.files?.[0];
    e.target.value = ''; // the same file can be picked again
    if (!picked) return;
    const problem = resumeAttachError(picked);
    setResumeError(problem);
    if (!problem) setResume(picked);
  };
  const removeResume = () => {
    setResume(null);
    setResumeError('');
    focusNext.current = 'pick';
  };

  // ── Writing ──
  const write = async (e) => {
    e?.preventDefault();
    if (writing) return;
    const description = jobDescription.trim();
    if (!description) {
      setFormError('Paste the job description first.');
      refs.jd.current?.focus();
      return;
    }
    const again = Boolean(result);
    const id = latest.next();
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const forTone = tone;
    setFormError('');
    setLetterError('');
    setNews('');
    if (again) setSeal(null); // the letter comes back out, dimmed, while the new one is written
    setWriting({ tone: forTone, again });

    let next = null;
    let problem = '';
    try {
      const form = new FormData();
      form.append('jobDescription', description.slice(0, MAX_JOB_DESCRIPTION));
      form.append('tone', forTone);
      if (resume) form.append('resume', resume);
      if (sender.profile) form.append('profile', JSON.stringify(sender.profile));
      const res = await fetch('/api/cover-letter', { method: 'POST', body: form, signal: ctrl.signal });
      if (!res.ok) {
        problem = await errorFrom(res, { size: resume?.size, hasResume: Boolean(resume) });
      } else {
        next = normalizeLetterResult(await res.json().catch(() => null));
        if (!next) problem = 'The desk sent back an unreadable letter. Try again.';
      }
    } catch {
      problem = ctrl.signal.aborted
        ? 'Writing the letter took too long. Try again in a minute.'
        : 'Couldn’t reach the airmail desk. Check your connection and try again.';
    } finally {
      clearTimeout(timer);
    }
    if (!latest.isCurrent(id)) return;
    setWriting(null);
    if (!next) {
      if (again) setLetterError(problem);
      else setFormError(problem);
      return;
    }
    version.current += 1;
    setResult({ ...next, tone: forTone, version: version.current });
    setEdited(null);
    setSeal(null);
    if (again) setNews(`A new version is in the letter — ${toneOf(forTone).label.toLowerCase()}.`);
    else focusNext.current = 'heading';
  };

  // ── The letter ──
  const onLetterChange = (e) => setEdited(e.target.value);
  const undoEdits = () => {
    setEdited(null);
    setLetterError('');
    focusNext.current = 'letter';
  };

  // Seal the letter: the fold plays once per letter (never under reduced motion); a letter
  // already sealed just says how it went out this time.
  const sealIt = (how) => {
    if (seal) {
      setSeal({ ...seal, how });
      return;
    }
    const play = !reduced && !folded.current.has(result.version);
    folded.current.add(result.version);
    setSeal({ how, play, busy: play, date: postmarkDate(new Date()) });
    focusNext.current = 'sealed';
  };

  const copyLetter = async () => {
    if (writing || !result) return;
    const text = letterText(edited, result.letter);
    if (!text) {
      setLetterError(EMPTY);
      focusNext.current = seal ? null : 'letter';
      return;
    }
    setLetterError('');
    let copied = false;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      // No clipboard here (an older browser, a page that isn't secure) or permission refused.
      copied = copyBySelection(text);
    }
    if (copied) {
      sealIt('copied');
      return;
    }
    // Last resort: the letter itself, selected, and how to copy it by hand.
    setSeal(null);
    setLetterError(COPY_FALLBACK);
    requestAnimationFrame(() => {
      const el = refs.letter.current;
      if (!el) return;
      el.focus();
      el.select();
    });
  };

  const downloadLetter = () => {
    if (writing || !result) return;
    const text = letterText(edited, result.letter);
    if (!text) {
      setLetterError(EMPTY);
      focusNext.current = seal ? null : 'letter';
      return;
    }
    setLetterError('');
    try {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = FILE_NAME;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000); // Safari reads the URL after click()
    } catch {
      setLetterError('Couldn’t save the file here. Copy the letter instead.');
      return;
    }
    sealIt('downloaded');
  };

  const openLetter = () => {
    setSeal(null);
    focusNext.current = 'letter';
  };

  const onFoldDone = () => setSeal((s) => (s ? { ...s, busy: false } : s));

  // ── Render ──
  const wasEdited = result ? isEdited(edited, result.letter) : false;
  const words = wordCount(shown);
  const from = sender.profile?.name || '';

  return (
    <div className="cl">
      <input
        id="cl-resume"
        ref={refs.file}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        tabIndex={-1}
        onChange={onPickResume}
      />

      <form className="cl-card cl-desk" onSubmit={write} noValidate>
        <h2 className="cl-h">
          THE DESK <span className="cl-h-note">the role this letter is for</span>
        </h2>

        <div className="cl-f">
          <label htmlFor="cl-jd" className="cl-label">
            Job description
          </label>
          <textarea
            id="cl-jd"
            ref={refs.jd}
            className="cl-field cl-area"
            value={jobDescription}
            onChange={(e) => {
              setJobDescription(e.target.value);
              if (formError) setFormError(''); // the alert was about what is being changed
            }}
            placeholder="Paste the full job description here"
            rows={7}
            aria-required="true"
            data-lenis-prevent=""
          />
        </div>

        <div className="cl-f">
          <label htmlFor="cl-resume" className="cl-label">
            Your resume <span className="cl-opt">optional · PDF up to {MAX_RESUME_LABEL}</span>
          </label>
          {resume ? (
            <p className="cl-file">
              <span className="cl-file-tag" aria-hidden="true">
                PDF
              </span>
              <span className="cl-file-n">
                {resume.name} <span className="cl-file-s">· {sizeLabel(resume.size)}</span>
              </span>
              <button type="button" className="cl-link" onClick={removeResume}>
                Remove<span className="sr-only"> the resume</span>
              </button>
            </p>
          ) : (
            <div className="cl-attach">
              <button
                type="button"
                className="cl-btn cl-btn-2 cl-btn-s"
                ref={refs.pick}
                onClick={pickResume}
                aria-describedby="cl-resume-hint"
              >
                Attach a PDF
              </button>
              <p className="cl-hint" id="cl-resume-hint">
                Lets the letter cite your real experience.
              </p>
            </div>
          )}
          {resumeError && <Alert message={resumeError} />}
        </div>

        <fieldset className="cl-tones">
          <legend className="cl-label">
            Tone <span className="cl-opt">· pick a tag</span>
          </legend>
          <div className="cl-tags">
            {TONES.map((t) => (
              <label key={t.id} className="cl-tag" data-on={tone === t.id ? '' : undefined}>
                <input
                  className="cl-tag-in"
                  type="radio"
                  name="cl-tone"
                  value={t.id}
                  checked={tone === t.id}
                  onChange={() => setTone(t.id)}
                />
                <span className="cl-tag-shape" aria-hidden="true" />
                <span className="cl-tag-hole" aria-hidden="true" />
                <span className="cl-tag-code" aria-hidden="true">
                  {t.code}
                </span>
                <span className="cl-tag-t">
                  <span className="cl-tag-name">{t.label}</span>
                  <span className="cl-tag-desc">{t.desc}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <p className="cl-sender">
          <span className="cl-k">FROM</span>{' '}
          {!sender.ready ? (
            <span className="cl-sender-t">checking for a saved profile…</span>
          ) : sender.profile ? (
            <span className="cl-sender-t">
              <b>{senderLine(sender.profile)}</b>{' '}
              {sender.source === 'account' ? '· your saved profile' : '· the profile saved on this device'}
            </span>
          ) : (
            <span className="cl-sender-t">No saved profile — attach your resume so the letter can cite your real experience.</span>
          )}
        </p>

        {formError && <Alert message={formError} />}
        {writing && !writing.again && (
          <p className="cl-status" role="status">
            <Lamp />
            <span className="cl-status-w">WRITING</span> your letter, {toneOf(writing.tone).label.toLowerCase()} — about 15
            seconds
          </p>
        )}
        <div className="cl-actions">
          <button type="submit" className="cl-btn" aria-disabled={writing ? 'true' : undefined}>
            {writing ? 'Writing…' : result ? 'Write a new version' : 'Write my letter'}
          </button>
        </div>
      </form>

      {!result && <Procedure />}

      <p className="sr-only" role="status">
        {news}
      </p>

      {result && (
        <section className="cl-card cl-letter" aria-labelledby="cl-letter-h" aria-busy={writing ? 'true' : undefined}>
          <span className="cl-stripes" aria-hidden="true" />
          <div className="cl-letter-head">
            <h2 className="cl-h" id="cl-letter-h" tabIndex={-1} ref={refs.heading}>
              YOUR LETTER <span className="cl-h-note">{toneOf(result.tone).label} · yours to edit</span>
            </h2>
            <p className="cl-readout">
              {words} WORDS
              {wasEdited && <span className="cl-edited"> · EDITED</span>}
            </p>
          </div>
          {result.subject && (
            <p className="cl-subject">
              <span className="cl-k">SUBJECT</span> {result.subject}
            </p>
          )}

          {writing?.again && (
            <p className="cl-status" role="status">
              <Lamp />
              <span className="cl-status-w">REWRITING</span> a new version, {toneOf(writing.tone).label.toLowerCase()}. This
              one stays here until it lands.
            </p>
          )}
          {letterError && (
            <div ref={letterAlertRef}>
              <Alert message={letterError} />
            </div>
          )}

          {seal && (
            <div className="cl-sealed" ref={refs.stage} data-play={seal.play ? '' : undefined}>
              <p className="cl-sealed-s" role="status" tabIndex={-1} ref={refs.sealed}>
                <span className="cl-sealed-t">
                  <span className="cl-k cl-k-ok">SEALED</span>{' '}
                  {seal.how === 'copied'
                    ? 'Copied to your clipboard — paste it into your email or the application.'
                    : `Saved as ${FILE_NAME} — attach it, or paste it where the application asks.`}
                </span>
              </p>
              <Envelope play={seal.play} subject={result.subject} from={from} date={seal.date} onDone={onFoldDone} />
              <div className="cl-bar cl-sealed-bar" inert={seal.busy ? true : undefined}>
                <button type="button" className="cl-btn" onClick={openLetter}>
                  Open the letter
                </button>
                <button type="button" className="cl-btn cl-btn-2" onClick={copyLetter}>
                  Copy again
                </button>
                <button type="button" className="cl-btn cl-btn-2" onClick={downloadLetter}>
                  Download .txt
                </button>
              </div>
            </div>
          )}

          <div className="cl-open" hidden={Boolean(seal)}>
            <label htmlFor="cl-letter" className="cl-label cl-letter-l">
              The letter <span className="cl-opt">· Copy and Download use your edits</span>
            </label>
            <textarea
              id="cl-letter"
              ref={refs.letter}
              className="cl-field cl-paper"
              value={shown}
              onChange={onLetterChange}
              readOnly={Boolean(writing)}
              data-busy={writing ? '' : undefined}
              rows={14}
              spellCheck
            />
            {wasEdited && (
              <p className="cl-edits">
                <span className="cl-k">EDITED</span> Regenerate writes a fresh version and replaces your edits.{' '}
                <button type="button" className="cl-link" onClick={undoEdits}>
                  Undo my edits
                </button>
              </p>
            )}
            <div className="cl-bar">
              <button type="button" className="cl-btn" onClick={copyLetter} aria-disabled={writing ? 'true' : undefined}>
                Copy
              </button>
              <button
                type="button"
                className="cl-btn cl-btn-2"
                onClick={downloadLetter}
                aria-disabled={writing ? 'true' : undefined}
              >
                Download .txt
              </button>
              <button type="button" className="cl-btn cl-btn-2" onClick={write} aria-disabled={writing ? 'true' : undefined}>
                {writing ? (
                  <>
                    <Lamp />
                    Rewriting…
                  </>
                ) : (
                  'Regenerate'
                )}
              </button>
            </div>
          </div>
        </section>
      )}

      {result && (result.keywords.length > 0 || result.notes.length > 0) && (
        <div className="cl-pair">
          {result.keywords.length > 0 && (
            <section className="cl-card" aria-labelledby="cl-h-kw">
              <h3 className="cl-h" id="cl-h-kw">
                KEYWORDS PACKED <span className="cl-h-note">terms from the job the letter uses</span>
              </h3>
              <ul className="cl-chips">
                {result.keywords.map((k) => (
                  <li key={k} className="cl-chip">
                    {k}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {result.notes.length > 0 && (
            <section className="cl-card" aria-labelledby="cl-h-notes">
              <h3 className="cl-h" id="cl-h-notes">
                CUSTOMS NOTES <span className="cl-h-note">how it was tailored</span>
              </h3>
              <ul className="cl-notes">
                {result.notes.map((n, i) => (
                  <li key={i}>
                    <span className="cl-mark" aria-hidden="true">
                      →
                    </span>
                    {n}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
