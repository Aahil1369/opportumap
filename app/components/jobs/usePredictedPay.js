'use client';

// Our salary model's pay for a role that lists none (spec §7, AI quota): asked only while its
// row is on screen, and only once the row has stayed there for a moment (a quick scroll past
// asks nothing), through one queue for the whole page (lib/departures/payQueue.js: one request
// per role and country, at most 3 in flight, failures kept, never retried). Answers are also
// kept for the tab's session in sessionStorage, under the keys the homepage's prediction uses.
// A 429 from the model pauses every new question for a minute (they come back unavailable).
//
//   const { pay, state } = usePredictedPay(row.ask, { visible: onScreen });
//   row.ask: { title, country, company, location } (null when the role lists its pay)
//   state:   'idle' (nothing asked yet) | 'loading' | 'done' (pay: 'C$88K–102K') | 'unavailable'
//
// The job gate (Task 6) uses the same hook with { visible: open, dwellMs: 0 }: a role the board
// already asked about is answered from the queue, without a second request.

import { useEffect, useState } from 'react';
import { createPayQueue, payKey } from '../../../lib/departures/payQueue';
import { localPay } from '../../../lib/departures/pay';

const DWELL_MS = 350;
const COOL_MS = 60_000;
let coolUntil = 0;

function kept(key) {
  try {
    return sessionStorage.getItem(`om:pay:${key}`);
  } catch {
    return null;
  }
}

function keep(key, pay) {
  try {
    sessionStorage.setItem(`om:pay:${key}`, pay);
  } catch {
    // private mode: the queue still keeps it for this page
  }
}

/** One question to the salary model: the pay in the role's own currency, or null. */
async function askModel(job) {
  const key = payKey(job);
  const known = kept(key);
  if (known != null) return known || null; // '' is the homepage's "unavailable"
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
  const d = await res.json();
  const pay = localPay({ salary_min: d?.min, salary_max: d?.max, currency: d?.currency });
  if (!pay || pay === 'Pay not listed') return null;
  keep(key, pay);
  return pay;
}

/** The page's one queue: every row and the gate ask through it. */
export const payQueue = createPayQueue({ fetcher: askModel, concurrency: 3 });

const IDLE = { pay: null, state: 'idle' };

export function usePredictedPay(job, { visible = false, dwellMs = DWELL_MS } = {}) {
  const key = job ? payKey(job) : null;
  const [got, setGot] = useState({ key: null, pay: null, state: 'idle' });
  const asked = got.key === key;

  useEffect(() => {
    if (!key || !visible || asked) return undefined;
    const ask = { title: job.title, country: job.country, company: job.company, location: job.location };
    const timer = setTimeout(() => {
      setGot({ key, pay: null, state: 'loading' });
      payQueue.request(ask).then((pay) =>
        setGot((g) => (g.key === key ? { key, pay, state: pay ? 'done' : 'unavailable' } : g)),
      );
    }, dwellMs);
    return () => clearTimeout(timer);
    // `job` is read once, when its key is asked about; a new object with the same key changes nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, visible, asked, dwellMs]);

  return asked ? { pay: got.pay, state: got.state } : IDLE;
}
