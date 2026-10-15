'use client';

// Our salary model's pay for a role that lists none (spec §7, AI quota): asked only while its
// row is on screen, and only once the row has stayed there for a moment (a quick scroll past
// asks nothing), through one queue for the whole page (lib/departures/payQueue.js: one request
// per role and country, at most 3 in flight, failures kept, never retried). Answers are also
// kept for the tab's session in sessionStorage: the text under the homepage's `om:pay:<key>`,
// the numbers under `om:payn:<key>`. A 429 from the model pauses every new question for a
// minute (they come back unavailable).
//
//   const { pay, state, range } = usePredictedPay(row.ask, { visible: onScreen });
//   row.ask: { title, country, company, location } (null when the role lists its pay)
//   state:   'idle' (nothing asked yet) | 'loading' | 'done' (pay: 'C$88K–102K') | 'unavailable'
//   range:   { min, max, low, high, currency } numbers behind `pay` (low/high: the city's range
//            for this kind of role), or null; an answer the homepage kept has text only.
//
// The job gate (JobGate) uses the same hook while it is open (dwellMs 0, or 600 for a role that
// lists its pay and asks only for its runway): a role the board already asked about is answered
// from the queue, without a second request.

import { useEffect, useState } from 'react';
import { createPayQueue, payKey } from '../../../lib/departures/payQueue';
import { modelPay } from '../../../lib/departures/pay';

const DWELL_MS = 350;
const COOL_MS = 60_000;
let coolUntil = 0;

function kept(key) {
  try {
    const pay = sessionStorage.getItem(`om:pay:${key}`);
    if (pay == null) return undefined;
    if (!pay) return null; // '' is the homepage's "unavailable"
    let range = null;
    try {
      const n = JSON.parse(sessionStorage.getItem(`om:payn:${key}`) || 'null');
      range = n && typeof n === 'object' && !Array.isArray(n) ? n : null;
    } catch {
      range = null;
    }
    return { pay, range };
  } catch {
    return undefined;
  }
}

function keep(key, got) {
  try {
    sessionStorage.setItem(`om:pay:${key}`, got.pay);
    sessionStorage.setItem(`om:payn:${key}`, JSON.stringify(got.range));
  } catch {
    // private mode: the queue still keeps it for this page
  }
}

/** One question to the salary model: { pay, range } in the role's own currency, or null. */
async function askModel(job) {
  const key = payKey(job);
  const known = kept(key);
  if (known !== undefined) return known;
  if (Date.now() < coolUntil) return null;
  const res = await fetch('/api/predict-salary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: job.title,
      company: job.company || '',
      location: job.location || '',
      country: job.country || '',
    }),
  });
  if (res.status === 429) coolUntil = Date.now() + COOL_MS;
  if (!res.ok) return null;
  const got = modelPay(await res.json());
  if (got) keep(key, got);
  return got;
}

/** The page's one queue: every row and the gate ask through it. */
export const payQueue = createPayQueue({ fetcher: askModel, concurrency: 3 });

const IDLE = { pay: null, state: 'idle', range: null };

export function usePredictedPay(job, { visible = false, dwellMs = DWELL_MS } = {}) {
  const key = job ? payKey(job) : null;
  const [got, setGot] = useState({ key: null, pay: null, state: 'idle', range: null });
  const asked = got.key === key;

  useEffect(() => {
    if (!key || !visible || asked) return undefined;
    const ask = { title: job.title, country: job.country, company: job.company, location: job.location };
    const timer = setTimeout(() => {
      setGot({ key, pay: null, state: 'loading', range: null });
      payQueue.request(ask).then((answer) =>
        setGot((g) =>
          g.key === key
            ? { key, pay: answer?.pay || null, state: answer?.pay ? 'done' : 'unavailable', range: answer?.range || null }
            : g,
        ),
      );
    }, dwellMs);
    return () => clearTimeout(timer);
    // `job` is read once, when its key is asked about; a new object with the same key changes nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, visible, asked, dwellMs]);

  return asked ? { pay: got.pay, state: got.state, range: got.range } : IDLE;
}
