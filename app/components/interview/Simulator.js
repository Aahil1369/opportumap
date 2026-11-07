'use client';

// /interview — the simulator. Everything below the hall header:
//  - the briefing: the role and company (and the job description) the questions are for;
//  - the checklist: the question bank as a pre-takeoff checklist. Each item opens to what it
//    is really assessing, how to answer and a strong example, and shows how the run went for it;
//  - the simulator: the mock run, one question at a time. Answer it (scored out of 10) or skip
//    it; the altimeter climbs to 100% as questions are done. Then the verdict plate,
//    CLEARED FOR TAKEOFF (average 7 or more) or GO-AROUND, flapped in once, and the debrief.
//
// Every answer from the API is checked (res.ok, then a shape check) before it is used; errors
// show where they happened (the briefing, or the question being scored).

import { Fragment, useEffect, useRef, useState } from 'react';
import {
  CLEARED,
  averageScore,
  interviewProgress,
  nextStop,
  normalizeFeedback,
  normalizeQuestions,
  previewText,
  scoreTone,
  scoresOf,
  simErrorFor,
  takeoffVerdict,
  tally,
} from '../../../lib/departures/interviewProgress';
import { createLatest } from '../../../lib/departures/createLatest';
import { errorText } from '../../../lib/fetchJson';
import Altimeter from './Altimeter';
import './interview.css';

const QUESTIONS_TIMEOUT_MS = 60_000;
const FEEDBACK_TIMEOUT_MS = 45_000;
const MAX_ANSWER = 6000;
const MAX_DESCRIPTION = 6000;
const CATEGORY = { behavioral: 'BEHAVIORAL', technical: 'TECHNICAL', culture: 'CULTURE', general: 'GENERAL' };
const TABS = [
  { id: 'checklist', label: 'CHECKLIST', sub: 'Question bank' },
  { id: 'simulator', label: 'SIMULATOR', sub: 'Mock interview' },
];
const pad2 = (n) => String(n).padStart(2, '0');

// The verdict plate's split-flap text is the board engine; it loads once the checklist is in,
// so the page itself ships none of it.
let flapModule = null;
const loadFlap = () =>
  import('../kit/FlapText').then((m) => {
    flapModule = m.default;
    return flapModule;
  });

/** What to say about a non-OK answer: simErrorFor words it from the status (and a 400's text). */
async function errorFrom(response, stage) {
  return simErrorFor(response.status, await errorText(response), stage);
}

// ── Small parts ─────────────────────────────────────────────────────────────────────────────

// A lamp that blinks while something loads; held still while it is off screen.
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
  return <span ref={ref} className="iv-lamp" data-off={off ? '' : undefined} aria-hidden="true" />;
}

function ScoreText({ score }) {
  return (
    <>
      <span aria-hidden="true">{score}/10</span>
      <span className="sr-only">{score} out of 10</span>
    </>
  );
}

function Alert({ message }) {
  return (
    <p className="iv-error" role="alert">
      <span className="iv-error-w">ALERT</span> {message}
    </p>
  );
}

function statusOf(result) {
  if (result?.status === 'answered') {
    return { tone: scoreTone(result.feedback.score), node: <ScoreText score={result.feedback.score} /> };
  }
  if (result?.status === 'skipped') return { tone: 'skip', node: 'SKIPPED' };
  return { tone: 'ready', node: 'READY' };
}

// ── The briefing ────────────────────────────────────────────────────────────────────────────

function Procedure() {
  return (
    <ol className="iv-proc" aria-label="How the simulator works">
      <li>
        <span className="iv-proc-k">01 · BRIEFING</span>
        <span className="iv-proc-t">Name the role and the company. Paste the job description if you have it.</span>
      </li>
      <li>
        <span className="iv-proc-k">02 · CHECKLIST</span>
        <span className="iv-proc-t">
          Behavioral, technical and culture questions for that role, each with what it’s really assessing.
        </span>
      </li>
      <li>
        <span className="iv-proc-k">03 · SIMULATOR</span>
        <span className="iv-proc-t">
          Answer them one by one. Each answer is scored out of 10; average 7 or better and you’re cleared for
          takeoff.
        </span>
      </li>
    </ol>
  );
}

