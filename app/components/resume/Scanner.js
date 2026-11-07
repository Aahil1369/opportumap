'use client';

// /resume — security X-ray. The belt (a drop zone with a real button + a hidden file input),
// the scan (the PDF tile rides through the X-ray frame while the grade comes back), and the
// result: the verdict plate (CLEARED 81 / BAG CHECK 47, flapped in once), section bars that grow
// once seen, alarms (red flags), prohibited items (clichés), inspection notes, rewrites, and
// roles that search the board.
//
// Files are checked here before any upload (validateResumeFile: a PDF up to MAX_RESUME_LABEL) and again by the API.

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MAX_RESUME_LABEL,
  jobsHref,
  normalizeGrade,
  resumeVerdict,
  scanErrorFor,
  sizeLabel,
  validateResumeFile,
} from '../../../lib/departures/resumeVerdict';
import { createLatest } from '../../../lib/departures/createLatest';
import { errorText } from '../../../lib/fetchJson';
import SignatureMoment from '../kit/SignatureMoment';
import './resume.css';

const TIMEOUT_MS = 90_000;
const SECTION_LABEL = { ats_compatibility: 'ATS' };

// The verdict plate's split-flap text is the board engine; it loads while the scan runs, so the
// page itself ships none of it.
let flapModule = null;
const loadFlap = () =>
  import('../kit/FlapText').then((m) => {
    flapModule = m.default;
    return flapModule;
  });

// The report's ✓ and → come from the board glyph face (globals.css, unicode-range). Fetch both
// weights while the scan runs: if they are still missing when the report lands, its first
// layout goes looking through the system fonts for them (measured: that layout took ~2x as long).
function warmGlyphs() {
  try {
    for (const w of [400, 700]) document.fonts?.load(`${w} 16px "OM Board Glyphs"`, '→✓')?.catch(() => {});
  } catch {
    // no FontFaceSet: nothing to warm
  }
}

/** What to say about a non-OK answer (scanErrorFor): its error text, or a plain one for its status. */
async function errorFrom(response, size) {
  return scanErrorFor(response.status, await errorText(response), size);
}

// ── The belt ────────────────────────────────────────────────────────────────────────────────

function Doc({ name, xray = false }) {
  return (
    <span className={xray ? 'rs-doc rs-doc-x' : 'rs-doc'}>
      <span className="rs-doc-tag">PDF</span>
      <span className="rs-doc-l" style={{ width: '62%' }} />
      <span className="rs-doc-l" style={{ width: '84%' }} />
      <span className={xray ? 'rs-doc-l rs-doc-hit' : 'rs-doc-l'} style={{ width: '70%' }} />
      <span className="rs-doc-l" style={{ width: '78%' }} />
      <span className="rs-doc-l" style={{ width: '52%' }} />
      <span className="rs-doc-n">{name}</span>
    </span>
  );
}

function Belt({ name }) {
  const ref = useRef(null);
  const [off, setOff] = useState(false);
  // The belt loops while the grade comes back: hold it still while it is off screen.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => setOff(!e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div className="rs-belt" ref={ref} data-off={off ? '' : undefined} aria-hidden="true">
      <span className="rs-rail">
        <span className="rs-rail-run" />
      </span>
      <span className="rs-track">
        <Doc name={name} />
      </span>
      <span className="rs-frame">
        <span className="rs-frame-label">X-RAY</span>
        <span className="rs-lamp" />
        <span className="rs-window">
          <span className="rs-track rs-track-x">
            <Doc name={name} xray />
          </span>
          <span className="rs-beam" />
        </span>
      </span>
    </div>
  );
}

// ── The result ──────────────────────────────────────────────────────────────────────────────

function PlateText({ text, className }) {
  const Flap = flapModule;
  if (!Flap) return <span className={className}>{text}</span>;
  return <Flap text={text} from="" className={className} />;
}

