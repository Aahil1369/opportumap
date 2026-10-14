// A yellow gate sign (spec §4): the gate letter on a black chip, then the label in mono capitals.
// A link when `href` is given (http(s) URLs get a plain <a>; pass target/rel through). Places
// without a gate letter (Lounge, Itinerary, Crew, Passport Control) leave `letter` out.
//
//   <GateSign letter="A" label="Jobs" href="/jobs" />   ->  [A] JOBS
//
// No hooks: server pages can render it.

import Link from 'next/link';
import './kit.css';

export default function GateSign({ letter, label, href, className, ...rest }) {
  const cls = className ? `gs ${className}` : 'gs';
  const letterless = letter ? undefined : '';
  const body = (
    <>
      {letter && (
        <span className="gs-l">
          <span className="sr-only">Gate </span>
          {letter}
        </span>
      )}
      <span className="gs-t">{label}</span>
    </>
  );
  if (!href) {
    return (
      <span className={cls} data-letterless={letterless} {...rest}>
        {body}
      </span>
    );
  }
  if (/^https?:\/\//i.test(href)) {
    return (
      <a className={cls} data-letterless={letterless} href={href} {...rest}>
        {body}
      </a>
    );
  }
  return (
    <Link className={cls} data-letterless={letterless} href={href} {...rest}>
      {body}
    </Link>
  );
}
