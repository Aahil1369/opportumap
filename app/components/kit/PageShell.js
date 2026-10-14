// A page in the terminal hall: the black hall header (gate sign, the headline with its one yellow
// word, a sub line) and then the page's content, both on --hall. 880px wide, 1120px when `wide`.
// It is the page's <main>; render <Navbar /> above it.
//
//   <PageShell sign={{ letter: 'A', label: 'Jobs' }} title="Where to" accent="next?"
//              sub="Every row is a real role. Tap one to board.">…</PageShell>
//
// No hooks: server pages can render it.

import GateSign from './GateSign';
import './kit.css';

export default function PageShell({ sign, title, accent, sub, children, wide = false, className, id }) {
  return (
    <main id={id} className={className ? `ps ${className}` : 'ps'} data-wide={wide ? '' : undefined}>
      <header className="ps-head">
        {sign && <GateSign letter={sign.letter} label={sign.label} />}
        <h1 className="ps-title">
          {title}
          {title && accent ? ' ' : null}
          {accent && <em className="ps-accent">{accent}</em>}
        </h1>
        {sub && <p className="ps-sub">{sub}</p>}
      </header>
      <div className="ps-body">{children}</div>
    </main>
  );
}
