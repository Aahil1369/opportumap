// One startup on its stand in the hangar: the tail fin rising from the stand's floor, the name,
// the tagline, stage / sector / base, the raise and its passengers. The whole card is the link
// to the startup's stand. `rise` plays the fin's one-time roll-in (startups.css, .hg-rise),
// `k` staggers it. No hooks.

import Link from 'next/link';
import TailFin from './TailFin';
import { STAGES, formatRaise, passengerLabel, standFor } from '../../../lib/departures/hangar.js';

const stageLabel = (v) => STAGES.find((s) => s.value === v)?.label ?? String(v ?? '').toUpperCase();

export default function StandCard({ startup: s, rise = false, k = 0 }) {
  const raise = formatRaise(s.raise_amount);
  const equity = Number(s.equity_offered) > 0 ? ` · ${s.equity_offered}%` : '';
  const tags = [s.stage && stageLabel(s.stage), s.sector && String(s.sector).toUpperCase(), s.location && String(s.location).toUpperCase()].filter(Boolean);
  return (
    <li className="hg-stand" data-rise={rise ? '' : undefined} style={rise ? { '--k': k } : undefined}>
      <Link href={`/startups/${s.id}`} className="hg-card">
        <div className="hg-bay" aria-hidden="true">
          <span className="hg-bay-no">STAND {standFor(s.id)}</span>
          <TailFin name={s.name} size={88} className="hg-fin" />
        </div>
        <div className="hg-card-body">
          <h3 className="hg-name">{s.name}</h3>
          {s.tagline && <p className="hg-tagline">{s.tagline}</p>}
          {tags.length > 0 && (
            <ul className="hg-tags" aria-label="Stage, sector and base">
              {tags.map((t, i) => (
                <li key={`${i}-${t}`}>{t}</li>
              ))}
            </ul>
          )}
          <p className="hg-card-foot">
            <span className={raise ? 'hg-raise' : 'hg-raise hg-raise-none'}>{raise ? `RAISING ${raise}${equity}` : 'RAISE NOT DISCLOSED'}</span>
            <span className="hg-pax">{passengerLabel(s.upvote_count).toUpperCase()}</span>
          </p>
        </div>
      </Link>
    </li>
  );
}
