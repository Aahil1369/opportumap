'use client';

// The crew badge (/profile): an airport crew ID on a lanyard. The yellow band, the member's
// initials (or picture), display name (never an email), their route chip, member since and a
// crew number from the public user id (a label, not a count).
// Signature moment: the badge drops onto its lanyard once (transform/opacity) and the route's
// codes clack onto their tiles; reduced motion shows it in place, as plain text.

import FlapText from '../kit/FlapText';
import SignatureMoment from '../kit/SignatureMoment';
import Avatar from '../community/Avatar';
import { displayName } from '../../../lib/displayName.js';
import { isVerifiedUserId } from '../../../lib/admin.js';
import { crewNo, memberSince } from '../../../lib/departures/lounge.js';

function Route({ route, play }) {
  if (!route.ready) {
    return (
      <span className="cb-wait">
        <span aria-hidden="true">··· → ···</span>
        <span className="sr-only">Loading your route</span>
      </span>
    );
  }
  if (route.ends) {
    const { from, to } = route.ends;
    return (
      <span className="cb-route">
        <span className="sr-only">{`${from} to ${to}`}</span>
        <span aria-hidden="true">
          <FlapText text={`${from} → ${to}`} play={play} delayMs={420} />
        </span>
      </span>
    );
  }
  if (route.failed) {
    return (
      <span className="cb-none">
        Didn&apos;t load.{' '}
        <button type="button" className="lg-link" onClick={route.retry}>
          Try again
        </button>
      </span>
    );
  }
  return <span className="cb-none">No route yet</span>;
}

export default function CrewBadge({ user, route }) {
  const name = displayName(user);
  const since = memberSince(user.created_at);
  const no = crewNo(user.id);
  const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  return (
    <SignatureMoment className="cb">
      {({ play }) => (
        <div className="cb-card" data-drop={play ? '' : undefined}>
          <span className="cb-slot" aria-hidden="true" />
          <div className="cb-band" aria-hidden="true">
            <span>OPPORTUMAP</span>
            <span className="cb-band-r">CREW</span>
          </div>
          <div className="cb-main">
            <Avatar name={name} src={avatar} size="lg" />
            <div className="cb-id">
              <p className="cb-k" aria-hidden="true">
                CREW MEMBER
              </p>
              <h2 className="cb-name" tabIndex={-1} data-after-signin="">
                {name}
              </h2>
              {isVerifiedUserId(user.id) && <p className="cb-verified">✓ Verified</p>}
            </div>
          </div>
          <dl className="cb-fields">
            <div className="cb-field cb-field-route">
              <dt>Route</dt>
              <dd>
                <Route route={route} play={play} />
              </dd>
            </div>
            <div className="cb-field">
              <dt>Member since</dt>
              <dd>{since || '—'}</dd>
            </div>
            {no && (
              <div className="cb-field">
                <dt>Crew no.</dt>
                <dd>{no}</dd>
              </div>
            )}
          </dl>
          <span className="cb-bars" aria-hidden="true" />
        </div>
      )}
    </SignatureMoment>
  );
}
