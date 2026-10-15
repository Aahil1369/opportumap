'use client';

// The runway under the gate's pay (spec §7): a row of lights over the city's range for this kind
// of role (low–high), the lights inside this role's pay (min–max) lit. The lit lights come on one
// after another, once, by opacity only (gate.css); under reduced motion they are simply on.
// The lights are aria-hidden; a sentence says the same for screen readers. Any value missing or
// nonsense: nothing at all (lib/departures/gateInfo.js runwayLights).
//
//   <RunwayRange min={88000} max={102000} low={60000} high={140000}
//                lowText="C$60K" highText="C$140K" caption="Toronto range" delayMs={500} />

import { runwayLights } from '../../../lib/departures/gateInfo';

const LIGHTS = 12;
const STEP_MS = 70;

export default function RunwayRange({ min, max, low, high, lowText, highText, caption = 'City range', delayMs = 0 }) {
  const lit = runwayLights({ min, max, low, high }, LIGHTS);
  if (!lit) return null;
  const order = [];
  lit.forEach((on, i) => on && order.push(i));
  return (
    <div className="rw">
      <div className="rw-lights" aria-hidden="true" style={{ '--n': LIGHTS }}>
        {lit.map((on, i) => (
          <span key={i} className="rw-l">
            {on && <span className="rw-on" style={{ animationDelay: `${delayMs + order.indexOf(i) * STEP_MS}ms` }} />}
          </span>
        ))}
      </div>
      <p className="rw-labels" aria-hidden="true">
        <span>{lowText}</span>
        <span className="rw-cap">{caption}</span>
        <span>{highText}</span>
      </p>
      <p className="sr-only">
        {caption} for this kind of role: {lowText} to {highText}.
      </p>
    </div>
  );
}
