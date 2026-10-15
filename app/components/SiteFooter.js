// The hall's footer, on every page (app/layout.js renders it once, after the page): every place
// as its gate sign (spec §4, the same letters as the night navbar), Passport Control → Migrova
// (the one cross-link to visas), the information desk, and one honest line. A server component
// that adds nothing to any page's first load: plain links (no prefetching below the fold, and no
// next/link or kit GateSign import, which would put their client code in the root layout's
// chunks), the sign markup is kit.css's .gs, and footer.css is bundled into globals.css, so no
// stylesheet request is added either.
import './kit/kit.css';

/** A gate sign as kit/GateSign.js draws it (the letter chip, then the label), as plain markup. */
function Sign({ letter, label }) {
  return (
    <span className="gs" data-letterless={letter ? undefined : ''}>
      {letter && (
        <span className="gs-l">
          <span className="sr-only">Gate </span>
          {letter}
        </span>
      )}
      <span className="gs-t">{label}</span>
    </span>
  );
}

const GATES = [
  { href: '/jobs', letter: 'A', label: 'Jobs', sub: 'The departures board' },
  { href: '/map', letter: 'B', label: 'Map', sub: 'Control tower' },
  { href: '/resume', letter: 'C', label: 'Security', sub: 'Resume grader' },
  { href: '/interview', letter: 'D', label: 'Simulator', sub: 'Interview prep' },
  { href: '/startups', letter: 'E', label: 'Hangar', sub: 'Startups' },
  { href: '/cover-letter', letter: 'F', label: 'Airmail', sub: 'Cover letter' },
  { href: '/community', label: 'Lounge', sub: 'Community' },
  { href: '/saved', label: 'Itinerary', sub: 'Saved roles' },
];

export default function SiteFooter() {
  return (
    <footer className="sf">
      <div className="sf-in">
        <nav className="sf-nav" aria-label="Gates">
          <p className="sf-kicker" aria-hidden="true">
            ALL GATES
          </p>
          <ul className="sf-gates">
            {GATES.map((g) => (
              <li key={g.href}>
                <a href={g.href} className="sf-gate">
                  <Sign letter={g.letter} label={g.label} />
                  <span className="sf-sub">{g.sub}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sf-desks">
          <a href="https://migrova.netlify.app" target="_blank" rel="noopener noreferrer" className="sf-desk">
            <span className="sf-desk-t">
              <span aria-hidden="true">🛂 </span>PASSPORT CONTROL → Migrova
            </span>
            <span className="sf-sub">
              Visas and moving abroad, on our sibling site<span className="sr-only"> (opens in a new tab)</span>
            </span>
          </a>
          <a href="/contact" className="sf-desk">
            <span className="sf-desk-t">
              <span className="sf-i" aria-hidden="true">
                i
              </span>
              INFORMATION DESK
            </span>
            <span className="sf-sub">Questions, ideas, a bug: straight to the founder</span>
          </a>
        </div>

        <p className="sf-legal">OpportuMap · general information, not career or immigration advice.</p>
      </div>
    </footer>
  );
}
