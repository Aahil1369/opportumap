'use client';

// /jobs, the departures board (spec §7). Search a role, a company, a city or its code ("tor"
// finds Toronto, YYZ), narrow it with the gate chips, tap a row to open its gate.
//
// - What it searches: searchPlan (lib/departures/jobRows.js). The base search is the visitor's
//   profile (profileQuery, their preferred countries) or "software engineer"; a ?q= in the URL
//   (the homepage's WHERE TO?) or the search box replaces it. Newest request wins (createLatest):
//   an older, slower answer is dropped. A failed request is an error state with Try again, never
//   "No roles match".
// - Order: best match first when there is a profile (scoreJob, the same number as each row's
//   badge and BOARDING), else the feed's order; "Newest first" sorts by posted date.
// - Rows: JobRow. Rows keep their slot (key = position), so a new search or chip re-flaps the
//   rows on screen in place; "Load more" adds rows that clack in. Only on-screen rows flap or ask
//   the salary model (usePredictedPay).
// - The gate: a row is a link to /jobs?job=<id>; a click opens the role here (pushState, Back
//   closes it) and a deep link opens it once the board has it. JobDetailPanel stands in for the
//   gate until JobGate (Task 6) replaces it.

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GateFilters from './GateFilters';
import JobRow from './JobRow';
import { createLatest } from '../../../lib/departures/createLatest';
import { ROLE_TYPES, countriesOf, filterJobs, jobRow, searchPlan, sortJobs } from '../../../lib/departures/jobRows';
import { profileQuery } from '../../../lib/departures/profileQuery';
import { loadHomeProfile } from '../home/homeProfile';
import './jobs.css';

const JobDetailPanel = dynamic(() => import('../JobDetailPanel'), { ssr: false });
const ProfileModal = dynamic(() => import('../ProfileModal'), { ssr: false });

const PER_PAGE = 24;
const NO_FILTERS = { type: 'all', remote: false, country: 'all', saved: false };
const ISO2 = /^[a-z]{2}$/;
const SAVED_KEY = 'opportumap_saved';
const PROFILE_KEY = 'opportumap_profile';
const SESSION_COOKIE = /(?:^|;\s*)sb-[^=;]+-auth-token/;

const LOAD_ERROR = "We couldn't load roles right now. Try again.";
const GONE = 'That role has left the board. Here are the roles for your search.';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/** The visitor's profile: their account's (signed in), else one kept on this device, else null. */
async function loadProfile() {
  const remote = await loadHomeProfile().catch(() => null);
  if (remote) return remote;
  const local = readJson(PROFILE_KEY, null);
  return local && typeof local === 'object' && !Array.isArray(local) ? local : null;
}

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
async function loadBoard(plan, preferred) {
  const jobs = await fetchJobs(plan.query, plan.countries || preferred);
  if (plan.place && plan.fallback && !filterJobs(jobs, { place: plan.place }).length) {
    return { jobs: await fetchJobs(plan.fallback, preferred), place: null, label: plan.fallback };
  }
  return { jobs, place: plan.place, label: plan.text || plan.query };
}

const searchHref = (text) => (text ? `/jobs?${new URLSearchParams({ q: text })}` : '/jobs');