// ── The checklist ───────────────────────────────────────────────────────────────────────────

function ChecklistItem({ q, index, result, open, onToggle, onRehearse }) {
  const status = statusOf(result);
  const state = result?.status === 'answered' || result?.status === 'skipped' ? result.status : 'open';
  const bodyId = `iv-item-${index}`;
  return (
    <li className="iv-item" data-open={open ? '' : undefined} data-state={state}>
      <button type="button" className="iv-item-head" aria-expanded={open} aria-controls={bodyId} onClick={onToggle}>
        <span className="iv-box" aria-hidden="true">
          {state === 'answered' ? '✓' : state === 'skipped' ? '–' : ''}
        </span>
        <span className="iv-item-meta">
          <span className="iv-num">{pad2(index + 1)}</span>
          <span className="iv-cat">{CATEGORY[q.category]}</span>
        </span>
        <span className="iv-item-q">{q.question}</span>
        <span className="iv-st" data-tone={status.tone}>
          {status.node}
        </span>
        <span className="iv-chev" aria-hidden="true">
          {open ? '−' : '+'}
        </span>
      </button>
      <div className="iv-item-body" id={bodyId} hidden={!open}>
        {q.why && (
          <>
            <p className="iv-lbl">WHAT THEY’RE ASSESSING</p>
            <p className="iv-p">{q.why}</p>
          </>
        )}
        {q.howToAnswer && (
          <>
            <p className="iv-lbl">HOW TO ANSWER</p>
            <p className="iv-p">{q.howToAnswer}</p>
          </>
        )}
        {q.exampleAnswer && (
          <>
            <p className="iv-lbl iv-lbl-ok">A STRONG ANSWER</p>
            <p className="iv-p iv-example">{q.exampleAnswer}</p>
          </>
        )}
        <button type="button" className="iv-btn iv-btn-2 iv-btn-s" onClick={onRehearse}>
          Rehearse this one →
        </button>
      </div>
    </li>
  );
}

// ── The run ─────────────────────────────────────────────────────────────────────────────────

