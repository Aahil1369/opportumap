// The night window (homepage beat 3): the world at night as amber city lights, at static
// positions. Each light is a code from the city table (cityCodes.data.js) with its city's
// longitude/latitude; the window is a plain equirectangular view, a little taller than true
// scale so it reads on a phone. Server-side only: the page sends the finished dots path and one
// hub per country (its main city) for the routes.
import { CITY_ROWS } from './cityCodes.data.js';

export const NIGHT_VIEW = { w: 1000, h: 560 };
const LNG = [-128, 180];
const LAT = [66, -46];

/** [code, longitude, latitude] */
export const CITY_LIGHTS = [
  // North America
  ['JFK', -74.0, 40.7], ['SFO', -122.4, 37.8], ['LAX', -118.2, 34.1], ['SEA', -122.3, 47.6], ['BOS', -71.1, 42.4],
  ['IAD', -77.0, 38.9], ['ORD', -87.6, 41.9], ['AUS', -97.7, 30.3], ['DFW', -96.8, 32.8], ['IAH', -95.4, 29.8],
  ['ATL', -84.4, 33.7], ['MIA', -80.2, 25.8], ['DEN', -105.0, 39.7], ['PHX', -112.1, 33.4], ['MSP', -93.3, 45.0],
  ['DTW', -83.0, 42.3], ['PHL', -75.2, 40.0], ['SAN', -117.2, 32.7], ['PDX', -122.7, 45.5], ['SLC', -111.9, 40.8],
  ['LAS', -115.1, 36.2], ['CLT', -80.8, 35.2], ['STL', -90.2, 38.6], ['MSY', -90.1, 30.0], ['RDU', -78.6, 35.8],
  ['YYZ', -79.4, 43.7], ['YVR', -123.1, 49.3], ['YUL', -73.6, 45.5], ['YYC', -114.1, 51.0], ['YEG', -113.5, 53.5],
  ['YOW', -75.7, 45.4], ['YWG', -97.1, 49.9], ['YHZ', -63.6, 44.6],
  // Mexico, Central America, the Caribbean
  ['MEX', -99.1, 19.4], ['GDL', -103.3, 20.7], ['MTY', -100.3, 25.7], ['PTY', -79.5, 9.0], ['GUA', -90.5, 14.6],
  ['SDQ', -69.9, 18.5], ['HAV', -82.4, 23.1], ['SJO', -84.1, 9.9], ['SJU', -66.1, 18.4], ['KIN', -76.8, 18.0],
  // South America
  ['GRU', -46.6, -23.5], ['GIG', -43.2, -22.9], ['BSB', -47.9, -15.8], ['EZE', -58.4, -34.6], ['BOG', -74.1, 4.7],
  ['MDE', -75.6, 6.2], ['SCL', -70.7, -33.4], ['LIM', -77.0, -12.0], ['CCS', -66.9, 10.5], ['UIO', -78.5, -0.2],
  ['MVD', -56.2, -34.9], ['FOR', -38.5, -3.7], ['REC', -34.9, -8.1], ['POA', -51.2, -30.0], ['COR', -64.2, -31.4],
  ['LPB', -68.1, -16.5], ['ASU', -57.6, -25.3],
  // Europe
  ['LHR', -0.1, 51.5], ['MAN', -2.2, 53.5], ['EDI', -3.2, 56.0], ['DUB', -6.3, 53.3], ['CDG', 2.35, 48.9],
  ['BER', 13.4, 52.5], ['MUC', 11.6, 48.1], ['FRA', 8.7, 50.1], ['HAM', 10.0, 53.6], ['AMS', 4.9, 52.4],
  ['BRU', 4.35, 50.85], ['ZRH', 8.5, 47.4], ['GVA', 6.1, 46.2], ['VIE', 16.4, 48.2], ['WAW', 21.0, 52.2],
  ['KRK', 19.9, 50.1], ['PRG', 14.4, 50.1], ['BUD', 19.0, 47.5], ['MAD', -3.7, 40.4], ['BCN', 2.2, 41.4],
  ['LIS', -9.1, 38.7], ['OPO', -8.6, 41.1], ['MXP', 9.2, 45.5], ['FCO', 12.5, 41.9], ['NAP', 14.3, 40.9],
  ['ATH', 23.7, 38.0], ['IST', 29.0, 41.0], ['ARN', 18.1, 59.3], ['OSL', 10.8, 59.9], ['CPH', 12.6, 55.7],
  ['HEL', 24.9, 60.2], ['KBP', 30.5, 50.4], ['OTP', 26.1, 44.4], ['SOF', 23.3, 42.7], ['BEG', 20.5, 44.8],
  ['ZAG', 16.0, 45.8], ['RIX', 24.1, 56.9], ['VNO', 25.3, 54.7], ['TLL', 24.8, 59.4], ['SVO', 37.6, 55.8],
  ['LED', 30.3, 59.9], ['KEF', -21.9, 64.1], ['LYS', 4.8, 45.8], ['MRS', 5.4, 43.3], ['VLC', -0.4, 39.5],
  ['GOT', 12.0, 57.7], ['MLA', 14.5, 35.9], ['LUX', 6.1, 49.6], ['LJU', 14.5, 46.1],
  // Middle East, the Caucasus, Central Asia
  ['DXB', 55.3, 25.2], ['AUH', 54.4, 24.5], ['DOH', 51.5, 25.3], ['RUH', 46.7, 24.7], ['JED', 39.2, 21.5],
  ['TLV', 34.8, 32.1], ['AMM', 35.9, 31.9], ['BEY', 35.5, 33.9], ['KWI', 48.0, 29.4], ['MCT', 58.4, 23.6],
  ['BAH', 50.6, 26.2], ['TBS', 44.8, 41.7], ['EVN', 44.5, 40.2], ['GYD', 49.9, 40.4], ['ALA', 76.9, 43.2],
  ['TAS', 69.2, 41.3], ['ESB', 32.9, 39.9],
  // South Asia
  ['BLR', 77.6, 13.0], ['BOM', 72.9, 19.1], ['DEL', 77.2, 28.6], ['HYD', 78.5, 17.4], ['MAA', 80.3, 13.1],
  ['PNQ', 73.9, 18.5], ['CCU', 88.4, 22.6], ['AMD', 72.6, 23.0], ['COK', 76.3, 10.0], ['JAI', 75.8, 26.9],
  ['KHI', 67.0, 24.9], ['LHE', 74.3, 31.5], ['ISB', 73.0, 33.7], ['GIL', 74.3, 35.9], ['DAC', 90.4, 23.8],
  ['CMB', 79.9, 6.9], ['KTM', 85.3, 27.7],
  // East Asia
  ['PEK', 116.4, 39.9], ['PVG', 121.5, 31.2], ['SZX', 114.1, 22.5], ['CAN', 113.3, 23.1], ['HKG', 114.2, 22.3],
  ['TPE', 121.6, 25.0], ['HND', 139.7, 35.7], ['KIX', 135.5, 34.7], ['ICN', 127.0, 37.6], ['PUS', 129.1, 35.2],
  ['CTU', 104.1, 30.7], ['WUH', 114.3, 30.6], ['XIY', 108.9, 34.3], ['HGH', 120.2, 30.3], ['FUK', 130.4, 33.6],
  ['CTS', 141.4, 43.1], ['NGO', 136.9, 35.2],
  // Southeast Asia
  ['SIN', 103.8, 1.35], ['KUL', 101.7, 3.1], ['CGK', 106.8, -6.2], ['MNL', 121.0, 14.6], ['BKK', 100.5, 13.8],
  ['SGN', 106.7, 10.8], ['HAN', 105.8, 21.0], ['DPS', 115.2, -8.7], ['PNH', 104.9, 11.6], ['RGN', 96.2, 16.8],
  ['CEB', 123.9, 10.3], ['CNX', 99.0, 18.8], ['SUB', 112.75, -7.25],
  // Africa
  ['JNB', 28.0, -26.2], ['CPT', 18.4, -33.9], ['DUR', 31.0, -29.9], ['LOS', 3.4, 6.5], ['ABV', 7.5, 9.1],
  ['NBO', 36.8, -1.3], ['CAI', 31.2, 30.0], ['ADD', 38.7, 9.0], ['ACC', -0.2, 5.6], ['DAR', 39.3, -6.8],
  ['EBB', 32.6, 0.35], ['CMN', -7.6, 33.6], ['ALG', 3.1, 36.7], ['TUN', 10.2, 36.8], ['ABJ', -4.0, 5.3],
  ['DSS', -17.4, 14.7], ['KGL', 30.1, -1.95], ['LUN', 28.3, -15.4], ['HRE', 31.0, -17.8], ['DLA', 9.7, 4.05],
  ['RAK', -8.0, 31.6], ['HBE', 29.9, 31.2], ['MRU', 57.5, -20.2],
  // Oceania
  ['SYD', 151.2, -33.9], ['MEL', 145.0, -37.8], ['BNE', 153.0, -27.5], ['PER', 115.9, -31.95], ['ADL', 138.6, -34.9],
  ['CBR', 149.1, -35.3], ['HBA', 147.3, -42.9], ['AKL', 174.8, -36.85], ['WLG', 174.8, -41.3], ['CHC', 172.6, -43.5],
  ['SUV', 178.4, -18.1], ['POM', 147.2, -9.4],
];

