'use client';

// A country's ARRIVALS mini-board on /map (spec §8): the roles landing in it on this search, as
// a split-flap board (FlapBoard: a real table, every cell's text readable; the tiles clack in
// once as it opens, reduced motion: the text is simply there). In the kit Dialog: focus trap,
// Esc, the page behind still, focus back to whatever opened it.
//
//   [B] ARRIVALS                                   ✕
//   Canada
//   Roles landing in Canada on this search. Pick one to open its gate.
//   ARRIVALS · CANADA
//   LOCAL  CITY  ROLE                 PAY            STATUS
//   08:40  YYZ   Software Engineer    C$88K–102K     ON TIME
//   …
//   [Show on the map]  [More on the board →]
//
// A row is a link to the role on /jobs (a new tab works); a plain click opens its gate here,
// over this board, and closing the gate comes back to the row.
//
// rows: lib/departures/mapData.js countryArrivals; hrefFor(id) -> the row's link; moreHref ->
// the board for this search; onOpenJob(id, rowLink); onShowOnMap (null: the map is not up).

import { useId } from 'react';
import Dialog from '../kit/Dialog';
import FlapBoard from '../kit/FlapBoard';
import GateSign from '../kit/GateSign';
import { ARRIVALS_COLUMNS } from '../../../lib/departures/mapData';
import './map.css';

export default function ArrivalsBoard({ name, rows, hrefFor, moreHref, onOpenJob, onShowOnMap, onClose, returnFocusRef }) {
  const titleId = useId();
  const board = rows.map((r) => ({ ...r, href: hrefFor(r.id) }));
  const ids = new Map(board.map((r) => [r.href, r.id]));

  // A plain click on a row opens its gate here; a modified click (new tab) follows the link. In
  // the capture phase, so the row's own Link (which skips a click already prevented) never navigates.
  const click = (e) => {
    const link = e.target instanceof Element ? e.target.closest('a.fb-link') : null;
    if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const id = ids.get(link.getAttribute('href'));
    if (!id) return;
    e.preventDefault();
    onOpenJob(id, link);
  };

  return (
    <Dialog open onClose={onClose} labelledBy={titleId} className="arr" returnFocusRef={returnFocusRef}>
      <header className="arr-head">
        <div className="arr-top">
          <GateSign letter="B" label="Arrivals" />
          <button type="button" className="arr-x" onClick={onClose} aria-label="Close">
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <h2 id={titleId} className="arr-title">
          <span className="sr-only">Arrivals: </span>
          {name}
        </h2>
        <p className="arr-sub">Roles landing in {name} on this search. Pick one to open its gate.</p>
      </header>

      {/* The board's own rows are links; this only catches their plain clicks, first. */}
      {board.length ? (
        <div className="arr-board" onClickCapture={click}>
          <FlapBoard caption={`ARRIVALS · ${name.toUpperCase()}`} columns={ARRIVALS_COLUMNS} rows={board} />
        </div>
      ) : (
        <p className="arr-none">No roles to show for {name} on this search. The board has more.</p>
      )}

      <div className="arr-ctas">
        {onShowOnMap && (
          <button type="button" className="mt-btn" onClick={onShowOnMap}>
            Show on the map
          </button>
        )}
        <a className="mt-link" href={moreHref}>
          More on the board <span aria-hidden="true">→</span>
        </a>
      </div>
    </Dialog>
  );
}
