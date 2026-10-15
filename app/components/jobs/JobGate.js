'use client';

// The job detail is the gate (spec §7). A panel in the kit's Dialog (focus trap, Esc, the page
// behind still, data-lenis-prevent so the panel scrolls itself):
//
//   OM 4127 · YYZ · TORONTO                 ✕        (gateFor + the board's code, gateInfo.js)
//   Software Engineer                    [GATE A12]
//   Shopify · Toronto, Ontario · posted 2 days ago
//   PAY · PREDICTED FOR THIS ROLE   the pay flaps in once (FlapText), over the runway lights:
//   ● ● ● ● ◉ ◉ ● …                 the city's range, this role's part lit (RunwayRange)
//   🔊 ANNOUNCEMENT · AI ADVICE     "Attention, candidates for <role>:" + the advice, plain text
//   [Board this role →] [🛂 Visa for Canada]
//
// Pay: the role's own when it lists one; else our salary model's estimate, asked through the
// board's one queue (usePredictedPay: a role the board already asked about costs nothing more).
// A role that lists its pay asks the model once too, when its gate opens, for the city's range
// its runway sits on. The advice: /api/job-advice, asked once the gate has stayed open a moment;
// a failure (503 advice-unavailable, a network error) says "Announcement unavailable right now."
// and nothing else. Successful answers are kept for the page (per role and profile).
// Reduced motion: the pay and the lights are simply there.

import { useEffect, useId, useState } from 'react';
import Dialog from '../kit/Dialog';
import FlapText from '../kit/FlapText';
import RunwayRange from './RunwayRange';
import { usePredictedPay } from './usePredictedPay';
import {
  announcement,
  boardLink,
  countryLabel,
  gateAsk,
  gateHeader,
  gatePay,
  postedAgo,
  visaLink,
} from '../../../lib/departures/gateInfo';
import { cleanTitle } from '../../../lib/departures/jobPlace';
import './gate.css';

const FLAP_DELAY_MS = 260; // after the panel has risen (kit.css dlg-rise, 240 ms)
const LIGHTS_DELAY_MS = 700; // the runway lights come on as the pay lands
const ADVICE_DWELL_MS = 600; // a gate opened and shut at once asks nothing

const advices = new Map(); // role id + profile -> Promise<advice> (successes only)

/** What the advice reads of a profile (and nothing else of it leaves the page). */
function profileFacts(profile) {
  if (!profile || typeof profile !== 'object') return null;
  const { skills, experience, jobTypes, nationality, currentCountry } = profile;
  return { skills, experience, jobTypes: Array.isArray(jobTypes) ? jobTypes : [], nationality, currentCountry };
}

const plainText = (html) =>
  String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function askAdvice(key, body) {
  if (advices.has(key)) return advices.get(key);
  const p = fetch('/api/job-advice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(async (res) => {
    if (!res.ok) throw new Error(`advice ${res.status}`);
    return res.json();
  });
  advices.set(key, p);
  // A failure is not kept: the next time this gate is opened (a new, deliberate open) asks again.
  p.catch(() => advices.delete(key));
  return p;
}

/**
 * job: a board job. profile: the visitor's (null: none; undefined: still loading, the advice
 * waits for it). returnFocusRef: the row that opened the gate (focus goes back there on close).
 */
