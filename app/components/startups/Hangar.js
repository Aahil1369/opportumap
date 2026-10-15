'use client';

// The hangar floor (/startups): the post button, the filter chips and the startups on their
// stands. One unfiltered GET /api/startups is the hangar (`all`): the sector counts always come
// from it, so picking a chip never zeroes the others. While that list is complete (fewer than
// the API's 50) the chips filter it here, instantly; past that the API filters instead.
// Signed-out visitors get "Sign in to post a startup" in place of the post button. Loading has a
// skeleton, failures a retry, and an empty hangar is the main screen, not a blank grid.
// Signature moment: the first time the stands fill, their tail fins roll up onto the floor once
// (transform/opacity, the first 12 only); reduced motion shows them in place.

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { fetchJson } from '../../../lib/fetchJson.js';
import { createLatest } from '../../../lib/departures/createLatest.js';
import {
  DEFAULT_FILTERS,
  EMPTY_DRAFT,
  SECTORS,
  SORTS,
  STAGES,
  filtersLocally,
  hangarView,
  isDefaultFilters,
  startupQuery,
  withPosted,
} from '../../../lib/departures/hangar.js';
import { usePrefersReducedMotion } from '../kit/useReducedMotion';
import { useViewer } from './useViewer';
import { SignInButton } from './SignIn';
import StandCard from './StandCard';
import TailFin from './TailFin';

const PostStartup = dynamic(() => import('./PostStartup'), { ssr: false });

const RISE_MAX = 12; // fins that roll in; the rest are simply there
const RISE_MS = 70 * RISE_MAX + 700;
const TIMEOUT_MS = 15000;

const withTimeout = () =>
  typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? { signal: AbortSignal.timeout(TIMEOUT_MS) } : {};

function Chip({ pressed, onClick, children, label }) {
  return (
    <button type="button" className="hg-chip" aria-pressed={pressed} aria-label={label} onClick={onClick}>
      {children}
    </button>
  );
}

