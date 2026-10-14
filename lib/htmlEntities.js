// Decode the HTML entities job feeds send (e.g. "Partners &amp; Logistics").
// Server-side only, one pass, fixed map: the result is plain text and every sink
// that shows job text renders it as text (React / textContent), never as HTML.
const NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '–', mdash: '—', hellip: '…', bull: '•', middot: '·',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  euro: '€', pound: '£', yen: '¥', cent: '¢', copy: '©', reg: '®', trade: '™',
};

const ENTITY = /&(#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6}|[a-zA-Z]{2,8});/g;

export function decodeEntities(text) {
  if (typeof text !== 'string' || !text.includes('&')) return text;
  return text.replace(ENTITY, (match, body) => {
    if (body[0] === '#') {
      const hex = body[1] === 'x' || body[1] === 'X';
      const cp = parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10);
      if (!(cp > 0 && cp <= 0x10ffff) || (cp >= 0xd800 && cp <= 0xdfff)) return match;
      return String.fromCodePoint(cp);
    }
    const v = NAMED[body.toLowerCase()];
    return v === undefined ? match : v;
  });
}
