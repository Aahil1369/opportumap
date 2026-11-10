'use client';

// /jobs, the departures board (spec §7). Search a role, a company, a city or its code ("tor"
// finds Toronto, YYZ), narrow it with the gate chips, tap a row to open its gate.
//
// - First paint: the server's board (`initial`, from app/jobs/page.js): the homepage's search
//   (HOME_SEARCH) with every row's final text in the HTML; the motion layers on after hydration.
//   With no server board (the feeds were down at ISR time) placeholder rows wait for the same
//   search from /api/jobs.
// - What it searches: a visitor with no profile and no ?q= keeps the server's board (no request).
//   Otherwise searchPlan (lib/departures/jobRows.js): the base search is the visitor's profile
//   (profileQuery, their preferred countries) or "software engineer"; a ?q= in the URL (the
//   homepage's WHERE TO?) or the search box replaces it, and its rows re-flap in place over the
//   server's. Newest request wins (createLatest): an older, slower answer is dropped. A failed
//   request is an error state with Try again, never "No roles match".
// - Order: best match first when there is a profile (scoreJob, the same number as each row's
//   badge and BOARDING), else the feed's order; "Newest first" sorts by posted date. Each board
//   is ranked for the profile it was fetched for, so the server's rows hold still while the
//   visitor's own board is on its way, and re-flap once, when it lands.
// - Rows: JobRow. Rows keep their slot (key = position), so a new search or chip re-flaps the
//   rows on screen in place; "Load more" adds rows that clack in. Only on-screen rows flap or ask
//   the salary model (usePredictedPay). A row's heart saves a snapshot of the role for /saved, the
//   itinerary (lib/departures/savedStore.js).
// - The gate: a row is a link to /jobs?job=<id>; a click opens the role here (pushState, Back
//   closes it). A deep link opens from the server's board at once (the homepage links its rows
//   here, from the same search) or from the visitor's own search once it lands (deepLink); if
//   neither has the role, one /api/jobs?id= lookup asks for it (the two pages' boards can differ
//   when a feed call failed for one of them), and only then does the board say it couldn't find
//   it. The gate is JobGate (the kit Dialog), loaded on first open; it hands focus back to the
//   row that opened it as it closes (Esc, ✕, the backdrop or Back).
// - The desk: the AI assistant (ChatWidget, /api/chat) behind the floating Ask AI button, and the
//   relocation guide (RelocationModal) behind "I got the job". Both load when first opened.

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GateFilters from './GateFilters';
import JobRow from './JobRow';
import { createLatest } from '../../../lib/departures/createLatest';
import {
  ROLE_TYPES,
  countriesOf,
  deepLink,
  filterJobs,
  findJob,
  jobRow,
  searchPlan,
  sortJobs,
} from '../../../lib/departures/jobRows';
import { profileQuery } from '../../../lib/departures/profileQuery';
import { HOME_SEARCH } from '../../../lib/departures/homeSearch';
import { keepHomeProfile, loadHomeProfile } from '../home/homeProfile';
import { saveProfile as storeProfile } from '../../../lib/saveProfile';
import { deviceStorage, readSaved, removeJob, saveJob } from '../../../lib/departures/savedStore';
import { inputOnArrival, loadVisitorProfile, searchOnArrival } from '../../../lib/departures/visitorProfile';
import './jobs.css';

const JobGate = dynamic(() => import('./JobGate'), { ssr: false });
const ProfileModal = dynamic(() => import('../ProfileModal'), { ssr: false });
const ChatWidget = dynamic(() => import('../ChatWidget'), { ssr: false });
const RelocationModal = dynamic(() => import('../RelocationModal'), { ssr: false });

const PER_PAGE = 24;
const NO_FILTERS = { type: 'all', remote: false, country: 'all', saved: false };
const ISO2 = /^[a-z]{2}$/;
const SESSION_COOKIE = /(?:^|;\s*)sb-[^=;]+-auth-token/;

const LOAD_ERROR = "We couldn't load roles right now. Try again.";
const MISSING = "We couldn't find that role on the board just now. Try searching for it by its title or company.";

// The homepage's search: the server's board, and the board of a visitor with no profile and no ?q=.
const HOME_PLAN = Object.freeze({ text: '', query: HOME_SEARCH.query, place: null, countries: HOME_SEARCH.countries, fallback: null });
/** One search on the board: the nth time the visitor asked for it, and what was fetched. */
const boardKey = (n, text, plan, preferred) => [n, text, plan.query, (plan.countries || preferred).join(',')].join('\u0000');
const HOME_KEY = boardKey(0, '', HOME_PLAN, []);

/** One role by id (a deep link neither board has), or null. */
async function lookupJob(id) {
  try {
    const res = await fetch(`/api/jobs?${new URLSearchParams({ id })}`);
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data?.jobs) && data.jobs[0] && String(data.jobs[0].id) === id ? data.jobs[0] : null;
  } catch {
    return null;
  }
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

