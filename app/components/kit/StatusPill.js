// A board status as a pill. The word is always the text (colour only repeats it): BOARDING --ok,
// NEW --new, ON TIME / ANY GATE --info, CANCELLED --warn, anything else --ink-dim (kit.css).
// No hooks: server pages can render it.

import './kit.css';

export default function StatusPill({ status, className }) {
  const word = String(status ?? '').trim().toUpperCase();
  if (!word) return null;
  return (
    <span className={className ? `sp ${className}` : 'sp'} data-status={word}>
      {word}
    </span>
  );
}
