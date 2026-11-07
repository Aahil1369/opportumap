// /interview — the simulator, pure core (no DOM, no React; unit-tested in scripts/departures).
//
// The page runs the interview questions as a pre-takeoff checklist and a mock run: each
// question is answered (and scored out of 10 by the AI) or skipped. The altimeter shows how much
// of the run is done, and the run ends with a verdict plate: CLEARED FOR TAKEOFF when at least
// MIN_SCORED answered questions average 7 or more, GO-AROUND when they average less, and HOLDING
// (a neutral plate that asks for more answers) when fewer were scored (Ruling R15).

export const CLEARED_AVG = 7;
export const MIN_SCORED = 3;
export const CLEARED = 'CLEARED FOR TAKEOFF';
export const GO_AROUND = 'GO-AROUND';
export const HOLDING = 'HOLDING';
export const MAX_QUESTIONS = 15; // the route asks for 15; a longer answer is cut to that
export const CATEGORIES = ['behavioral', 'technical', 'culture'];

const finite = (v) => (v === null || v === '' || typeof v === 'boolean' ? NaN : Number(v));

/**
 * How far through the run the altimeter reads, 0–100. `answered` counts every question done
 * (answered or skipped). 100 only when all are done — never by rounding one short of the end —
 * and one done always reads at least 1.
 */
export function interviewProgress(answered, total) {
  const a = finite(answered);
  const t = Math.floor(finite(total));
  if (!Number.isFinite(a) || !Number.isFinite(t) || t <= 0 || a <= 0) return 0;
  if (a >= t) return 100;
  return Math.max(1, Math.min(99, Math.floor((a / t) * 100)));
}

/** Counts for the checklist keys: answered, skipped, done (both) and still open. */
export function tally(keys, results) {
  const list = Array.isArray(keys) ? keys : [];
  const res = results && typeof results === 'object' ? results : {};
  let answered = 0;
  let skipped = 0;
  for (const key of list) {
    const status = res[key]?.status;
    if (status === 'answered') answered += 1;
    else if (status === 'skipped') skipped += 1;
  }
  const done = answered + skipped;
  return { answered, skipped, done, open: list.length - done, total: list.length };
}

const isDone = (r) => r?.status === 'answered' || r?.status === 'skipped';

/**
 * The next question still open after `from`, going forward and wrapping round; `from` itself
 * only when it is the last one open. -1 when every question is done.
 */
export function nextOpen(keys, results, from) {
  const list = Array.isArray(keys) ? keys : [];
  const res = results && typeof results === 'object' ? results : {};
  const n = list.length;
  if (!n) return -1;
  const start = Number.isInteger(from) && from >= 0 && from < n ? from : -1;
  for (let step = 1; step <= n; step += 1) {
    const i = (start + step + n) % n;
    if (!isDone(res[list[i]])) return i;
  }
  return -1;
}

/**
 * Where the run goes next: nextOpen, with the answer still being scored (`scoringKey`) counted
 * open. A skipped question that is being answered after all is not done until its score lands,
 * so the run never ends — and the verdict never shows — with a score in flight.
 */
export function nextStop(keys, results, from, scoringKey) {
  const res = results && typeof results === 'object' ? results : {};
  if (scoringKey === null || scoringKey === undefined) return nextOpen(keys, res, from);
  return nextOpen(keys, { ...res, [scoringKey]: undefined }, from);
}

/** The answered scores, in checklist order (skips are not scores). */
export function scoresOf(keys, results) {
  const list = Array.isArray(keys) ? keys : [];
  const res = results && typeof results === 'object' ? results : {};
  return list.filter((k) => res[k]?.status === 'answered').map((k) => res[k].feedback?.score);
}

/** The average score to one decimal, as the plate shows it; null when nothing was scored. */
export function averageScore(scores) {
  const nums = (Array.isArray(scores) ? scores : []).map(finite).filter(Number.isFinite);
  if (!nums.length) return null;
  return Math.round((nums.reduce((s, v) => s + v, 0) / nums.length) * 10) / 10;
}

/**
 * The verdict for the answered scores: HOLDING with fewer than MIN_SCORED (not enough to judge,
 * and not a bad score); then CLEARED FOR TAKEOFF when the shown average is 7 or more, GO-AROUND
 * when it is less.
 */
export function takeoffVerdict(scores) {
  const nums = (Array.isArray(scores) ? scores : []).map(finite).filter(Number.isFinite);
  if (nums.length < MIN_SCORED) return HOLDING;
  return averageScore(nums) >= CLEARED_AVG ? CLEARED : GO_AROUND;
}

/** The plate's colour: ok when cleared, amber for a go-around, info (neutral) while holding. */
export function verdictTone(verdict) {
  if (verdict === CLEARED) return 'ok';
  if (verdict === GO_AROUND) return 'amber';
  return 'info';
}

/**
 * The line under the plate: why this verdict, and what to do next. `counts` is tally()'s
 * ({ answered, total }). Holding asks for more scored answers, or for a new checklist when this
 * one has fewer than MIN_SCORED questions.
 */
export function verdictNote(verdict, counts) {
  const scored = Number(counts?.answered) || 0;
  const total = Number(counts?.total) || 0;
  if (verdict === CLEARED) {
    return 'An average of 7 or better across your answers. Say them out loud once more before the real thing.';
  }
  if (verdict === GO_AROUND) {
    return 'Below an average of 7. Go around: rework the lowest answers, then run the simulator again.';
  }
  if (total < MIN_SCORED) {
    return `A verdict needs at least ${MIN_SCORED} scored answers, and this checklist has fewer questions than that. Build a new checklist for a full run.`;
  }
  if (scored === 0) {
    return `Nothing was scored — every question was skipped. A verdict needs at least ${MIN_SCORED} scored answers: open a skipped question below and answer it.`;
  }
  return `A verdict needs at least ${MIN_SCORED} scored answers, and you have ${scored} so far. Open a skipped question below and answer it.`;
}

