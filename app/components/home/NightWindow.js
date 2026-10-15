// Beat 3, the window: the board gives way to a terminal window onto the world at night. Amber
// city lights at static positions (lib/departures/cityLights.js) are server-rendered as one SVG
// path; the routes (NightRoutes) draw out from a neutral default (Dubai, to the board's first
// cities) or, for a signed-in visitor with a profile, from their own country. The frame slides
// in and the arcs draw once, when the window scrolls into view (Beat + home.css).
import Beat from './Beat';
import NightRoutes from './NightRoutes';
import { NIGHT_VIEW, nightLights } from '../../../lib/departures/cityLights';

const DEFAULT_ORIGIN = 'ae'; // DXB: halfway between most of the board's cities
const BACKUP_DESTS = ['ca', 'gb', 'sg'];

export default function NightWindow({ rows }) {
  const { dots, hubs, points } = nightLights();
  const origin = hubs[DEFAULT_ORIGIN];
  // To the board's own cities first (their country's lit hub when the city has no light).
  const dests = [];
  for (const hub of [...rows.map((r) => points[r.cells.code] || hubs[r.iso2]), ...BACKUP_DESTS.map((c) => hubs[c])]) {
    if (dests.length < 3 && hub && hub[0] !== origin[0] && !dests.some((d) => d[0] === hub[0])) dests.push(hub);
  }

  return (
    <Beat as="section" className="hp-beat nw" aria-labelledby="nw-title">
      <div className="hp-copy">
        <p className="hp-kicker">THE VIEW FROM YOUR GATE</p>
        <h2 id="nw-title" className="hp-h2">
          The whole world, <em>lit up.</em>
        </h2>
        <p className="hp-text">
          Every light is a city where roles open up. Sign in and set up your profile, and the routes
          start from your country.
        </p>
      </div>
      <NightRoutes hubs={hubs} origin={origin} dests={dests} w={NIGHT_VIEW.w} h={NIGHT_VIEW.h}>
        <svg className="nw-lights" viewBox={`0 0 ${NIGHT_VIEW.w} ${NIGHT_VIEW.h}`} aria-hidden="true">
          <path className="nw-glow" d={dots} />
          <path className="nw-dots" d={dots} />
        </svg>
      </NightRoutes>
    </Beat>
  );
}
