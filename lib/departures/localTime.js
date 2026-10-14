// The LOCAL column: the clock in the job's country (its main city's time zone), 24 h "HH:MM".
import { cityIndex } from './cityCode.js';

const formats = new Map();
function formatFor(timeZone) {
  if (!formats.has(timeZone)) {
    let f;
    try {
      f = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    } catch {
      f = null; // an engine without this zone: fall back to UTC below
    }
    formats.set(timeZone, f);
  }
  return formats.get(timeZone);
}

/**
 * localTime('ca', now) -> '08:40' (Toronto). Unknown countries read UTC.
 * Optional `code` (a cityCode result, e.g. 'YVR') uses that city's own zone when it is in the
 * table; 'ANY' and unknown codes fall back to the country.
 */
export function localTime(iso2, now = new Date(), code) {
  const { main, tzByCode } = cityIndex();
  const country = typeof iso2 === 'string' ? iso2.trim().toLowerCase() : '';
  let date = now instanceof Date ? now : new Date(now ?? Date.now());
  if (Number.isNaN(date.getTime())) date = new Date();
  const zone = (code && tzByCode.get(String(code).toUpperCase())) || main.get(country)?.[4] || 'UTC';
  const f = formatFor(zone) || formatFor('UTC');
  const parts = f.formatToParts(date);
  const hh = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const mm = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}`;
}