export default function JobGate({ job, profile, onClose, returnFocusRef }) {
  const titleId = useId();
  const header = gateHeader(job);
  const role = cleanTitle(job?.title) || 'Untitled role';
  const company = String(job?.company ?? '').replace(/\s+/g, ' ').trim();
  const location = header.code === 'ANY' ? 'Remote' : String(job?.location ?? '').replace(/\s+/g, ' ').trim();
  const ago = postedAgo(job?.posted_at);

  // A role with no listed pay needs the estimate now (the board has usually asked already); one
  // that lists its pay asks only for its runway, so a gate opened and shut at once asks nothing.
  const listed = gatePay(job, null).kind === 'listed';
  const predicted = usePredictedPay(gateAsk(job), { visible: true, dwellMs: listed ? ADVICE_DWELL_MS : 0 });
  const pay = gatePay(job, predicted);

  const apply = boardLink(job?.url);
  const visa = visaLink(header.iso2);
  const country = countryLabel(header.iso2);

  // ── The announcement ──
  const facts = profileFacts(profile);
  const adviceKey = profile === undefined ? null : `${job?.id ?? ''}\u0000${JSON.stringify(facts)}`;
  const [heard, setHeard] = useState({ key: null, advice: null, failed: false });
  useEffect(() => {
    if (!adviceKey) return undefined;
    let live = true;
    const body = {
      job: {
        title: role,
        company,
        location,
        salary: pay.kind === 'listed' ? pay.text : 'not listed',
        description: plainText(job?.description).slice(0, 500),
      },
      profile: facts,
    };
    const timer = setTimeout(
      () => {
        askAdvice(adviceKey, body).then(
          (advice) => live && setHeard({ key: adviceKey, advice, failed: false }),
          () => live && setHeard({ key: adviceKey, advice: null, failed: true }),
        );
      },
      advices.has(adviceKey) ? 0 : ADVICE_DWELL_MS,
    );
    return () => {
      live = false;
      clearTimeout(timer);
    };
    // The body is what the key names (the role and the profile's facts) as of this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adviceKey]);
  const now = heard.key === adviceKey ? heard : { advice: null, failed: false };
  const pa = announcement(role, now.advice);
  const unavailable = now.failed || (now.advice && !pa);

  let payShown;
  if (pay.kind === 'listed' || pay.kind === 'predicted') {
    payShown = <FlapText text={pay.text} from="" play delayMs={FLAP_DELAY_MS} />;
  } else {
    payShown = (
      <p className="gate-note">{pay.kind === 'unavailable' ? 'Pay estimate unavailable' : 'Asking our salary model…'}</p>
    );
  }

  return (
    <Dialog open onClose={onClose} labelledBy={titleId} className="gate" returnFocusRef={returnFocusRef}>
      <header className="gate-head">
        <div className="gate-top">
          <p className="gate-line">{header.line}</p>
          <button type="button" className="gate-x" onClick={onClose} aria-label="Close">
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <div className="gate-id">
          <div className="gate-who">
            <h2 id={titleId} className="gate-title">
              {role}
            </h2>
            <p className="gate-sub">{[company, location, ago].filter(Boolean).join(' · ')}</p>
          </div>
          <p className="gate-plate">
            <small>GATE</small> <span>{header.gate}</span>
          </p>
        </div>
      </header>

      <section className="gate-sec" aria-labelledby={`${titleId}-pay`}>
        <h3 id={`${titleId}-pay`} className="gate-k">
          {pay.label}
        </h3>
        <div className="gate-pay" data-kind={pay.kind} aria-live="polite">
          {payShown}
        </div>
        {pay.runway && (
          <RunwayRange {...pay.runway} caption={`${header.town || 'City'} range`} delayMs={LIGHTS_DELAY_MS} />
        )}
        {pay.kind === 'predicted' && (
          <p className="gate-src">
            {header.code === 'ANY'
              ? 'Our salary model’s estimate for this role.'
              : 'Our salary model’s estimate for this role and city, in the local currency.'}
          </p>
        )}
      </section>

      <section className="gate-sec" aria-labelledby={`${titleId}-pa`}>
        <h3 id={`${titleId}-pa`} className="gate-k">
          <span aria-hidden="true">🔊 </span>ANNOUNCEMENT · AI ADVICE
        </h3>
        <div className="gate-pa" aria-live="polite">
          {pa && (
            <p>
              <strong className="gate-pa-lead">{pa.lead}</strong> {pa.text}
            </p>
          )}
          {!pa && unavailable && <p className="gate-note">Announcement unavailable right now.</p>}
          {!pa && !unavailable && <p className="gate-note">Listening for the announcement…</p>}
        </div>
      </section>

      <div className="gate-ctas">
        {apply ? (
          <a className="gate-board" href={apply} target="_blank" rel="noopener noreferrer">
            Board this role <span aria-hidden="true">→</span>
            <span className="sr-only"> (opens the listing in a new tab)</span>
          </a>
        ) : (
          <p className="gate-note gate-noapply">This role has no apply link.</p>
        )}
        {visa && country && (
          <a className="gate-visa" href={visa} target="_blank" rel="noopener">
            <span aria-hidden="true">🛂</span> Visa for {country}
            <span className="sr-only"> (Migrova, opens in a new tab)</span>
          </a>
        )}
      </div>
    </Dialog>
  );
}
