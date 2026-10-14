'use client';

// The client half of /lab/kit: a board that plays once when scrolled into view (SignatureMoment),
// the board glyphs as plain mono text and as tiles, and a Dialog.

import { useRef, useState } from 'react';
import FlapBoard from '../../components/kit/FlapBoard';
import SignatureMoment from '../../components/kit/SignatureMoment';
import Dialog from '../../components/kit/Dialog';
import StatusPill from '../../components/kit/StatusPill';
import AirportCode from '../../components/kit/AirportCode';

const COLUMNS = [
  { key: 'local', label: 'LOCAL', width: 5 },
  { key: 'route', label: 'ROUTE', width: 29 },
  { key: 'pay', label: 'PAY', width: 9, line: 2 },
  { key: 'status', label: 'STATUS', width: 9, tone: 'status', line: 2 },
];

const ROWS = [
  { id: 'r1', cells: { local: '18:10', route: 'LHE → BLR · DATA SCIENTIST', pay: '₹18L–26L', status: 'NEW' } },
  { id: 'r2', cells: { local: '21:44', route: 'GIL → ICN · GAME DEVELOPER', pay: '₩55M–70M', status: 'ON TIME' } },
  { id: 'r3', cells: { local: 'NOW', route: 'GIL → EBB → DFW · FOUNDER, 16', pay: '', status: 'ARRIVED ✓' } },
];

const label = 'font-mono text-[11px] font-medium tracking-[0.22em] text-sign';

export default function KitLab() {
  const [open, setOpen] = useState(false);
  const [plays, setPlays] = useState(0);
  const opener = useRef(null);

  return (
    <>
      <section aria-labelledby="k-glyphs" className="mt-10 space-y-3">
        <h2 id="k-glyphs" className={label}>BOARD GLYPHS</h2>
        <p id="k-plain" className="font-mono text-[18px] font-medium text-ink">GIL → EBB → DFW · FOUNDER, 16 · ARRIVED ✓</p>
        <p id="k-plain-pay" className="font-mono text-[18px] font-medium text-ink-dim">₹18L–26L · ₩55M–70M · ← → ↗ ↘ ✕</p>
      </section>

      <div aria-hidden="true" className="h-[70svh]" />

      <section aria-labelledby="k-board" className="space-y-3">
        <h2 id="k-board" className={label}>A BOARD THAT PLAYS ONCE IN VIEW · PLAYED {plays}×</h2>
        <SignatureMoment playWhen="inView" onPlay={() => setPlays((n) => n + 1)} data-testid="moment">
          {({ play }) => <FlapBoard columns={COLUMNS} rows={ROWS} play={play} caption="DEPARTURES · SAMPLE" />}
        </SignatureMoment>
      </section>

      <section aria-labelledby="k-dialog" className="mt-10 space-y-3">
        <h2 id="k-dialog" className={label}>DIALOG</h2>
        <button
          ref={opener}
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center min-h-[48px] px-5 rounded-[10px] bg-sign text-sign-ink font-sans text-[16px] font-bold"
        >
          Open gate A12
        </button>
      </section>

      <Dialog open={open} onClose={() => setOpen(false)} labelledBy="k-dlg-title" returnFocusRef={opener}>
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] tracking-[0.16em] text-ink-sub">OM 4127 · YYZ · TORONTO</p>
              <h3 id="k-dlg-title" className="mt-2 font-sans text-[22px] font-extrabold">Software Engineer</h3>
            </div>
            <AirportCode code="YYZ" />
          </div>
          <StatusPill status="BOARDING" />
          <p className="text-[16px] leading-[1.5] text-ink-dim">
            A sample gate. Tab and Shift+Tab stay inside; Esc or the backdrop closes it and focus returns to the button.
          </p>
          <label className="block">
            <span className="font-mono text-[11px] tracking-[0.16em] text-ink-sub">NOTE</span>
            <input className="mt-1 w-full rounded-[8px] bg-hall-3 border border-rule px-3 py-2.5 text-[16px] text-ink" placeholder="Type here" />
          </label>
          <div aria-hidden="true" className="h-[90svh] rounded-[8px] border border-dashed border-rule" />
          <div className="flex gap-2">
            <a href="#k-dialog" className="flex-1 text-center min-h-[48px] leading-[48px] rounded-[10px] bg-sign text-sign-ink font-bold">
              Board this role →
            </a>
            <button type="button" onClick={() => setOpen(false)} className="flex-1 min-h-[48px] rounded-[10px] ring-1 ring-inset ring-rule text-ink">
              Close
            </button>
          </div>
        </div>
      </Dialog>

      <div aria-hidden="true" className="h-[60svh]" />
    </>
  );
}
