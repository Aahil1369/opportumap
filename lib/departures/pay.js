// Pay as the board shows it: a compact range in the job's own currency ("C$88K–102K").
// The old feed formatted every salary with "$", so a Toronto role read like US dollars.

/** Currency of each Adzuna country (Adzuna reports salaries in the local currency). */
export const CURRENCY_BY_COUNTRY = {
  gb: 'GBP', us: 'USD', ca: 'CAD', au: 'AUD',
  de: 'EUR', fr: 'EUR', nl: 'EUR', at: 'EUR', be: 'EUR', es: 'EUR', it: 'EUR',
  in: 'INR', nz: 'NZD', pl: 'PLN', sg: 'SGD', za: 'ZAR', br: 'BRL', ch: 'CHF', mx: 'MXN',
};

// How each currency is written. `$` alone is only ever USD. `space` puts a space between a
// letter symbol and the amount; `after` writes the symbol after it (Polish "12K–15K zł").
const SYMBOLS = {
  USD: { s: '$' }, CAD: { s: 'C$' }, AUD: { s: 'A$' }, NZD: { s: 'NZ$' }, SGD: { s: 'S$' },
  MXN: { s: 'MX$' }, BRL: { s: 'R$' }, GBP: { s: '£' }, EUR: { s: '€' }, INR: { s: '₹' },
  ZAR: { s: 'R' }, CHF: { s: 'CHF', space: true }, PLN: { s: 'zł', after: true }, JPY: { s: '¥' },
};

const NOT_LISTED = 'Pay not listed';

function amount(v) {
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? v : null;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v.trim());
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

const trim1 = (n) => {
  const s = (Math.round(n * 10) / 10).toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
};

// 88412 -> "88K", 3500 -> "3.5K", 9500000 -> "9.5M"; INR in lakh/crore: 1800000 -> "18L".
function compact(v, currency) {
  if (currency === 'INR' && v >= 1e5) {
    const l = trim1(v / 1e5);
    return Number(l) < 100 ? `${l}L` : `${trim1(v / 1e7)}Cr`;
  }
  if (v >= 1e3) {
    const k = v / 1e3;
    const shown = k >= 10 ? Math.round(k) : Number(trim1(k));
    if (shown < 1000) return `${k >= 10 ? shown : trim1(k)}K`;
    const m = v / 1e6;
    return `${m >= 10 ? Math.round(m) : trim1(m)}M`;
  }
  return String(Math.round(v));
}

/**
 * localPay({ salary_min: 88000, salary_max: 102000, currency: 'CAD' }) -> 'C$88K–102K'.
 * The currency is the job's own, else its country's (not for remote jobs: their country is only
 * where the map places them). Unknown currencies use their ISO code ("SEK 45K"); no currency at
 * all gives the bare amount. No usable number -> 'Pay not listed'.
 */
export function localPay(job) {
  if (!job || typeof job !== 'object') return NOT_LISTED;
  let lo = amount(job.salary_min);
  let hi = amount(job.salary_max);
  if (lo == null && hi == null) return NOT_LISTED;
  if (lo == null) lo = hi;
  if (hi == null) hi = lo;
  if (lo > hi) [lo, hi] = [hi, lo];

  const own = typeof job.currency === 'string' && /^[A-Za-z]{3}$/.test(job.currency) ? job.currency.toUpperCase() : null;
  const country = typeof job.country === 'string' ? job.country.toLowerCase() : '';
  const currency = own || (!job.remote && CURRENCY_BY_COUNTRY[country]) || null;

  const a = compact(lo, currency);
  const b = compact(hi, currency);
  const value = a === b ? a : `${a}–${b}`;
  if (!currency) return value;
  const sym = SYMBOLS[currency] || { s: currency, space: true };
  if (sym.after) return `${value} ${sym.s}`;
  return sym.space ? `${sym.s} ${value}` : `${sym.s}${value}`;
}

/**
 * Our salary model's answer (/api/predict-salary: { min, max, low, high, currency }) -> { pay,
 * range } or null when it gives no usable pay. pay is localPay's text ('C$88K–102K'); range keeps
 * the numbers the job gate's runway needs: the role's min/max and the city's low/high for this
 * kind of role (null when the answer has none), in `currency`.
 */
export function modelPay(answer) {
  if (!answer || typeof answer !== 'object') return null;
  const pay = localPay({ salary_min: answer.min, salary_max: answer.max, currency: answer.currency });
  if (pay === NOT_LISTED) return null;
  const currency = typeof answer.currency === 'string' && /^[A-Za-z]{3}$/.test(answer.currency) ? answer.currency.toUpperCase() : null;
  return {
    pay,
    range: { min: amount(answer.min), max: amount(answer.max), low: amount(answer.low), high: amount(answer.high), currency },
  };
}
