// The simulator's altimeter: how much of the mock run is done (0–100), as a dial. The needle
// turns by transform and the lit arc grows by a short stroke-dashoffset; both ease to the new
// reading (instantly under reduced motion, interview.css). At 100 the arc turns --ok.
//
// It is a real progressbar (role, value, value text); the dial itself is aria-hidden.
// No hooks: it only renders what it is given.
//
//   <Altimeter value={interviewProgress(done, total)} valueText="40% — 6 of 15 done" />

const C = 60; // the dial's centre, in a 120 × 120 viewBox
const SWEEP = 270; // 0 sits at -135° from twelve o'clock, 100 at +135°
const ARC_R = 41;

const clamp = (v) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
};
const angleFor = (v) => -SWEEP / 2 + (v * SWEEP) / 100;
const round2 = (n) => Math.round(n * 100) / 100;
function polar(r, deg) {
  const a = (deg * Math.PI) / 180;
  return [round2(C + r * Math.sin(a)), round2(C - r * Math.cos(a))];
}

const [SX, SY] = polar(ARC_R, angleFor(0));
const [EX, EY] = polar(ARC_R, angleFor(100));
const ARC = `M ${SX} ${SY} A ${ARC_R} ${ARC_R} 0 1 1 ${EX} ${EY}`;
const TICKS = Array.from({ length: 21 }, (_, i) => {
  const major = i % 2 === 0;
  const [x1, y1] = polar(major ? 46 : 48.5, angleFor(i * 5));
  const [x2, y2] = polar(53, angleFor(i * 5));
  return { x1, y1, x2, y2, major };
});

export default function Altimeter({ value, valueText, label = 'Simulator progress', className }) {
  const v = clamp(value);
  return (
    <div
      className={className ? `alt ${className}` : 'alt'}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      aria-valuetext={valueText || `${v}%`}
      data-full={v >= 100 ? '' : undefined}
    >
      <svg className="alt-face" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
        <circle className="alt-bezel" cx={C} cy={C} r="58" />
        <circle className="alt-dial" cx={C} cy={C} r="55" />
        {TICKS.map((t, i) => (
          <line key={i} className={t.major ? 'alt-tick alt-tick-major' : 'alt-tick'} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
        ))}
        <path className="alt-track" d={ARC} pathLength="100" />
        <path className="alt-arc" d={ARC} pathLength="100" style={{ strokeDashoffset: 100 - v }} />
      </svg>
      <span className="alt-k" aria-hidden="true">
        ALT
      </span>
      <span className="alt-needle" style={{ transform: `rotate(${angleFor(v)}deg)` }} aria-hidden="true" />
      <span className="alt-hub" aria-hidden="true" />
      <span className="alt-read" aria-hidden="true">
        {v}
        <span className="alt-pct">%</span>
      </span>
    </div>
  );
}
