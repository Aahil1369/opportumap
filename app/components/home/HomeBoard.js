'use client';

// The homepage's split-flap boards (spec §6).
//   HomeBoard       beat 1: the departures board. The server sends its final text (rows from
//                   lib/departures/board.js at ISR time); after hydration it clacks in once, with
//                   LOCAL re-timed to the visitor's now, then the clock ticks each minute while
//                   the board is on screen. Rows keep their slot, so new rows (the signed-in
//                   visitor's, PersonalBoard) re-flap in place.
//   PredictionBeat  beat 2: one row lifts out and its pay re-flaps to our salary model's
//                   prediction (asked once, when the beat is in view; cached for the session).
//   FounderBeat     beat 5: the board dims except the founder's row, lit gold.
// Every board's LOCAL is on the visitor's clock after hydration (useBoardClock), so one city
// never shows two times on the page, even on an ISR page hours old.
// Reduced motion: FlapText shows plain text and the beats stay in their final state.

import { useEffect, useMemo, useRef, useState } from 'react';
import FlapBoard from '../kit/FlapBoard';
import FlapText from '../kit/FlapText';
import { localPay } from '../../../lib/departures/pay';
import { FOUNDER_LAYOUT, LAYOUT, PLATE_TILES, plateText, retime, withLayout } from '../../../lib/departures/homeBoard';
import { useBeat } from './Beat';

/**
 * The visitor's clock for a board: null on the server and during hydration (the rows show the
 * server's LOCAL), then the time from the first frame after hydration. It moves on at each
 * minute while the board (`ref`) is on screen and the page is visible, and catches up when either
 * comes back. Every board ticks on the same minute boundary, so they agree.
 */
function useBoardClock(ref) {
  const [now, setNow] = useState(null);

  useEffect(() => {
    const first = requestAnimationFrame(() => setNow(new Date()));
    let timer = 0;
    let onScreen = true;
    const sync = () => {
      clearTimeout(timer);
      timer = 0;
      if (!onScreen || document.visibilityState !== 'visible') return;
      timer = setTimeout(() => {
        setNow(new Date());
        sync();
      }, 60_250 - (Date.now() % 60_000));
    };
    const io = new IntersectionObserver(([entry]) => {
      const back = entry.isIntersecting && !onScreen;
      onScreen = entry.isIntersecting;
      if (back) setNow(new Date());
      sync();
    });
    io.observe(ref.current);
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNow(new Date());
      sync();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelAnimationFrame(first);
      io.disconnect();
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [ref]);

  return now;
}

/** Rows in their board slots, LOCAL re-timed to `now` (null: as the server rendered them). */
const slotted = (rows, now) => rows.map((row, i) => ({ ...retime(row, now), id: `slot-${i}` }));

export default function HomeBoard({ rows, columns, caption }) {
  const ref = useRef(null);
  // The first frame after hydration: the board clacks in, already on the visitor's local times
  // (an ISR page can be minutes old).
  const now = useBoardClock(ref);
  const cols = useMemo(() => withLayout(columns, LAYOUT), [columns]);
  const shown = useMemo(() => slotted(rows, now), [rows, now]);

  return (
    <div ref={ref} className="hb">
      <FlapBoard columns={cols} rows={shown} play={now !== null} caption={caption} />
    </div>
  );
}

// ── Beat 2: the prediction ────────────────────────────────────────────────────────────────

const predictions = new Map(); // "title|country" -> Promise<string | null>

/**
 * Our salary model's pay for a row ("C$95K–118K"), or null when it is unavailable. Asked once per
 * role and country: kept for the page and the session, failures too (no retry storm).
 */
function predictPay(row) {
  const title = row.cells.role;
  const country = row.iso2 || '';
  const key = `${title}|${country}`;
  if (predictions.has(key)) return predictions.get(key);
  let kept = null;
  try {
    kept = sessionStorage.getItem(`om:pay:${key}`);
  } catch {
    kept = null;
  }
  const ask = () =>
    fetch('/api/predict-salary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, company: row.company || '', location: row.location || row.city || '', country }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        const pay = d ? localPay({ salary_min: d.min, salary_max: d.max, currency: d.currency }) : null;
        return pay && pay !== 'Pay not listed' ? pay : null;
      })
      .catch(() => null)
      .then((pay) => {
        try {
          sessionStorage.setItem(`om:pay:${key}`, pay || '');
        } catch {
          // private mode: the page-level cache still holds it
        }
        return pay;
      });
  const p = kept != null ? Promise.resolve(kept || null) : ask();
  predictions.set(key, p);
  return p;
}

export function PredictionBeat({ row }) {
  const ref = useRef(null);
  const { state, seen } = useBeat(ref);
  const now = useBoardClock(ref);
  const [predicted, setPredicted] = useState(undefined); // undefined: not asked; null: unavailable

  useEffect(() => {
    if (!seen) return undefined;
    let live = true;
    predictPay(row).then((pay) => live && setPredicted(pay));
    return () => {
      live = false;
    };
  }, [seen, row]);

  const listed = row.cells.pay;
  const where = row.city ? ` in ${row.city}` : '';
  // The board's pay: the role's own, or the estimate Adzuna lists for it, so say only where it is from.
  let note = 'The pay on the board.';
  if (predicted) note = `Our salary model's estimate for ${row.cells.role}${where}.`;
  else if (predicted === null) note = "Our salary model's estimate is unavailable right now, so this is the pay on the board.";
  else if (seen) note = 'Asking our salary model…';

  // LOCAL on the visitor's clock, as on the board above (not the time the page was built).
  const time = retime(row, now).cells.time;

  return (
    <figure ref={ref} className="pb" data-beat={state ?? undefined}>
      <div className="pb-card">
        <p className="pb-row">
          <FlapText text={time} play={false} width={LAYOUT.time.width} />
          <FlapText className="pb-code" text={row.cells.code} play={false} width={LAYOUT.code.width} />
          <FlapText text={row.cells.role} play={false} width={LAYOUT.role.width} />
        </p>
        <p className="pb-label">PAY</p>
        <p className="pb-pay">
          <FlapText text={predicted ? plateText(predicted) : listed} from={listed} width={PLATE_TILES} />
        </p>
      </div>
      <figcaption className="pb-note" aria-live="polite">
        {note}
      </figcaption>
    </figure>
  );
}

// ── Beat 5: your row ──────────────────────────────────────────────────────────────────────

export function FounderBeat({ rows, founder, columns }) {
  const ref = useRef(null);
  const { state } = useBeat(ref);
  const now = useBoardClock(ref);
  const cols = useMemo(() => withLayout(columns, FOUNDER_LAYOUT), [columns]);
  // The dimmed rows are the board's own, on the visitor's clock like the board above.
  const board = useMemo(
    () => [
      ...rows.slice(0, 3).map((row, i) => ({ id: `off-${i}`, cells: retime(row, now).cells, tone: 'off', play: false })),
      { ...founder, tone: 'lit' },
    ],
    [rows, founder, now],
  );

  return (
    <div ref={ref} className="fd" data-beat={state ?? undefined}>
      <FlapBoard columns={cols} rows={board} play={state === 'play'} caption="ARRIVALS" />
      <p className="fd-line">I made it across three countries. This board is so you can too.</p>
    </div>
  );
}
