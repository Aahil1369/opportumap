'use client';

// /map, the control tower (spec §8, wave 2): the search, the radar (Map.js, Mapbox, loaded lazily)
// and the boards it opens.
//
// - The search: the visitor's profile (their account's, else one kept on this device, read in an
//   effect so the server's HTML and the first client render match) gives the base search
//   (profileQuery + preferred countries, else "software engineer"); a ?q= in the URL or the
//   search box replaces it, read like /jobs reads it (searchPlan: "tor" is Toronto). Newest
//   request wins (createLatest). The moment a new search starts its old beacons leave the map;
//   its own light up when it lands. A failed request is an error state with Try again, a search
//   with nothing on the map says so; neither is ever a total.
// - The radar: one clustered layer (Map.js). A beacon opens its gate (JobGate); a country, or a
//   cluster in the world view, opens its ARRIVALS board (ArrivalsBoard), whose rows open gates
//   too. A country with no roles on this search says so in a line, not a dialog.
// - The keyboard (and the touch) path: "Arrivals by country", a select of the countries on the
//   radar, and its Show arrivals button open the same boards. Choosing a country only remembers
//   it (ArrowDown on a closed select fires `change` at once in Chromium and Firefox, so a board
//   opened on change would always be the first country's; WCAG 3.2.2). If the map cannot load
//   (no WebGL, no network), the boards and a link to /jobs still work.
// - The data layer (towerData.js: the search's city table, the beacons, the boards) loads after
//   hydration, next to the profile, so it is not in the page's first-load JS.
// - AI: no salary model or advice here; a gate asks for its own pay and advice when it opens.

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createLatest } from '../../../lib/departures/createLatest';
import { profileQuery } from '../../../lib/departures/profileQuery';
import { radarChip } from '../../../lib/departures/radarChip';
import { inputOnArrival, loadVisitorProfile, searchOnArrival } from '../../../lib/departures/visitorProfile';
import { saveProfile as storeProfile } from '../../../lib/saveProfile';
import { keepHomeProfile, loadHomeProfile } from '../home/homeProfile';
import './map.css';

const Radar = dynamic(() => import('../Map'), { ssr: false });
const ArrivalsBoard = dynamic(() => import('./ArrivalsBoard'), { ssr: false });
const JobGate = dynamic(() => import('../jobs/JobGate'), { ssr: false });
const ProfileModal = dynamic(() => import('../ProfileModal'), { ssr: false });

const ISO2 = /^[a-z]{2}$/;
const SESSION_COOKIE = /(?:^|;\s*)sb-[^=;]+-auth-token/;
const EMPTY = Object.freeze({ type: 'FeatureCollection', features: Object.freeze([]) });
const NOTICE_MS = 5000;
const LOAD_ERROR = "We couldn't load roles right now.";
const MISSING = "That role isn't on the radar for this search.";

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

