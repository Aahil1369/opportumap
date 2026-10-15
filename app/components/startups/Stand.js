'use client';

// One startup's stand (/startups/[id]). GET /api/startups/[id] brings the startup and `mine`,
// the signed-in user's own { upvoted, interested } (null when signed out), so +1 PASSENGER and
// STANDBY start from the truth: a tap never un-votes by accident, and a second tap while one
// is saving is ignored. Signed-out visitors get "Sign in to board" in place of the actions;
// signing in reloads the stand with their state. Loading, not-found and load errors (with a
// retry) each have their own screen. Signature moment: the tail fin rolls onto the stand once
// and the passenger tiles flap in; boarding flaps the count to its new number. Reduced motion:
// all of it is simply there.

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import GateSign from '../kit/GateSign';
import FlapText from '../kit/FlapText';
import { usePrefersReducedMotion } from '../kit/useReducedMotion';
import { fetchJson } from '../../../lib/fetchJson.js';
import { createLatest } from '../../../lib/departures/createLatest.js';
import { STAGES, formatRaise, passengerLabel, passengerTiles, standFor } from '../../../lib/departures/hangar.js';
import { safeHttpUrl } from '../../../lib/safeUrl.js';
import { useViewer } from './useViewer';
import { SignInPrompt } from './SignIn';
import TailFin from './TailFin';

const TIMEOUT_MS = 15000;
const withTimeout = () =>
  typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? { signal: AbortSignal.timeout(TIMEOUT_MS) } : {};
const stageLabel = (v) => STAGES.find((s) => s.value === v)?.label ?? String(v ?? '').toUpperCase();

const ACTIONS = {
  upvote: { flag: 'upvoted', count: 'upvote_count', failed: "Couldn't save your boarding. Try again." },
  interest: { flag: 'interested', count: 'interest_count', failed: "Couldn't save your standby. Try again." },
};

function Shell({ children, busy }) {
  return (
    <main className="ps hg-standpage" data-wide="" aria-busy={busy || undefined}>
      {children}
    </main>
  );
}

function BackLink() {
  return (
    <Link href="/startups" className="hg-back">
      ← Back to the hangar
    </Link>
  );
}