export default function Hangar() {
  const viewer = useViewer();
  const reduced = usePrefersReducedMotion();
  const [all, setAll] = useState(null); // null while loading
  const [loadError, setLoadError] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [remote, setRemote] = useState(null); // { key, startups } | { key, error } from the API's filters
  const [postOpen, setPostOpen] = useState(false);
  const [postWanted, setPostWanted] = useState(false); // tapped before the session was known
  const [postLoaded, setPostLoaded] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [notice, setNotice] = useState('');
  const [rise, setRise] = useState(false);
  const rose = useRef(false);
  const riseTimer = useRef(0);
  const reducedNow = useRef(reduced);
  const postButton = useRef(null);
  const [latestAll] = useState(createLatest);
  const [latestRemote] = useState(createLatest);

  useEffect(() => {
    reducedNow.current = reduced;
  });
  useEffect(() => () => clearTimeout(riseTimer.current), []);

  // Signature moment: the first time the hangar has startups, the first fins roll in, once.
  const startRise = useCallback((list) => {
    if (rose.current || reducedNow.current || !list?.length) return;
    rose.current = true;
    setRise(true);
    riseTimer.current = setTimeout(() => setRise(false), RISE_MS);
  }, []);

  const fetchAll = useCallback(() => {
    const req = latestAll.next();
    fetchJson(`/api/startups?${startupQuery(DEFAULT_FILTERS)}`, withTimeout())
      .then((d) => {
        if (!latestAll.isCurrent(req)) return;
        const list = Array.isArray(d?.startups) ? d.startups : [];
        setAll(list);
        startRise(list);
      })
      .catch(() => {
        if (latestAll.isCurrent(req)) setLoadError(true);
      });
  }, [latestAll, startRise]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const retry = () => {
    setLoadError(false);
    setAll(null);
    setRemote(null);
    fetchAll();
  };

  // The chips filter `all` here while it is complete; otherwise the API filters.
  const local = filtersLocally(all) || isDefaultFilters(filters);
  const key = startupQuery(filters);
  const remoteKey = remote?.key;
  useEffect(() => {
    if (!all || local || remoteKey === key) return;
    const req = latestRemote.next();
    fetchJson(`/api/startups?${key}`, withTimeout())
      .then((d) => {
        if (latestRemote.isCurrent(req)) setRemote({ key, startups: Array.isArray(d?.startups) ? d.startups : [] });
      })
      .catch(() => {
        if (latestRemote.isCurrent(req)) setRemote({ key, error: true });
      });
  }, [all, local, key, remoteKey, latestRemote]);

  const signedIn = viewer.ready && !!viewer.user;
  // A tap before the session is known opens the form as soon as it is (and the visitor is in).
  const showPost = signedIn && (postOpen || postWanted);
  const openPost = () => {
    setNotice('');
    if (!viewer.ready) {
      setPostWanted(true);
      return;
    }
    setPostLoaded(true);
    setPostOpen(true);
  };
  const closePost = () => {
    setPostOpen(false);
    setPostWanted(false);
  };

  const onPosted = (startup) => {
    const next = withPosted(all, startup);
    setAll(next);
    setRemote(null);
    setDraft(EMPTY_DRAFT);
    closePost();
    setNotice(`${startup.name} is on its stand.`);
    startRise(next);
  };

  const view = hangarView(all, filters); // counts: always from the unfiltered list
  const remoteView = !local && remote?.key === key ? remote : null;
  const shown = local ? view.shown : remoteView?.startups ?? null;
  const toggle = (k, v) => setFilters((f) => ({ ...f, [k]: f[k] === v ? '' : v }));
  const clear = () => setFilters(DEFAULT_FILTERS);

  const postAction = signedIn ? (
    <button ref={postButton} type="button" className="hg-btn hg-btn-sign" onClick={openPost} data-after-signin="">
      + Post a startup
    </button>
  ) : viewer.ready ? (
    <SignInButton>Sign in to post a startup</SignInButton>
  ) : (
    <button ref={postButton} type="button" className="hg-btn hg-btn-sign" onClick={openPost} aria-busy={postWanted || undefined}>
      + Post a startup
    </button>
  );

  return (
    <div className="hg">
      {(postLoaded || showPost) && (
        <PostStartup
          open={showPost}
          onClose={closePost}
          onPosted={onPosted}
          draft={draft}
          setDraft={setDraft}
          returnFocusRef={postButton}
        />
      )}

      {loadError ? (
        <section className="hg-state" role="alert" aria-labelledby="hg-error-title">
          <p className="hg-kicker">E · HANGAR · DOORS STUCK</p>
          <h2 id="hg-error-title" className="hg-state-title">
            The hangar didn&apos;t load.
          </h2>
          <p className="hg-state-sub">Something went wrong on our side. Try again in a moment.</p>
          <button type="button" className="hg-btn hg-btn-sign" onClick={retry}>
            Try again
          </button>
        </section>
      ) : all === null ? (
        <div className="hg-loading" aria-busy="true">
          <p className="sr-only" role="status">
            Opening the hangar doors…
          </p>
          <ul className="hg-grid" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="hg-stand hg-skel">
                <div className="hg-card">
                  <div className="hg-bay" />
                  <div className="hg-card-body">
                    <span className="hg-skel-bar" />
                    <span className="hg-skel-bar hg-skel-short" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : all.length === 0 ? (
        <section className="hg-empty" aria-labelledby="hg-empty-title">
          <div className="hg-empty-bays" aria-hidden="true">
            {['E01', 'E02', 'E03'].map((stand, i) => (
              <div key={stand} className="hg-empty-bay" data-yours={i === 0 ? '' : undefined}>
                <TailFin vacant draw={i === 0 && !reduced} size={88} />
                <span className="hg-empty-no">
                  <span>STAND {stand}</span> <span>{i === 0 ? 'YOURS?' : 'VACANT'}</span>
                </span>
              </div>
            ))}
          </div>
          <h2 id="hg-empty-title" className="hg-state-title">
            The hangar is empty — post the first startup.
          </h2>
          <p className="hg-state-sub">
            Founders park their startup here: a tail fin painted from its name, the pitch and the raise. Builders and investors board as
            passengers, stand by for the deck, and message the founder.
          </p>
          <div className="hg-state-actions">{postAction}</div>
          {notice && (
            <p className="hg-notice" role="status">
              {notice}
            </p>
          )}
        </section>
      ) : (
        <>
          <div className="hg-toolbar">
            {postAction}
            <p className="hg-notice" role="status">
              {notice}
            </p>
          </div>

          <div className="hg-chips" data-lenis-prevent="" role="group" aria-label="Filter the hangar">
            <div className="hg-chip-group" role="group" aria-label="Sort">
              {SORTS.map((s) => (
                <Chip key={s.value} pressed={filters.sort === s.value} onClick={() => setFilters((f) => ({ ...f, sort: s.value }))}>
                  {s.label}
                </Chip>
              ))}
            </div>
            <span className="hg-chip-sep" aria-hidden="true" />
            <div className="hg-chip-group" role="group" aria-label="Stage">
              {STAGES.map((s) => (
                <Chip key={s.value} pressed={filters.stage === s.value} onClick={() => toggle('stage', s.value)}>
                  {s.label}
                </Chip>
              ))}
            </div>
            <span className="hg-chip-sep" aria-hidden="true" />
            <div className="hg-chip-group" role="group" aria-label="Sector">
              {SECTORS.map((s) => (
                <Chip
                  key={s}
                  pressed={filters.sector === s}
                  onClick={() => toggle('sector', s)}
                  label={`${s}, ${view.counts[s]} on the floor`}
                >
                  {s.toUpperCase()}
                  <span className="hg-chip-n" aria-hidden="true">
                    {view.counts[s]}
                  </span>
                </Chip>
              ))}
            </div>
            {!isDefaultFilters(filters) && (
              <>
                <span className="hg-chip-sep" aria-hidden="true" />
                <button type="button" className="hg-chip hg-chip-clear" onClick={clear}>
                  CLEAR ✕
                </button>
              </>
            )}
          </div>

          {remoteView?.error ? (
            <div className="hg-none" role="alert">
              <p className="hg-none-t">These stands didn&apos;t load.</p>
              <button type="button" className="hg-btn hg-btn-ghost" onClick={() => setRemote(null)}>
                Try again
              </button>
            </div>
          ) : shown === null ? (
            <p className="hg-none" role="status" aria-busy="true">
              Checking the stands…
            </p>
          ) : shown.length === 0 ? (
            <div className="hg-none" role="status">
              <p className="hg-none-t">No startups on these stands yet.</p>
              <button type="button" className="hg-btn hg-btn-ghost" onClick={clear}>
                Clear the filters
              </button>
            </div>
          ) : (
            <ul className="hg-grid" aria-label="Startups in the hangar">
              {shown.map((s, i) => (
                <StandCard key={s.id} startup={s} rise={rise && i < RISE_MAX} k={i} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
