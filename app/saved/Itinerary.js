'use client';

// /saved, the itinerary (spec §8): the roles this visitor saved, as a departures board.
//
// - The roles: lib/departures/savedStore.js, read once after hydration (they live on this device,
//   so the server renders the hall and a placeholder board). Each is the snapshot taken when it
//   was saved, so a role no search returns any more is still here (review focus 5). Saves from
//   before snapshots (ids only) show as "Looking up this role…" while they are looked up, once
//   each (/api/jobs?id=, migrateSaved); found, the row clacks into its details, not found, it
//   says "Details unavailable" and can still be removed.
// - Rows: ItineraryRow, newest save first, 24 at a time ("Show more"). A row opens its gate
//   (JobGate, the kit Dialog, loaded on first open) over the board; /saved?job=<id> opens it too,
//   and Back closes it. Pay: the listed pay, else our salary model's estimate, asked only for rows
//   on screen through the page's one queue (usePredictedPay: at most 3 in flight, cached).
// - Remove: the role leaves the device's list at once and a polite status line says so; on the
//   board its status flaps to CANCELLED, the row fades out, then it is gone. Focus moves
//   to the next row's Remove (or the previous one's, or the empty board's link) when it was on the
//   removed one. Reduced motion: the row goes at once.
// - Empty: "No roles saved yet — pick one on the board." with the way to the board.
// No totals anywhere: the board never says how many roles are on it.

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import ItineraryRow from './ItineraryRow';
import { deviceStorage, migrateSaved, readSaved, removeJob } from '../../lib/departures/savedStore';
import { isJobId, jobRow } from '../../lib/departures/jobRows';
import { loadHomeProfile } from '../components/home/homeProfile';
import { PROFILE_KEY } from '../../lib/saveProfile';

const JobGate = dynamic(() => import('../components/jobs/JobGate'), { ssr: false });

const PER_PAGE = 24;
const CANCELLED_MS = 1500; // the CANCELLED flap (about 0.9 s) and a moment to read it
const FADE_MS = 240; // then the row fades out (saved.css)
const REDUCE = '(prefers-reduced-motion: reduce)';
const MISSING = 'That role is not on your itinerary any more.';

const hrefFor = (id) => `/saved?${new URLSearchParams({ job: id })}`;
const available = (e) => !!e && !e.pending && !e.unavailable;

/** The visitor's profile: their account's (signed in), else one kept on this device, else null. */
async function loadProfile() {
  const remote = await loadHomeProfile().catch(() => null);
  if (remote) return remote;
  try {
    const local = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
    return local && typeof local === 'object' && !Array.isArray(local) ? local : null;
  } catch {
    return null;
  }
}

/** A role saved id-only, looked up once: the job, null when it is not found; throws when the lookup failed. */
async function lookupJob(id) {
  if (!isJobId(id)) return null;
  const res = await fetch(`/api/jobs?${new URLSearchParams({ id })}`);
  if (!res.ok) throw new Error(`jobs ${res.status}`);
  const data = await res.json();
  const job = Array.isArray(data?.jobs) ? data.jobs[0] : null;
  return job && String(job.id) === id ? job : null;
}

const reducedNow = () => typeof window !== 'undefined' && !!window.matchMedia?.(REDUCE).matches;

/** The Remove button of the nearest row after this one still on the board, else before it, else null. */
function neighbour(button) {
  const li = button.closest('li');
  for (let el = li?.nextElementSibling; el; el = el.nextElementSibling) {
    if (!el.dataset.stage) return el.querySelector('.it-x');
  }
  for (let el = li?.previousElementSibling; el; el = el.previousElementSibling) {
    if (!el.dataset.stage) return el.querySelector('.it-x');
  }
  return null;
}

/** Runs `fn` after `ms`, kept in `timers` so an unmount clears it. */
function after(timers, fn, ms) {
  const t = setTimeout(() => {
    timers.delete(t);
    fn();
  }, ms);
  timers.add(t);
}

