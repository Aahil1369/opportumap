'use client';

// The night window's routes (beat 3): three arcs drawing out (stroke-dashoffset, home.css) from
// one city to three others. Signed-in visitors with a profile get their own: from the country
// they live in (else their passport's) to the countries they want to work in; everyone else
// sees a neutral default. Never geolocation. `children` is the server-rendered city lights.

import { useEffect, useMemo, useState } from 'react';
import { loadHomeProfile } from './homeProfile';

const ALIASES = {
  usa: 'us', us: 'us', america: 'us', 'united states of america': 'us', uk: 'gb', britain: 'gb',
  'great britain': 'gb', england: 'gb', scotland: 'gb', wales: 'gb', uae: 'ae', emirates: 'ae',
  holland: 'nl', korea: 'kr', 'south korea': 'kr', 'hong kong': 'hk', 'ivory coast': 'ci',
};
const fold = (s) =>
  String(s ?? '').toLowerCase().normalize('NFD').replace(/\p{M}+/gu, '').replace(/[^a-z]+/g, ' ').trim();

let names = null;
/** The hub country a free-text place names ("Lahore, Pakistan", "UK", "pk"), or null. */
function countryIn(text, hubs) {
  const parts = String(text ?? '').split(',').map(fold).filter(Boolean).reverse();
  for (const part of parts) {
    if (hubs[part]) return part;
    if (ALIASES[part] && hubs[ALIASES[part]]) return ALIASES[part];
    try {
      names ??= new Intl.DisplayNames(['en'], { type: 'region' });
    } catch {
      return null;
    }
    const hit = Object.keys(hubs).find((iso2) => fold(names.of(iso2.toUpperCase())) === part);
    if (hit) return hit;
  }
  return null;
}

/** Origin + three destinations for a profile, or null when it names no country we can light. */
function profileRoute(profile, hubs, fallback) {
  const home = countryIn(profile.currentCountry, hubs) || (hubs[profile.nationality] ? profile.nationality : null);
  if (!home) return null;
  const origin = hubs[home];
  const picks = [];
  for (const hub of [...(profile.preferredCountries || []).map((c) => hubs[c]), ...fallback]) {
    if (hub && hub[0] !== origin[0] && !picks.some((p) => p[0] === hub[0])) picks.push(hub);
  }
  return { origin, dests: picks.slice(0, 3) };
}

const r1 = (n) => Math.round(n * 10) / 10;
/** A great-circle-looking arc: a quadratic curve bowed up by a quarter of its length. */
function arc([, x0, y0], [, x1, y1]) {
  const lift = Math.hypot(x1 - x0, y1 - y0) * 0.28;
  return `M${x0} ${y0}Q${r1((x0 + x1) / 2)} ${r1((y0 + y1) / 2 - lift)} ${x1} ${y1}`;
}

export default function NightRoutes({ hubs, origin, dests, w, h, children }) {
  const [route, setRoute] = useState({ origin, dests });

  useEffect(() => {
    let live = true;
    loadHomeProfile().then((profile) => {
      const mine = profile && profileRoute(profile, hubs, dests);
      if (live && mine) setRoute(mine);
    });
    return () => {
      live = false;
    };
  }, [hubs, dests]);

  const arcs = useMemo(() => route.dests.map((d) => arc(route.origin, d)), [route]);
  const at = ([, x, y]) => ({ left: `${(x / w) * 100}%`, top: `${(y / h) * 100}%` });
  const flip = ([, x]) => (x / w > 0.82 ? '' : undefined); // label left of a pin near the right edge
  const codes = route.dests.map((d) => d[0]);

  return (
    <div
      className="nw-window"
      role="img"
      aria-label={`The world at night, city lights, with routes from ${route.origin[0]} to ${codes.join(', ')}.`}
    >
      {children}
      <svg className="nw-routes" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        {arcs.map((d, i) => (
          <path key={`${route.origin[0]}-${codes[i]}`} className="nw-arc" d={d} pathLength="1" style={{ '--i': i }} />
        ))}
      </svg>
      <span className="nw-pin nw-from" style={at(route.origin)} data-flip={flip(route.origin)} aria-hidden="true">
        <span>{route.origin[0]}</span>
      </span>
      {route.dests.map((d, i) => (
        <span key={d[0]} className="nw-pin nw-to" style={{ ...at(d), '--i': i }} data-flip={flip(d)} aria-hidden="true">
          <span>{d[0]}</span>
        </span>
      ))}
      <p className="nw-cap" aria-hidden="true">
        VIEW FROM GATE · {route.origin[0]} ▸ THE WORLD
      </p>
    </div>
  );
}