const r1 = (n) => Math.round(n * 10) / 10;

/** [x, y] of a longitude/latitude in the window's viewBox (0 0 1000 560). */
export function nightPoint(lng, lat) {
  return [
    r1(((lng - LNG[0]) / (LNG[1] - LNG[0])) * NIGHT_VIEW.w),
    r1(((LAT[0] - lat) / (LAT[0] - LAT[1])) * NIGHT_VIEW.h),
  ];
}

let LIGHTS = null;

/**
 * { dots, hubs, points }: `dots` is one SVG path with a zero-length segment per light (round caps
 * draw the dots); `hubs` maps each country to [code, x, y] of its main city's light (the table's
 * first row for the country), or of its first lit city when the main one has no light; `points`
 * maps each lit code to its [code, x, y].
 */
export function nightLights() {
  if (LIGHTS) return LIGHTS;
  const at = new Map(CITY_LIGHTS.map(([code, lng, lat]) => [code, nightPoint(lng, lat)]));
  const hubs = {};
  const seen = new Set();
  for (const [, , code, iso2] of CITY_ROWS) {
    const main = !seen.has(iso2);
    seen.add(iso2);
    const p = at.get(code);
    if (p && (main || !hubs[iso2])) hubs[iso2] = [code, ...p];
  }
  const dots = [...at.values()].map(([x, y]) => `M${x} ${y}h0`).join('');
  const points = Object.fromEntries([...at].map(([code, p]) => [code, [code, ...p]]));
  LIGHTS = { dots, hubs, points };
  return LIGHTS;
}