function Plate({ grade, headingRef }) {
  const { label, tone } = resumeVerdict(grade.score);
  return (
    <div className="rs-plate" data-tone={tone}>
      <p className="rs-kicker">
        SECURITY <span aria-hidden="true">·</span> VERDICT
      </p>
      <h2 className="rs-verdict" id="rs-verdict" tabIndex={-1} ref={headingRef}>
        <PlateText text={label} className="rs-v-label" />{' '}
        <PlateText text={String(grade.score)} className="rs-v-score" />
        <span className="sr-only"> out of 100</span>
      </h2>
      <p className="rs-v-note">
        {tone === 'ok'
          ? 'Through security — 60 or above. Tighten what’s flagged below and it gets stronger.'
          : 'Pulled aside for a closer look — below 60. Clear the alarms below, then scan again.'}
      </p>
      {(grade.grade || grade.name) && (
        <p className="rs-tags">
          {grade.grade && (
            <span className="rs-tag">
              GRADE <b>{grade.grade}</b>
            </span>
          )}
          {grade.name && <span className="rs-tag">{grade.name}</span>}
        </p>
      )}
      {grade.summary && <p className="rs-summary">{grade.summary}</p>}
    </div>
  );
}

function SectionBars({ scores }) {
  const entries = Object.entries(scores);
  if (!entries.length) return null;
  return (
    <section className="rs-card" aria-labelledby="rs-h-sections">
      <h3 className="rs-h" id="rs-h-sections">
        X-RAY <span className="rs-h-sub">by section</span>
      </h3>
      <SignatureMoment playWhen="inView" threshold={0.25}>
        {({ play, reduced }) => (
          <ul className="rs-bars" data-armed={reduced ? undefined : ''} data-play={play ? '' : undefined}>
            {entries.map(([key, value], i) => (
              <li key={key} className="rs-bar" style={{ '--v': value / 100, '--i': i }}>
                <span className="rs-bar-k">{SECTION_LABEL[key] ?? key.replace(/_/g, ' ')}</span>
                <span className="rs-bar-n">{value}</span>
                <span className="rs-bar-track" aria-hidden="true">
                  <span className="rs-bar-fill" data-tone={value >= 60 ? 'ok' : 'amber'} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </SignatureMoment>
    </section>
  );
}

function Result({ grade, headingRef }) {
  return (
    <div className="rs-result">
      <Plate grade={grade} headingRef={headingRef} />
      <SectionBars scores={grade.sectionScores} />

      {grade.redFlags.length > 0 && (
        <section className="rs-card rs-alarms" aria-labelledby="rs-h-alarms">
          <h3 className="rs-h" id="rs-h-alarms">
            ALARMS <span className="rs-h-sub">red flags — fix these first</span>
          </h3>
          <SignatureMoment playWhen="inView" threshold={0.25}>
            {({ play }) => (
              <ul className="rs-list" data-play={play ? '' : undefined}>
                {grade.redFlags.map((flag, i) => (
                  <li key={i} className="rs-alarm" style={{ '--i': i }}>
                    <span className="rs-alarm-lamp" aria-hidden="true" />
                    <span className="rs-alarm-w">ALARM</span>
                    <span className="rs-alarm-t">{flag}</span>
                  </li>
                ))}
              </ul>
            )}
          </SignatureMoment>
        </section>
      )}

      {grade.clichesFound.length > 0 && (
        <section className="rs-card" aria-labelledby="rs-h-prohibited">
          <h3 className="rs-h" id="rs-h-prohibited">
            PROHIBITED ITEMS <span className="rs-h-sub">clichés recruiters skip</span>
          </h3>
          <p className="rs-lead">Confiscated. Swap each one for a specific result with a number.</p>
          <ul className="rs-items">
            {grade.clichesFound.map((c, i) => (
              <li key={i} className="rs-item">
                <span className="rs-no" aria-hidden="true" />
                <s>{c}</s>
              </li>
            ))}
          </ul>
        </section>
      )}

      {grade.improvements.length > 0 && (
        <section className="rs-card" aria-labelledby="rs-h-notes">
          <h3 className="rs-h" id="rs-h-notes">
            INSPECTION NOTES <span className="rs-h-sub">what to fix</span>
          </h3>
          <ol className="rs-list">
            {grade.improvements.map((item, i) => (
              <li key={i} className="rs-note">
                <span className="rs-prio" data-p={item.priority}>
                  {item.priority.toUpperCase()}
                </span>
                <div>
                  <p className="rs-note-issue">{item.issue}</p>
                  {item.fix && (
                    <p className="rs-note-fix">
                      <b>Fix: </b>
                      {item.fix}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {grade.rewrittenBullets.length > 0 && (
        <section className="rs-card" aria-labelledby="rs-h-rewrites">
          <h3 className="rs-h" id="rs-h-rewrites">
            REPACKED <span className="rs-h-sub">bullet rewrites</span>
          </h3>
          <ul className="rs-list">
            {grade.rewrittenBullets.map((b, i) => (
              <li key={i} className="rs-rewrite">
                <p className="rs-ba">BEFORE</p>
                <p className="rs-before">{b.original}</p>
                <p className="rs-ba rs-ba-after">AFTER</p>
                <p className="rs-after">{b.rewritten}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(grade.strengths.length > 0 || grade.keywords_missing.length > 0) && (
        <div className="rs-pair">
          {grade.strengths.length > 0 && (
            <section className="rs-card" aria-labelledby="rs-h-strengths">
              <h3 className="rs-h" id="rs-h-strengths">
                CLEARED ITEMS <span className="rs-h-sub">what’s working</span>
              </h3>
              <ul className="rs-list">
                {grade.strengths.map((s, i) => (
                  <li key={i} className="rs-ok">
                    <span className="rs-ok-mark" aria-hidden="true">
                      ✓
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {grade.keywords_missing.length > 0 && (
            <section className="rs-card" aria-labelledby="rs-h-keywords">
              <h3 className="rs-h" id="rs-h-keywords">
                NOT DECLARED <span className="rs-h-sub">keywords ATS scanners look for</span>
              </h3>
              <ul className="rs-chips">
                {grade.keywords_missing.map((k, i) => (
                  <li key={i} className="rs-chip">
                    {k}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {grade.jobMatches.length > 0 && (
        <section className="rs-card" aria-labelledby="rs-h-roles">
          <h3 className="rs-h" id="rs-h-roles">
            ROLES YOU MATCH <span className="rs-h-sub">each one searches the board</span>
          </h3>
          <ul className="rs-roles">
            {grade.jobMatches.map((job, i) => (
              <li key={i}>
                <Link className="rs-role" href={jobsHref(job.title)}>
                  <span className="rs-role-top">
                    <span className="rs-role-t">{job.title}</span>
                    <span className="rs-role-m">
                      {job.matchScore}% <span className="sr-only">match</span>
                    </span>
                  </span>
                  <span className="rs-role-track" aria-hidden="true">
                    <span className="rs-role-fill" style={{ '--v': job.matchScore / 100 }} />
                  </span>
                  {job.reason && <span className="rs-role-r">{job.reason}</span>}
                  <span className="rs-role-go" aria-hidden="true">
                    SEARCH THE BOARD →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ── The scanner ─────────────────────────────────────────────────────────────────────────────

export default function Scanner() {
  const [phase, setPhase] = useState('idle'); // idle · scanning · done
  const [file, setFile] = useState(null); // { name, size } of the PDF on the belt
  const [grade, setGrade] = useState(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const pickRef = useRef(null);
  const statusRef = useRef(null);
  const headingRef = useRef(null);
  const dragDepth = useRef(0);
  const [latest] = useState(createLatest);
  const abortRef = useRef(null);
  const focusNext = useRef(null); // 'status' | 'verdict' | 'pick'

  // Nothing lands after the page is gone.
  useEffect(
    () => () => {
      latest.next();
      abortRef.current?.abort();
    },
    [latest],
  );

  // A PDF dropped beside the belt must not replace the page with the PDF.
  useEffect(() => {
    const hasFiles = (e) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
    const block = (e) => {
      if (hasFiles(e)) e.preventDefault();
    };
    window.addEventListener('dragover', block);
    window.addEventListener('drop', block);
    return () => {
      window.removeEventListener('dragover', block);
      window.removeEventListener('drop', block);
    };
  }, []);

  // Focus follows the scan: the status line while it runs, the verdict when it lands, the
  // picker again after an error.
  useEffect(() => {
    const target = focusNext.current;
    if (!target) return;
    focusNext.current = null;
    const el = { status: statusRef, verdict: headingRef, pick: pickRef }[target]?.current;
    el?.focus();
  }, [phase, error]);

  const scan = useCallback(
    async (picked) => {
      if (!picked) return;
      const check = validateResumeFile(picked);
      if (!check.ok) {
        // Refused before any upload; a result already on screen stays.
        setError(check.error);
        return;
      }
      const id = latest.next();
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      loadFlap().catch(() => {});
      warmGlyphs();

      setFile({ name: picked.name || 'resume.pdf', size: picked.size });
      setError('');
      setGrade(null);
      focusNext.current = 'status';
      setPhase('scanning');

      let next = null;
      let problem = '';
      try {
        const form = new FormData();
        form.append('resume', picked);
        const res = await fetch('/api/resume-grade', { method: 'POST', body: form, signal: ctrl.signal });
        if (!res.ok) {
          problem = await errorFrom(res, picked.size);
        } else {
          next = normalizeGrade(await res.json().catch(() => null));
          if (!next) problem = 'The grader sent back an unreadable answer. Try again.';
        }
      } catch {
        problem = ctrl.signal.aborted
          ? 'The scan took too long. Try again in a minute.'
          : 'Couldn’t reach the scanner. Check your connection and try again.';
      } finally {
        clearTimeout(timer);
      }
      if (!latest.isCurrent(id)) return;
      if (next) {
        // Give the plate its flaps if they are a moment away; never hold the result for them.
        if (!flapModule) await Promise.race([loadFlap().catch(() => {}), new Promise((r) => setTimeout(r, 400))]);
        if (!latest.isCurrent(id)) return;
        setGrade(next);
        focusNext.current = 'verdict';
        setPhase('done');
      } else {
        setError(problem);
        focusNext.current = 'pick';
        setPhase('idle');
      }
    },
    [latest],
  );

  const pick = () => inputRef.current?.click();
  const onPick = (e) => {
    const picked = e.target.files?.[0];
    e.target.value = ''; // the same file can be picked again
    scan(picked);
  };

  const onDragEnter = (e) => {
    e.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  };
  const onDragLeave = () => {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };
  const onDrop = (e) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    scan(e.dataTransfer?.files?.[0]);
  };

  const alert = error ? (
    <p className="rs-error" role="alert">
      <span className="rs-error-w">ALARM</span> {error}
    </p>
  ) : null;

  return (
    <div className="rs">
      <input
        id="rs-file"
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        tabIndex={-1}
        onChange={onPick}
      />

      {phase === 'idle' && (
        <div
          className="rs-drop"
          data-drag={dragging ? '' : undefined}
          onDragEnter={onDragEnter}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <span className="rs-drop-art" aria-hidden="true">
            <Doc name="resume.pdf" />
          </span>
          <label htmlFor="rs-file" className="rs-drop-t">
            Put your resume on the belt
          </label>
          <p className="rs-drop-s" id="rs-file-hint">
            Drag a PDF here or choose one · PDF up to {MAX_RESUME_LABEL} · about 15 seconds
          </p>
          <button type="button" className="rs-btn" ref={pickRef} onClick={pick} aria-describedby="rs-file-hint">
            Choose a PDF
          </button>
        </div>
      )}

      {phase === 'idle' && alert}

      {phase === 'scanning' && file && (
        <div className="rs-scan">
          <Belt name={file.name} />
          <p className="rs-scan-s" role="status" tabIndex={-1} ref={statusRef}>
            <span className="rs-scan-w">SCANNING</span> {file.name} · {sizeLabel(file.size)} — reading sections, scoring,
            matching roles
          </p>
        </div>
      )}

      {phase === 'done' && grade && file && (
        <>
          <div className="rs-again">
            <p className="rs-again-f">
              <span className="rs-again-k">SCANNED</span> {file.name}
            </p>
            <button type="button" className="rs-btn rs-btn-2" ref={pickRef} onClick={pick}>
              Scan another<span className="sr-only"> resume</span>
            </button>
          </div>
          {alert}
          <Result grade={grade} headingRef={headingRef} />
        </>
      )}
    </div>
  );
}