async function fetchJobs(query, countries) {
  const qs = new URLSearchParams({ q: query });
  if (countries?.length) qs.set('countries', countries.join(','));
  const res = await fetch(`/api/jobs?${qs}`);
  if (!res.ok) throw new Error(`jobs ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data?.jobs)) throw new Error('jobs payload');
  return data.jobs;
}

/** A plan's roles. A place with no roles there (a role word that looks like a city) is searched as words. */
async function loadRadar(plan, preferred, filterJobs) {
  const jobs = await fetchJobs(plan.query, plan.countries || preferred);
  if (plan.place && plan.fallback && !filterJobs(jobs, { place: plan.place }).length) {
    return { jobs: await fetchJobs(plan.fallback, preferred), place: null, label: plan.fallback };
  }
  return { jobs, place: plan.place, label: plan.text || plan.query };
}

const searchHref = (text) => (text ? `/map?${new URLSearchParams({ q: text })}` : '/map');
const boardHref = (text) => (text ? `/jobs?${new URLSearchParams({ q: text })}` : '/jobs');
const gateHref = (text, id) => `/map?${new URLSearchParams(text ? { q: text, job: id } : { job: id })}`;

export default function ControlTower() {
  const [profile, setProfile] = useState(undefined); // undefined: still loading
  const [input, setInput] = useState('');
  const [asked, setAsked] = useState(null); // { text, n }
  const [radar, setRadar] = useState(null); // { key, state: 'ok' | 'error', jobs, place, label, at }
  const [mapState, setMapState] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [mapTry, setMapTry] = useState(0);
  const [arrivals, setArrivals] = useState(null); // iso2 of the open board
  const [chosen, setChosen] = useState(''); // iso2 chosen in "Arrivals by country" (choosing opens nothing)
  const [openId, setOpenId] = useState(null);
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(false);
  const [latest] = useState(createLatest);
  const [lib, setLib] = useState(null); // towerData.js, once loaded
  const [libTry, setLibTry] = useState(0);
  const [libFailed, setLibFailed] = useState(false);
  const view = useRef(null); // the map's { fitBounds }
  const boardOpener = useRef(null); // what opened the arrivals board (focus goes back there)
  const gateOpener = useRef(null); // what opened the gate
  const meRef = useRef(null);
  const fitted = useRef(null);
  const pushed = useRef(false); // opening the gate added a history entry (Back closes it)
  const wanted = useRef(null); // ?job= from the URL: that gate opens once its search is on the radar

  // The URL and the profile, once, after hydration; Back / Forward close and open the gate.
  useEffect(() => {
    let live = true;
    const params = new URLSearchParams(window.location.search);
    const q = clean(params.get('q'));
    wanted.current = params.get('job');
    loadVisitorProfile({ account: loadHomeProfile }).then((p) => {
      if (!live) return;
      setProfile(p);
      // A signed-in visitor's profile can land after they typed or searched: theirs stays.
      setInput((v) => inputOnArrival(v, q));
      setAsked((a) => searchOnArrival(a, q));
    });
    // Back closes the gate (its Dialog hands focus back to the opener); Forward opens it again.
    const onPop = () => {
      pushed.current = false;
      setOpenId(new URLSearchParams(window.location.search).get('job'));
    };
    window.addEventListener('popstate', onPop);
    return () => {
      live = false;
      window.removeEventListener('popstate', onPop);
    };
  }, []);

  // The data layer, after hydration (and again on Try again if its chunk failed to load).
  useEffect(() => {
    let live = true;
    import('./towerData').then(
      (m) => live && setLib(m),
      () => live && setLibFailed(true),
    );
    return () => {
      live = false;
    };
  }, [libTry]);

  // ── The search ──
  const preferred = useMemo(
    () => (Array.isArray(profile?.preferredCountries) ? profile.preferredCountries.filter((c) => ISO2.test(c)) : []),
    [profile],
  );
  const base = profile === undefined ? null : profileQuery(profile);
  const plan = useMemo(
    () => (lib && asked && base !== null ? lib.searchPlan(asked.text, { base }) : null),
    [lib, asked, base],
  );
  const key = plan ? [asked.n, asked.text, plan.query, (plan.countries || preferred).join(',')].join('\u0000') : null;
  const loading = key !== null && radar?.key !== key;

  useEffect(() => {
    if (!key) return;
    const id = latest.next(); // any older request is stale from here on
    if (!loading) return;
    loadRadar(plan, preferred, lib.filterJobs)
      .then(
        (r) => ({ ...r, state: 'ok' }),
        () => ({ state: 'error', jobs: [], place: null, label: plan.text || plan.query }),
      )
      .then((r) => {
        if (latest.isCurrent(id)) setRadar({ ...r, key, at: Date.now() });
      });
    // `plan`, `preferred` and `loading` are what `key` is made of, as of this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, latest]);

  // ── What is on the radar ──
  const now = useMemo(() => new Date(radar?.at || 0), [radar]);
  const roles = useMemo(
    () => (lib && radar?.state === 'ok' ? lib.filterJobs(radar.jobs, { place: radar.place, now }) : []),
    [lib, radar, now],
  );
  // While a new search loads, the map is empty: the old beacons are gone at once.
  const beacons = useMemo(
    () => (loading || !radar || !lib ? EMPTY : lib.jobsToGeoJSON(roles, { now })),
    [lib, loading, radar, roles, now],
  );
  const countries = useMemo(() => (loading || !lib ? [] : lib.arrivalCountries(roles)), [lib, loading, roles]);
  // The chosen country while it is on this search's radar (a new search may not have it).
  const picked = countries.some((c) => c.iso2 === chosen) ? chosen : '';
  const ranked = profile ?? null;
  const arrivalRows = useMemo(
    () => (arrivals && lib ? lib.countryArrivals(roles, arrivals, { now, profile: ranked }) : []),
    [lib, arrivals, roles, now, ranked],
  );

  // A place search ("tor", "Berlin") flies to its best match's beacons once they land ("tor" also
  // matches Torino and Torrance: their beacons stay on, the map goes to Toronto).
  useEffect(() => {
    if (!radar || radar.state !== 'ok' || !radar.place || fitted.current === radar.key) return;
    if (mapState !== 'ready' || !beacons.features.length) return;
    fitted.current = radar.key;
    const best = beacons.features.filter((f) => f.properties.code === radar.place.codes?.[0]);
    const points = (best.length ? best : beacons.features).map((f) => f.geometry.coordinates);
    view.current?.fitBounds(lib.boundsOf(points));
  }, [lib, radar, beacons, mapState]);

  // Once the radar is up, the arrivals board's code loads in an idle moment: the first board then
  // opens without a fetch (its opening frame is the one long frame of the moment).
  useEffect(() => {
    if (mapState !== 'ready') return undefined;
    const later = window.requestIdleCallback || ((fn) => setTimeout(fn, 1200));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const id = later(() => {
      import('./ArrivalsBoard').catch(() => {});
    });
    return () => cancel(id);
  }, [mapState]);

  // A line like "No roles in Chad on this search." goes after a few seconds.
  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), NOTICE_MS);
    return () => clearTimeout(t);
  }, [notice]);

  // A link to /map?job=<id> (a reload, or Back into /map) opens that role's gate once its search
  // is on the radar (deepLink; no lookup by id here, unlike /jobs). A role the radar does not have
  // is a notice, and the link loses its ?job=.
  const settled = !loading && radar?.state === 'ok';
  useEffect(() => {
    const id = wanted.current;
    if (!id || !lib) return;
    const what = lib.deepLink(id, { lists: [radar?.jobs], settled, looked: true });
    if (what !== 'open' && what !== 'miss') return;
    wanted.current = null;
    Promise.resolve().then(() => {
      if (what === 'open') setOpenId(id);
      else {
        setNotice(MISSING);
        window.history.replaceState(null, '', searchHref(asked?.text));
      }
    });
  }, [lib, radar, settled, asked?.text]);

  // ── Actions ──
  const submit = (e) => {
    e.preventDefault();
    const text = clean(input);
    window.history.replaceState(null, '', searchHref(text));
    setNotice('');
    setArrivals(null);
    setAsked((a) => ({ text, n: (a?.n ?? 0) + 1 }));
  };
  const retry = () => {
    if (libFailed) {
      setLibFailed(false);
      setLibTry((n) => n + 1);
    }
    setAsked((a) => ({ text: a?.text ?? '', n: (a?.n ?? 0) + 1 }));
  };

  const showCountry = useCallback(
    (iso) => {
      if (loading || !lib) return; // the old beacons are gone and the new ones are not in yet
      const name = lib.countryLabel(iso) || iso.toUpperCase();
      if (!countries.some((c) => c.iso2 === iso)) {
        setNotice(`No roles in ${name} on this search.`);
        return;
      }
      setNotice('');
      boardOpener.current = document.activeElement;
      setArrivals(iso);
    },
    [lib, countries, loading],
  );
  // A gate is a history entry, as on /jobs and /saved: Back (an iPhone's swipe) closes it.
  const openGate = useCallback(
    (id, el) => {
      gateOpener.current = el || document.activeElement;
      setNotice('');
      setOpenId(id);
      window.history.pushState(null, '', gateHref(asked?.text, id));
      pushed.current = true;
    },
    [asked?.text],
  );
  // Focus goes back to the opener from the gate's Dialog as it unmounts (returnFocusRef).
  const closeGate = useCallback(() => {
    setOpenId(null);
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, '', searchHref(asked?.text));
    }
  }, [asked?.text]);
  const closeBoard = useCallback(() => setArrivals(null), []);
  const showOnMap = useCallback(() => {
    const iso = arrivals;
    setArrivals(null);
    const points = beacons.features.filter((f) => f.properties.iso2 === iso).map((f) => f.geometry.coordinates);
    view.current?.fitBounds(lib?.boundsOf(points));
  }, [lib, arrivals, beacons]);
  const onMapState = useCallback((s) => setMapState(s), []);
  const onReady = useCallback((api) => {
    view.current = api;
  }, []);
  const retryMap = () => {
    setMapState('loading');
    setMapTry((n) => n + 1);
  };
  // Choosing a country only remembers it; Show arrivals opens its board.
  const pick = (e) => setChosen(e.target.value);
  const showPicked = (e) => {
    if (!picked) return;
    boardOpener.current = e.currentTarget;
    setNotice('');
    setArrivals(picked);
  };

  const saveProfile = (p) => {
    setProfile(p);
    setEditing(false);
    keepHomeProfile(p);
    storeProfile(p, { signedIn: SESSION_COOKIE.test(document.cookie) });
  };

  // ── What the tower says ──
  const label = (loading ? plan && (plan.text || plan.query) : radar?.label) || '';
  const openJob = openId && lib ? lib.findJob(roles, openId) || lib.findJob(radar?.jobs, openId) : null;
  const boardName = arrivals ? lib?.countryLabel(arrivals) || arrivals.toUpperCase() : '';
  const empty = !loading && radar?.state === 'ok' && !beacons.features.length;

  let message = null;
  if (libFailed || (!loading && radar?.state === 'error')) {
    message = (
      <div className="mt-msg" role="alert">
        <p className="mt-msg-t">{LOAD_ERROR}</p>
        <button type="button" className="mt-btn" onClick={retry}>
          Try again
        </button>
      </div>
    );
  } else if (mapState === 'error') {
    message = (
      <div className="mt-msg" role="alert">
        <p className="mt-msg-t">The map couldn&apos;t load here.</p>
        <p className="mt-msg-s">Arrivals by country still works, and every role is on the board.</p>
        <div className="mt-msg-row">
          <button type="button" className="mt-btn" onClick={retryMap}>
            Try again
          </button>
          <a className="mt-link" href={boardHref(asked?.text)}>
            Open the board <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    );
  } else if (empty) {
    message = (
      <div className="mt-msg">
        <p className="mt-msg-t">Nothing on the radar for “{label}”.</p>
        <p className="mt-msg-s">Try another role, a company, or a city.</p>
      </div>
    );
  }

  // Busy until a search is on the map: the profile, the data layer and the roles are all in.
  const busy = !libFailed && (!plan || loading);
  // The HUD chip; an empty search says so there too (the HUD is the page's one live region).
  const chip = radarChip({ busy, empty, ok: radar?.state === 'ok', label });

  return (
    <div className="mt-tower">
      <div className="mt-bar">
        <form className="mt-search" role="search" onSubmit={submit}>
          <label className="mt-label" htmlFor="mt-q">
            Where to?
          </label>
          <div className="mt-field">
            <input
              id="mt-q"
              className="mt-input"
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              spellCheck={false}
              placeholder="Role, company, city or code"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" className="mt-go">
              Go
            </button>
          </div>
        </form>
        <div className="mt-pick">
          <label className="mt-label" htmlFor="mt-arr">
            Arrivals by country
          </label>
          <div className="mt-field">
            <select id="mt-arr" className="mt-select" value={picked} onChange={pick} disabled={!countries.length}>
              <option value="">{countries.length ? 'Country arrivals' : 'No countries yet'}</option>
              {countries.map((c) => (
                <option key={c.iso2} value={c.iso2}>
                  {c.name}
                </option>
              ))}
            </select>
            <button type="button" className="mt-show" onClick={showPicked} disabled={!picked}>
              Show<span className="sr-only"> arrivals</span>
            </button>
            <button ref={meRef} type="button" className="mt-me" onClick={() => setEditing(true)}>
              {/* Phones show "PROFILE" (room for the country and Show); the name stays "Set up profile". */}
              <span className="mt-me-v">{profile ? 'Edit ' : 'Set up '}</span>
              profile
              <span className="sr-only"> (it lights BOARDING on your best matches)</span>
            </button>
          </div>
        </div>
      </div>

      <section className="mt-stage" aria-labelledby="mt-radar-k" data-state={mapState}>
        <h2 id="mt-radar-k" className="sr-only">
          Map of the roles on this search
        </h2>
        <p className="sr-only">
          Each beacon is a role; use Arrivals by country above to read them as a board.
        </p>
        <div className="mt-map" key={mapTry}>
          <Radar beacons={beacons} onBeacon={openGate} onCountry={showCountry} onState={onMapState} onReady={onReady} />
        </div>

        {/* The one live region: the chip and the notices, with no role="status" inside it. */}
        <div className="mt-hud" aria-live="polite">
          {chip && (
            <p className="mt-chip" data-busy={busy ? '' : undefined}>
              <span className="mt-chip-k">{chip.key}</span>
              <span className="mt-chip-t">{chip.text}</span>
            </p>
          )}
          {notice && <p className="mt-notice">{notice}</p>}
        </div>

        {mapState === 'loading' && !message && (
          <p className="mt-boot" aria-hidden="true">
            Lighting the radar…
          </p>
        )}
        {message}

        <ul className="mt-legend" aria-label="Legend">
          <li>
            <i className="mt-dot" aria-hidden="true" /> A role
          </li>
          <li>
            <i className="mt-dot" data-any="" aria-hidden="true" /> Remote, any gate
          </li>
          <li>
            <i className="mt-ring" aria-hidden="true" /> More roles nearby
          </li>
          <li className="mt-legend-c">Pick a beacon for its gate, a country for its arrivals.</li>
        </ul>
      </section>

      {arrivals && (
        <ArrivalsBoard
          name={boardName}
          rows={arrivalRows}
          hrefFor={(id) => `/jobs?${new URLSearchParams(asked?.text ? { q: asked.text, job: id } : { job: id })}`}
          moreHref={boardHref(asked?.text)}
          onOpenJob={openGate}
          onShowOnMap={mapState === 'ready' ? showOnMap : null}
          onClose={closeBoard}
          returnFocusRef={boardOpener}
        />
      )}
      {openJob && <JobGate key={openJob.id} job={openJob} profile={profile} onClose={closeGate} returnFocusRef={gateOpener} />}
      {editing && (
        <ProfileModal initialProfile={profile} onSave={saveProfile} onClose={() => setEditing(false)} returnFocusRef={meRef} />
      )}
    </div>
  );
}
