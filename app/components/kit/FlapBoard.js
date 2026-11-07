// A departures board: table semantics (role="table", real header + cell text) with every cell a
// FlapText. Columns are fixed tile counts, so rows never grow wider than the board and a long
// title is cut on '…' (the full text stays in the accessible cell). Rows ripple 120 ms apart;
// FlapText's engine caps how many tiles flip at once. Its only hook is useId (allowed in server
// components), so a server page can render a board directly; only the FlapText cells hydrate.
//
// columns: [{ key, label, width, tone?: 'status' | 'sign' | 'dim', line?: 2 }]
//   width: tiles in the column. tone 'status' colours by the status word (BOARDING, NEW, ...).
//   line 2: on phones the column drops to a second line, under the last line-1 column.
// rows:    [{ id, cells: { [key]: string }, href?, spoken?, tone?, play? }]
//   tone: a data-tone on the row, for page styles; play: this row's own play (default the board's).
//   spoken: { [key]: string }, words for a cell in the row link's name when its tiles say less
//   ("Pay not listed" for a PAY cell that reads NOT LISTED).

import Link from 'next/link';
import { useId } from 'react';
import FlapText from './FlapText';
import './kit.css';

const ROW_STAGGER_MS = 120;
// Tile geometry (kit.css): 0.6em + 2.5px wide, 1px apart; columns 12px apart (6px on phones).
const ADVANCE = 0.6;
const TILE_PAD = 2.5;
const TILE_GAP = 1;
const GAP = 12;
const PHONE_GAP = 6;
const MAX_FS = 24; // px: tiles stop growing at ~17px wide
const PHONE_MAX_FS = 17;

const tilesOf = (c) => Math.max(1, Math.floor(c.width) || 1);
const round = (x) => Math.round(x * 1000) / 1000;
const track = (w) => `calc(${round(ADVANCE * w)} * var(--flap-fs) + ${round((TILE_PAD + TILE_GAP) * w - TILE_GAP)}px)`;

/** The largest font size at which every line of columns fits the board's width (100cqi). */
function fontSize(lines, gap, max) {
  const fits = lines
    .filter((widths) => widths.length)
    .map((widths) => {
      const tiles = widths.reduce((s, w) => s + w, 0);
      const px = (TILE_PAD + TILE_GAP) * tiles - TILE_GAP * widths.length + gap * (widths.length - 1);
      return `(100cqi - ${round(px)}px) / ${round(ADVANCE * tiles)}`;
    });
  return `min(${max}px, ${fits.join(', ')})`;
}

function boardLayout(columns) {
  const widths = columns.map(tilesOf);
  const layout = { cols: widths.map(track).join(' '), fs: fontSize([widths], GAP, MAX_FS), phone: null };
  const one = [];
  const two = [];
  columns.forEach((c, i) => (c.line === 2 ? two : one).push(i));
  if (!one.length || !two.length) return layout;

  // Phone grid: line-1 columns before the last one keep their tracks; the line-2 columns get one
  // track each after them, and the last line-1 column spans those tracks on the first line.
  const lead = one.slice(0, -1);
  const tracks = [...lead, ...two].map((i) => track(widths[i]));
  tracks[tracks.length - 1] = `minmax(${tracks[tracks.length - 1]}, 1fr)`;
  const place = {};
  lead.forEach((i, k) => (place[columns[i].key] = { r: 1, c: `${k + 1}` }));
  place[columns[one.at(-1)].key] = { r: 1, c: `${lead.length + 1} / -1` };
  two.forEach((i, k) => (place[columns[i].key] = { r: 2, c: `${lead.length + 1 + k}` }));
  const w = (ids) => ids.map((i) => widths[i]);
  layout.phone = {
    cols: tracks.join(' '),
    fs: fontSize([w(one), w([...lead, ...two])], PHONE_GAP, PHONE_MAX_FS),
    place,
  };
  return layout;
}

export default function FlapBoard({ columns, rows, play = true, caption, id, className }) {
  const layout = boardLayout(columns);
  const autoId = useId(); // unique per board, even when two boards share a caption
  const captionId = caption ? id || autoId : undefined;
  const tableStyle = {
    '--fb-cols': layout.cols,
    '--fb-fs': layout.fs,
    ...(layout.phone && { '--fb-pcols': layout.phone.cols, '--fb-pfs': layout.phone.fs }),
  };
  const cellStyle = (key) => {
    const p = layout.phone?.place[key];
    return p ? { '--pr': p.r, '--pc': p.c } : undefined;
  };

  return (
    <div className={className ? `fb ${className}` : 'fb'}>
      {caption && (
        <div className="fb-caption" id={captionId}>
          {caption}
        </div>
      )}
      <div
        className="fb-table"
        role="table"
        aria-labelledby={captionId}
        data-phone={layout.phone ? '' : undefined}
        style={tableStyle}
      >
        <div className="fb-head" role="rowgroup">
          <div className="fb-row" role="row">
            {columns.map((c) => (
              <span key={c.key} className="fb-cell fb-th" role="columnheader" style={cellStyle(c.key)}>
                {c.label}
              </span>
            ))}
          </div>
        </div>
        <div className="fb-body" role="rowgroup">
          {rows.map((row, r) => (
            <div key={row.id} className="fb-row" role="row" data-tone={row.tone}>
              {columns.map((c, i) => {
                const value = row.cells?.[c.key] ?? '';
                return (
                  <span
                    key={c.key}
                    className="fb-cell"
                    role="cell"
                    data-tone={c.tone && c.tone !== 'status' ? c.tone : undefined}
                    style={cellStyle(c.key)}
                  >
                    {i === 0 && row.href && (
                      <Link
                        className="fb-link"
                        href={row.href}
                        aria-label={columns.map((col) => row.spoken?.[col.key] ?? row.cells?.[col.key]).filter(Boolean).join(' · ')}
                      />
                    )}
                    <FlapText
                      text={value}
                      width={tilesOf(c)}
                      play={row.play ?? play}
                      delayMs={r * ROW_STAGGER_MS}
                      status={c.tone === 'status'}
                    />
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