function Feedback({ fb, scoreRef }) {
  return (
    <div className="iv-fb">
      <div className="iv-score" data-tone={scoreTone(fb.score)}>
        <p className="iv-score-n" tabIndex={-1} ref={scoreRef}>
          <span className="iv-score-k">SCORE</span>{' '}
          <b aria-hidden="true">{fb.score}</b>
          <span className="iv-score-of" aria-hidden="true">
            /10
          </span>
          <span className="sr-only">{fb.score} out of 10</span>
        </p>
        {fb.verdict && <p className="iv-score-v">{fb.verdict}</p>}
      </div>
      {fb.whatWorked.length > 0 && (
        <div>
          <p className="iv-lbl iv-lbl-ok">WHAT WORKED</p>
          <ul className="iv-marks">
            {fb.whatWorked.map((w, i) => (
              <li key={i} data-mark="ok">
                <span className="iv-mark" aria-hidden="true">
                  ✓
                </span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}
      {fb.whatToImprove.length > 0 && (
        <div>
          <p className="iv-lbl iv-lbl-amber">WHAT TO IMPROVE</p>
          <ul className="iv-marks">
            {fb.whatToImprove.map((w, i) => (
              <li key={i} data-mark="amber">
                <span className="iv-mark" aria-hidden="true">
                  →
                </span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}
      {fb.strongerVersion && (
        <div className="iv-stronger">
          <p className="iv-lbl iv-lbl-ok">A STRONGER VERSION</p>
          <p className="iv-p">{fb.strongerVersion}</p>
        </div>
      )}
      {fb.tips.length > 0 && (
        <div>
          <p className="iv-lbl">TIPS</p>
          <ul className="iv-marks">
            {fb.tips.map((t, i) => (
              <li key={i} data-mark="info">
                <span className="iv-mark" aria-hidden="true">
                  ·
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PlateWord({ text, from, delayMs }) {
  const Flap = flapModule;
  if (!Flap) return <span className="iv-v-word">{text}</span>;
  return <Flap text={text} from={from} delayMs={delayMs} className="iv-v-word" />;
}

function VerdictPlate({ verdict, from, avg, counts, headingRef }) {
  const tone = verdict === CLEARED ? 'ok' : 'amber';
  const words = verdict.split(' ');
  let note;
  if (tone === 'ok') {
    note = 'An average of 7 or better across your answers. Say them out loud once more before the real thing.';
  } else if (avg === null) {
    note = 'Nothing was scored — every question was skipped. Answer a few to get a verdict.';
  } else {
    note = 'Below an average of 7. Go around: rework the lowest answers, then run the simulator again.';
  }
  return (
    <div className="iv-plate" data-tone={tone}>
      <p className="iv-kicker">
        SIMULATOR <span aria-hidden="true">·</span> VERDICT
      </p>
      <h2 className="iv-verdict" id="iv-verdict" tabIndex={-1} ref={headingRef}>
        {words.map((w, i) => (
          <Fragment key={i}>
            {i > 0 && ' '}
            <PlateWord text={w} from={from ? w : ''} delayMs={i * 160} />
          </Fragment>
        ))}
      </h2>
      <p className="iv-avg">
        <span className="iv-avg-k">AVERAGE</span>{' '}
        {avg === null ? (
          <b>none scored</b>
        ) : (
          <>
            <b aria-hidden="true">{avg.toFixed(1)}</b>
            <span className="iv-avg-of" aria-hidden="true">
              {' '}
              / 10
            </span>
            <span className="sr-only">{avg.toFixed(1)} out of 10</span>
          </>
        )}
      </p>
      <p className="iv-v-note">{note}</p>
      <p className="iv-tags">
        <span className="iv-tag">
          SCORED <b>{counts.answered}</b>
        </span>
        <span className="iv-tag">
          SKIPPED <b>{counts.skipped}</b>
        </span>
      </p>
    </div>
  );
}

function Debrief({ questions, results, onRehearse }) {
  return (
    <section className="iv-card" aria-labelledby="iv-h-debrief">
      <h3 className="iv-h" id="iv-h-debrief">
        DEBRIEF
      </h3>
      <p className="iv-lead">Every question and how it went. Open one to go back to it.</p>
      <ol className="iv-debrief">
        {questions.map((q, i) => {
          const status = statusOf(results[q.key]);
          return (
            <li key={q.key}>
              <button type="button" className="iv-db-row" onClick={() => onRehearse(i)}>
                <span className="iv-num">{pad2(i + 1)}</span>
                <span className="iv-db-q">{previewText(q.question, 90)}</span>
                <span className="iv-st" data-tone={status.tone}>
                  {status.node}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ── The simulator ───────────────────────────────────────────────────────────────────────────

export default function Simulator() {
  const [form, setForm] = useState({ title: '', company: '', description: '' });
  const [briefing, setBriefing] = useState(null); // { title, company } the checklist was built for
  const [editing, setEditing] = useState(true);
  const [loading, setLoading] = useState(null); // { title, company } while a checklist is on its way
  const [formError, setFormError] = useState('');
  const [questions, setQuestions] = useState([]);
  const [tab, setTab] = useState('checklist');
  const [openRows, setOpenRows] = useState({}); // checklist key -> open
  const [current, setCurrent] = useState(0);
  const [results, setResults] = useState({}); // key -> { status: 'answered', feedback } | { status: 'skipped' }
  const [drafts, setDrafts] = useState({}); // key -> the answer being written
  const [scoring, setScoring] = useState(null); // the key being scored (one at a time)
  const [simError, setSimError] = useState(null); // { key, message }
  const [verdict, setVerdict] = useState(null); // { text, from } while the verdict screen is up

  const [latest] = useState(createLatest); // the newest checklist request wins
  const [sessions] = useState(createLatest); // a new checklist drops scores for the old one
  const sessionRef = useRef(0);
  const shownVerdict = useRef(''); // the verdict already flapped in this run (plays once)
  const questionsAbort = useRef(null);
  const feedbackAbort = useRef(null);
  const alive = useRef(true);
  const focusNext = useRef(null);
  const refs = {
    title: useRef(null),
    company: useRef(null),
    change: useRef(null),
    checklist: useRef(null),
    question: useRef(null),
    answer: useRef(null),
    status: useRef(null),
    score: useRef(null),
    verdict: useRef(null),
    tabs: useRef(null),
  };

  const keys = questions.map((item) => item.key);
  const counts = tally(keys, results);
  const progress = interviewProgress(counts.done, counts.total);
  const q = questions[current];
  const result = q ? results[q.key] : undefined;

  // The question on screen, for answers that land later (a score for another question must
  // not pull focus away from this one).
  const currentKey = useRef(null);
  useEffect(() => {
    currentKey.current = tab === 'simulator' && !verdict ? (q?.key ?? null) : null;
  });

  // Nothing lands after the page is gone.
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      latest.next();
      sessions.next();
      questionsAbort.current?.abort();
      feedbackAbort.current?.abort();
    };
  }, [latest, sessions]);

  // Focus follows the run: the checklist when it lands, the question when it changes, the
  // status line while scoring, the score when it lands, the verdict at the end.
  useEffect(() => {
    const target = focusNext.current;
    if (!target) return;
    const el = refs[target]?.current;
    if (!el) return;
    focusNext.current = null;
    el.focus();
  });

  const setField = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  const generate = async (e) => {
    e.preventDefault();
    if (loading) return;
    const title = form.title.trim();
    const company = form.company.trim();
    if (!title || !company) {
      setFormError('Add the job title and the company first.');
      (title ? refs.company : refs.title).current?.focus();
      return;
    }
    const id = latest.next();
    questionsAbort.current?.abort();
    const ctrl = new AbortController();
    questionsAbort.current = ctrl;
    const timer = setTimeout(() => ctrl.abort(), QUESTIONS_TIMEOUT_MS);
    setFormError('');
    setLoading({ title, company });

    let next = null;
    let problem = '';
    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: title,
          company,
          jobDescription: form.description.trim().slice(0, MAX_DESCRIPTION),
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        problem = await errorFrom(res, 'questions');
      } else {
        next = normalizeQuestions(await res.json().catch(() => null));
        if (!next.length) problem = 'The simulator sent back an unreadable checklist. Try again.';
      }
    } catch {
      problem = ctrl.signal.aborted
        ? 'Building the checklist took too long. Try again in a minute.'
        : 'Couldn’t reach the simulator. Check your connection and try again.';
    } finally {
      clearTimeout(timer);
    }
    if (!latest.isCurrent(id)) return;
    setLoading(null);
    if (problem) {
      setFormError(problem);
      return;
    }
    // A new checklist: the old run (and any score still on its way) is over.
    sessionRef.current = sessions.next();
    feedbackAbort.current?.abort();
    shownVerdict.current = '';
    loadFlap().catch(() => {});
    setQuestions(next);
    setBriefing({ title, company });
    setEditing(false);
    setResults({});
    setDrafts({});
    setOpenRows({});
    setCurrent(0);
    setScoring(null);
    setSimError(null);
    setVerdict(null);
    setTab('checklist');
    focusNext.current = 'checklist';
  };

  const editBriefing = () => {
    setEditing(true);
    focusNext.current = 'title';
  };
  const keepChecklist = () => {
    setEditing(false);
    setFormError('');
    focusNext.current = 'change';
  };

  // ── Tabs ──
  const selectTab = (id, focusTab = false) => {
    setTab(id);
    if (id === 'simulator') loadFlap().catch(() => {});
    if (focusTab) refs.tabs.current?.querySelector(`#iv-tab-${id}`)?.focus();
  };
  const onTabKey = (e) => {
    const i = TABS.findIndex((t) => t.id === tab);
    let to = -1;
    if (e.key === 'ArrowRight') to = (i + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') to = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = TABS.length - 1;
    if (to < 0) return;
    e.preventDefault();
    selectTab(TABS[to].id, true);
  };

  // ── The run ──
  // Open the simulator: on question `index`, or (none given) where the run was left.
  const rehearse = (index) => {
    if (Number.isInteger(index)) {
      setCurrent(index);
      setVerdict(null);
      focusNext.current = 'question';
    } else {
      focusNext.current = verdict ? 'verdict' : 'question';
    }
    selectTab('simulator');
  };

  const showVerdictFor = async (snapshot) => {
    const text = takeoffVerdict(scoresOf(keys, snapshot));
    // Give the plate its flaps if they are a moment away; never hold the verdict for them.
    if (!flapModule) await Promise.race([loadFlap().catch(() => {}), new Promise((r) => setTimeout(r, 400))]);
    if (!alive.current) return;
    const from = shownVerdict.current === text ? text : '';
    shownVerdict.current = text;
    setVerdict({ text, from });
    focusNext.current = 'verdict';
  };

  // The answer being scored counts as open, so the run cannot end with a score in flight.
  const advance = (snapshot) => {
    const next = nextStop(keys, snapshot, current, scoring);
    setSimError(null);
    if (next === -1) {
      showVerdictFor(snapshot);
      return;
    }
    setCurrent(next);
    focusNext.current = 'question';
  };

  const skip = () => {
    if (!q || scoring === q.key) return;
    const snapshot = { ...results, [q.key]: { status: 'skipped' } };
    setResults(snapshot);
    advance(snapshot);
  };

  const submit = async (e) => {
    e?.preventDefault();
    if (!q || !briefing || scoring === q.key) return;
    if (scoring) {
      setSimError({ key: q.key, message: 'One answer is being scored — wait for it, then score this one.' });
      return;
    }
    const answer = (drafts[q.key] ?? '').trim();
    if (!answer) {
      setSimError({ key: q.key, message: 'Write an answer first, then score it.' });
      refs.answer.current?.focus();
      return;
    }
    const key = q.key;
    const sid = sessionRef.current;
    const ctrl = new AbortController();
    feedbackAbort.current = ctrl;
    const timer = setTimeout(() => ctrl.abort(), FEEDBACK_TIMEOUT_MS);
    setSimError(null);
    setScoring(key);
    focusNext.current = 'status';

    let fb = null;
    let problem = '';
    try {
      const res = await fetch('/api/interview/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q.question,
          answer: answer.slice(0, MAX_ANSWER),
          jobTitle: briefing.title,
          category: q.category,
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        problem = await errorFrom(res, 'feedback');
      } else {
        fb = normalizeFeedback(await res.json().catch(() => null));
        if (!fb) problem = 'The simulator sent back an unreadable score. Your answer is still here — try again.';
      }
    } catch {
      problem = ctrl.signal.aborted
        ? 'Scoring took too long. Your answer is still here — try again.'
        : 'Couldn’t reach the simulator. Check your connection and try again.';
    } finally {
      clearTimeout(timer);
    }
    if (!alive.current || !sessions.isCurrent(sid)) return;
    setScoring(null);
    if (fb) setResults((r) => ({ ...r, [key]: { status: 'answered', feedback: fb } }));
    else setSimError({ key, message: problem });
    // Focus follows only if that question is still the one on screen.
    if (currentKey.current === key) focusNext.current = fb ? 'score' : 'answer';
  };

  const onAnswerKey = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submit();
    }
  };

  // A fresh run: a score still on its way belongs to the old one, so it is dropped.
  const runAgain = () => {
    sessionRef.current = sessions.next();
    feedbackAbort.current?.abort();
    setScoring(null);
    shownVerdict.current = '';
    setResults({});
    setSimError(null);
    setVerdict(null);
    setCurrent(0);
    focusNext.current = 'question';
  };

  const backToChecklist = () => {
    selectTab('checklist');
    focusNext.current = 'checklist';
  };

  const toggleRow = (key) => setOpenRows((o) => ({ ...o, [key]: !o[key] }));

  // ── Render ──
  const hasChecklist = questions.length > 0 && briefing;
  const nextIndex = q ? nextStop(keys, results, current, scoring) : -1;
  // The plate's words come from the same live results as its average, so the two always agree.
  const plateVerdict = verdict ? takeoffVerdict(scoresOf(keys, results)) : null;
  useEffect(() => {
    if (plateVerdict) shownVerdict.current = plateVerdict;
  }, [plateVerdict]);
  const nextLabel = nextIndex === -1 ? 'See the verdict →' : 'Next question →';
  const busyHere = q && scoring === q.key;

  return (
    <div className="iv">
      <section className="iv-card iv-brief" data-compact={editing ? undefined : ''}>
        {editing ? (
          <form onSubmit={generate} noValidate>
            <h2 className="iv-h">
              BRIEFING <span className="iv-h-note">the role you’re rehearsing for</span>
            </h2>
            <div className="iv-grid">
              <div className="iv-f">
                <label htmlFor="iv-title" className="iv-label">
                  Job title
                </label>
                <input
                  id="iv-title"
                  ref={refs.title}
                  className="iv-field"
                  value={form.title}
                  onChange={setField('title')}
                  placeholder="e.g. Software Engineer"
                  autoComplete="organization-title"
                  maxLength={120}
                  aria-required="true"
                />
              </div>
              <div className="iv-f">
                <label htmlFor="iv-company" className="iv-label">
                  Company
                </label>
                <input
                  id="iv-company"
                  ref={refs.company}
                  className="iv-field"
                  value={form.company}
                  onChange={setField('company')}
                  placeholder="e.g. Shopify"
                  autoComplete="organization"
                  maxLength={120}
                  aria-required="true"
                />
              </div>
            </div>
            <div className="iv-f">
              <label htmlFor="iv-desc" className="iv-label">
                Job description <span className="iv-opt">optional — makes the questions sharper</span>
              </label>
              <textarea
                id="iv-desc"
                className="iv-field iv-area"
                value={form.description}
                onChange={setField('description')}
                placeholder="Paste the job description here"
                rows={4}
                data-lenis-prevent=""
              />
            </div>
            {formError && <Alert message={formError} />}
            {loading && (
              <p className="iv-status" role="status">
                <Lamp />
                <span className="iv-status-w">PREPARING</span> writing questions for {loading.title} at {loading.company}{' '}
                — about 20 seconds
              </p>
            )}
            <div className="iv-actions">
              <button type="submit" className="iv-btn" aria-disabled={loading ? 'true' : undefined}>
                {loading ? 'Building your checklist…' : hasChecklist ? 'Build a new checklist' : 'Build my checklist'}
              </button>
              {hasChecklist && !loading && (
                <button type="button" className="iv-btn iv-btn-2" onClick={keepChecklist}>
                  Keep the current one
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="iv-briefed">
            <p className="iv-briefed-t">
              <span className="iv-k">BRIEFED</span> <b>{briefing.title}</b> <span aria-hidden="true">·</span>
              <span className="sr-only"> at </span> {briefing.company}
            </p>
            <button type="button" className="iv-btn iv-btn-2 iv-btn-s" ref={refs.change} onClick={editBriefing}>
              Change role
            </button>
          </div>
        )}
      </section>

      {!hasChecklist && <Procedure />}

      {hasChecklist && (
        <>
          <div className="iv-tabs" role="tablist" aria-label="Simulator mode" ref={refs.tabs} onKeyDown={onTabKey}>
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`iv-tab-${t.id}`}
                className="iv-tab"
                aria-selected={tab === t.id}
                aria-controls={`iv-panel-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => selectTab(t.id)}
              >
                <span className="iv-tab-k">{t.label}</span>
                <span className="iv-tab-s">{t.sub}</span>
              </button>
            ))}
          </div>

          <div
            role="tabpanel"
            id="iv-panel-checklist"
            aria-labelledby="iv-tab-checklist"
            className="iv-panel"
            hidden={tab !== 'checklist'}
          >
            <section className="iv-card" aria-labelledby="iv-h-checklist">
              <h2 className="iv-h" id="iv-h-checklist" tabIndex={-1} ref={refs.checklist}>
                PRE-TAKEOFF CHECKLIST
              </h2>
              <p className="iv-lead">
                {questions.length === 1 ? 'One question' : `${questions.length} questions`} for <b>{briefing.title}</b> at{' '}
                <b>{briefing.company}</b>. Open one for what it’s really assessing, how to answer, and a strong example.
              </p>
              <ol className="iv-list">
                {questions.map((item, i) => (
                  <ChecklistItem
                    key={item.key}
                    q={item}
                    index={i}
                    result={results[item.key]}
                    open={!!openRows[item.key]}
                    onToggle={() => toggleRow(item.key)}
                    onRehearse={() => rehearse(i)}
                  />
                ))}
              </ol>
              <div className="iv-actions">
                <button type="button" className="iv-btn" onClick={() => rehearse(null)}>
                  {counts.done > 0 ? 'Back to the simulator →' : 'Start the simulator →'}
                </button>
              </div>
            </section>
          </div>

          <div
            role="tabpanel"
            id="iv-panel-simulator"
            aria-labelledby="iv-tab-simulator"
            className="iv-panel"
            hidden={tab !== 'simulator'}
          >
            <div className="iv-instruments">
              <Altimeter value={progress} valueText={`${progress}% — ${counts.done} of ${counts.total} questions done`} />
              <dl className="iv-read">
                <div>
                  <dt>DONE</dt>
                  <dd>
                    {pad2(counts.done)}
                    <span className="iv-read-of"> / {pad2(counts.total)}</span>
                  </dd>
                </div>
                <div>
                  <dt>SCORED</dt>
                  <dd>{pad2(counts.answered)}</dd>
                </div>
                <div>
                  <dt>SKIPPED</dt>
                  <dd>{pad2(counts.skipped)}</dd>
                </div>
              </dl>
            </div>

            {verdict ? (
              <>
                <VerdictPlate
                  verdict={plateVerdict}
                  from={verdict.from}
                  avg={averageScore(scoresOf(keys, results))}
                  counts={counts}
                  headingRef={refs.verdict}
                />
                <div className="iv-actions">
                  <button type="button" className="iv-btn" onClick={runAgain}>
                    Run it again
                  </button>
                  <button type="button" className="iv-btn iv-btn-2" onClick={backToChecklist}>
                    Back to the checklist
                  </button>
                </div>
                <Debrief questions={questions} results={results} onRehearse={rehearse} />
              </>
            ) : (
              q && (
                <section className="iv-card iv-cockpit" aria-labelledby="iv-q" key={q.key}>
                  <p className="iv-kicker">
                    QUESTION {pad2(current + 1)} / {pad2(questions.length)} <span aria-hidden="true">·</span>{' '}
                    {CATEGORY[q.category]}
                  </p>
                  <h3 className="iv-q" id="iv-q" tabIndex={-1} ref={refs.question}>
                    {q.question}
                  </h3>

                  {result?.status === 'answered' ? (
                    <>
                      <Feedback fb={result.feedback} scoreRef={refs.score} />
                      <div className="iv-actions">
                        <button type="button" className="iv-btn" onClick={() => advance(results)}>
                          {nextLabel}
                        </button>
                      </div>
                    </>
                  ) : (
                    <form className="iv-answer" onSubmit={submit} noValidate>
                      {result?.status === 'skipped' && (
                        <p className="iv-skipped">
                          <span className="iv-k">SKIPPED</span> Answer it now, or move on.
                        </p>
                      )}
                      <label htmlFor="iv-answer" className="iv-label">
                        Your answer
                      </label>
                      <textarea
                        id="iv-answer"
                        ref={refs.answer}
                        className="iv-field iv-area"
                        value={drafts[q.key] ?? ''}
                        onChange={(e) => setDrafts((d) => ({ ...d, [q.key]: e.target.value }))}
                        onKeyDown={onAnswerKey}
                        placeholder="Write it the way you’d say it out loud."
                        rows={7}
                        maxLength={MAX_ANSWER}
                        aria-describedby="iv-answer-hint"
                        data-lenis-prevent=""
                      />
                      <p className="iv-hint" id="iv-answer-hint">
                        A minute or two of speaking is plenty. It’s scored out of 10; 7 or more is a strong answer.
                      </p>
                      {busyHere && (
                        <p className="iv-status" role="status" tabIndex={-1} ref={refs.status}>
                          <Lamp />
                          <span className="iv-status-w">SCORING</span> reading your answer against the role
                        </p>
                      )}
                      {simError?.key === q.key && <Alert message={simError.message} />}
                      <div className="iv-actions">
                        <button type="submit" className="iv-btn" aria-disabled={scoring ? 'true' : undefined}>
                          {busyHere ? 'Scoring…' : 'Score my answer'}
                        </button>
                        <button
                          type="button"
                          className="iv-btn iv-btn-2"
                          onClick={skip}
                          aria-disabled={busyHere ? 'true' : undefined}
                        >
                          Skip<span className="sr-only"> this question</span>
                        </button>
                      </div>
                    </form>
                  )}
                </section>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}
