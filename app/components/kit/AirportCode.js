// A three-letter city code (YYZ, BER, ANY) on one dark board tile, in sign yellow. cityCode()
// always gives three capitals; anything else is cut or padded so the tile keeps its width.
// No hooks: server pages can render it.

import './kit.css';

export default function AirportCode({ code, className, title }) {
  const letters = String(code ?? '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  return (
    <span className={className ? `ac ${className}` : 'ac'} title={title}>
      {letters.padEnd(3, '·')}
    </span>
  );
}