export default function JobsBoard() {
  const [profile, setProfile] = useState(undefined); // undefined: still loading
  const [input, setInput] = useState('');
  const [asked, setAsked] = useState(null); // { text, n }: the search on the board
  const [board, setBoard] = useState(null); // { key, state: 'ok' | 'error', jobs, place, label, at }
  const [filters, setFilters] = useState(NO_FILTERS);
  const [newest, setNewest] = useState(false);
  const [page, setPage] = useState(1);
  const [saved, setSaved] = useState([]); // job ids, as kept in localStorage
  const [openId, setOpenId] = useState(null);
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(false);
  const [latest] = useState(createLatest);
  const wanted = useRef(null); // ?job= from the URL, opened once the board has that role
  const opener = useRef(null); // the row that opened the gate: focus goes back there
  const pushed = useRef(false); // the gate added a history entry (Back closes it)

  // The URL, the profile and the saved roles, once; Back / Forward open and close the gate.
  useEffect(() => {
    let live = true;
    const params = new URLSearchParams(window.location.search);
    wanted.current = params.get('job');
    loadProfile().then((p) => {
      if (!live) return;
      const q = (params.get('q') || '').replace(/\s+/g, ' ').trim();
      setProfile(p);
      setInput(q);
      setAsked({ text: q, n: 0 });
      const ids = readJson(SAVED_KEY, []);
      setSaved(Array.isArray(ids) ? ids : []);
    });
    const onPop = () => {
      pushed.current = false;
      const id = new URLSearchParams(window.location.search).get('job');
      setOpenId(id);
      if (!id && opener.current?.isConnected) opener.current.focus(); // Back closed the gate
      if (!id) opener.current = null;
    };
    window.addEventListener('popstate', onPop);
    return () => {
      live = false;
      window.removeEventListener('popstate', onPop);
    };
  }, []);

  // ── The search ──
  const preferred = useMemo(
    () => (Array.isArray(profile?.preferredCountries) ? profile.preferredCountries.filter((c) => ISO2.test(c)) : []),
    [profile],
  );
  const base = profile === undefined ? null : profileQuery(profile);
  const plan = useMemo(() => (asked && base !== null ? searchPlan(asked.text, { base }) : null), [asked, base]);
  const key = plan ? [asked.n, asked.text, plan.query, (plan.countries || preferred).join(',')].join('\u0000') : null;
  const loading = key !== null && board?.key !== key;

  useEffect(() => {
    if (!key) return;
    const id = latest.next();
    loadBoard(plan, preferred)
      .then(
        (b) => ({ ...b, state: 'ok' }),
        () => ({ state: 'error', jobs: [], place: null, label: plan.text || plan.query }),
      )
      .then((b) => {
        if (!latest.isCurrent(id)) return; // a newer search has started: this answer is stale
        setBoard({ ...b, key, at: Date.now() });
        setPage(1);
      });
    // `plan` and `preferred` are what `key` is made of.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, latest]);

  // A deep link (?job=<id>) opens its role once the board has loaded.
  useEffect(() => {
    if (board?.state !== 'ok' || !wanted.current) return;
    const id = wanted.current;
    wanted.current = null;
    const there = board.jobs.some((j) => String(j.id) === id);
    Promise.resolve().then(() => {
      if (there) setOpenId(id);
      else {
        setNotice(GONE);
        window.history.replaceState(null, '', searchHref(asked?.text));
      }
    });
  }, [board, asked?.text]);

  // ── The board ──
  const now = useMemo(() => new Date(board?.at || 0), [board]);
  const savedIds = useMemo(() => new Set(saved.map(String)), [saved]);
  const ordered = useMemo(
    () => (board ? sortJobs(board.jobs, newest ? 'newest' : profile ? 'match' : 'feed', profile) : []),
    [board, newest, profile],
  );
  const list = useMemo(
    () =>
      filterJobs(ordered, {
        place: board?.place,
        type: filters.type,
        remote: filters.remote,
        country: filters.country,
        saved: filters.saved ? savedIds : null,
        now,
      }),
    [ordered, board, filters, savedIds, now],
  );
  const rows = useMemo(
    () => list.slice(0, page * PER_PAGE).map((job) => jobRow(job, { now, profile })),
    [list, page, now, profile],
  );
  const countries = useMemo(() => countriesOf(board?.jobs), [board]);

  // ── Actions ──
  const submit = (e) => {
    e.preventDefault();
    const text = input.replace(/\s+/g, ' ').trim();
    window.history.replaceState(null, '', searchHref(text));
    setNotice('');
    setFilters((f) => ({ ...f, country: 'all' }));
    setAsked((a) => ({ text, n: (a?.n ?? 0) + 1 }));
  };
  const retry = () => setAsked((a) => ({ text: a?.text ?? '', n: (a?.n ?? 0) + 1 }));
  const changeFilters = (next) => {
    setFilters(next);
    setPage(1);
  };
  const clearFilters = () => {
    setFilters(NO_FILTERS);
    setNewest(false);
    setPage(1);
  };

  const hrefFor = useCallback(
    (id) => `/jobs?${new URLSearchParams(asked?.text ? { q: asked.text, job: id } : { job: id })}`,
    [asked?.text],
  );

  const open = useCallback(
    (id, el) => {
      opener.current = el;
      setNotice('');
      setOpenId(id);
      window.history.pushState(null, '', hrefFor(id));
      pushed.current = true;
    },
    [hrefFor],
  );

  const close = useCallback(() => {
    setOpenId(null);
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, '', searchHref(asked?.text));
    }
    const el = opener.current;
    opener.current = null;
    if (el?.isConnected) el.focus();
  }, [asked?.text]);

  const toggleSave = useCallback(
    (id) => {
      setSaved((ids) => {
        const has = ids.some((x) => String(x) === id);
        const raw = board?.jobs.find((j) => String(j.id) === id)?.id ?? id;
        const next = has ? ids.filter((x) => String(x) !== id) : [...ids, raw];
        try {
          localStorage.setItem(SAVED_KEY, JSON.stringify(next));
        } catch {
          // storage full or blocked: the toggle still holds for this page
        }
        return next;
      });
    },
    [board],
  );

  const saveProfile = (p) => {
    setProfile(p);
    setEditing(false);
    if (SESSION_COOKIE.test(document.cookie)) {
      fetch('/api/user-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: p }),
      }).catch(() => {});
    }
    try {
      if (p?.rememberOnDevice) localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
      else localStorage.removeItem(PROFILE_KEY);
    } catch {
      // storage blocked: the profile still holds for this page
    }
  };

  // ── What the board says ──
  const busy = !board || loading;
  const openJob = openId && board ? board.jobs.find((j) => String(j.id) === openId) : null;
  const yours = !!profile && !asked?.text;
  const caption = `${yours ? 'YOUR DEPARTURES' : 'DEPARTURES'}${board ? ` · ${board.label}` : ''}`;
  const where = board?.place ? board.place.cities.slice(0, 3).join(', ') : '';
  const more = list.length > rows.length;
  const filtered = filters.type !== 'all' || filters.remote || filters.saved || filters.country !== 'all';

  let body;
  if (!board) {
    body = (
      <ul className="jb-list jb-ghosts" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="jr jr-ghost">
            <span />
            <span />
            <span />
          </li>
        ))}
      </ul>
    );
  } else if (board.state === 'error') {
    body = (
      <div className="jb-msg" role="alert">
        <p className="jb-msg-t">{LOAD_ERROR}</p>
        <button type="button" className="jb-btn" onClick={retry}>
          Try again
        </button>
      </div>
    );
  } else if (!rows.length) {
    body = (
      <div className="jb-msg">
        <p className="jb-msg-t">No roles match.</p>
        <p className="jb-msg-s">
          {filtered ? 'Try another search, or clear the chips.' : 'Try another role, a company, or a city.'}
        </p>
        {filtered && (
          <button type="button" className="jb-btn" onClick={clearFilters}>
            Clear the chips
          </button>
        )}
      </div>
    );
  } else {
    body = (
      <ul className="jb-list">
        {rows.map((row, i) => (
          <JobRow
            key={`slot-${i}`}
            row={row}
            href={hrefFor(row.id)}
            index={i}
            saved={savedIds.has(row.id)}
            onOpen={open}
            onSave={toggleSave}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="jb">
      <form className="jb-search" role="search" onSubmit={submit}>
        <div className="jb-labelrow">
          <label className="jb-label" htmlFor="jb-q">
            Where to?
          </label>
          <button type="button" className="jb-me" onClick={() => setEditing(true)}>
            {profile ? 'Edit profile' : 'Set up profile'}
            <span className="sr-only"> (it puts your best matches first)</span>
            {!profile && <span aria-hidden="true"> →</span>}
          </button>
        </div>
        <div className="jb-field">
          <input
            id="jb-q"
            className="jb-input"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            spellCheck={false}
            placeholder="Role, company, city or code"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="jb-go">
            Go
          </button>
        </div>
      </form>

      <GateFilters
        types={ROLE_TYPES}
        filters={filters}
        countries={countries}
        newest={newest}
        onChange={changeFilters}
        onNewest={(v) => {
          setNewest(v);
          setPage(1);
        }}
        onClear={clearFilters}
      />

      {notice && (
        <p className="jb-notice" role="status">
          {notice}
        </p>
      )}

      <section className="jb-board" aria-labelledby="jb-cap" aria-busy={busy} data-match={profile ? '' : undefined}>
        <div className="jb-top">
          <h2 id="jb-cap" className="jb-cap">
            {caption}
          </h2>
          <p className="jb-live" aria-live="polite">
            {busy ? 'Updating the board…' : board?.state === 'ok' ? <span className="sr-only">Board updated.</span> : null}
          </p>
          {where && <p className="jb-where">Roles in {where}</p>}
        </div>
        {board?.state === 'ok' && rows.length > 0 && (
          <div className="jb-head jr-grid" aria-hidden="true">
            <span className="jr-code">To</span>
            <span className="jr-role">Role</span>
            <span className="jr-where">Company</span>
            <span className="jr-side">{profile ? 'Match' : ''}</span>
            <span className="jr-pay">Pay</span>
            <span className="jr-status">Status</span>
          </div>
        )}
        {body}
        {board?.state === 'ok' && more && (
          <div className="jb-more">
            <button type="button" className="jb-btn" onClick={() => setPage((p) => p + 1)}>
              Load more
            </button>
          </div>
        )}
      </section>

      <p className="jb-foot">
        Roles come live from Adzuna, RemoteOK, Remotive, Arbeitnow and Himalayas. Pay marked ~ is our
        salary model&apos;s estimate for the role and the city, in the local currency.
      </p>

      {openJob && <JobDetailPanel job={openJob} profile={profile} onClose={close} />}
      {editing && (
        <ProfileModal initialProfile={profile} onSave={saveProfile} onClose={() => setEditing(false)} />
      )}
    </div>
  );
}
