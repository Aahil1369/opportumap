'use client';

// One row of the /jobs board (spec §7): CODE · role · company and city · match · PAY · STATUS.
// Desktop: one line. Phones: two (code + role / company · pay · status), jobs.css. The row is a
// link to /jobs?job=<id> (a deep link; a plain click opens the gate in place) with the save
// toggle beside it, never inside it.
//
// Motion (FlapText, the kit's split-flap): the code, pay and status flap, only while the row is
// on screen. A row that arrives on screen (first results, "Load more") clacks in from blank; one
// that arrives below the fold just shows its text and never flaps (and never gets a canvas: the
// engine paints flips on a small canvas per cell, made on the first flip). When a search or a
// chip changes the row's text, an on-screen row re-flaps to it; an off-screen one snaps.
// A role with no listed pay asks the salary model (usePredictedPay) while the row is on screen;
// the estimate flaps in, marked "~", or the row says "Pay estimate unavailable".

import { memo, useRef } from 'react';
import FlapText from '../kit/FlapText';
import { useOnScreen } from './useOnScreen';
import { usePredictedPay } from './usePredictedPay';

export const PAY_TILES = 12;
export const STATUS_TILES = 8;
const STAGGER_MS = 70;
const PER_BATCH = 24; // rows a page of results adds: each batch ripples from its own first row

function payLabel(row, predicted, state) {
  if (row.pay) return row.pay;
  if (predicted) return `${predicted}, estimated by our salary model`;
  return state === 'unavailable' ? 'Pay estimate unavailable' : 'Pay not listed';
}

function JobRow({ row, href, index, saved, onOpen, onSave }) {
  const ref = useRef(null);
  const { on, first } = useOnScreen(ref);
  const { pay: predicted, state } = usePredictedPay(row.ask, { visible: on });
  const arrive = first === true;
  const delayMs = Math.min(index % PER_BATCH, 10) * STAGGER_MS;
  const flap = (text) => ({ text, play: on, from: arrive ? '' : text, delayMs });

  let pay;
  if (row.pay) {
    pay = <FlapText {...flap(row.pay)} width={PAY_TILES} />;
  } else if (predicted) {
    // The estimate is news even on a row that is already there: it flaps in from blank.
    pay = <FlapText text={`~${predicted}`} from="" play={on} delayMs={delayMs} width={PAY_TILES} />;
  } else {
    pay = <span className="jr-paynote">{state === 'unavailable' ? 'Pay estimate unavailable' : 'Pay not listed'}</span>;
  }

  const label = [
    `${row.role}, ${row.where || row.code}`,
    `Code ${row.code}`,
    `Pay: ${payLabel(row, predicted, state)}`,
    row.status,
    row.match ? `${row.match.text} match` : '',
  ]
    .filter(Boolean)
    .join('. ');

  const click = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onOpen(row.id, e.currentTarget);
  };

  return (
    <li ref={ref} className="jr">
      <a className="jr-link" href={href} onClick={click} aria-label={label} data-job={row.id}>
        <span className="jr-code">
          <FlapText {...flap(row.code)} width={3} />
        </span>
        <span className="jr-role" title={row.role}>
          {row.role}
        </span>
        <span className="jr-where" title={row.where}>
          {row.where}
        </span>
        <span className="jr-side">
          {row.match && (
            <span className="jr-match" title={`${row.match.label} match for your profile`}>
              {row.match.text}
            </span>
          )}
        </span>
        <span className="jr-pay" data-est={predicted && !row.pay ? '' : undefined}>
          {pay}
        </span>
        <span className="jr-status">
          <FlapText {...flap(row.status)} width={STATUS_TILES} status />
        </span>
      </a>
      <button
        type="button"
        className="jr-save"
        aria-pressed={saved}
        aria-label={`Save ${row.role}`}
        onClick={() => onSave(row.id)}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
          <path
            d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4.5 7.3 4.5c2 0 3.5 1.1 4.7 2.7 1.2-1.6 2.7-2.7 4.7-2.7 3.4 0 5.7 3.1 4.5 6.6-1.7 4.8-9.2 9.4-9.2 9.4Z"
            fill={saved ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </li>
  );
}

export default memo(JobRow);
