'use client';

// One row of the itinerary (/saved): CODE · role · company and city · PAY · STATUS, and Remove.
// Built like a /jobs row (JobRow): the code, pay and status are split-flap cells (FlapText), the
// role and company plain text; one line on a wide board, three on a phone (saved.css). The row is
// a link to /saved?job=<id> (a new tab opens its gate there); a plain click opens the gate here.
// Remove sits beside the link, never inside it, and is always visible (touch has no hover).
//
// Motion: like JobRow, a row that arrives on screen clacks in from blank (rippling down the
// board), one first seen below the fold just shows its text, and only on-screen rows flap.
// Remove (stage 'cancelled'): the status flaps to CANCELLED at once (no ripple delay), the rest of
// the row dims; then (stage 'gone') the row fades out and the board drops it (Itinerary.js).
// Reduced motion: the board drops the row at once (no stages).
//
// A role with no listed pay asks the salary model (usePredictedPay, the page's one queue) while
// the row is on screen; the estimate flaps in, amber and underlined with dots.
// A role saved before snapshots (entry.pending / entry.unavailable) has no details: no link, a
// line saying so, and Remove.

import { memo, useCallback, useRef } from 'react';
import FlapText from '../components/kit/FlapText';
import { useOnScreen } from '../components/jobs/useOnScreen';
import { usePredictedPay } from '../components/jobs/usePredictedPay';
import { PAY_TILES, payCell } from '../../lib/departures/jobRows';

export const STATUS_TILES = 9; // CANCELLED
const STAGGER_MS = 70;
const NO_CODE = '---';

// A role saved before snapshots: being looked up, its lookup failed (asked again next visit),
// or not found.
const NO_DETAILS = {
  looking: { role: 'Looking up this role…', where: 'Saved before the board kept details' },
  later: { role: 'Details unavailable right now', where: 'We will look it up again next visit' },
  gone: { role: 'Details unavailable', where: 'Couldn\'t find its details' },
};

function payLabel(row, predicted, state) {
  if (row.pay) return row.pay;
  if (predicted) return `${predicted}, estimated by our salary model`;
  return state === 'unavailable' ? 'Pay estimate unavailable' : 'Pay not listed';
}

/**
 * entry: the saved entry (lib/departures/savedStore.js). row: jobRow(entry) for a role with
 * details, else null. looking: its id is being looked up right now. stage: null | 'cancelled' | 'gone'.
 * position: 1-based position (for no-details rows' aria-labels). buttonRef(id, el): the board keeps the Remove buttons, to move focus after a removal.
 */
function ItineraryRow({ entry, row, href, index, stage, looking, position, onOpen, onRemove, buttonRef }) {
  const ref = useRef(null);
  const { on, first } = useOnScreen(ref);
  const { pay: predicted, state } = usePredictedPay(row?.ask ?? null, { visible: on && !stage });
  const arrive = first === true;
  // The arrival (and an estimate landing later, as on /jobs) ripples down the board; CANCELLED
  // flaps at once on the row that was removed.
  const delayMs = stage ? 0 : Math.min(index, 10) * STAGGER_MS;
  const flap = (text) => ({ text, play: on, from: arrive ? '' : text, delayMs });
  const id = entry.id;
  const setButton = useCallback((el) => buttonRef(id, el), [buttonRef, id]);

  const status = stage ? 'CANCELLED' : row?.status ?? '';
  const name = row?.role || 'this saved role';
  const removeLabel = row
    ? `Remove ${name} from your itinerary`
    : `Remove the saved role in row ${position} (details unavailable) from your itinerary`;
  const statusCell = (
    <span className="it-status">
      <FlapText {...flap(status)} width={STATUS_TILES} status />
    </span>
  );

  let main;
  if (row) {
    const cell = payCell(row.pay, predicted);
    let pay;
    if (cell.text && !cell.estimate) pay = <FlapText {...flap(cell.text)} width={PAY_TILES} />;
    else if (cell.estimate) pay = <FlapText text={cell.text} from="" play={on} delayMs={delayMs} width={PAY_TILES} />;
    else pay = <span className="it-paynote">{state === 'unavailable' ? 'Pay estimate unavailable' : 'Pay not listed'}</span>;

    const label = [
      `${row.role}, ${row.where || row.code}`,
      `Code ${row.code}`,
      `Pay: ${payLabel(row, predicted, state)}`,
      stage ? 'Cancelled' : row.status,
    ]
      .filter(Boolean)
      .join('. ');

    const click = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      if (!stage) onOpen(id, e.currentTarget);
    };

    main = (
      <a
        className="it-link"
        href={href}
        onClick={click}
        aria-label={label}
        aria-disabled={stage ? 'true' : undefined}
        tabIndex={stage ? -1 : undefined}
        data-job={id}
      >
        <span className="it-code">
          <FlapText {...flap(row.code)} width={3} />
        </span>
        <span className="it-role" title={row.role}>
          {row.role}
        </span>
        <span className="it-where" title={row.where}>
          {row.where}
        </span>
        <span className="it-meta">
          <span
            className="it-pay"
            data-est={cell.estimate ? '' : undefined}
            title={cell.estimate ? 'Estimated by our salary model' : undefined}
          >
            {pay}
          </span>
          {statusCell}
        </span>
      </a>
    );
  } else {
    const nolink = NO_DETAILS[looking ? 'looking' : entry.pending ? 'later' : 'gone'];
    main = (
      <div className="it-link it-nolink" data-job={id}>
        <span className="it-code">
          <FlapText {...flap(NO_CODE)} width={3} />
        </span>
        <span className="it-role">{nolink.role}</span>
        <span className="it-where">{nolink.where}</span>
        <span className="it-meta">
          <span className="it-pay" />
          {statusCell}
        </span>
      </div>
    );
  }

  return (
    <li ref={ref} className="it" data-stage={stage || undefined}>
      {main}
      <button
        ref={setButton}
        type="button"
        className="it-x"
        aria-label={removeLabel}
        aria-disabled={stage ? 'true' : undefined}
        onClick={() => {
          if (!stage) onRemove(id);
        }}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
        <span className="it-x-t">Remove</span>
      </button>
    </li>
  );
}

export default memo(ItineraryRow);
