'use client';

// The homepage board for everyone, personalised for a signed-in visitor with a profile: their
// roles (the same query and countries /jobs uses: lib/departures/profileQuery.js) re-flap into
// the board's rows in place. Same DOM, no page swap; until (or unless) they arrive, the server's
// rows stay. The row builder (and its city table) loads only on this path.

import { useEffect, useState } from 'react';
import HomeBoard from './HomeBoard';
import { loadHomeProfile } from './homeProfile';
import { profileQuery } from '../../../lib/departures/profileQuery';

const ISO2 = /^[a-z]{2}$/;

export default function PersonalBoard({ rows, columns, caption }) {
  const [mine, setMine] = useState(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const profile = await loadHomeProfile();
      if (!live || !profile) return;
      const countries = (profile.preferredCountries || []).filter((c) => ISO2.test(c));
      const url = `/api/jobs?q=${encodeURIComponent(profileQuery(profile))}${countries.length ? `&countries=${countries.join(',')}` : ''}`;
      const [res, board] = await Promise.all([fetch(url), import('../../../lib/departures/board')]);
      if (!res.ok) return;
      const { jobs } = await res.json();
      if (!live || !Array.isArray(jobs) || !jobs.length) return;
      // Their chosen countries share the whole board; without a choice it stays a varied board.
      const perCountry = countries.length ? Math.max(2, Math.ceil(rows.length / countries.length)) : 2;
      const next = board.boardRowsFrom(jobs, { now: new Date(), profile, fill: rows, perCountry });
      // Only a board with at least one of their own roles is YOUR DEPARTURES (not the same rows renamed).
      if (board.hasOwnRows(next, rows)) setMine(next);
    })().catch(() => {});
    return () => {
      live = false;
    };
  }, [rows]);

  return <HomeBoard rows={mine || rows} columns={columns} caption={mine ? 'YOUR DEPARTURES' : caption} />;
}