/** One answer's colour: ok from 7, amber below (the same line as the verdict). */
export function scoreTone(score) {
  const s = finite(score);
  return Number.isFinite(s) && s >= CLEARED_AVG ? 'ok' : 'amber';
}

/**
 * A stable, unique key per question: from its id (`q.id ?? index`), so a question keeps its key
 * across renders and its answer stays with it. Ids and places never mix ("id:1" vs "#1"); a
 * repeated id gets its place appended ("id:1#4"), and again until it is unique. Keys depend only
 * on the questions before, so appending questions never renames earlier ones.
 */
export function questionKeys(questions) {
  const list = Array.isArray(questions) ? questions : [];
  const seen = new Set();
  return list.map((q, i) => {
    const raw = q && typeof q === 'object' ? q.id : undefined;
    const id = raw === null || raw === undefined ? '' : String(raw).trim();
    let key = id ? `id:${id}` : `#${i}`;
    while (seen.has(key)) key = `${key}#${i}`;
    seen.add(key);
    return key;
  });
}

const text = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const block = (v, max) =>
  typeof v === 'string'
    ? v
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .slice(0, max)
    : '';

function categoryOf(v) {
  const c = typeof v === 'string' ? v.toLowerCase() : '';
  if (/behaviou?r/.test(c)) return 'behavioral';
  if (/technical|role/.test(c)) return 'technical';
  if (/culture|fit|values/.test(c)) return 'culture';
  return 'general';
}

/**
 * The question bank as the page renders it: questions with text (trimmed, capped; the same
 * question once), each with its stable key (from the list as sent), category behavioral |
 * technical | culture | general, and the why / how-to-answer / example text ('' when missing).
 * Junk gives [].
 */
export function normalizeQuestions(raw) {
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.questions) ? raw.questions : [];
  const keys = questionKeys(list);
  const seenText = new Set();
  const out = [];
  list.forEach((q, i) => {
    if (out.length >= MAX_QUESTIONS || !q || typeof q !== 'object') return;
    const question = text(q.question, 600);
    if (!question) return;
    const same = question.toLowerCase();
    if (seenText.has(same)) return;
    seenText.add(same);
    out.push({
      key: keys[i],
      category: categoryOf(q.category),
      question,
      why: block(q.why, 1200),
      howToAnswer: block(q.howToAnswer, 1200),
      exampleAnswer: block(q.exampleAnswer, 2000),
    });
  });
  return out;
}

function strings(v, max = 6) {
  if (!Array.isArray(v)) return [];
  const out = [];
  for (const s of v) {
    const t = block(s, 600);
    if (t && !out.includes(t)) out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * One scored answer as the page renders it: the score (0–10, one decimal), the one-line verdict,
 * what worked / what to improve / tips (strings only, no blanks or repeats) and the stronger
 * version. null when the answer has no usable score.
 */
export function normalizeFeedback(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const n = finite(raw.score);
  if (!Number.isFinite(n)) return null;
  return {
    score: Math.round(Math.min(10, Math.max(0, n)) * 10) / 10,
    verdict: text(raw.verdict, 400),
    whatWorked: strings(raw.whatWorked),
    whatToImprove: strings(raw.whatToImprove),
    strongerVersion: block(raw.strongerVersion, 3000),
    tips: strings(raw.tips, 4),
  };
}

/**
 * A question for the debrief list: whole when it fits in `max` characters (no ellipsis), else
 * cut at the last word that fits, trailing punctuation dropped, then "…" (at most `max` in all).
 */
export function previewText(value, max = 90) {
  const t = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  const chars = Array.from(t);
  if (chars.length <= max) return t;
  const room = Math.max(1, max - 1);
  let head = chars.slice(0, room).join('');
  if (chars[room] !== ' ') {
    const space = head.lastIndexOf(' ');
    if (space >= room * 0.5) head = head.slice(0, space);
  }
  head = head.replace(/[\s.,;:!?…—–-]+$/u, '');
  return `${head || chars.slice(0, room).join('')}…`;
}

const BUSY = 'The simulator is busy right now. Wait a minute, then try again.';
const FAILED = {
  questions: 'The simulator couldn’t build your checklist. Try again.',
  feedback: 'Couldn’t score that answer. It’s still here — try again.',
};
const MISSING = {
  questions: 'Add the job title and the company first.',
  feedback: 'Write an answer first, then score it.',
};
const TOO_LONG = {
  questions: 'That job description is too long. Shorten it, then try again.',
  feedback: 'That answer is too long to score. Shorten it, then score it again.',
};

/**
 * What the page says for a non-OK answer from /api/interview (`stage` 'questions') or
 * /api/interview/feedback ('feedback'). A 400, or a 413 (a body over the routes' 64 KB), keeps
 * the route's own short text, else says what to fix; 429/503, or an error that reads as a rate
 * limit, says busy; anything else is a plain line. No other text from the routes is shown.
 */
export function simErrorFor(status, error, stage = 'feedback') {
  const said = typeof error === 'string' ? error.trim() : '';
  const kind = stage === 'questions' ? 'questions' : 'feedback';
  if (status === 429 || status === 503) return BUSY;
  if (status === 400) return said && said.length <= 200 ? said : MISSING[kind];
  if (status === 413) return said && said.length <= 200 ? said : TOO_LONG[kind];
  if (/rate.?limit|\b429\b|too many requests/i.test(said)) return BUSY;
  return FAILED[kind];
}
