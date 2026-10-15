// Beat 4, the gates: every tool is a place in the terminal (spec §4). Six yellow gate signs, each
// a link with the plain name of the tool beside it, slide in one after another (transform only)
// when the walk scrolls into view (Beat + home.css). Server-rendered; no JS of its own.
import Link from 'next/link';
import GateSign from '../kit/GateSign';
import Beat from './Beat';

export const GATES = [
  { letter: 'A', label: 'Jobs', href: '/jobs', what: 'The board: search roles by city, code or title.' },
  { letter: 'B', label: 'Map', href: '/map', what: 'The control tower: roles on a map of the world.' },
  { letter: 'C', label: 'Security', href: '/resume', what: 'Your resume, scanned and graded honestly.' },
  { letter: 'D', label: 'Simulator', href: '/interview', what: 'Interview practice, question by question.' },
  { letter: 'E', label: 'Hangar', href: '/startups', what: 'Early-stage startups and the people behind them.' },
  { letter: 'F', label: 'Airmail', href: '/cover-letter', what: 'A cover letter written for the role.' },
];

export default function GateWalk() {
  return (
    <Beat as="section" className="hp-beat gw" aria-labelledby="gw-title">
      <div className="hp-copy">
        <p className="hp-kicker">GATES A–F</p>
        <h2 id="gw-title" className="hp-h2">
          Every tool is a <em>gate.</em>
        </h2>
        <p className="hp-text">Walk the terminal. Each sign is one step of the move, from the search to the letter.</p>
      </div>
      <ol className="gw-list">
        {GATES.map((g, i) => (
          <li key={g.letter} className="gw-item" style={{ '--i': i }}>
            <Link href={g.href} className="gw-link">
              <GateSign letter={g.letter} label={g.label} />
              <span className="gw-what">{g.what}</span>
              <span className="gw-go" aria-hidden="true">
                →
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Beat>
  );
}