export default function Itinerary() {
  const [list, setList] = useState(null); // null: not read yet (the server, hydration)
  const [readAt, setReadAt] = useState(0); // when: NEW is relative to it
  const [looking, setLooking] = useState(false); // id-only saves are being looked up
  const [profile, setProfile] = useState(undefined); // undefined: still loading
  const [stages, setStages] = useState(() => new Map()); // id -> 'cancelled' | 'gone'
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  const [said, setSaid] = useState(''); // the polite status line
  const [notice, setNotice] = useState('');
  const buttons = useRef(new Map()); // id -> its Remove button
  const timers = useRef(new Set());
  const opener = useRef(null); // the row that opened the gate (the gate's Dialog gives it focus back)
  const pushed = useRef(false); // opening the gate added a history entry (Back closes it)
  const emptyLink = useRef(null); // the empty board's link, and "Show more": focus can land there
  const moreRef = useRef(null);
  const wanted = useRef(null); // ?job= from the URL

  // The roles (and the id-only saves looked up, once), the profile, the URL, Back / Forward.
  useEffect(() => {
    let live = true;
    const store = deviceStorage();
    wanted.current = new URLSearchParams(window.location.search).get('job');
    // Read once this commit is done (state is never set synchronously in an effect; under
    // StrictMode the first, discarded mount reads nothing and looks nothing up).
    Promise.resolve().then(() => {
      if (!live) return;
      const entries = readSaved(store);
      setList(entries);
      setReadAt(Date.now());
      if (!entries.some((e) => e.pending)) return;
      setLooking(true);
      migrateSaved(store, lookupJob).then((next) => {
        if (!live) return;
        // Only the looked-up rows change: a row being removed keeps its stage, and a role saved
        // in another tab meanwhile shows on the next visit.
        const byId = new Map(next.map((e) => [e.id, e]));
        setList((prev) => prev.map((e) => (e.pending && byId.has(e.id) ? byId.get(e.id) : e)));
        setLooking(false);
      });
    });
    loadProfile().then((p) => live && setProfile(p));
    const onPop = () => {
      pushed.current = false;
      setOpenId(new URLSearchParams(window.location.search).get('job'));
    };
    window.addEventListener('popstate', onPop);
    const pending = timers.current;
    return () => {
      live = false;
      window.removeEventListener('popstate', onPop);
      for (const t of pending) clearTimeout(t);
      pending.clear();
    };
  }, []);

  // A link to /saved?job=<id> opens that role's gate once the roles are read.
  useEffect(() => {
    const id = wanted.current;
    if (!list || !id) return;
    wanted.current = null;
    Promise.resolve().then(() => {
      if (list.some((e) => e.id === id && available(e))) setOpenId(id);
      else {
        setNotice(MISSING);
        window.history.replaceState(null, '', '/saved');
      }
    });
  }, [list]);

  // ── The board ──
  const now = useMemo(() => new Date(readAt), [readAt]);
  const shown = useMemo(() => (list ? list.slice(0, page * PER_PAGE) : []), [list, page]);
  const rows = useMemo(
    () => new Map(shown.filter(available).map((e) => [e.id, jobRow(e, { now, profile: profile ?? null })])),
    [shown, now, profile],
  );

  // ── Actions ──
  const keepButton = useCallback((id, el) => {
    if (el) buttons.current.set(id, el);
    else buttons.current.delete(id);
  }, []);

  const remove = useCallback(
    (id) => {
      if (!list || stages.has(id) || !list.some((e) => e.id === id)) return;
      removeJob(deviceStorage(), id); // off the device's list now, whatever happens to the page
      const name = rows.get(id)?.role || 'The saved role';
      // The row goes. If focus was on its Remove, it moves to the next row still on the board,
      // else the one before, else the empty board's link (or "Show more").
      const drop = () => {
        const button = buttons.current.get(id);
        const focused = !!button && button === document.activeElement;
        const target = focused ? neighbour(button) : null;
        flushSync(() => {
          setList((prev) => prev.filter((e) => e.id !== id));
          setStages((m) => {
            if (!m.has(id)) return m;
            const n = new Map(m);
            n.delete(id);
            return n;
          });
        });
        if (focused) (target?.isConnected ? target : emptyLink.current || moreRef.current)?.focus();
      };
      setSaid(`${name} removed from your itinerary.`);
      if (reducedNow()) {
        drop();
        return;
      }
      setStages((m) => new Map(m).set(id, 'cancelled'));
      after(timers.current, () => setStages((m) => (m.has(id) ? new Map(m).set(id, 'gone') : m)), CANCELLED_MS);
      after(timers.current, drop, CANCELLED_MS + FADE_MS);
    },
    [list, stages, rows],
  );

  const open = useCallback((id, el) => {
    opener.current = el;
    setNotice('');
    setOpenId(id);
    window.history.pushState(null, '', hrefFor(id));
    pushed.current = true;
  }, []);

  // Focus goes back to the row from the gate's Dialog as it unmounts (returnFocusRef = opener).
  const close = useCallback(() => {
    setOpenId(null);
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, '', '/saved');
    }
  }, []);

  // ── What the board says ──
  const openJob = openId && list ? list.find((e) => e.id === openId && available(e)) || null : null;
  const more = list ? list.length > shown.length : false;

  let body;
  if (!list) {
    body = (
      <ul className="it-list it-ghosts" aria-hidden="true">
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i} className="it it-ghost">
            <span />
            <span />
            <span />
          </li>
        ))}
      </ul>
    );
  } else if (!list.length) {
    body = (
      <div className="it-empty">
        <p className="it-empty-t">No roles saved yet — pick one on the board.</p>
        <p className="it-empty-s">Tap the heart on any row of the board and the role lands here, with its pay and its gate.</p>
        <Link ref={emptyLink} className="it-btn" href="/jobs">
          Open the board <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  } else {
    body = (
      <ul className="it-list">
        {shown.map((entry, i) => (
          <ItineraryRow
            key={entry.id}
            entry={entry}
            row={rows.get(entry.id) || null}
            href={hrefFor(entry.id)}
            index={i}
            stage={stages.get(entry.id) || null}
            looking={looking && !!entry.pending}
            position={i + 1}
            onOpen={open}
            onRemove={remove}
            buttonRef={keepButton}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="iti">
      {notice && (
        <p className="it-notice" role="status">
          {notice}
        </p>
      )}

      <section className="it-board" aria-labelledby="it-cap" aria-busy={!list || looking}>
        <div className="it-top">
          <h2 id="it-cap" className="it-cap">
            Itinerary · saved roles
          </h2>
          <p className="it-live" aria-live="polite">
            {looking ? 'Looking up your earlier saves…' : said}
          </p>
        </div>
        {list?.length > 0 && (
          <div className="it-head it-grid" aria-hidden="true">
            <span className="it-code">To</span>
            <span className="it-role">Role</span>
            <span className="it-where">Company</span>
            <span className="it-pay">Pay</span>
            <span className="it-status">Status</span>
          </div>
        )}
        {body}
        {more && (
          <div className="it-more">
            <button ref={moreRef} type="button" className="it-btn" onClick={() => setPage((p) => p + 1)}>
              Show more
            </button>
          </div>
        )}
      </section>

      <p className="it-foot">
        Your itinerary is kept on this device. Each role keeps the details it had when you saved it,
        so its listing may have closed since. Pay in amber, underlined with dots, is our salary
        model&apos;s estimate for the role and the city, in the local currency.
        {list?.some((e) => !available(e)) &&
          ' Roles saved before the board kept details show without them: find them on the board again, or remove them.'}
      </p>

      {openJob && <JobGate key={openJob.id} job={openJob} profile={profile} onClose={close} returnFocusRef={opener} />}
    </div>
  );
}