export default function Stand({ id }) {
  const viewer = useViewer();
  const reduced = usePrefersReducedMotion();
  const [status, setStatus] = useState('loading'); // loading | ready | notfound | error
  const [startup, setStartup] = useState(null);
  const [mine, setMine] = useState(null);
  const [pending, setPending] = useState('');
  const [actionError, setActionError] = useState('');
  const [latest] = useState(createLatest);
  const inFlight = useRef({});
  const seenUser = useRef(undefined);

  const load = useCallback(
    ({ quiet = false } = {}) => {
      const req = latest.next();
      if (!quiet) setStatus('loading');
      fetchJson(`/api/startups/${encodeURIComponent(id)}`, withTimeout())
        .then((d) => {
          if (!latest.isCurrent(req)) return;
          if (!d?.startup) {
            setStatus('notfound');
            return;
          }
          setStartup(d.startup);
          setMine(d.mine ?? null);
          setStatus('ready');
        })
        .catch((err) => {
          if (!latest.isCurrent(req)) return;
          // A quiet reload (after sign-in) that fails keeps the stand on screen.
          if (quiet && err?.status !== 404) {
            setActionError("Couldn't refresh your boarding status. Reload the page.");
            return;
          }
          setStatus(err?.status === 404 ? 'notfound' : 'error');
        });
    },
    [id, latest],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Signing in or out on this page: reload the stand, so the actions match the session.
  const uid = viewer.ready ? viewer.user?.id ?? '' : undefined;
  useEffect(() => {
    if (uid === undefined) return;
    if (seenUser.current !== undefined && seenUser.current !== uid) {
      setActionError('');
      load({ quiet: true });
    }
    seenUser.current = uid;
  }, [uid, load]);

  const reloadQuietly = () => load({ quiet: true });

  const act = async (kind) => {
    const { flag, count, failed } = ACTIONS[kind];
    if (inFlight.current[kind] || !mine) return;
    inFlight.current[kind] = true;
    setPending(kind);
    setActionError('');
    try {
      const d = await fetchJson(`/api/startups/${encodeURIComponent(id)}/${kind}`, { method: 'POST' });
      if (typeof d?.[flag] !== 'boolean') throw new Error(failed);
      setMine((m) => (m ? { ...m, [flag]: d[flag] } : m));
      setStartup((s) => (s ? { ...s, [count]: Math.max(0, Number(d.count) || 0) } : s));
    } catch (err) {
      if (err?.status === 401) {
        setMine(null);
        setActionError('Your session ended. Sign in to board again.');
      } else {
        setActionError(failed);
      }
    } finally {
      inFlight.current[kind] = false;
      setPending('');
    }
  };

  if (status === 'loading') {
    return (
      <Shell busy>
        <header className="ps-head">
          <BackLink />
          <p className="sr-only" role="status">
            Opening the stand…
          </p>
          <div className="hg-hero hg-skel" aria-hidden="true">
            <div className="hg-hero-bay" />
            <div className="hg-hero-text">
              <span className="hg-skel-bar" />
              <span className="hg-skel-bar hg-skel-short" />
            </div>
          </div>
        </header>
      </Shell>
    );
  }

  if (status === 'error' || status === 'notfound') {
    const missing = status === 'notfound';
    return (
      <Shell>
        <header className="ps-head">
          <BackLink />
        </header>
        <div className="ps-body">
          <section className="hg-state" role={missing ? undefined : 'alert'} aria-labelledby="hg-stand-state">
            <p className="hg-kicker">{missing ? 'E · HANGAR · STAND VACANT' : 'E · HANGAR · DOORS STUCK'}</p>
            <h1 id="hg-stand-state" className="hg-state-title">
              {missing ? 'No startup on this stand.' : "This stand didn't load."}
            </h1>
            <p className="hg-state-sub">
              {missing ? 'It may have been taken down, or the link is wrong.' : 'Something went wrong on our side. Try again in a moment.'}
            </p>
            <div className="hg-state-actions">
              {!missing && (
                <button type="button" className="hg-btn hg-btn-sign" onClick={() => load()}>
                  Try again
                </button>
              )}
              <Link href="/startups" className="hg-btn hg-btn-ghost">
                Back to the hangar
              </Link>
            </div>
          </section>
        </div>
      </Shell>
    );
  }

  const s = startup;
  const isOwner = !!viewer.user && viewer.user.id === s.user_id;
  const signedIn = mine !== null;
  const raise = formatRaise(s.raise_amount);
  const equity = Number(s.equity_offered) > 0 ? `${s.equity_offered}%` : null;
  const deckUrl = safeHttpUrl(s.pitch_deck_url || '');
  const website = safeHttpUrl(s.website || '');
  const up = Math.max(0, Number(s.upvote_count) || 0);
  const tiles = passengerTiles(up); // 3 tiles, '999+' past that (a new length remounts the tiles)
  const standby = Math.max(0, Number(s.interest_count) || 0);
  const specs = [
    ['Stage', stageLabel(s.stage)],
    ['Sector', s.sector],
    ['Based in', s.location],
    ['Crew', Number(s.team_size) > 0 ? `${s.team_size} ${Number(s.team_size) === 1 ? 'person' : 'people'}` : null],
  ].filter(([, v]) => v);

  return (
    <Shell>
      <header className="ps-head hg-stand-head">
        <BackLink />
        <div className="hg-stand-sign">
          <GateSign letter="E" label="Hangar" />
          <span className="hg-stand-no">STAND {standFor(s.id)}</span>
        </div>
        <div className="hg-hero">
          <div className="hg-hero-bay" data-rise={reduced ? undefined : ''} aria-hidden="true">
            <TailFin name={s.name} size={132} className="hg-fin" />
          </div>
          <div className="hg-hero-text">
            <h1 className="ps-title hg-hero-name">{s.name}</h1>
            {s.tagline && <p className="ps-sub">{s.tagline}</p>}
          </div>
        </div>
      </header>

      <div className="ps-body hg-stand-body">
        <dl className="hg-specs">
          {specs.map(([label, value]) => (
            <div key={label} className="hg-spec">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <aside className="hg-side" aria-labelledby="hg-pass">
          <section className="hg-pass">
            <h2 id="hg-pass" className="hg-h2">
              Boarding
            </h2>
            <p className="hg-pass-raise">
              {raise ? (
                <>
                  <span className="hg-pass-big">{raise}</span>
                  <span className="hg-pass-cap">RAISING{equity ? ` · ${equity} EQUITY` : ''}</span>
                </>
              ) : (
                <span className="hg-pass-cap">RAISE NOT DISCLOSED</span>
              )}
            </p>

            <div className="hg-pax-row">
              <span className="hg-pass-cap">PASSENGERS</span>
              <span className="hg-pax-tiles" aria-hidden="true">
                <FlapText key={tiles.length} text={tiles} width={tiles.length} />
              </span>
              <span className="sr-only" aria-live="polite">
                {passengerLabel(up)}
              </span>
            </div>

            {signedIn ? (
              <div className="hg-acts">
                <button
                  type="button"
                  className="hg-btn hg-toggle"
                  data-kind="passenger"
                  data-after-signin=""
                  aria-pressed={!!mine.upvoted}
                  aria-disabled={pending === 'upvote' || undefined}
                  aria-describedby="hg-up-state"
                  onClick={() => act('upvote')}
                >
                  +1 PASSENGER
                </button>
                <p id="hg-up-state" className="hg-state-line" data-on={mine.upvoted ? '' : undefined}>
                  {mine.upvoted ? "You're on board ✓ Tap again to step off." : 'Back this startup in public.'}
                </p>

                {!isOwner && (
                  <>
                    <button
                      type="button"
                      className="hg-btn hg-toggle"
                      data-kind="standby"
                      aria-pressed={!!mine.interested}
                      aria-disabled={pending === 'interest' || undefined}
                      aria-describedby="hg-int-state"
                      onClick={() => act('interest')}
                    >
                      STANDBY
                    </button>
                    <p id="hg-int-state" className="hg-state-line" data-on={mine.interested ? '' : undefined}>
                      {mine.interested ? 'On standby ✓' : "Tell the founder you're interested."}
                      {standby > 0 ? ` · ${standby} on standby` : ''}
                    </p>
                    <Link
                      href={`/messages?startup=${encodeURIComponent(s.id)}&with=${encodeURIComponent(s.user_id)}`}
                      className="hg-btn hg-btn-sign"
                    >
                      Message the founder →
                    </Link>
                  </>
                )}
                {isOwner && <p className="hg-state-line">This is your stand. {standby > 0 ? `${standby} on standby.` : 'No one on standby yet.'}</p>}
              </div>
            ) : (
              <SignInPrompt id="hg-signin" title="Sign in to board" onSignedIn={reloadQuietly}>
                Add yourself as a passenger, go on standby, or message the founder.
              </SignInPrompt>
            )}

            {actionError && (
              <p role="alert" className="hg-alert">
                {actionError}
              </p>
            )}

            {website && (
              <a href={website} target="_blank" rel="noopener noreferrer" className="hg-btn hg-btn-ghost">
                Visit the website ↗
              </a>
            )}
            {s.user_name && <p className="hg-founder">FOUNDER · {s.user_name}</p>}
          </section>
        </aside>

        <div className="hg-rest">
          {s.description && (
            <section aria-labelledby="hg-about" className="hg-section">
              <h2 id="hg-about" className="hg-h2">
                About
              </h2>
              <p className="hg-about">{s.description}</p>
            </section>
          )}

          {deckUrl && (
            <section aria-labelledby="hg-deck" className="hg-section">
              <h2 id="hg-deck" className="hg-h2">
                Pitch deck
              </h2>
              {/* The deck is a public link (the pitch-decks bucket is public), so it is open to
                  everyone who visits the stand, and the stand says so. */}
              <div className="hg-deckbox">
                <p>The founder shared this deck as a public link: anyone can open it.</p>
                <a href={deckUrl} target="_blank" rel="noopener noreferrer" className="hg-btn hg-btn-sign">
                  Open the pitch deck ↗
                </a>
              </div>
            </section>
          )}
        </div>

        <p className="hg-foot">Early-stage means early-stage. Due diligence is your job.</p>
      </div>
    </Shell>
  );
}
