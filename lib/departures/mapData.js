// /map, the control tower (spec §8, wave 2): the search's roles as the map's beacons, and a
// country's ARRIVALS mini-board. Pure (and tested); app/components/Map.js and
// app/components/map/ControlTower.js only wire these up.
//
//   jobsToGeoJSON(jobs, { now })        -> the clustered source's FeatureCollection: one Point per
//                                          role with a real place ([lng, lat], finite, in range)
//   countryArrivals(jobs, iso2, opts)   -> up to `limit` (8) board rows, all in that country
//   ARRIVALS_COLUMNS                    -> LOCAL · CITY · ROLE · PAY · STATUS, the board's tiles
//   arrivalCountries(jobs)              -> [{ iso2, name }] by name: "Arrivals by country"
//   leadingCountry(isos)                -> the country most of a cluster's roles are in, or null
//   boundsOf(points)                    -> [[w, s], [e, n]] around [lng, lat] points, or null
import { BOARD_COLUMNS, boardRowsFrom } from './board.js';
import { countryLabel } from './gateInfo.js';
import { LAYOUT, withLayout } from './homeBoard.js';
import { cleanTitle, placeOf } from './jobPlace.js';
import { localPay } from './pay.js';
import { jobStatus } from './status.js';

const ISO2 = /^[a-z]{2}$/;
const iso2Of = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');
const idOf = (job) => (job.id == null ? '' : String(job.id));

/** A coordinate as a finite number (numbers or numeric strings), else null. null/'' are missing, not 0. */
function coord(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** [lng, lat] for a role with a real place, else null. 0, 0 is the old feeds' "nowhere". */
function pointOf(job) {
  const lng = coord(job.lng);
  const lat = coord(job.lat);
  if (lng == null || lat == null) return null;
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null;
  if (lng === 0 && lat === 0) return null;
  return [lng, lat];
}

/**
 * jobsToGeoJSON(jobs, { now }) -> { type: 'FeatureCollection', features } with one feature per
 * role: geometry Point [lng, lat]; properties (all strings, read by the beacon label as text):
 *   id, code (YYZ / ANY), iso2 (its own country, '' when remote), title (tidy), company,
 *   payText (localPay: 'C$88K–102K' | 'Pay not listed'), status (ANY GATE | NEW | ON TIME).
 * Roles without a finite place, without an id, or repeating an id already placed are skipped.
 * No profile here: scoring every beacon against one (BOARDING) would cost a pass per role; the
 * arrivals board (a handful of rows) does that.
 */
export function jobsToGeoJSON(jobs, { now = new Date() } = {}) {
  const features = [];
  const seen = new Set();
  for (const job of Array.isArray(jobs) ? jobs : []) {
    if (!job || typeof job !== 'object') continue;
    const id = idOf(job);
    if (!id || seen.has(id)) continue;
    const point = pointOf(job);
    if (!point) continue;
    seen.add(id);
    const place = placeOf(job);
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: point },
      properties: {
        id,
        code: place.code,
        iso2: place.remote ? '' : place.iso2,
        title: cleanTitle(job.title) || 'Untitled role',
        company: String(job.company ?? '').replace(/\s+/g, ' ').trim(),
        payText: localPay(job),
        status: jobStatus(job, { now }),
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

/** The arrivals board's columns: the homepage board's tiles, the code column read as the CITY. */
export const ARRIVALS_COLUMNS = withLayout(
  BOARD_COLUMNS.map((c) => (c.key === 'code' ? { ...c, label: 'CITY' } : c)),
  LAYOUT,
);

/**
 * countryArrivals(jobs, iso2, { limit = 8, now, profile }) -> board rows (boardRowsFrom's shape:
 * { id, href, iso2, tz, city, company, location, cells: { time, code, role, pay, status } }), all
 * roles of that country's own (remote roles have none), never sample rows. boardRowsFrom shows
 * each city once, so it deals in rounds: every city once, then the next best role per city,
 * until the board is full. The profile lights BOARDING on the rows it picked.
 */
export function countryArrivals(jobs, iso2, { limit = 8, now = new Date(), profile = null } = {}) {
  const iso = iso2Of(iso2);
  if (!ISO2.test(iso) || !(limit > 0)) return [];
  let pool = [];
  const byId = new Map();
  for (const job of Array.isArray(jobs) ? jobs : []) {
    if (!job || typeof job !== 'object' || !idOf(job)) continue;
    const place = placeOf(job);
    if (place.remote || place.iso2 !== iso) continue;
    pool.push(job);
    if (!byId.has(idOf(job))) byId.set(idOf(job), job);
  }

  const rows = [];
  while (rows.length < limit && pool.length) {
    const got = boardRowsFrom(pool, { now, limit: limit - rows.length, fill: [], perCountry: limit, showcase: false });
    if (!got.length) break;
    rows.push(...got);
    const taken = new Set(got.map((r) => r.id));
    pool = pool.filter((j) => !taken.has(idOf(j)));
  }

  if (!profile) return rows;
  return rows.map((row) => {
    const job = byId.get(row.id);
    const status = job ? jobStatus(job, { now, profile }) : row.cells.status;
    return status === row.cells.status ? row : { ...row, cells: { ...row.cells, status } };
  });
}

/** The countries with roles of their own on this search, by name: [{ iso2: 'ca', name: 'Canada' }]. */
export function arrivalCountries(jobs) {
  const names = new Map();
  for (const job of Array.isArray(jobs) ? jobs : []) {
    if (!job || typeof job !== 'object') continue;
    const place = placeOf(job);
    if (place.remote || !ISO2.test(place.iso2) || names.has(place.iso2)) continue;
    names.set(place.iso2, countryLabel(place.iso2) || place.iso2.toUpperCase());
  }
  return [...names]
    .map(([iso2, name]) => ({ iso2, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

/** The country most of these (a cluster's roles) are in; '' / null (remote) never lead; a tie goes to the first seen. */
export function leadingCountry(isos) {
  const n = new Map();
  let best = null;
  for (const v of Array.isArray(isos) ? isos : []) {
    const iso = iso2Of(v);
    if (!ISO2.test(iso)) continue;
    n.set(iso, (n.get(iso) || 0) + 1);
    if (best === null || n.get(iso) > n.get(best)) best = iso;
  }
  return best;
}

/**
 * The [[west, south], [east, north]] box around [lng, lat] points, or null. Points on both sides
 * of the antimeridian (Fiji, New Zealand's islands, Alaska) wrap past 180 instead of spanning
 * the whole world.
 */
export function boundsOf(points) {
  const pts = (Array.isArray(points) ? points : []).filter(
    (p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]),
  );
  if (!pts.length) return null;
  const box = (lngs) => [Math.min(...lngs), Math.max(...lngs)];
  let [w, e] = box(pts.map((p) => p[0]));
  if (e - w > 180) {
    const shifted = box(pts.map((p) => (p[0] < 0 ? p[0] + 360 : p[0])));
    if (shifted[1] - shifted[0] < e - w) [w, e] = shifted;
  }
  const lats = pts.map((p) => p[1]);
  return [
    [w, Math.min(...lats)],
    [e, Math.max(...lats)],
  ];
}
