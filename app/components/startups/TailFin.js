// A startup's tail fin, painted from its name (lib/departures/tailFin.js): the fin in its hue,
// 1–3 cheat-line stripes, a rudder line and the name's first letter on a black roundel. Purely
// decorative (aria-hidden): the name is always in the text next to it.
//
//   <TailFin name="NeuralHire" size={72} />
//   <TailFin vacant />            an empty stand: the outline only (dashed), or drawn once with
//   <TailFin vacant draw />       a short stroke-dashoffset when `draw` (startups.css, .tf-draw)
//
// No hooks: server pages can render it.

import { FIN_ROUNDEL, FIN_VIEWBOX, finPalette, finShape, finStripes, tailFin } from '../../../lib/departures/tailFin.js';
import './startups.css';

// The rudder hinge, 8 units in from the trailing edge (52,6) → (58,60).
const RUDDER = 'M44.2 8 L49.8 58';

export default function TailFin({ name, size = 64, vacant = false, draw = false, className }) {
  const cls = ['tf', vacant && 'tf-vacant', draw && 'tf-draw', className].filter(Boolean).join(' ');
  if (vacant) {
    return (
      <svg className={cls} viewBox={FIN_VIEWBOX} width={size} height={size} aria-hidden="true" focusable="false">
        <path className="tf-outline" d={finShape()} pathLength={draw ? 1 : undefined} />
      </svg>
    );
  }
  const fin = tailFin(name);
  const p = finPalette(fin.hue);
  const { cx, cy, r } = FIN_ROUNDEL;
  return (
    <svg className={cls} viewBox={FIN_VIEWBOX} width={size} height={size} aria-hidden="true" focusable="false">
      <path d={finShape()} fill={p.body} />
      {finStripes(fin.stripes).map((points, i) => (
        <polygon key={i} points={points} fill={i % 2 ? p.ink : p.light} />
      ))}
      <path d={RUDDER} stroke="#0a0b0d" strokeOpacity="0.45" strokeWidth="0.9" fill="none" />
      <circle cx={cx} cy={cy} r={r} fill={p.roundel} />
      <text className="tf-letter" x={cx} y={cy} fill={p.light} textAnchor="middle" dominantBaseline="central">
        {fin.letter}
      </text>
    </svg>
  );
}