/**
 * initial: the server's board, { jobs (boardJobs), at (its clock) }, or null. It is the first
 * board, and stays a place deep links look in after the visitor's own search replaces it.
 */
export default function JobsBoard({ initial = null }) {
  const [server] = useState(() => (Array.isArray(initial?.jobs) && initial.jobs.length ? initial : null));
  const [profile, setProfile] = useState(undefined); // undefined: still loading
  const [input, setInput] = useState('');
  const [asked, setAsked] = useState(null); // { text, n }: the search on the board
  // { key, state: 'ok' | 'error', jobs, place, label, at, profile (ranked for), mine (the profile's own search) }
  const [board, setBoard] = useState(() =>
    server
      ? { key: HOME_KEY, state: 'ok', jobs: server.jobs, place: null, label: HOME_PLAN.query, at: server.at, profile: null, mine: false }
      : null,
  );
  const [filters, setFilters] = useState(NO_FILTERS);
  const [newest, setNewest] = useState(false);
  const [page, setPage] = useState(1);
  const [saved, setSaved] = useState([]); // ids of the saved roles (lib/departures/savedStore.js)
  const [openId, setOpenId] = useState(null);
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(false);
  const [chat, setChat] = useState({ loaded: false, open: false }); // the assistant stays mounted once opened
  const [moving, setMoving] = useState(false);
  const [linked, setLinked] = useState({ jobs: [], looked: false }); // a deep link's role, looked up by id
  const [latest] = useState(createLatest);
  const askRef = useRef(null);
  const moveRef = useRef(null);
  const meRef = useRef(null); // "Set up profile": the profile dialog gives it focus back
  const wanted = useRef(null); // ?job= from the URL, opened once a board has that role
  const opener = useRef(null); // the row that opened the gate: the gate's Dialog gives it focus back
  const pushed = useRef(false); // the gate added a history entry (Back closes it)

  // The URL, the profile and the saved roles, once; Back / Forward open and close the gate.
  useEffect(() => {
    let live = true;
    const params = new URLSearchParams(window.location.search);
    wanted.current = params.get('job');
    loadVisitorProfile({ account: loadHomeProfile }).then((p) => {
      if (!live) return;
      const q = (params.get('q') || '').replace(/\s+/g, ' ').trim();
      setProfile(p);
      // A signed-in visitor's profile can land after they typed or searched: theirs stays.
      setInput((v) => inputOnArrival(v, q));
      setAsked((a) => searchOnArrival(a, q));
      setSaved(readSaved(deviceStorage()).map((e) => e.id));
    });
    const onPop = () => {
      pushed.current = false;
      // Back closes the gate (its Dialog returns focus to the row); Forward opens it again.
      setOpenId(new URLSearchParams(window.location.search).get('job'));
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
  const plan = useMemo(() => {
    if (!asked || base === null) return null;
    // No profile and no search: the homepage's search, which the server's board already shows.
    if (!profile && !asked.text) return HOME_PLAN;
    return searchPlan(asked.text, { base });
  }, [asked, base, profile]);
  const key = plan ? boardKey(asked.n, asked.text, plan, preferred) : null;
  const loading = key !== null && board?.key !== key;

  useEffect(() => {
    if (!key) return;
    const id = latest.next(); // any older request is stale from here on
    if (!loading) return; // the board already shows this search (the server's board)
    loadBoard(plan, preferred)
      .then(
        (b) => ({ ...b, state: 'ok' }),
        () => ({ state: 'error', jobs: [], place: null, label: plan.text || plan.query }),
      )
      .then((b) => {
        if (!latest.isCurrent(id)) return; // a newer search has started: this answer is stale
        setBoard({ ...b, key, at: Date.now(), profile: profile ?? null, mine: !!profile && !plan.text });
        setPage(1);
      });
    // `plan`, `preferred`, `profile` and `loading` are what `key` is made of, as of this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, latest]);

  // A deep link (?job=<id>) opens its role from whichever board has it: the server's (a homepage
  // row, at once) or the visitor's own search, once that has landed; failing both, one lookup by
  // id. Only then is it a miss.
  const settled = key !== null && !loading && board?.state === 'ok';
  useEffect(() => {
    const id = wanted.current;
    const what = deepLink(id, { lists: [server?.jobs, board?.jobs, linked.jobs], settled, looked: linked.looked });
    if (what === 'lookup') {
      let live = true;
      lookupJob(id).then((job) => {
        if (live) setLinked({ jobs: job ? [job] : [], looked: true });
      });
      return () => {
        live = false;
      };
    }
    if (what !== 'open' && what !== 'miss') return undefined;
    wanted.current = null;
    Promise.resolve().then(() => {
      if (what === 'open') setOpenId(id);
      else {
        setNotice(MISSING);
        window.history.replaceState(null, '', searchHref(asked?.text));
      }
    });
    return undefined;
  }, [server, board, linked, settled, asked?.text]);

  // ── The board ──
  const now = useMemo(() => new Date(board?.at || 0), [board]);
  const savedIds = useMemo(() => new Set(saved.map(String)), [saved]);
  // The profile the rows are ranked for: while the visitor's own board is loading, the one the
  // board on screen was fetched for (the server's: none), so its rows hold still; then theirs.
  const ranked = (loading ? board?.profile : profile) ?? null;
  const ordered = useMemo(
    () => (board ? sortJobs(board.jobs, newest ? 'newest' : ranked ? 'match' : 'feed', ranked) : []),
    [board, newest, ranked],
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
    () => list.slice(0, page * PER_PAGE).map((job) => jobRow(job, { now, profile: ranked })),
    [list, page, now, ranked],
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

  // Focus goes back to the row from the gate's Dialog as it unmounts (returnFocusRef = opener):
  // focusing it here, while the Dialog is still open, would only be pulled back into the panel.
  const close = useCallback(() => {
    setOpenId(null);
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, '', searchHref(asked?.text));
    }
  }, [asked?.text]);

  // A save keeps a snapshot of the role (lib/departures/savedStore.js), so /saved still shows it
  // once no search returns it. Both writes are idempotent: React running this updater twice
  // (StrictMode) stores the same thing. Storage blocked or full: the toggle still holds for this page.
  const toggleSave = useCallback(
    (id) => {
      setSaved((ids) => {
        const has = ids.some((x) => String(x) === id);
        const store = deviceStorage();
        if (has) removeJob(store, id);
        else {
          const job = findJob(board?.jobs, id) || findJob(server?.jobs, id);
          if (job) saveJob(store, job);
        }
        return has ? ids.filter((x) => String(x) !== id) : [id, ...ids];
      });
    },
    [board, server],
  );

  const openChat = () => setChat({ loaded: true, open: true });
  const closeChat = useCallback(() => setChat((c) => ({ ...c, open: false })), []);
  const closeMove = useCallback(() => setMoving(false), []);

  const saveProfile = (p) => {
    setProfile(p);
    setEditing(false);
    keepHomeProfile(p);
    storeProfile(p, { signedIn: SESSION_COOKIE.test(document.cookie) });
  };

  // ── What the board says ──
  const busy = !board || loading;
  const openJob = openId ? findJob(board?.jobs, openId) || findJob(server?.jobs, openId) || findJob(linked.jobs, openId) : null;
  const yours = !!board?.mine;
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
          <button ref={meRef} type="button" className="jb-me" onClick={() => setEditing(true)}>
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

      <section className="jb-board" aria-labelledby="jb-cap" aria-busy={busy} data-match={ranked ? '' : undefined}>
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
            <span className="jr-side">{ranked ? 'Match' : ''}</span>
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

      <section className="jb-desk" aria-labelledby="jb-desk-k">
        <div className="jb-desk-copy">
          <h2 id="jb-desk-k" className="jb-desk-k">
            Got the job?
          </h2>
          <p className="jb-desk-s">Plan the move: the visa, housing, the first legal steps and people to ask.</p>
        </div>
        <button
          ref={moveRef}
          type="button"
          className="jb-btn"
          aria-haspopup="dialog"
          onClick={() => setMoving(true)}
        >
          I got the job →
        </button>
      </section>

      <p className="jb-foot">
        Roles come live from Adzuna, RemoteOK, Remotive, Arbeitnow and Himalayas. Pay in amber,
        underlined with dots, is our salary model&apos;s estimate for the role and the city, in the
        local currency.
      </p>

      <button
        ref={askRef}
        type="button"
        className="jb-ask"
        aria-haspopup="dialog"
        aria-expanded={chat.open}
        onClick={openChat}
      >
        <span className="jb-ask-i" aria-hidden="true">
          i
        </span>
        <span className="jb-ask-t">Ask AI</span>
        <span className="sr-only"> about visas, moving and settling in</span>
      </button>

      {openJob && <JobGate key={openJob.id} job={openJob} profile={profile} onClose={close} returnFocusRef={opener} />}
      {editing && (
        <ProfileModal initialProfile={profile} onSave={saveProfile} onClose={() => setEditing(false)} returnFocusRef={meRef} />
      )}
      {chat.loaded && (
        <ChatWidget open={chat.open} onClose={closeChat} profile={profile ?? null} returnFocusRef={askRef} />
      )}
      {moving && <RelocationModal onClose={closeMove} returnFocusRef={moveRef} />}
    </div>
  );
}
