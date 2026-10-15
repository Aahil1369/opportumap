// The homepage boards' layout and their LOCAL clock (app/components/home/HomeBoard.js), kept pure
// and light: no city table, so nothing here adds to the homepage's first load.
//
//   LAYOUT / FOUNDER_LAYOUT   tiles per column (beat 1's board, beat 5's arrivals board)
//   PLATE_TILES, plateText    beat 2's pay plate: our model's pay with its PREDICTED label
//   clockIn(tz, now)          "HH:MM" in a time zone
//   retime(row, now)          a board row with LOCAL on the visitor's clock
import { PAY_WIDTH } from './pay.js';

// Tiles per column. PAY holds every pay localPay writes (PAY_WIDTH, 13). Phones fold PAY and
// STATUS under ROLE: line 1 is LOCAL · TO · ROLE (27 tiles), line 2 keeps LOCAL and TO's tracks
// and adds PAY · STATUS (29); FlapBoard sizes the tiles so the wider line fits.
export const LAYOUT = {
  time: { width: 5 },
  code: { width: 3, tone: 'sign' },
  role: { width: 19 },
  pay: { width: PAY_WIDTH, line: 2 },
  status: { width: 8, tone: 'status', line: 2 },
};

// Beat 5: the route is the widest cell (29 tiles), on a line of its own on phones; no PAY.
export const FOUNDER_LAYOUT = {
  time: { width: 5, line: 2 },
  code: { width: 3, tone: 'sign', line: 2 },
  role: { width: 29 },
  status: { width: 9, tone: 'status', line: 2 },
};

/** Board columns with this layout's widths (columns the layout leaves out are dropped). */
export const withLayout = (columns, layout) => columns.filter((c) => layout[c.key]).map((c) => ({ ...c, ...layout[c.key] }));

// Beat 2's plate: the honest label is part of the text and is never cut, whatever the pay
// ("CHF 120K–150K · PREDICTED" is 25 tiles). home.css sizes .pb-pay from this count.
export const PREDICTED = ' · PREDICTED';
export const PLATE_TILES = PAY_WIDTH + Array.from(PREDICTED).length;

/** The plate's text: our model's pay, labelled a prediction. */
export const plateText = (pay) => `${pay}${PREDICTED}`;

const clocks = new Map();

/** "HH:MM" in a time zone (24 h), or null when the engine does not know the zone. */
export function clockIn(tz, now) {
  if (typeof tz !== 'string' || !tz || !(now instanceof Date) || Number.isNaN(now.getTime())) return null;
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

/**
 * The row with LOCAL on `now` in the row's own zone (row.tz). With no `now` (the server, and
 * hydration) or no known zone (the founder's NOW) the row is returned as it is.
 */
export function retime(row, now) {
  const time = now && row?.tz ? clockIn(row.tz, now) : null;
  return time && time !== row.cells?.time ? { ...row, cells: { ...row.cells, time } } : row;
}
