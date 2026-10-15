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
// Reduced motion: FlapText shows plain text and the beats stay in their final state.

import { useEffect, useMemo, useRef, useState } from 'react';
import FlapBoard from '../kit/FlapBoard';
import FlapText from '../kit/FlapText';
import { localPay } from '../../../lib/departures/pay';
import { useBeat } from './Beat';

// Tiles per column. Phones fold PAY and STATUS under ROLE, so both lines are 27 tiles: the
// approved step-0 tile size at 390 px.
const LAYOUT = {
  time: { width: 5 },
  code: { width: 3, tone: 'sign' },
  role: { width: 19 },
  pay: { width: 11, line: 2 },
  status: { width: 8, tone: 'status', line: 2 },
};
// Beat 5: the route is the widest cell (29 tiles), on a line of its own on phones; no PAY.
const FOUNDER_LAYOUT = {
  time: { width: 5, line: 2 },
  code: { width: 3, tone: 'sign', line: 2 },
  role: { width: 29 },
  status: { width: 9, tone: 'status', line: 2 },
};
const withLayout = (columns, layout) => columns.filter((c) => layout[c.key]).map((c) => ({ ...c, ...layout[c.key] }));

const clocks = new Map();
/** "HH:MM" in a time zone (24 h), or null when the engine does not know the zone. */
function clockIn(tz, now) {
  if (!clocks.has(tz)) {
    let f = null;
    try {
      f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    } catch {
      f = null;
    }
    clocks.set(tz, f);
  }
  const parts = clocks.get(tz)?.formatToParts(now);
  const h = parts?.find((p) => p.type === 'hour')?.value;
  const m = parts?.find((p) => p.type === 'minute')?.value;
  return h && m ? `${h.padStart(2, '0')}:${m.padStart(2, '0')}` : null;
}

/** Rows in their board slots, LOCAL re-timed to `now` (null: as the server rendered them). */
function slotted(rows, now) {
  return rows.map((row, i) => {
    const time = now && row.tz ? clockIn(row.tz, now) : null;
    return { ...row, id: `slot-${i}`, cells: time ? { ...row.cells, time } : row.cells };
  });
}

export default function HomeBoard({ rows, columns, caption }) {
  const ref = useRef(null);
  const [now, setNow] = useState(null);
  const [play, setPlay] = useState(false);
  const cols = useMemo(() => withLayout(columns, LAYOUT), [columns]);
  const shown = useMemo(() => slotted(rows, now), [rows, now]);

  useEffect(() => {
    // The first frame after hydration: the board clacks in, already on the visitor's local times
    // (an ISR page can be minutes old).
    const first = requestAnimationFrame(() => {
      setNow(new Date());
      setPlay(true);
    });
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
  }, []);

  return (
    <div ref={ref} className="hb">
      <FlapBoard columns={cols} rows={shown} play={play} caption={caption} />
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

const PAY_TILES = 23; // "C$185K–234K · PREDICTED"

export function PredictionBeat({ row }) {
  const ref = useRef(null);
  const { state, seen } = useBeat(ref);
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
  let note = 'The pay the role lists.';
  if (predicted) note = `Our salary model's estimate for ${row.cells.role}${where}.`;
  else if (predicted === null) note = "Our salary model's estimate is unavailable right now, so this is the pay the role lists.";
  else if (seen) note = 'Asking our salary model…';

  return (
    <figure ref={ref} className="pb" data-beat={state ?? undefined}>
      <div className="pb-card">
        <p className="pb-row">
          <FlapText text={row.cells.time} play={false} width={5} />
          <FlapText className="pb-code" text={row.cells.code} play={false} width={3} />
          <FlapText text={row.cells.role} play={false} width={19} />
        </p>
        <p className="pb-label">PAY</p>
        <p className="pb-pay">
          <FlapText text={predicted ? `${predicted} · PREDICTED` : listed} from={listed} width={PAY_TILES} />
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
  const cols = useMemo(() => withLayout(columns, FOUNDER_LAYOUT), [columns]);
  const board = useMemo(
    () => [
      ...rows.slice(0, 3).map((row, i) => ({ id: `off-${i}`, cells: row.cells, tone: 'off', play: false })),
      { ...founder, tone: 'lit' },
    ],
    [rows, founder],
  );

  return (
    <div ref={ref} className="fd" data-beat={state ?? undefined}>
      <FlapBoard columns={cols} rows={board} play={state === 'play'} caption="ARRIVALS" />
      <p className="fd-line">I made it across three countries. This board is so you can too.</p>
    </div>
  );
}
